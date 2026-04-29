// 의사결정 영향맵 SVG 렌더러
//
// 입력: { people, influences, client_id, company }
// - 중앙 점선원: 자사(영업담당) + 고객사 핵심 buying committee (EB/DM/CH 위주)
// - 외부 영향: 본사/경쟁/컨설팅/SI/도입사례/규제/파트너 카테고리별 방사형 배치
// - 라인 톤: positive(실선) / uncertain(점선) / tense(톱니선) / negative(빨강)

const STANDARD_CATEGORIES = ['본사', '경쟁사', '컨설팅', '파트너', '도입사례', '규제'];

const CENTER_W = 540;     // 중앙 buying committee 박스 — 인물 중첩 방지를 위해 충분히 크게
const CENTER_H = 360;
const SYSTEM_R = 380;     // 외부 영향 노드 배치 반경
const SYSTEM_NODE_R = 44;
const PERSON_W = 130;     // 인물 카드 너비 (Economic Buyer 등 풀명 수용)
const PERSON_H = 48;
const CANVAS_W = 1180;
const CANVAS_H = 880;
const CLIENT_OFFSET_X = 100;  // 자사 인물은 박스 외부 좌측 여백

const ROLE_COLORS = {
  EB: '#1E40AF', DM: '#0E7490', CH: '#059669', TB: '#F59E0B',
  UB: '#7C3AED', CO: '#0891B2', GK: '#6B7280', BL: '#DC2626',
};
const ROLE_LABELS = {
  EB: 'Economic Buyer', DM: 'Decision Maker', CH: 'Champion',
  TB: 'Technical Buyer', UB: 'User Buyer', CO: 'Coach',
  GK: 'Gatekeeper', BL: 'Blocker',
};
// EB(최종 결정권자) 가장 굵게, DM 두 번째
const ROLE_EMPHASIS = { EB: 4, DM: 2.8, default: 1.8 };

const TONE_COLORS = {
  positive: '#059669', uncertain: '#9CA3AF', tense: '#DC2626',
  negative: '#DC2626', neutral: '#9CA3AF',
};

export function renderInfluenceMap(svg, data) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  defineMarkers(svg);

  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;

  // 1) 중앙 박스 — 자사 + 고객사 buying committee 영역 (조직 계층 보존을 위해 직사각형 사용)
  svg.appendChild(el('rect', {
    x: cx - CENTER_W / 2, y: cy - CENTER_H / 2,
    width: CENTER_W, height: CENTER_H,
    rx: 14, ry: 14,
    fill: '#FAFBFC', stroke: '#94A3B8', 'stroke-width': 2, 'stroke-dasharray': '7 5',
  }));

  // 회사명 (중앙 박스 상단 외부)
  if (data.company?.name) {
    svg.appendChild(text(cx, cy - CENTER_H / 2 - 14, `🏢 ${data.company.name}`, {
      'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle', fill: '#1F2937',
    }));
  }
  // "Buying Committee" 라벨 (좌상단)
  svg.appendChild(text(cx - CENTER_W / 2 + 12, cy - CENTER_H / 2 + 16,
    'BUYING COMMITTEE  ·  Decision Map', {
    'font-size': 9, 'font-weight': 700, fill: '#6B7280', 'letter-spacing': 1.5,
  }));

  // 2) 관여 인물 식별 — 영향선에 등장하거나 핵심 MEDDIC 역할이 있는 사람만
  const peopleById = new Map((data.people || []).map(p => [p.id, p]));
  const clientPerson = (data.people || []).find(p => p.is_client || p.id === data.client_id);
  const meddic = data.meddic || {};

  const involvedIds = new Set();
  // 영향선에 linked_to로 등장한 모든 인물
  (data.influences || []).forEach(inf => {
    (inf.linked_to || []).forEach(id => involvedIds.add(id));
  });
  // MEDDIC 핵심 역할
  (data.people || []).forEach(p => {
    if (['EB', 'DM', 'CH', 'BL'].includes(p.dmu_role)) involvedIds.add(p.id);
  });
  // MEDDIC에서 명시한 EB/Champion
  if (meddic.economic_buyer) involvedIds.add(meddic.economic_buyer);
  if (meddic.champion) involvedIds.add(meddic.champion);

  const involvedPeople = (data.people || []).filter(p =>
    !p.is_client && involvedIds.has(p.id));

  // 3) 조직 계층 위치 계산 — 박스 안에는 고객사만, 자사는 박스 외부 좌측
  const layoutOpts = {
    cx, cy,
    boxLeft: cx - CENTER_W / 2 + 24,   // 박스 전체 너비를 고객사 인물에 사용
    boxRight: cx + CENTER_W / 2 - 24,
    boxTop: cy - CENTER_H / 2 + 44,
    boxBottom: cy + CENTER_H / 2 - 20,
  };
  const centerPeople = layoutCenterByHierarchy(
    involvedPeople, data.reportings || [], clientPerson, layoutOpts,
    (data.people || []).filter(p => p.org !== 'us')
  );

  // 자사(영업담당) 외부 라벨 — "Sales (us)"
  if (clientPerson) {
    const cp = centerPeople.find(c => c.person.id === clientPerson.id);
    if (cp) {
      // 박스 좌측 외부 → 박스 좌측 가장자리로 점선 연결 라인
      svg.appendChild(el('line', {
        x1: cp.x + PERSON_W / 2, y1: cp.y,
        x2: cx - CENTER_W / 2, y2: cp.y,
        stroke: '#1E40AF', 'stroke-width': 1.5, 'stroke-dasharray': '4 3',
      }));
    }
  }

  // 4) 중앙 박스 안의 보고 라인 (mini org chart) — 노드 아래 깔리도록 먼저 그리기
  const involvedSet = new Set(involvedPeople.map(p => p.id));
  const centerReportings = (data.reportings || []).filter(r =>
    involvedSet.has(r.manager) && involvedSet.has(r.report));
  for (const r of centerReportings) {
    drawMiniReporting(svg, r, centerPeople);
  }

  // 5) 외부 영향 라인
  const influences = [...(data.influences || [])];

  // 균등 각도 외부 배치
  const N = Math.max(influences.length, 1);
  influences.forEach((sys, i) => {
    const theta = -Math.PI / 2 + (i / N) * 2 * Math.PI;
    sys._x = cx + Math.cos(theta) * SYSTEM_R;
    sys._y = cy + Math.sin(theta) * SYSTEM_R;
  });

  for (const sys of influences) {
    const targets = (sys.linked_to && sys.linked_to.length)
      ? sys.linked_to.map(id => centerPeople.find(c => c.person.id === id)).filter(Boolean)
      : [{ x: cx, y: cy, person: null }];
    for (const t of targets) {
      drawInfluenceLine(svg, t.x, t.y, sys._x, sys._y, sys);
    }
  }

  // 5) 외부 노드
  for (const sys of influences) {
    drawSystemNode(svg, sys);
  }

  // 6) 중앙 인물 노드
  for (const cp of centerPeople) {
    drawCenterPerson(svg, cp.person, cp.x, cp.y);
  }
}

// ──────────────────────────────────────────────────────────────
// 중앙 박스 — 조직 계층 기반 인물 배치 (자사 좌측, 고객사 우측 계층)
// ──────────────────────────────────────────────────────────────
function layoutCenterByHierarchy(involved, reportings, clientPerson, opts, allPeople = []) {
  const { boxLeft, boxRight, boxTop, boxBottom, cx, cy } = opts;
  const positions = [];

  // 자사(영업담당) — 박스 외부 좌측에 별도 위치
  if (clientPerson) {
    positions.push({
      person: clientPerson,
      x: cx - CENTER_W / 2 - CLIENT_OFFSET_X,
      y: cy,
    });
  }

  if (involved.length === 0) return positions;

  // 전체 조직 보고 라인으로 레벨 산출 (involved에 없는 중간 매니저 정보까지 활용)
  // → 오변호사(법무) 같은 인물이 부모(CFO 박상무)가 missing이어도 정확한 레벨에 배치됨
  const allById = new Map((allPeople.length ? allPeople : involved).map(p => [p.id, p]));
  const allReps = reportings.filter(r => allById.has(r.manager) && allById.has(r.report));
  const isReportFull = new Set(allReps.map(r => r.report));
  const fullLevels = new Map();
  for (const p of allById.values()) {
    if (!isReportFull.has(p.id)) fullLevels.set(p.id, 0);
  }
  let changed = true, iter = 0;
  while (changed && iter < 50) {
    iter++; changed = false;
    for (const r of allReps) {
      const ml = fullLevels.get(r.manager);
      const cl = fullLevels.get(r.report);
      if (ml !== undefined && cl === undefined) { fullLevels.set(r.report, ml + 1); changed = true; }
      else if (cl !== undefined && ml === undefined) { fullLevels.set(r.manager, cl - 1); changed = true; }
    }
  }
  for (const p of allById.values()) if (!fullLevels.has(p.id)) fullLevels.set(p.id, 0);
  const minLvl = Math.min(...[...fullLevels.values()]);
  for (const [k, v] of fullLevels) fullLevels.set(k, v - minLvl);

  // involved 인물의 레벨만 추출 (전체 레벨 기준)
  const levels = new Map();
  involved.forEach(p => levels.set(p.id, fullLevels.get(p.id) ?? 0));
  // involved 안에서 사용된 레벨 정규화 (빈 레벨 제거하지 않고 그대로 유지)

  // 레벨별 그룹
  const byLvl = new Map();
  for (const p of involved) {
    const l = levels.get(p.id);
    if (!byLvl.has(l)) byLvl.set(l, []);
    byLvl.get(l).push(p);
  }
  const sortedLvls = [...byLvl.keys()].sort((a, b) => a - b);

  // 각 레벨별로 균등 분배 (그리드 기반)
  // 모든 행 중 최대 인원수에 맞춰 컬럼 너비 계산 → 균등 정렬
  const maxN = Math.max(...sortedLvls.map(l => byLvl.get(l).length));
  const rowH = (boxBottom - boxTop) / Math.max(1, sortedLvls.length);
  const availW = boxRight - boxLeft;
  const colW = availW / maxN;

  // 부모 X 중심 + 역할 우선순위로 정렬 (전체 보고라인 사용)
  const fullParentOf = (id) => allReps.find(r => r.report === id)?.manager || null;

  for (let li = 0; li < sortedLvls.length; li++) {
    const lvl = sortedLvls[li];
    const peopleInLvl = byLvl.get(lvl).slice();
    peopleInLvl.sort((a, b) => {
      const pa = fullParentOf(a.id), pb = fullParentOf(b.id);
      if (pa !== pb) return String(pa || '').localeCompare(String(pb || ''));
      const order = { EB: 0, DM: 1, CH: 2, BL: 3, TB: 4, UB: 5, CO: 6, GK: 7 };
      return (order[a.dmu_role] ?? 9) - (order[b.dmu_role] ?? 9);
    });
    const n = peopleInLvl.length;
    // 행 안에서 균등 분배: maxN 그리드 기준 가운데 정렬
    const offset = (maxN - n) / 2;
    const y = boxTop + (li + 0.5) * rowH;
    peopleInLvl.forEach((p, i) => {
      const colIdx = offset + i;
      const x = boxLeft + (colIdx + 0.5) * colW;
      positions.push({ person: p, x, y });
    });
  }

  return positions;
}

// 중앙 박스 내부의 미니 보고선
function drawMiniReporting(svg, r, centerPeople) {
  const m = centerPeople.find(c => c.person.id === r.manager);
  const c = centerPeople.find(cp => cp.person.id === r.report);
  if (!m || !c) return;
  // 매니저 하단 → 자녀 상단으로 ㄱ자 라인
  const mBot = m.y + PERSON_H / 2;
  const cTop = c.y - PERSON_H / 2;
  const busY = (mBot + cTop) / 2;
  svg.appendChild(el('line', { x1: m.x, y1: mBot, x2: m.x, y2: busY,
    stroke: '#CBD5E1', 'stroke-width': 1.2 }));
  if (Math.abs(m.x - c.x) > 1) {
    svg.appendChild(el('line', { x1: m.x, y1: busY, x2: c.x, y2: busY,
      stroke: '#CBD5E1', 'stroke-width': 1.2 }));
  }
  svg.appendChild(el('line', { x1: c.x, y1: busY, x2: c.x, y2: cTop,
    stroke: '#CBD5E1', 'stroke-width': 1.2 }));
}

// ──────────────────────────────────────────────────────────────
// 중앙 인물 (작은 카드)
// ──────────────────────────────────────────────────────────────
function drawCenterPerson(svg, p, cx, cy) {
  const isClient = !!p.is_client;
  const role = p.dmu_role || '';
  const roleColor = ROLE_COLORS[role] || '#9CA3AF';
  const stroke = isClient ? '#1E40AF' : roleColor;
  const fill = isClient ? '#DBEAFE' : (role === 'DM' ? '#F0F9FF' : '#FFFFFF');
  const sw = isClient ? 3 : (ROLE_EMPHASIS[role] || ROLE_EMPHASIS.default);

  svg.appendChild(el('rect', {
    x: cx - PERSON_W / 2, y: cy - PERSON_H / 2,
    width: PERSON_W, height: PERSON_H, rx: 5, ry: 5,
    fill, stroke, 'stroke-width': sw,
  }));

  // 역할 풀네임 라벨 — 카드 위에 색상으로 표기
  if (role && !isClient) {
    svg.appendChild(text(cx, cy - PERSON_H / 2 - 4, ROLE_LABELS[role] || role, {
      'font-size': 9, 'font-weight': 700, 'text-anchor': 'middle',
      fill: roleColor, 'letter-spacing': 0.3,
    }));
  } else if (isClient) {
    svg.appendChild(text(cx, cy - PERSON_H / 2 - 4, '— Sales (us) —', {
      'font-size': 9, 'font-weight': 700, 'text-anchor': 'middle',
      fill: '#1E40AF', 'letter-spacing': 0.3,
    }));
  }

  // 이름 (중앙)
  svg.appendChild(text(cx, cy + 2, truncate(p.name || p.id, 12), {
    'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'middle',
    fill: isClient ? '#1E40AF' : '#1F2937',
  }));
  // 직책
  if (p.title) {
    svg.appendChild(text(cx, cy + PERSON_H / 2 + 12, truncate(p.title, 16), {
      'font-size': 9, 'text-anchor': 'middle', fill: '#6B7280',
    }));
  }

  const titleEl = el('title', {});
  titleEl.textContent = `${p.name || p.id} · ${p.title || ''} · ${ROLE_LABELS[role] || role || ''}`;
  svg.lastChild.appendChild?.(titleEl);
}

// ──────────────────────────────────────────────────────────────
// 외부 영향 노드
// ──────────────────────────────────────────────────────────────
function drawSystemNode(svg, sys) {
  const cat = sys.category || '기타';
  const fillByCategory = {
    '본사': '#DBEAFE', '경쟁사': '#FEE2E2', '컨설팅': '#FEF3C7',
    '파트너': '#D1FAE5', '도입사례': '#E0E7FF', '규제': '#FEE2E2',
  };
  const strokeByCategory = {
    '본사': '#1E40AF', '경쟁사': '#DC2626', '컨설팅': '#F59E0B',
    '파트너': '#059669', '도입사례': '#7C3AED', '규제': '#DC2626',
  };

  const fill = fillByCategory[cat] || '#F3F4F6';
  const stroke = strokeByCategory[cat] || '#9CA3AF';

  const c = el('circle', {
    cx: sys._x, cy: sys._y, r: SYSTEM_NODE_R,
    fill, stroke, 'stroke-width': 2,
  });
  svg.appendChild(c);

  // 라벨 (멀티라인)
  const lines = String(sys.label || sys.category || '').split('\n');
  const lineH = 12;
  const startY = sys._y - ((lines.length - 1) * lineH) / 2 + 2;
  lines.forEach((ln, i) => {
    svg.appendChild(text(sys._x, startY + i * lineH, truncate(ln, 12), {
      'font-size': 10.5, 'text-anchor': 'middle',
      fill: '#1F2937', 'font-weight': 600,
    }));
  });
  // 카테고리
  svg.appendChild(text(sys._x, sys._y + SYSTEM_NODE_R + 12, `[${cat}]`, {
    'font-size': 9, 'text-anchor': 'middle', fill: '#6B7280',
  }));

  const titleEl = el('title', {});
  titleEl.textContent = `${sys.label || sys.category} · ${sys.tone || ''} ${sys.notes ? '— ' + sys.notes : ''}`;
  c.appendChild(titleEl);
}

// ──────────────────────────────────────────────────────────────
// 영향선 (positive/uncertain/tense/negative)
// ──────────────────────────────────────────────────────────────
function drawInfluenceLine(svg, x1, y1, x2, y2, sys) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const ux = dx / dist, uy = dy / dist;
  const startOffset = 25;
  const endOffset = SYSTEM_NODE_R + 2;
  const sx = x1 + ux * startOffset;
  const sy = y1 + uy * startOffset;
  const ex = x2 - ux * endOffset;
  const ey = y2 - uy * endOffset;

  const sw = Math.max(1, sys.strength || 2);
  const color = TONE_COLORS[sys.tone] || '#9CA3AF';

  let lineEl;
  if (sys.tone === 'tense') {
    lineEl = drawSawtooth(sx, sy, ex, ey, color, sw);
  } else {
    const dash = sys.tone === 'uncertain' ? '6 4' : null;
    lineEl = el('line', {
      x1: sx, y1: sy, x2: ex, y2: ey,
      stroke: color, 'stroke-width': sw,
      ...(dash && { 'stroke-dasharray': dash }),
    });
  }
  // 화살표
  if (sys.direction === 'out' || sys.direction === 'bi') lineEl.setAttribute('marker-end', 'url(#arrow-out)');
  if (sys.direction === 'in' || sys.direction === 'bi') lineEl.setAttribute('marker-start', 'url(#arrow-in)');
  svg.appendChild(lineEl);
}

function drawSawtooth(x1, y1, x2, y2, color, sw) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': sw });
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const step = 8;
  const tickHalf = 5;
  let d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `;
  for (let s = step; s < len - 2; s += step) {
    const px = x1 + ux * s, py = y1 + uy * s;
    const ax = px + nx * tickHalf, ay = py + ny * tickHalf;
    const bx = px - nx * tickHalf, by = py - ny * tickHalf;
    d += `M ${ax.toFixed(2)} ${ay.toFixed(2)} L ${bx.toFixed(2)} ${by.toFixed(2)} `;
  }
  return el('path', { d, stroke: color, 'stroke-width': sw, fill: 'none' });
}

function defineMarkers(svg) {
  const defs = el('defs', {});
  defs.innerHTML = `
    <marker id="arrow-out" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#444"/>
    </marker>
    <marker id="arrow-in" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M10,0 L0,5 L10,10 z" fill="#444"/>
    </marker>
  `;
  svg.appendChild(defs);
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

export { STANDARD_CATEGORIES };
