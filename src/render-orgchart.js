// 조직구조도 SVG 렌더러 — B2B 고객사 보고 라인 시각화
//
// 입력: { people, reportings, client_id, company }
// - people: 인물 목록 (id, name, title, dept, org, dmu_role, tone, is_client)
// - reportings: 보고 라인 ([{ manager, report }])
// - 사회복지 가계도와 유사하지만 단순화 (부부 개념 없음, 직급 계층만)
//
// 시각:
// - 인물 카드 = 직사각형 (직책·이름·부서)
// - 좌측 색상 바 = DMU 역할 (EB/CH/DM/TB/UB/CO/GK/BL)
// - 테두리 색상 = 우호도 톤 (positive/neutral/caution/negative/unknown)
// - 자사(영업담당) = 굵은 파란 강조
// - 보고선 = 부모-자녀선 (수직-수평-수직)

const NODE_W = 168;   // 풀 영문 라벨(Economic Buyer 등) 수용
const NODE_H = 72;
const COL_GAP = 18;
const ROW_GAP = 84;
const PAD = 60;

// DMU 역할 색상
const ROLE_COLORS = {
  EB: '#1E40AF', // Economic Buyer — 네이비
  DM: '#0E7490', // Decision Maker — 티얼
  CH: '#059669', // Champion — 그린 (우리 편)
  TB: '#F59E0B', // Technical Buyer — 엠버
  UB: '#7C3AED', // User Buyer — 보라
  CO: '#0891B2', // Coach — 시안
  GK: '#6B7280', // Gatekeeper — 그레이
  BL: '#DC2626', // Blocker — 레드
};

// 풀 영문 라벨 — chip 대신 카드 상단에 직접 표기
const ROLE_LABELS = {
  EB: 'Economic Buyer',
  DM: 'Decision Maker',
  CH: 'Champion',
  TB: 'Technical Buyer',
  UB: 'User Buyer',
  CO: 'Coach',
  GK: 'Gatekeeper',
  BL: 'Blocker',
};

// 최종 결정권자(Economic Buyer = 예산 결재 임원)가 가장 굵은 라인
// Decision Maker(의사결정자, 보통 부서 책임자)가 두 번째
const ROLE_EMPHASIS = {
  EB: 5,    // Economic Buyer — 최종 결정권자, 가장 굵게 (5px)
  DM: 3.5,  // Decision Maker — 두 번째 (3.5px)
  default: 2,
};

const TONE_COLORS = {
  positive: '#059669',
  neutral:  '#9CA3AF',
  caution:  '#F59E0B',
  negative: '#DC2626',
  unknown:  '#CBD5E1',
};

const TONE_LABELS = {
  positive: '🟢',
  neutral:  '⚪',
  caution:  '🟡',
  negative: '🔴',
  unknown:  '⚫',
};

export function renderOrgChart(svg, data) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const peopleById = new Map((data.people || []).map(p => [p.id, { ...p }]));
  // 자사(영업담당)는 조직구조도에 표시하지 않음 (영향맵에서만 표시)
  const themPeople = [...peopleById.values()].filter(p => p.org !== 'us');
  const themIds = new Set(themPeople.map(p => p.id));
  const reportings = (data.reportings || []).filter(r =>
    themIds.has(r.manager) && themIds.has(r.report));

  if (themPeople.length === 0) {
    drawEmptyState(svg);
    return;
  }

  // 1) 세대(레벨) 할당
  const themMap = new Map(themPeople.map(p => [p.id, p]));
  assignLevels(themMap, reportings);

  // 2) 톱-다운 배치
  const positions = layoutTopDown(themMap, reportings);

  // 3) 보텀-업 보정 (자녀 그룹 중심에 부모 정렬)
  alignParentsToChildren(positions, reportings, themMap);

  // 4) 음수 보정 + 충돌 해소
  normalizePositions(positions, themMap);

  // 5) 캔버스 크기
  const allX = [...positions.values()].map(p => p.x);
  const allY = [...positions.values()].map(p => p.y);
  const width = Math.max(...allX) + NODE_W + PAD * 2;
  const height = Math.max(...allY) + NODE_H + 50 + PAD * 2;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // 6) 회사명 표시
  if (data.company?.name) {
    svg.appendChild(text(width / 2, 30, `🏢 ${data.company.name}` +
      (data.company.industry ? `  ·  ${data.company.industry}` : ''), {
      'font-size': 16, 'font-weight': 700, 'text-anchor': 'middle', fill: '#1F2937',
    }));
    if (data.company.size || data.company.stage) {
      svg.appendChild(text(width / 2, 50,
        [data.company.size, data.company.stage].filter(Boolean).join('  ·  '), {
        'font-size': 11, 'text-anchor': 'middle', fill: '#6B7280',
      }));
    }
  }

  // 7) 보고선
  for (const r of reportings) {
    drawReportingLine(svg, r, positions);
  }

  // 8) 인물 카드
  for (const p of themPeople) {
    const pos = positions.get(p.id);
    if (pos) drawPersonCard(svg, p, pos);
  }
}

// ──────────────────────────────────────────────────────────────
// 1) 레벨 할당 (CEO = 0, 임원 = 1, ...)
// ──────────────────────────────────────────────────────────────
function assignLevels(peopleById, reportings) {
  // 명시 level이 있으면 사용
  for (const p of peopleById.values()) {
    if (typeof p.level === 'number') p._lvl = p.level;
  }
  // 시드: 매니저가 없는 인물은 level 0
  const isReport = new Set(reportings.map(r => r.report));
  for (const p of peopleById.values()) {
    if (p._lvl === undefined && !isReport.has(p.id)) p._lvl = 0;
  }

  // BFS: 매니저의 level + 1 = report level
  let changed = true, iter = 0;
  while (changed && iter < 50) {
    iter++; changed = false;
    for (const r of reportings) {
      const m = peopleById.get(r.manager);
      const c = peopleById.get(r.report);
      if (!m || !c) continue;
      if (m._lvl !== undefined && c._lvl === undefined) {
        c._lvl = m._lvl + 1; changed = true;
      } else if (c._lvl !== undefined && m._lvl === undefined) {
        m._lvl = c._lvl - 1; changed = true;
      }
    }
  }
  // 미할당 → 0
  for (const p of peopleById.values()) if (p._lvl === undefined) p._lvl = 0;
  const minL = Math.min(...[...peopleById.values()].map(p => p._lvl));
  for (const p of peopleById.values()) p._lvl -= minL;
}

// ──────────────────────────────────────────────────────────────
// 2) 톱-다운 배치 — 부모 X 중심 시도
// ──────────────────────────────────────────────────────────────
function layoutTopDown(peopleById, reportings) {
  const byLevel = new Map();
  for (const p of peopleById.values()) {
    if (!byLevel.has(p._lvl)) byLevel.set(p._lvl, []);
    byLevel.get(p._lvl).push(p);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const positions = new Map();

  for (const lvl of levels) {
    const peopleInLvl = byLevel.get(lvl);
    // 정렬: 부모 X 중심 → DMU 역할 우선순위 → 이름
    for (const p of peopleInLvl) {
      p._desiredX = computeDesiredCenter(p, reportings, positions);
    }
    peopleInLvl.sort((a, b) => {
      const ax = a._desiredX === null ? Number.POSITIVE_INFINITY : a._desiredX;
      const bx = b._desiredX === null ? Number.POSITIVE_INFINITY : b._desiredX;
      if (Number.isFinite(ax) && Number.isFinite(bx) && Math.abs(ax - bx) > 1) return ax - bx;
      // DMU 역할 순서 (EB/DM/CH 우선)
      const order = { EB: 0, DM: 1, CH: 2, TB: 3, UB: 4, CO: 5, GK: 6, BL: 7 };
      return (order[a.dmu_role] ?? 9) - (order[b.dmu_role] ?? 9);
    });

    let cursor = PAD;
    const y = PAD + 40 + lvl * (NODE_H + ROW_GAP); // +40 for company header
    for (const p of peopleInLvl) {
      let startX;
      if (p._desiredX !== null) {
        startX = Math.max(cursor, p._desiredX - NODE_W / 2);
      } else {
        startX = cursor;
      }
      positions.set(p.id, { x: startX, y, person: p });
      cursor = startX + NODE_W + COL_GAP;
    }
  }
  return positions;
}

function computeDesiredCenter(person, reportings, positions) {
  // 매니저(들)의 X 평균
  const managers = reportings
    .filter(r => r.report === person.id)
    .map(r => positions.get(r.manager))
    .filter(Boolean);
  if (managers.length === 0) return null;
  const avg = managers.reduce((sum, m) => sum + m.x + NODE_W / 2, 0) / managers.length;
  return avg;
}

// ──────────────────────────────────────────────────────────────
// 3) 보텀-업 보정
// ──────────────────────────────────────────────────────────────
function alignParentsToChildren(positions, reportings, peopleById) {
  // 매니저별로 자녀 그룹 중심 vs 매니저 중심 비교 → 매니저 우측 시프트 (필요 시)
  const levels = [...new Set([...peopleById.values()].map(p => p._lvl))].sort((a, b) => b - a);
  for (const lvl of levels) {
    if (lvl === 0) continue;
    // 이 레벨의 자녀들을 가진 매니저 식별
    const managerIds = new Set(reportings
      .filter(r => peopleById.get(r.report)?._lvl === lvl)
      .map(r => r.manager));

    for (const mgrId of managerIds) {
      const mgrPos = positions.get(mgrId);
      if (!mgrPos) continue;
      const childIds = reportings.filter(r => r.manager === mgrId).map(r => r.report);
      const childPos = childIds.map(id => positions.get(id)).filter(Boolean);
      if (childPos.length === 0) continue;
      const childMin = Math.min(...childPos.map(c => c.x));
      const childMax = Math.max(...childPos.map(c => c.x)) + NODE_W;
      const childCenter = (childMin + childMax) / 2;
      const mgrCenter = mgrPos.x + NODE_W / 2;
      const dx = childCenter - mgrCenter;
      if (dx > 1) {
        // 매니저 + 매니저보다 우측에 있는 같은 레벨 시프트
        const mgrLvl = mgrPos.person._lvl;
        for (const [, pos] of positions.entries()) {
          if (pos.person._lvl === mgrLvl && pos.x >= mgrPos.x) {
            pos.x += dx;
          }
        }
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 4) 음수 보정 + 충돌 해소
// ──────────────────────────────────────────────────────────────
function normalizePositions(positions, peopleById) {
  const minX = Math.min(...[...positions.values()].map(p => p.x));
  if (minX < PAD) {
    const shift = PAD - minX;
    for (const v of positions.values()) v.x += shift;
  }

  const levels = [...new Set([...peopleById.values()].map(p => p._lvl))].sort((a, b) => a - b);
  for (const lvl of levels) {
    const peopleInLvl = [...peopleById.values()].filter(p => p._lvl === lvl);
    const sorted = peopleInLvl.map(p => positions.get(p.id)).filter(Boolean).sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      const minLeft = sorted[i - 1].x + NODE_W + COL_GAP;
      if (sorted[i].x < minLeft) {
        sorted[i].x = minLeft;
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 5) 인물 카드 렌더
// ──────────────────────────────────────────────────────────────
function drawPersonCard(svg, p, pos) {
  const role = p.dmu_role || '';
  const roleColor = ROLE_COLORS[role] || '#9CA3AF';
  const tone = p.tone || 'unknown';
  const toneColor = TONE_COLORS[tone] || TONE_COLORS.unknown;
  const isClient = !!p.is_client;
  // 자사 또는 DM/EB 강조 적용
  const emphasis = isClient ? 3 : (ROLE_EMPHASIS[role] || ROLE_EMPHASIS.default);

  const x = pos.x, y = pos.y;
  // 카드 배경 (테두리 = 우호도 톤, 굵기 = 역할 중요도)
  // EB(최종 결정권자)는 가장 강한 강조 + DM은 두 번째 강조
  const bgFill = role === 'EB' ? '#EFF6FF' : (role === 'DM' ? '#F0F9FF' : '#FFFFFF');
  svg.appendChild(el('rect', {
    x, y, width: NODE_W, height: NODE_H,
    rx: 6, ry: 6,
    fill: bgFill,
    stroke: toneColor,
    'stroke-width': emphasis,
  }));

  // 좌측 컬러 바 (DMU 역할) — EB가 가장 두꺼움
  const barW = role === 'EB' ? 11 : (role === 'DM' ? 8 : 6);
  svg.appendChild(el('rect', {
    x, y, width: barW, height: NODE_H,
    fill: roleColor, rx: 3, ry: 3,
  }));

  // 역할 풀네임 라벨 (카드 상단, 색상 = 역할 색)
  if (role) {
    const roleLabel = ROLE_LABELS[role] || role;
    svg.appendChild(text(x + 14, y + 16, roleLabel, {
      'font-size': 10, 'font-weight': 700, fill: roleColor, 'letter-spacing': 0.3,
    }));
  }

  // 우호도 표시 (우상단)
  svg.appendChild(text(x + NODE_W - 8, y + 18, TONE_LABELS[tone] || '⚫', {
    'font-size': 12, 'text-anchor': 'end',
  }));

  // 이름
  svg.appendChild(text(x + 14, y + 38, truncate(p.name || p.id, 22), {
    'font-size': 13, 'font-weight': 700, fill: '#1F2937',
  }));
  // 직책
  svg.appendChild(text(x + 14, y + 53, truncate(p.title || '', 26), {
    'font-size': 10.5, fill: '#4B5563',
  }));
  // 부서
  if (p.dept) {
    svg.appendChild(text(x + 14, y + 66, truncate(p.dept, 28), {
      'font-size': 9.5, fill: '#9CA3AF', 'font-style': 'italic',
    }));
  }

  // 호버 툴팁
  const titleEl = el('title', {});
  titleEl.textContent = describePerson(p);
  svg.lastChild.appendChild?.(titleEl);
}

function describePerson(p) {
  const parts = [p.name || p.id];
  if (p.title) parts.push(p.title);
  if (p.dept) parts.push(p.dept);
  if (p.dmu_role) parts.push(`[${ROLE_LABELS[p.dmu_role] || p.dmu_role}]`);
  if (p.tone) parts.push(`tone: ${p.tone}`);
  if (p.notes) parts.push(`(${p.notes})`);
  return parts.join(' · ');
}

// ──────────────────────────────────────────────────────────────
// 6) 보고선
// ──────────────────────────────────────────────────────────────
function drawReportingLine(svg, r, positions) {
  const m = positions.get(r.manager);
  const c = positions.get(r.report);
  if (!m || !c) return;
  const mCenterX = m.x + NODE_W / 2;
  const mBottomY = m.y + NODE_H;
  const cCenterX = c.x + NODE_W / 2;
  const cTopY = c.y;
  const busY = (mBottomY + cTopY) / 2;

  // 매니저 → bus
  svg.appendChild(el('line', {
    x1: mCenterX, y1: mBottomY, x2: mCenterX, y2: busY,
    stroke: '#94A3B8', 'stroke-width': 1.5,
  }));
  // bus 가로
  if (Math.abs(mCenterX - cCenterX) > 1) {
    svg.appendChild(el('line', {
      x1: mCenterX, y1: busY, x2: cCenterX, y2: busY,
      stroke: '#94A3B8', 'stroke-width': 1.5,
    }));
  }
  // bus → 자녀
  svg.appendChild(el('line', {
    x1: cCenterX, y1: busY, x2: cCenterX, y2: cTopY,
    stroke: '#94A3B8', 'stroke-width': 1.5,
  }));
}

// ──────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────
function drawEmptyState(svg) {
  svg.setAttribute('viewBox', '0 0 800 400');
  svg.appendChild(text(400, 200, '인물 정보가 없습니다 — 미팅 노트를 입력하세요', {
    'font-size': 14, fill: '#9CA3AF', 'text-anchor': 'middle',
  }));
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function el(tag, attrs = {}) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v);
  }
  return e;
}
function text(x, y, content, attrs = {}) {
  const t = el('text', { x, y, ...attrs });
  t.textContent = content;
  return t;
}

export { ROLE_COLORS, TONE_COLORS };
