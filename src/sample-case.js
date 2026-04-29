// 시연용 가상 B2B 케이스 모음 — 모두 학습 시연 목적의 가상 회사·인물이며 실제와 무관.
// 5개 영업 시나리오: 대기업 / 외국계 / 공공기관 / 스타트업 / SMB 중견기업

// ──────────────────────────────────────────────────────────────
// CASE 1 — 대기업 신규 진입 (제조업 ABC전자)
// ──────────────────────────────────────────────────────────────
const CASE_ENTERPRISE = {
  client_id: 'me',
  company: { name: 'ABC전자', industry: '제조 (반도체 장비)', size: '대기업 (5,000명)', stage: 'POC 협의' },
  people: [
    // 자사 (영업담당)
    { id: 'me', name: '김영업', title: '영업담당 (자사)', org: 'us', is_client: true },
    // 고객사 — CEO부터 실무자까지
    { id: 'ceo', name: '이대표', title: '대표이사', dept: '경영진', org: 'them',
      dmu_role: 'EB', tone: 'neutral', notes: '직접 미팅 1회', last_meeting: '2026-03-15' },
    { id: 'cfo', name: '박상무', title: 'CFO', dept: '재무', org: 'them',
      dmu_role: 'GK', tone: 'caution', notes: '예산 심의' },
    { id: 'cto', name: '정전무', title: 'CTO', dept: '기술본부', org: 'them',
      dmu_role: 'DM', tone: 'positive', notes: '기술적 의사결정자' },
    { id: 'sales_vp', name: '최본부장', title: '영업본부장', dept: '영업', org: 'them',
      dmu_role: 'CH', tone: 'positive', notes: '우리 솔루션 적극 옹호 — 이전 회사에서 사용 경험' },
    { id: 'it_dir', name: '강팀장', title: 'IT 인프라팀장', dept: 'IT', org: 'them',
      dmu_role: 'TB', tone: 'caution', notes: '기술 평가 진행 중' },
    { id: 'ops_dir', name: '윤차장', title: '운영팀장', dept: '운영', org: 'them',
      dmu_role: 'UB', tone: 'positive', notes: '실사용자 — 데모 후 호의적' },
    { id: 'procurement', name: '한과장', title: '구매팀장', dept: '구매', org: 'them',
      dmu_role: 'GK', tone: 'neutral', notes: 'RFP 절차 통제' },
    { id: 'legal', name: '오변호사', title: '법무팀장', dept: '법무', org: 'them',
      dmu_role: 'GK', tone: 'caution', notes: '계약 검토 단계 예정' },
    { id: 'security', name: '신부장', title: '보안실장', dept: '보안', org: 'them',
      dmu_role: 'BL', tone: 'negative', notes: '경쟁사 X솔루션 강력 추천' },
  ],
  reportings: [
    { manager: 'ceo', report: 'cfo' },
    { manager: 'ceo', report: 'cto' },
    { manager: 'ceo', report: 'sales_vp' },
    { manager: 'cto', report: 'it_dir' },
    { manager: 'cto', report: 'security' },
    { manager: 'sales_vp', report: 'ops_dir' },
    { manager: 'cfo', report: 'procurement' },
    { manager: 'cfo', report: 'legal' },
  ],
  influences: [
    { id: 'comp_x', label: 'X사 (경쟁)', category: '경쟁사', linked_to: ['security', 'cto'],
      tone: 'tense', strength: 3, direction: 'in', notes: '기존 보안 솔루션 공급' },
    { id: 'consulting', label: 'A 컨설팅', category: '컨설팅', linked_to: ['ceo'],
      tone: 'uncertain', strength: 2, direction: 'in', notes: 'DX 전략 컨설팅 진행 중' },
    { id: 'sister_corp', label: '계열사 도입사례', category: '도입사례', linked_to: ['sales_vp', 'cto'],
      tone: 'positive', strength: 2, direction: 'in', notes: 'ABC유통에서 작년 도입' },
    { id: 'isms', label: 'ISMS-P 인증', category: '규제', linked_to: ['security', 'legal'],
      tone: 'tense', strength: 3, direction: 'in', notes: '12월 갱신 심사' },
    { id: 'partner_si', label: 'B SI 파트너', category: '파트너', linked_to: ['it_dir'],
      tone: 'positive', strength: 2, direction: 'bi', notes: '구축 협력 가능' },
  ],
  meddic: {
    metrics: '연 12억원 운영비 절감 + 장애 시간 70% 감소 (예상)',
    economic_buyer: 'ceo',
    decision_criteria: ['도입 사례', '보안 인증', '확장성', '가격'],
    decision_process: 'POC (4주) → 본부장 보고 → CFO 예산 심의 → CEO 결재 → 4Q 도입',
    pain: '레거시 시스템 운영비 연 8억 + 분기당 평균 3건 장애',
    champion: 'sales_vp',
  },
};

const TEXT_ENTERPRISE = `[2026-03-15 ABC전자 1차 미팅 — 김영업]
이대표(대표이사)와 30분 미팅. 신규 솔루션 검토 의향 있음. 본격적 추진은 정전무(CTO)와 협의하라고 함.

[2026-03-22 정전무 미팅]
정전무는 우리 솔루션에 호의적. 기술 평가는 IT 인프라팀(강팀장)이 담당하며 보안실장 신부장과 합의 필요. 그런데 신부장은 X사 솔루션을 강력 추천 중.

[2026-04-05 사내 동맹]
영업본부장 최본부장이 우리 편 — 이전 회사(DEF산업)에서 우리 솔루션을 사용한 경험. 운영팀장 윤차장도 데모 후 매우 긍정적. 두 사람이 사내 추진해줌.

[추가 정보]
- 박상무(CFO) 예산 심의 단계, 신중한 입장
- 한과장(구매팀장)이 RFP 절차 통제
- 오변호사(법무팀장)가 계약 단계에서 검토 예정
- A 컨설팅이 ABC전자 DX 전략을 자문 중 (이대표 직보)
- 계열사 ABC유통이 작년 우리 솔루션 도입 — 레퍼런스 활용 가능
- ISMS-P 인증 12월 갱신 심사 — 보안 요구사항 강화 예상

[다음 액션]
- 신부장과 1:1 미팅 잡기 (Blocker → Coach 전환 시도)
- 최본부장과 함께 임원 보고 자료 준비
- A 컨설팅 담당 파트너 라인업 확인`;

// ──────────────────────────────────────────────────────────────
// CASE 2 — 외국계 본사 결재 (글로벌 SaaS 한국지사)
// ──────────────────────────────────────────────────────────────
const CASE_GLOBAL = {
  client_id: 'me',
  company: { name: 'GlobalCorp 한국지사', industry: 'SaaS', size: '글로벌 다국적 (한국지사 200명)', stage: '본사 승인 대기' },
  people: [
    { id: 'me', name: '이영업', title: '영업담당', org: 'us', is_client: true },
    // 한국지사
    { id: 'kr_md', name: 'James Park', title: 'Korea MD', dept: '한국지사 경영', org: 'them',
      dmu_role: 'CH', tone: 'positive', notes: '한국지사장 — 우리 적극 옹호' },
    { id: 'kr_cto', name: 'Alex Kim', title: 'Korea CTO', dept: '기술', org: 'them',
      dmu_role: 'TB', tone: 'positive', notes: '한국 기술 책임자' },
    { id: 'kr_ops', name: 'Sarah Lee', title: '운영팀장', dept: '운영', org: 'them',
      dmu_role: 'UB', tone: 'positive', notes: '실사용자 리더' },
    // 미국 본사
    { id: 'global_ceo', name: 'David Smith', title: 'Global CEO', dept: '본사 경영진', org: 'them',
      dmu_role: 'EB', tone: 'unknown', notes: '직접 접점 없음' },
    { id: 'global_cio', name: 'Linda Chen', title: 'Global CIO', dept: '본사 기술', org: 'them',
      dmu_role: 'DM', tone: 'caution', notes: '본사 IT 표준 담당' },
    { id: 'global_proc', name: 'Mike Johnson', title: 'Global Procurement', dept: '본사 구매', org: 'them',
      dmu_role: 'GK', tone: 'neutral', notes: '글로벌 벤더 등록 절차' },
  ],
  reportings: [
    { manager: 'global_ceo', report: 'global_cio' },
    { manager: 'global_ceo', report: 'global_proc' },
    { manager: 'global_ceo', report: 'kr_md' },
    { manager: 'kr_md', report: 'kr_cto' },
    { manager: 'kr_md', report: 'kr_ops' },
  ],
  influences: [
    { id: 'global_policy', label: '글로벌 IT 표준', category: '본사', linked_to: ['global_cio', 'kr_cto'],
      tone: 'tense', strength: 3, direction: 'in' },
    { id: 'us_vendor', label: '미국 본사 기존 벤더', category: '경쟁사', linked_to: ['global_cio'],
      tone: 'tense', strength: 3, direction: 'in', notes: '본사 표준 공급사' },
    { id: 'gartner', label: 'Gartner Magic Quadrant', category: '도입사례', linked_to: ['global_cio'],
      tone: 'positive', strength: 2, direction: 'in' },
    { id: 'gdpr', label: 'GDPR / 개인정보법', category: '규제', linked_to: ['global_proc'],
      tone: 'tense', strength: 3, direction: 'in' },
  ],
  meddic: {
    metrics: '한국지사 연 5억원 절감 / 글로벌 확산 시 50억원',
    economic_buyer: 'global_ceo',
    decision_criteria: ['글로벌 표준 부합', '보안 인증', '본사 도입사례'],
    decision_process: '한국지사 추천 → 본사 IT 검토 (8주) → 글로벌 구매 등록 → 본사 CEO 승인',
    pain: '본사 표준 솔루션의 한국 지원 부족 — 한국 운영팀 야근 빈발',
    champion: 'kr_md',
  },
};

const TEXT_GLOBAL = `[2026-02-10 GlobalCorp 한국지사 1차 미팅]
James Park (한국 MD)가 우리에게 직접 연락. 한국 운영 효율화를 위해 솔루션 검토 중. 본사 표준 솔루션이 한국 지원 부족.

[2026-02-25 기술 미팅]
Alex Kim (Korea CTO)와 데모 진행. 매우 긍정적. Sarah Lee 운영팀장도 동석, 실사용자 관점에서 호의적.

[본사 결재 구조 파악]
한국지사 단독 의사결정 불가. Global CIO Linda Chen이 본사 IT 표준을 관리하며, 모든 신규 벤더는 본사 IT 검토 + 글로벌 구매 등록 필요.
- David Smith (Global CEO): 최종 EB. 직접 접점 없음.
- Linda Chen (Global CIO): 본사 IT — 우리에 신중함, 기존 본사 벤더 선호 가능성.
- Mike Johnson (Global Procurement): 글로벌 벤더 등록 절차 통제.

[리스크]
- 본사가 미국 벤더(기존 공급사)를 선호할 가능성
- GDPR/한국 개인정보법 동시 충족 필요
- Gartner MQ 위치가 평가에 영향

[다음 액션]
- James MD와 함께 본사 발표 자료 준비 (Linda Chen 대상)
- 본사 도입사례(글로벌 기업) 케이스 스터디 확보
- 한국 ROI + 글로벌 확산 시 ROI 시나리오 작성`;

// ──────────────────────────────────────────────────────────────
// CASE 3 — 공공기관 RFP (한국XX공사)
// ──────────────────────────────────────────────────────────────
const CASE_PUBLIC = {
  client_id: 'me',
  company: { name: '한국XX공사', industry: '공공기관 (에너지)', size: '공공 (3,000명)', stage: 'RFP 발주 대기' },
  people: [
    { id: 'me', name: '박영업', title: '영업담당', org: 'us', is_client: true },
    { id: 'pres', name: '김사장', title: '사장', dept: '경영진', org: 'them',
      dmu_role: 'EB', tone: 'neutral', notes: '공공기관 사장' },
    { id: 'planning', name: '이본부장', title: '기획본부장', dept: '기획', org: 'them',
      dmu_role: 'DM', tone: 'positive', notes: 'IT 사업 총괄' },
    { id: 'it_dir', name: '정처장', title: 'IT처장', dept: 'IT', org: 'them',
      dmu_role: 'TB', tone: 'positive', notes: '기술 평가 책임자' },
    { id: 'planner', name: '최과장', title: 'IT사업 담당', dept: 'IT', org: 'them',
      dmu_role: 'CH', tone: 'positive', notes: '실무 사내 옹호자' },
    { id: 'audit', name: '강감사', title: '감사실장', dept: '감사', org: 'them',
      dmu_role: 'GK', tone: 'caution', notes: '발주 절차 적정성 감사' },
    { id: 'eval_1', name: '외부 평가위원 1', title: '대학 교수', dept: '평가위원회', org: 'them',
      dmu_role: 'TB', tone: 'unknown', notes: '평가위원 구성 미공개' },
    { id: 'eval_2', name: '외부 평가위원 2', title: '연구원', dept: '평가위원회', org: 'them',
      dmu_role: 'TB', tone: 'unknown' },
  ],
  reportings: [
    { manager: 'pres', report: 'planning' },
    { manager: 'pres', report: 'audit' },
    { manager: 'planning', report: 'it_dir' },
    { manager: 'it_dir', report: 'planner' },
  ],
  influences: [
    { id: 'gov_policy', label: '디지털플랫폼정부 정책', category: '규제', linked_to: ['pres', 'planning'],
      tone: 'positive', strength: 3, direction: 'in' },
    { id: 'comp_consortium', label: '경쟁 컨소시엄 (대형 SI)', category: '경쟁사', linked_to: ['it_dir'],
      tone: 'tense', strength: 3, direction: 'in', notes: '4개 대형 SI 컨소시엄' },
    { id: 'kepa', label: '나라장터 / 조달청', category: '규제', linked_to: ['planner'],
      tone: 'tense', strength: 3, direction: 'in', notes: '의무 발주 플랫폼' },
    { id: 'public_ref', label: '타 공공기관 도입사례', category: '도입사례', linked_to: ['planning'],
      tone: 'positive', strength: 2, direction: 'in', notes: '한국YY공단 작년 도입' },
  ],
  meddic: {
    metrics: '연간 운영비 15% 절감 + 시민 서비스 응답 시간 40% 단축',
    economic_buyer: 'pres',
    decision_criteria: ['기술 평가 점수', '가격 (최저가 가산)', '공공 도입사례', '하자보수'],
    decision_process: 'RFP 발주 (5월) → 제안서 (6월) → 평가위원회 (7월) → 우선협상 → 계약 (9월)',
    pain: '시스템 노후화로 시민 민원 폭증, 운영비 매년 15% 증가',
    champion: 'planner',
  },
};

const TEXT_PUBLIC = `[2026-01-20 한국XX공사 사전 영업]
최과장(IT사업 담당)이 우리 사이트 통해 문의. 시스템 노후화로 신규 사업 검토 중.

[2026-02-15 기술 미팅]
정처장(IT처장)과 데모. 호의적. 이본부장(기획본부장) 보고 후 RFP 발주 결정.

[RFP 일정]
- 5월: RFP 발주 (나라장터)
- 6월: 제안서 마감
- 7월: 평가위원회 (외부 위원 5명 포함, 명단 비공개)
- 8월: 우선협상대상자
- 9월: 계약 체결

[경쟁]
- 대형 SI 4개 컨소시엄 형성 중
- 한국YY공단(작년 우리 도입)이 좋은 레퍼런스 — 공공 도입사례 최강
- 디지털플랫폼정부 정책 부합 강조 필요
- 강감사(감사실장)가 발주 절차 적정성 감사 중 — 사전 접촉 위험

[다음 액션]
- 한국YY공단 사례 정리 (성과 수치)
- 디지털플랫폼정부 부합 RFP 답변 자료 준비
- 정처장과 추가 비공식 미팅 (감사 대상 외 시간)
- 최과장과 RFP 평가표 핵심 항목 협의`;

// ──────────────────────────────────────────────────────────────
// CASE 4 — 스타트업 빠른 결정 (TechStart)
// ──────────────────────────────────────────────────────────────
const CASE_STARTUP = {
  client_id: 'me',
  company: { name: 'TechStart', industry: 'AI 핀테크', size: '스타트업 (50명)', stage: 'POC 진행 중' },
  people: [
    { id: 'me', name: '최영업', title: '영업담당', org: 'us', is_client: true },
    { id: 'ceo', name: '박대표', title: 'CEO / 공동창업자', dept: '경영진', org: 'them',
      dmu_role: 'EB', tone: 'positive', notes: '직접 결재. 빠른 결정 선호' },
    { id: 'cto', name: '김CTO', title: 'CTO / 공동창업자', dept: '기술', org: 'them',
      dmu_role: 'DM', tone: 'positive', notes: '기술 검토 + 사용 결정' },
    { id: 'vp_eng', name: '이VP', title: 'VP Engineering', dept: '엔지니어링', org: 'them',
      dmu_role: 'CH', tone: 'positive', notes: '실사용자 + 사내 옹호자' },
    { id: 'lead_dev', name: '정개발', title: 'Lead Developer', dept: '엔지니어링', org: 'them',
      dmu_role: 'UB', tone: 'positive', notes: 'POC 진행자' },
  ],
  reportings: [
    { manager: 'ceo', report: 'cto' },
    { manager: 'cto', report: 'vp_eng' },
    { manager: 'vp_eng', report: 'lead_dev' },
  ],
  influences: [
    { id: 'vc', label: 'VC 투자사', category: '본사', linked_to: ['ceo'],
      tone: 'positive', strength: 2, direction: 'in', notes: 'A 시리즈 리드 투자사' },
    { id: 'comp_oss', label: '오픈소스 대안', category: '경쟁사', linked_to: ['cto'],
      tone: 'tense', strength: 2, direction: 'in' },
    { id: 'aws', label: 'AWS 크레딧', category: '파트너', linked_to: ['lead_dev'],
      tone: 'uncertain', strength: 1, direction: 'in' },
  ],
  meddic: {
    metrics: '엔지니어 1명당 주 5시간 절감 + 출시 속도 30% 향상',
    economic_buyer: 'ceo',
    decision_criteria: ['속도', '개발자 경험 (DX)', '월 단위 가격'],
    decision_process: 'POC (2주) → CTO 결정 → CEO 사인 → 즉시 도입',
    pain: '시리즈 B 라운드 전 빠른 출시 필요',
    champion: 'vp_eng',
  },
};

const TEXT_STARTUP = `[2026-04-01 TechStart 미팅]
박대표(CEO)와 김CTO가 동시 미팅. 시리즈 B 앞두고 빠른 출시 필요. 빠르면 2주 안에 결정 가능.

이VP(VP Engineering)가 우리에게 적극적. POC를 정개발(Lead Developer)이 직접 진행 중.

[빠른 의사결정 구조]
박대표 → 김CTO → 이VP → 정개발. 4명만 OK하면 도입.
박대표는 김CTO에게 기술 결정 위임. 김CTO가 POC 결과 보고 OK 시 박대표 사인.

[리스크]
- 오픈소스 대안 검토 중 (직접 만들기)
- AWS 크레딧 받아 AWS 솔루션도 고려

[다음 액션]
- POC 마감 4월 14일까지
- 개발자 친화 가격 모델 제안 (월 단위, 사용량 기반)`;

// ──────────────────────────────────────────────────────────────
// CASE 5 — SMB 중견기업 (오너 결정)
// ──────────────────────────────────────────────────────────────
const CASE_SMB = {
  client_id: 'me',
  company: { name: 'XX유통', industry: '유통', size: '중견기업 (300명)', stage: '경영진 보고 대기' },
  people: [
    { id: 'me', name: '한영업', title: '영업담당', org: 'us', is_client: true },
    { id: 'owner', name: '회장님', title: '회장 (오너)', dept: '경영진', org: 'them',
      dmu_role: 'EB', tone: 'unknown', notes: '직접 결재. 직접 미팅 필요' },
    { id: 'pres', name: '김사장', title: '대표이사 (전문경영인)', dept: '경영진', org: 'them',
      dmu_role: 'DM', tone: 'caution', notes: '경영 효율화 추진' },
    { id: 'cio', name: '이상무', title: 'CIO', dept: 'IT', org: 'them',
      dmu_role: 'CH', tone: 'positive', notes: '추천 인물. 회장님과 친분' },
    { id: 'ops_head', name: '박이사', title: '영업본부장', dept: '영업', org: 'them',
      dmu_role: 'UB', tone: 'positive', notes: '실사용 부서 책임자' },
    { id: 'finance', name: '최부장', title: '재무팀장', dept: '재무', org: 'them',
      dmu_role: 'GK', tone: 'caution', notes: '예산 통제' },
  ],
  reportings: [
    { manager: 'owner', report: 'pres' },
    { manager: 'pres', report: 'cio' },
    { manager: 'pres', report: 'ops_head' },
    { manager: 'pres', report: 'finance' },
  ],
  influences: [
    { id: 'comp_a', label: '경쟁 유통사 도입', category: '도입사례', linked_to: ['pres', 'owner'],
      tone: 'positive', strength: 3, direction: 'in', notes: 'YY유통이 작년 우리 솔루션 도입 후 매출 18% 증가' },
    { id: 'consulting', label: 'B 컨설팅', category: '컨설팅', linked_to: ['pres'],
      tone: 'uncertain', strength: 2, direction: 'in', notes: '경영 효율화 자문' },
  ],
  meddic: {
    metrics: '재고 관리 효율화 → 회전율 25% 개선, 연 8억원 절감',
    economic_buyer: 'owner',
    decision_criteria: ['경쟁사 도입사례', '오너 신뢰', '도입 기간'],
    decision_process: 'CIO 보고 → 김사장 검토 → 회장님 직접 보고 → 결재',
    pain: '경쟁사 YY유통이 우리 솔루션 도입 후 시장점유율 확대',
    champion: 'cio',
  },
};

const TEXT_SMB = `[2026-03-08 XX유통 미팅]
이상무(CIO)와 1차 미팅. 회장님 직접 결재 구조. 김사장(전문경영인)은 신중하나 결국 회장님 결재 통과해야 함.

이상무가 회장님과 친분 — 회장님께 직접 보고할 채널 보유.

[중요]
- 회장님: 직접 미팅 필요. 짧고 강한 임팩트 자료가 핵심.
- 박이사(영업본부장): 실사용 부서, 호의적
- 최부장(재무): 예산 신중

[차별화 포인트]
- 경쟁사 YY유통이 작년 우리 솔루션 도입 → 시장점유율 18% 증가
- 회장님이 경쟁사 의식 강함 → 이 케이스가 결정적

[다음 액션]
- 이상무 통해 회장님 미팅 잡기 (30분)
- YY유통 사례 한 페이지 자료 (회장님 보고용)
- 김사장 별도 자리 (전문경영인 우려 해소)`;

// ──────────────────────────────────────────────────────────────
// 수집 — 가장 다양한 3개 시나리오만 유지 (대기업·외국계·스타트업)
// ──────────────────────────────────────────────────────────────
export const SAMPLE_CASES = [
  { id: 'enterprise', label: '대기업 신규 진입 — ABC전자', description: '제조업, 5,000명, 보안실장 Blocker, 본부장 Champion.', data: CASE_ENTERPRISE, interviewText: TEXT_ENTERPRISE },
  { id: 'global', label: '외국계 본사 결재 — GlobalCorp', description: '한국지사 추진, 미국 본사 최종 결재 라인.', data: CASE_GLOBAL, interviewText: TEXT_GLOBAL },
  { id: 'startup', label: '스타트업 — TechStart', description: '4명만 OK하면 결정. 시리즈 B 앞두고 빠른 출시.', data: CASE_STARTUP, interviewText: TEXT_STARTUP },
];

// 미사용 케이스 (참고용으로 보존)
const _UNUSED = { CASE_PUBLIC, CASE_SMB, TEXT_PUBLIC, TEXT_SMB };

export const SAMPLE_CASE = SAMPLE_CASES[0].data;
