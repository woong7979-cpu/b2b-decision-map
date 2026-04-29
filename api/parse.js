// Vercel Serverless — 미팅 노트를 B2B 의사결정 구조 JSON으로 추출
// Endpoint: POST /api/parse  body: { text: string }

import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const MAX_INPUT_CHARS = 16000;

const SYSTEM_PROMPT = `당신은 B2B 영업 디스커버리 전문가입니다. 영업담당자의 미팅 노트·통화 기록·CRM 메모에서
고객사 의사결정 구조와 MEDDIC 정보를 추출하는 역할입니다.

[출력 규칙]
- 반드시 단일 JSON 객체만 출력. 설명·코드펜스·마크다운 금지.
- 모르는 값은 null 또는 빈 배열. 누락은 missing 배열에 명시.
- 모든 인물에 안정적 id (영문 소문자/언더스코어, 예: ceo, cto, sales_vp, procurement, security)
- 자사 영업담당은 id="me", is_client=true, org="us" 로 표시
- 고객사 인물은 org="them"

[스키마]
{
  "client_id": "me",
  "company": {
    "name": "ABC전자",
    "industry": "제조 (반도체)",
    "size": "대기업 (5,000명)",
    "stage": "POC 협의"
  },
  "people": [
    { "id": "me", "name": "김영업", "title": "영업담당", "org": "us", "is_client": true },
    { "id": "ceo", "name": "이대표", "title": "대표이사", "dept": "경영진", "org": "them",
      "dmu_role": "EB"|"DM"|"CH"|"TB"|"UB"|"CO"|"GK"|"BL"|null,
      "tone": "positive"|"neutral"|"caution"|"negative"|"unknown",
      "notes": "...", "last_meeting": "YYYY-MM-DD"|null }
  ],
  "reportings": [ { "manager": "ceo", "report": "cto" } ],
  "influences": [
    { "id": "comp_x", "label": "X사 (경쟁)",
      "category": "본사"|"경쟁사"|"컨설팅"|"파트너"|"도입사례"|"규제"|"기타",
      "linked_to": ["security", "cto"],
      "tone": "positive"|"uncertain"|"tense"|"negative",
      "strength": 1|2|3,
      "direction": "out"|"in"|"bi",
      "notes": "..." }
  ],
  "meddic": {
    "metrics": "연 12억원 절감 + 장애 70% 감소",
    "economic_buyer": "ceo" | null,
    "decision_criteria": ["도입사례", "보안인증", "확장성"],
    "decision_process": "POC → 본부장 보고 → CFO 심의 → CEO 결재 → 4Q 도입",
    "pain": "레거시 시스템 운영비 연 8억 + 분기당 3건 장애",
    "champion": "sales_vp" | null
  },
  "missing": [
    { "label": "...", "hint": "...", "severity": "high"|"medium" }
  ]
}

[DMU 역할 매핑 (한국어 → 영문 코드)]
- 대표/사장/회장/대표이사/CEO/임원 (예산결재권) → EB (Economic Buyer)
- 본부장/이사/CTO/CIO/실장 (기술/영업 의사결정) → DM (Decision Maker)
- 적극 추천/우리 편/이전 회사에서 사용/사내 옹호 → CH (Champion)
- 기술 평가/IT/보안/인프라/평가위원 → TB (Technical Buyer)
- 실사용자/운영팀/현업 → UB (User Buyer)
- 정보 제공자/우호적 비공식 → CO (Coach)
- 비서/구매팀/법무/심의/감사 (정보 통제) → GK (Gatekeeper)
- 반대/경쟁사 추천/부정적 → BL (Blocker)

[Tone 매핑]
- "적극 추천", "우리 편", "긍정적", "호의적" → positive
- "신중", "고민", "검토 중" → caution
- "반대", "부정적", "경쟁사 옹호" → negative
- 명확한 정보 없음 → unknown
- 그 외 일반 → neutral

[중요 규칙]
- 인터뷰에 등장한 모든 인물은 reportings 배열로 보고 라인 트리에 연결하세요.
  · "임원/본부장/이사" → CEO 또는 사장에게 보고
  · "팀장/과장/차장" → 본부장 또는 이사에게 보고
  · "실무자" → 팀장에게 보고
  외톨이 인물이 있으면 가시화가 깨집니다.
- 외부 영향(본사/경쟁/컨설팅/SI/도입사례/규제)은 영향선이 어떤 인물에게 미치는지(linked_to) 명시.
- MEDDIC 6요소 중 인터뷰에서 확인된 것만 채우고, 나머지는 빈 값으로 두세요.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }
  const text = (body.text || '').toString().trim();
  if (!text) return res.status(400).json({ error: 'text_required' });
  if (text.length > MAX_INPUT_CHARS) {
    return res.status(413).json({ error: 'text_too_long', limit: MAX_INPUT_CHARS });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'missing_api_key',
      hint: 'Vercel 환경변수 ANTHROPIC_API_KEY 설정 필요',
    });
  }

  const client = new Anthropic({ apiKey });

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content:
              `다음 미팅 노트에서 B2B 의사결정 구조 JSON을 추출하세요.\n` +
              (attempt > 0 ? '\n[중요] 직전 응답이 유효한 JSON이 아니었습니다. 반드시 단일 JSON 객체만 출력하세요.\n' : '') +
              `\n=== 미팅 노트 ===\n${text}\n=== 끝 ===`,
          },
        ],
      });

      const out = message.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
      const parsed = extractJson(out);
      if (!parsed) throw new Error('JSON 추출 실패');
      const validated = validateAndNormalize(parsed);
      return res.status(200).json(validated);
    } catch (err) {
      lastError = err;
    }
  }

  console.error('[api/parse] failed:', lastError?.message);
  return res.status(502).json({
    error: 'llm_extraction_failed',
    detail: String(lastError?.message || lastError),
  });
}

function extractJson(s) {
  if (!s) return null;
  s = s.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch { return null; }
}

function validateAndNormalize(obj) {
  const out = {
    client_id: obj.client_id || 'me',
    company: obj.company || {},
    people: Array.isArray(obj.people) ? obj.people.map(normalizePerson) : [],
    reportings: Array.isArray(obj.reportings)
      ? obj.reportings.filter(r => r && r.manager && r.report)
      : [],
    influences: Array.isArray(obj.influences) ? obj.influences.map(normalizeInfluence) : [],
    meddic: obj.meddic || {},
    missing: Array.isArray(obj.missing) ? obj.missing : [],
  };

  // 자사 영업담당 보장
  if (!out.people.find(p => p.is_client || p.id === out.client_id)) {
    out.people.unshift({
      id: 'me', name: '영업담당 (나)', title: '영업담당', org: 'us', is_client: true,
      dmu_role: null, tone: 'positive',
    });
    out.client_id = 'me';
  }

  // 보고 라인 자동 추론 (직책 키워드 기반)
  inferReportings(out);

  return out;
}

function normalizePerson(p) {
  const validRoles = ['EB','DM','CH','TB','UB','CO','GK','BL'];
  const validTones = ['positive','neutral','caution','negative','unknown'];
  return {
    id: p.id,
    name: p.name || p.id,
    title: p.title || '',
    dept: p.dept || '',
    org: p.org === 'us' ? 'us' : 'them',
    is_client: !!p.is_client,
    dmu_role: validRoles.includes(p.dmu_role) ? p.dmu_role : null,
    tone: validTones.includes(p.tone) ? p.tone : 'unknown',
    notes: p.notes || '',
    last_meeting: p.last_meeting || null,
  };
}

function normalizeInfluence(s) {
  const validCats = ['본사','경쟁사','컨설팅','파트너','도입사례','규제','기타'];
  const validTones = ['positive','uncertain','tense','negative'];
  const validDirs = ['out','in','bi'];
  let strength = parseInt(s.strength, 10);
  if (![1,2,3].includes(strength)) strength = 2;
  return {
    id: s.id || `inf_${Math.random().toString(36).slice(2, 8)}`,
    label: s.label || s.category || '영향',
    category: validCats.includes(s.category) ? s.category : '기타',
    linked_to: Array.isArray(s.linked_to) ? s.linked_to.filter(Boolean) : [],
    tone: validTones.includes(s.tone) ? s.tone : 'uncertain',
    strength,
    direction: validDirs.includes(s.direction) ? s.direction : 'in',
    notes: s.notes || '',
  };
}

// 직책 기반 보고 라인 자동 추론 (LLM 누락 보정)
function inferReportings(data) {
  const people = data.people.filter(p => p.org !== 'us');
  if (people.length === 0) return;

  // 직책별 레벨 점수 (낮을수록 상위)
  const titleLevel = (title) => {
    const t = (title || '').toLowerCase();
    if (/대표|회장|사장|ceo|president|md/.test(t)) return 0;
    if (/본부장|이사|cto|cio|cfo|coo|상무|전무|부사장|vp|director/.test(t)) return 1;
    if (/실장|처장|팀장|head/.test(t)) return 2;
    if (/과장|차장|책임|수석|lead/.test(t)) return 3;
    if (/대리|주임|선임|매니저|manager/.test(t)) return 4;
    return 5;
  };

  // 이미 있는 reporting의 report 식별
  const reportSet = new Set(data.reportings.map(r => r.report));
  const managerSet = new Set(data.reportings.map(r => r.manager));

  // 각 인물에게 매니저 추론 (보고 안 된 인물 대상)
  people.forEach(p => {
    if (reportSet.has(p.id)) return;
    const myLvl = titleLevel(p.title);
    if (myLvl === 0) return; // 최상위는 보고 라인 없음
    // 같은 부서에서 더 상위 직책 찾기
    const candidates = people.filter(q =>
      q.id !== p.id &&
      titleLevel(q.title) < myLvl &&
      (q.dept === p.dept || titleLevel(q.title) === 0));
    if (candidates.length === 0) return;
    // 가장 가까운 상위 (lvl 차이 작은)
    candidates.sort((a, b) => titleLevel(b.title) - titleLevel(a.title));
    const mgr = candidates[0];
    data.reportings.push({ manager: mgr.id, report: p.id });
  });
}
