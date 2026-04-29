// PPT 내보내기 — 분석된 데이터를 편집 가능한 PowerPoint로 변환
// pptxgenjs는 index.html에서 CDN으로 로드되어 window.PptxGenJS로 사용 가능

// 색상 팔레트 (renderer와 동일)
const ROLE_COLORS = {
  EB: '1E40AF', DM: '0E7490', CH: '059669', TB: 'F59E0B',
  UB: '7C3AED', CO: '0891B2', GK: '6B7280', BL: 'DC2626',
};
const ROLE_LABELS = {
  EB: 'Economic Buyer', DM: 'Decision Maker', CH: 'Champion',
  TB: 'Technical Buyer', UB: 'User Buyer', CO: 'Coach',
  GK: 'Gatekeeper', BL: 'Blocker',
};
const TONE_COLORS = {
  positive: '059669', neutral: '9CA3AF', caution: 'F59E0B',
  negative: 'DC2626', unknown: 'CBD5E1',
};
const TONE_LABEL_KO = {
  positive: '🟢 우호', neutral: '⚪ 중립', caution: '🟡 신중',
  negative: '🔴 적대', unknown: '⚫ 미상',
};

// MEDDIC 핵심 역할 (영향맵 표시 대상)
const CORE_ROLES = new Set(['EB', 'DM', 'CH', 'BL']);

const FONT = 'Malgun Gothic';

export async function exportToPPT(data) {
  if (typeof PptxGenJS === 'undefined') {
    throw new Error('PPT 라이브러리가 로딩 중입니다. 잠시 후 다시 시도해주세요.');
  }
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';   // 13.33 x 7.5 inches
  pres.title = `${data.company?.name || 'B2B'} 의사결정 맵`;
  pres.author = 'B2B Decision Map Tool';

  buildTitleSlide(pres, data);
  buildOrgChartSlide(pres, data);
  buildInfluenceMapSlide(pres, data);
  buildMeddicSlide(pres, data);

  const fname = `${data.company?.name || 'B2B'}_의사결정맵_${dateStr()}.pptx`;
  await pres.writeFile({ fileName: fname });
  return fname;
}

// ──────────────────────────────────────────────────────────────
// Slide 1 — Title
// ──────────────────────────────────────────────────────────────
function buildTitleSlide(pres, data) {
  const s = pres.addSlide();
  s.background = { color: '1E40AF' };

  // 좌측 강조 바
  s.addShape('rect', { x: 0, y: 0, w: 0.3, h: 7.5,
    fill: { color: 'F59E0B' }, line: { color: 'F59E0B', width: 0 } });

  s.addText('B2B SALES DECISION MAP', {
    x: 0.7, y: 1.3, w: 11, h: 0.4,
    fontFace: FONT, fontSize: 12, color: 'C7D2FE', bold: true, charSpacing: 6,
  });

  s.addText(data.company?.name || '고객사 의사결정 맵', {
    x: 0.7, y: 2.0, w: 12, h: 1.0,
    fontFace: FONT, fontSize: 48, bold: true, color: 'FFFFFF',
  });

  if (data.company?.industry || data.company?.size) {
    s.addText([data.company?.industry, data.company?.size].filter(Boolean).join('  ·  '), {
      x: 0.7, y: 3.1, w: 12, h: 0.5,
      fontFace: FONT, fontSize: 18, color: 'FCD34D',
    });
  }

  if (data.company?.stage) {
    s.addText(`📊 영업 단계: ${data.company.stage}`, {
      x: 0.7, y: 4.0, w: 12, h: 0.4,
      fontFace: FONT, fontSize: 14, color: 'E0E7FF',
    });
  }

  // 자사 영업담당
  const me = (data.people || []).find(p => p.is_client);
  if (me) {
    s.addText(`👤 영업담당: ${me.name}`, {
      x: 0.7, y: 4.5, w: 12, h: 0.4,
      fontFace: FONT, fontSize: 14, color: 'E0E7FF',
    });
  }

  // 하단
  s.addText(`생성일: ${dateStr()}  ·  Built with B2B Decision Map Tool`, {
    x: 0.7, y: 6.7, w: 12, h: 0.4,
    fontFace: FONT, fontSize: 10, color: '93C5FD',
  });
}

// ──────────────────────────────────────────────────────────────
// Slide 2 — 조직구조도
// ──────────────────────────────────────────────────────────────
function buildOrgChartSlide(pres, data) {
  const s = pres.addSlide();

  // 헤더
  s.addText('🏢 조직구조도 (Org Chart)', {
    x: 0.4, y: 0.3, w: 12, h: 0.5,
    fontFace: FONT, fontSize: 22, bold: true, color: '1F2937',
  });
  if (data.company?.name) {
    s.addText(`${data.company.name}` + (data.company.industry ? `  ·  ${data.company.industry}` : ''), {
      x: 0.4, y: 0.85, w: 12, h: 0.3,
      fontFace: FONT, fontSize: 12, color: '6B7280',
    });
  }

  // 인물·계층
  const themPeople = (data.people || []).filter(p => p.org !== 'us');
  if (themPeople.length === 0) {
    s.addText('(인물 정보 없음)', { x: 0.5, y: 3.5, w: 12, h: 0.5,
      fontFace: FONT, fontSize: 14, color: '9CA3AF', align: 'center' });
    return;
  }
  const reportings = (data.reportings || []).filter(r =>
    themPeople.some(p => p.id === r.manager) && themPeople.some(p => p.id === r.report));

  const positions = computeOrgLayout(themPeople, reportings, {
    boxLeft: 0.4, boxRight: 12.93, boxTop: 1.4, boxBottom: 6.9,
    cardW: 1.7, cardH: 0.85,
  });

  // 보고선 먼저
  for (const r of reportings) {
    drawReportingLine(s, r, positions);
  }
  // 인물 카드
  for (const pos of positions) {
    drawPersonCardPPT(s, pos, 1.7, 0.85);
  }

  // 푸터 범례
  s.addText('범례: ▌좌측 컬러 = DMU 역할  ·  ▔테두리 굵기 = 결정권 (EB > DM)  ·  배경색 = EB/DM 강조', {
    x: 0.4, y: 7.05, w: 12.5, h: 0.3,
    fontFace: FONT, fontSize: 9, color: '9CA3AF', italic: true,
  });
}

// ──────────────────────────────────────────────────────────────
// Slide 3 — 의사결정 영향맵
// ──────────────────────────────────────────────────────────────
function buildInfluenceMapSlide(pres, data) {
  const s = pres.addSlide();

  s.addText('🌐 의사결정 영향맵 (Influence Map)', {
    x: 0.4, y: 0.3, w: 12, h: 0.5,
    fontFace: FONT, fontSize: 22, bold: true, color: '1F2937',
  });

  // 중앙 박스 좌표 (인치)
  const boxX = 3.0, boxY = 1.5, boxW = 7.3, boxH = 4.5;
  // 박스
  s.addShape('roundRect', {
    x: boxX, y: boxY, w: boxW, h: boxH, rectRadius: 0.15,
    fill: { color: 'FAFBFC' },
    line: { color: '94A3B8', width: 1.5, dashType: 'dash' },
  });
  // 박스 라벨
  s.addText('BUYING COMMITTEE', {
    x: boxX + 0.15, y: boxY + 0.1, w: 5, h: 0.3,
    fontFace: FONT, fontSize: 10, bold: true, color: '6B7280', charSpacing: 3,
  });
  // 회사명
  if (data.company?.name) {
    s.addText(`🏢 ${data.company.name}`, {
      x: boxX, y: boxY - 0.4, w: boxW, h: 0.3,
      fontFace: FONT, fontSize: 13, bold: true, color: '1F2937', align: 'center',
    });
  }

  // 관여 인물 식별
  const peopleById = new Map((data.people || []).map(p => [p.id, p]));
  const meddic = data.meddic || {};
  const involvedIds = new Set();
  (data.influences || []).forEach(inf => (inf.linked_to || []).forEach(id => involvedIds.add(id)));
  (data.people || []).forEach(p => { if (CORE_ROLES.has(p.dmu_role)) involvedIds.add(p.id); });
  if (meddic.economic_buyer) involvedIds.add(meddic.economic_buyer);
  if (meddic.champion) involvedIds.add(meddic.champion);
  const involvedPeople = (data.people || []).filter(p => !p.is_client && involvedIds.has(p.id));

  // 박스 안 인물 배치 (계층 기반 균등)
  const themAll = (data.people || []).filter(p => p.org !== 'us');
  const reportings = data.reportings || [];
  const cardW = 1.5, cardH = 0.7;
  const positions = computeCommitteeLayout(involvedPeople, reportings, themAll, {
    boxLeft: boxX + 0.3, boxRight: boxX + boxW - 0.3,
    boxTop: boxY + 0.55, boxBottom: boxY + boxH - 0.3,
    cardW, cardH,
  });

  // 박스 안 미니 보고선
  const involvedSet = new Set(involvedPeople.map(p => p.id));
  for (const r of reportings) {
    if (!involvedSet.has(r.manager) || !involvedSet.has(r.report)) continue;
    const m = positions.find(p => p.person.id === r.manager);
    const c = positions.find(p => p.person.id === r.report);
    if (!m || !c) continue;
    const mBot = m.y + cardH / 2;
    const cTop = c.y - cardH / 2;
    const busY = (mBot + cTop) / 2;
    s.addShape('line', { x: m.x, y: mBot, w: 0, h: busY - mBot, line: { color: 'CBD5E1', width: 1 } });
    if (Math.abs(m.x - c.x) > 0.01) {
      s.addShape('line', { x: Math.min(m.x, c.x), y: busY, w: Math.abs(m.x - c.x), h: 0, line: { color: 'CBD5E1', width: 1 } });
    }
    s.addShape('line', { x: c.x, y: busY, w: 0, h: cTop - busY, line: { color: 'CBD5E1', width: 1 } });
  }

  // 자사(영업담당) - 박스 외부 좌측
  const me = (data.people || []).find(p => p.is_client);
  if (me) {
    const mx = boxX - 1.6, my = boxY + boxH / 2;
    s.addText('— Sales (us) —', {
      x: mx - 0.05, y: my - cardH / 2 - 0.25, w: cardW + 0.1, h: 0.2,
      fontFace: FONT, fontSize: 8, bold: true, color: '1E40AF', align: 'center', charSpacing: 1,
    });
    s.addShape('roundRect', {
      x: mx, y: my - cardH / 2, w: cardW, h: cardH, rectRadius: 0.05,
      fill: { color: 'DBEAFE' },
      line: { color: '1E40AF', width: 2 },
    });
    s.addText(me.name || me.id, {
      x: mx, y: my - 0.18, w: cardW, h: 0.25,
      fontFace: FONT, fontSize: 11, bold: true, color: '1E40AF', align: 'center',
    });
    s.addText(me.title || '영업담당', {
      x: mx, y: my, w: cardW, h: 0.2,
      fontFace: FONT, fontSize: 9, color: '1E3A8A', align: 'center',
    });
    // 점선 연결: 자사 → 박스
    s.addShape('line', {
      x: mx + cardW, y: my, w: boxX - (mx + cardW), h: 0,
      line: { color: '1E40AF', width: 1.2, dashType: 'dash' },
    });
  }

  // 외부 영향 노드 (박스 주위 방사형)
  const influences = data.influences || [];
  if (influences.length > 0) {
    const cx = boxX + boxW / 2, cy = boxY + boxH / 2;
    const rOut = Math.max(boxW, boxH) / 2 + 1.3;
    influences.forEach((inf, i) => {
      const theta = -Math.PI / 2 + (i / influences.length) * 2 * Math.PI;
      const ix = cx + Math.cos(theta) * rOut;
      const iy = cy + Math.sin(theta) * rOut;
      // 라인부터
      const targets = (inf.linked_to || []).map(id =>
        positions.find(p => p.person.id === id)).filter(Boolean);
      const drawTargets = targets.length > 0 ? targets : [{ x: cx, y: cy }];
      for (const t of drawTargets) {
        drawInfluenceLinePPT(s, t.x, t.y, ix, iy, inf);
      }
      drawExternalNode(s, ix, iy, inf);
    });
  }

  // 박스 안 인물 카드
  for (const pos of positions) {
    drawPersonCardPPT(s, pos, cardW, cardH);
  }
}

// ──────────────────────────────────────────────────────────────
// Slide 4 — MEDDIC 점검표
// ──────────────────────────────────────────────────────────────
function buildMeddicSlide(pres, data) {
  const s = pres.addSlide();
  s.addText('🎯 MEDDIC Discovery 점검표', {
    x: 0.4, y: 0.3, w: 12, h: 0.5,
    fontFace: FONT, fontSize: 22, bold: true, color: '1F2937',
  });

  const meddic = data.meddic || {};
  const peopleById = new Map((data.people || []).map(p => [p.id, p]));
  const nameOf = (id) => peopleById.get(id)?.name || '미식별';

  const items = [
    { letter: 'M', name: 'Metrics', kor: '정량 가치', value: meddic.metrics, color: '1E40AF' },
    { letter: 'E', name: 'Economic Buyer', kor: '예산 결정권자',
      value: meddic.economic_buyer ? `${nameOf(meddic.economic_buyer)} (${peopleById.get(meddic.economic_buyer)?.title || ''})` : null,
      color: '0E7490' },
    { letter: 'D', name: 'Decision Criteria', kor: '의사결정 기준',
      value: Array.isArray(meddic.decision_criteria) ? meddic.decision_criteria.join(', ') : meddic.decision_criteria,
      color: 'F59E0B' },
    { letter: 'D', name: 'Decision Process', kor: '의사결정 절차', value: meddic.decision_process, color: '059669' },
    { letter: 'I', name: 'Identify Pain', kor: '핵심 페인', value: meddic.pain, color: 'DC2626' },
    { letter: 'C', name: 'Champion', kor: '사내 옹호자',
      value: meddic.champion ? `${nameOf(meddic.champion)} (${peopleById.get(meddic.champion)?.title || ''})` : null,
      color: '111827' },
  ];

  const W = 4.0, H = 1.7, GX = 0.15, GY = 0.15;
  items.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * (W + GX);
    const y = 1.2 + row * (H + GY);

    s.addShape('roundRect', {
      x, y, w: W, h: H, rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: it.value ? it.color : 'DC2626', width: 2 },
    });
    s.addShape('roundRect', {
      x: x + 0.15, y: y + 0.15, w: 0.7, h: 0.7, rectRadius: 0.1,
      fill: { color: it.color }, line: { color: it.color, width: 0 },
    });
    s.addText(it.letter, {
      x: x + 0.15, y: y + 0.15, w: 0.7, h: 0.7,
      fontFace: FONT, fontSize: 28, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle',
    });
    s.addText(it.name, {
      x: x + 0.95, y: y + 0.15, w: W - 1.05, h: 0.32,
      fontFace: FONT, fontSize: 13, bold: true, color: '1F2937',
    });
    s.addText(it.kor, {
      x: x + 0.95, y: y + 0.5, w: W - 1.05, h: 0.28,
      fontFace: FONT, fontSize: 10, color: it.color, italic: true,
    });
    if (it.value) {
      s.addText(String(it.value), {
        x: x + 0.2, y: y + 0.95, w: W - 0.4, h: 0.7,
        fontFace: FONT, fontSize: 10.5, color: '111827',
      });
    } else {
      s.addText('⚠️ 미수집 — 보강 필요', {
        x: x + 0.2, y: y + 0.95, w: W - 0.4, h: 0.7,
        fontFace: FONT, fontSize: 10.5, color: 'DC2626', italic: true,
      });
    }
  });

  s.addText('이 6요소가 모두 채워지면 딜 성공률이 통계적으로 가장 높음', {
    x: 0.5, y: 6.6, w: 12.3, h: 0.4,
    fontFace: FONT, fontSize: 11, color: '6B7280', align: 'center', italic: true,
  });
}

// ──────────────────────────────────────────────────────────────
// Org chart 레이아웃 (인치 단위)
// ──────────────────────────────────────────────────────────────
function computeOrgLayout(themPeople, reportings, opts) {
  const { boxLeft, boxRight, boxTop, boxBottom, cardW, cardH } = opts;
  // 레벨 산출
  const peopleById = new Map(themPeople.map(p => [p.id, p]));
  const isReport = new Set(reportings.map(r => r.report));
  const levels = new Map();
  for (const p of themPeople) if (!isReport.has(p.id)) levels.set(p.id, 0);
  let changed = true, iter = 0;
  while (changed && iter < 50) {
    iter++; changed = false;
    for (const r of reportings) {
      const ml = levels.get(r.manager), cl = levels.get(r.report);
      if (ml !== undefined && cl === undefined) { levels.set(r.report, ml + 1); changed = true; }
      else if (cl !== undefined && ml === undefined) { levels.set(r.manager, cl - 1); changed = true; }
    }
  }
  for (const p of themPeople) if (!levels.has(p.id)) levels.set(p.id, 0);
  const minL = Math.min(...[...levels.values()]);
  for (const [k, v] of levels) levels.set(k, v - minL);

  const byL = new Map();
  for (const p of themPeople) {
    const l = levels.get(p.id);
    if (!byL.has(l)) byL.set(l, []);
    byL.get(l).push(p);
  }
  const lvls = [...byL.keys()].sort((a, b) => a - b);
  const maxN = Math.max(...lvls.map(l => byL.get(l).length));
  const rowH = (boxBottom - boxTop) / Math.max(1, lvls.length);
  const availW = boxRight - boxLeft;
  const colW = availW / maxN;

  const positions = [];
  const parentOf = (id) => reportings.find(r => r.report === id)?.manager || null;
  for (let li = 0; li < lvls.length; li++) {
    const lvl = lvls[li];
    const peopleInLvl = byL.get(lvl).slice();
    peopleInLvl.sort((a, b) => {
      const pa = parentOf(a.id), pb = parentOf(b.id);
      if (pa !== pb) return String(pa || '').localeCompare(String(pb || ''));
      const order = { EB: 0, DM: 1, CH: 2, BL: 3, TB: 4, UB: 5, CO: 6, GK: 7 };
      return (order[a.dmu_role] ?? 9) - (order[b.dmu_role] ?? 9);
    });
    const n = peopleInLvl.length;
    const offset = (maxN - n) / 2;
    const y = boxTop + (li + 0.5) * rowH;
    peopleInLvl.forEach((p, i) => {
      const x = boxLeft + (offset + i + 0.5) * colW;
      positions.push({ person: p, x, y });
    });
  }
  return positions;
}

function computeCommitteeLayout(involved, reportings, allThem, opts) {
  const { boxLeft, boxRight, boxTop, boxBottom, cardW, cardH } = opts;
  if (involved.length === 0) return [];
  // 전체 조직 레벨 계산
  const allById = new Map(allThem.map(p => [p.id, p]));
  const allReps = reportings.filter(r => allById.has(r.manager) && allById.has(r.report));
  const isReport = new Set(allReps.map(r => r.report));
  const fullLvls = new Map();
  for (const p of allThem) if (!isReport.has(p.id)) fullLvls.set(p.id, 0);
  let changed = true, iter = 0;
  while (changed && iter < 50) {
    iter++; changed = false;
    for (const r of allReps) {
      const ml = fullLvls.get(r.manager), cl = fullLvls.get(r.report);
      if (ml !== undefined && cl === undefined) { fullLvls.set(r.report, ml + 1); changed = true; }
      else if (cl !== undefined && ml === undefined) { fullLvls.set(r.manager, cl - 1); changed = true; }
    }
  }
  for (const p of allThem) if (!fullLvls.has(p.id)) fullLvls.set(p.id, 0);
  const minL = Math.min(...[...fullLvls.values()]);
  for (const [k, v] of fullLvls) fullLvls.set(k, v - minL);

  const levels = new Map();
  involved.forEach(p => levels.set(p.id, fullLvls.get(p.id) ?? 0));
  const byL = new Map();
  for (const p of involved) {
    const l = levels.get(p.id);
    if (!byL.has(l)) byL.set(l, []);
    byL.get(l).push(p);
  }
  const lvls = [...byL.keys()].sort((a, b) => a - b);
  const maxN = Math.max(...lvls.map(l => byL.get(l).length));
  const rowH = (boxBottom - boxTop) / Math.max(1, lvls.length);
  const availW = boxRight - boxLeft;
  const colW = availW / maxN;

  const positions = [];
  const parentOf = (id) => allReps.find(r => r.report === id)?.manager || null;
  for (let li = 0; li < lvls.length; li++) {
    const lvl = lvls[li];
    const peopleInLvl = byL.get(lvl).slice();
    peopleInLvl.sort((a, b) => {
      const pa = parentOf(a.id), pb = parentOf(b.id);
      if (pa !== pb) return String(pa || '').localeCompare(String(pb || ''));
      const order = { EB: 0, DM: 1, CH: 2, BL: 3, TB: 4, UB: 5, CO: 6, GK: 7 };
      return (order[a.dmu_role] ?? 9) - (order[b.dmu_role] ?? 9);
    });
    const n = peopleInLvl.length;
    const offset = (maxN - n) / 2;
    const y = boxTop + (li + 0.5) * rowH;
    peopleInLvl.forEach((p, i) => {
      const x = boxLeft + (offset + i + 0.5) * colW;
      positions.push({ person: p, x, y });
    });
  }
  return positions;
}

// ──────────────────────────────────────────────────────────────
// 인물 카드 (슬라이드 추가)
// ──────────────────────────────────────────────────────────────
function drawPersonCardPPT(slide, pos, cardW, cardH) {
  const p = pos.person;
  const role = p.dmu_role;
  const roleColor = ROLE_COLORS[role] || '9CA3AF';
  const tone = p.tone || 'unknown';
  const toneColor = TONE_COLORS[tone] || TONE_COLORS.unknown;
  // 강조 굵기
  const emphasis = role === 'EB' ? 3 : (role === 'DM' ? 2.25 : 1.25);
  const bgFill = role === 'EB' ? 'EFF6FF' : (role === 'DM' ? 'F0F9FF' : 'FFFFFF');

  const x = pos.x - cardW / 2, y = pos.y - cardH / 2;

  // 카드 배경
  slide.addShape('roundRect', {
    x, y, w: cardW, h: cardH, rectRadius: 0.06,
    fill: { color: bgFill },
    line: { color: toneColor, width: emphasis },
  });
  // 좌측 컬러 바
  const barW = role === 'EB' ? 0.13 : (role === 'DM' ? 0.1 : 0.07);
  slide.addShape('rect', {
    x, y, w: barW, h: cardH,
    fill: { color: roleColor }, line: { color: roleColor, width: 0 },
  });
  // 역할 라벨 (상단)
  if (role) {
    slide.addText(ROLE_LABELS[role] || role, {
      x: x + barW + 0.05, y: y + 0.04, w: cardW - barW - 0.1, h: 0.18,
      fontFace: FONT, fontSize: 8, bold: true, color: roleColor, charSpacing: 0.5,
    });
  }
  // 우호도
  slide.addText(TONE_LABEL_KO[tone].split(' ')[0], {
    x: x + cardW - 0.3, y: y + 0.04, w: 0.25, h: 0.2,
    fontFace: FONT, fontSize: 9, align: 'right',
  });
  // 이름
  slide.addText(p.name || p.id, {
    x: x + barW + 0.05, y: y + 0.22, w: cardW - barW - 0.1, h: 0.28,
    fontFace: FONT, fontSize: 11.5, bold: true, color: '1F2937',
  });
  // 직책
  slide.addText(p.title || '', {
    x: x + barW + 0.05, y: y + 0.5, w: cardW - barW - 0.1, h: 0.18,
    fontFace: FONT, fontSize: 8.5, color: '4B5563',
  });
  // 부서 (작은 카드인 경우 생략)
  if (p.dept && cardH > 0.75) {
    slide.addText(p.dept, {
      x: x + barW + 0.05, y: y + 0.68, w: cardW - barW - 0.1, h: 0.16,
      fontFace: FONT, fontSize: 8, color: '9CA3AF', italic: true,
    });
  }
}

// ──────────────────────────────────────────────────────────────
// 보고선 / 영향선 / 외부 노드
// ──────────────────────────────────────────────────────────────
function drawReportingLine(slide, r, positions) {
  const m = positions.find(p => p.person.id === r.manager);
  const c = positions.find(p => p.person.id === r.report);
  if (!m || !c) return;
  const cardH = 0.85;
  const mBot = m.y + cardH / 2;
  const cTop = c.y - cardH / 2;
  const busY = (mBot + cTop) / 2;

  slide.addShape('line', { x: m.x, y: mBot, w: 0, h: busY - mBot, line: { color: '94A3B8', width: 1.2 } });
  if (Math.abs(m.x - c.x) > 0.02) {
    slide.addShape('line', { x: Math.min(m.x, c.x), y: busY, w: Math.abs(m.x - c.x), h: 0, line: { color: '94A3B8', width: 1.2 } });
  }
  slide.addShape('line', { x: c.x, y: busY, w: 0, h: cTop - busY, line: { color: '94A3B8', width: 1.2 } });
}

function drawExternalNode(slide, x, y, inf) {
  const r = 0.55;
  const fillByCat = {
    '본사': 'DBEAFE', '경쟁사': 'FEE2E2', '컨설팅': 'FEF3C7',
    '파트너': 'D1FAE5', '도입사례': 'E0E7FF', '규제': 'FEE2E2', '기타': 'F3F4F6',
  };
  const lineByCat = {
    '본사': '1E40AF', '경쟁사': 'DC2626', '컨설팅': 'F59E0B',
    '파트너': '059669', '도입사례': '7C3AED', '규제': 'DC2626', '기타': '9CA3AF',
  };
  const fill = fillByCat[inf.category] || 'F3F4F6';
  const line = lineByCat[inf.category] || '9CA3AF';

  slide.addShape('ellipse', {
    x: x - r, y: y - r, w: r * 2, h: r * 2,
    fill: { color: fill }, line: { color: line, width: 1.5 },
  });
  slide.addText(inf.label || inf.category, {
    x: x - r + 0.05, y: y - 0.18, w: r * 2 - 0.1, h: 0.4,
    fontFace: FONT, fontSize: 9, bold: true, color: '1F2937', align: 'center', valign: 'middle',
  });
  slide.addText(`[${inf.category}]`, {
    x: x - r, y: y + r + 0.04, w: r * 2, h: 0.18,
    fontFace: FONT, fontSize: 7.5, color: '6B7280', align: 'center',
  });
}

function drawInfluenceLinePPT(slide, x1, y1, x2, y2, inf) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.05) return;
  const ux = dx / dist, uy = dy / dist;
  const startOff = 0.4, endOff = 0.55;
  const sx = x1 + ux * startOff, sy = y1 + uy * startOff;
  const ex = x2 - ux * endOff, ey = y2 - uy * endOff;
  const tone = inf.tone || 'uncertain';
  const colorByTone = { positive: '059669', uncertain: '9CA3AF', tense: 'DC2626', negative: 'DC2626' };
  const color = colorByTone[tone] || '9CA3AF';
  const dash = tone === 'uncertain' ? 'dash' : 'solid';
  const w = Math.max(0.5, Math.min(2.5, (inf.strength || 2) * 0.7));

  slide.addShape('line', {
    x: Math.min(sx, ex), y: Math.min(sy, ey),
    w: ex - sx, h: ey - sy,
    line: { color, width: w, dashType: dash, beginArrowType: 'triangle', endArrowType: 'triangle' },
  });
}

// ──────────────────────────────────────────────────────────────
function dateStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
