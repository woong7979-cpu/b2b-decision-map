// MEDDIC 점검표 — 6요소 카드 그리드 (PPT 4번 슬라이드와 동일 형식의 웹 버전)

const MEDDIC_DEFS = [
  { letter: 'M', name: 'Metrics',          kor: '정량 가치',         color: '#1E40AF', field: 'metrics' },
  { letter: 'E', name: 'Economic Buyer',   kor: '예산 결정권자',     color: '#0E7490', field: 'economic_buyer', isPerson: true },
  { letter: 'D', name: 'Decision Criteria',kor: '의사결정 기준',     color: '#F59E0B', field: 'decision_criteria', isList: true },
  { letter: 'D', name: 'Decision Process', kor: '의사결정 절차',     color: '#059669', field: 'decision_process' },
  { letter: 'I', name: 'Identify Pain',    kor: '핵심 페인',         color: '#DC2626', field: 'pain' },
  { letter: 'C', name: 'Champion',         kor: '사내 옹호자',       color: '#111827', field: 'champion', isPerson: true },
];

export function renderMeddicGrid(container, data) {
  const meddic = data?.meddic || {};
  const peopleById = new Map((data?.people || []).map(p => [p.id, p]));

  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'meddic-grid';

  for (const def of MEDDIC_DEFS) {
    const raw = meddic[def.field];
    let value = null;
    if (def.isPerson && raw) {
      const p = peopleById.get(raw);
      value = p ? `${p.name} (${p.title || ''})` : raw;
    } else if (def.isList && Array.isArray(raw)) {
      value = raw.length ? raw.join(', ') : null;
    } else {
      value = raw || null;
    }
    const isMissing = !value;

    const card = document.createElement('div');
    card.className = 'meddic-card' + (isMissing ? ' missing' : '');
    card.style.borderColor = isMissing ? '#DC2626' : def.color;

    // Letter chip
    const chip = document.createElement('div');
    chip.className = 'meddic-letter';
    chip.style.background = def.color;
    chip.textContent = def.letter;
    card.appendChild(chip);

    // Title block
    const titleBlock = document.createElement('div');
    titleBlock.className = 'meddic-title';
    const name = document.createElement('div');
    name.className = 'meddic-name';
    name.textContent = def.name;
    const kor = document.createElement('div');
    kor.className = 'meddic-kor';
    kor.style.color = def.color;
    kor.textContent = def.kor;
    titleBlock.appendChild(name);
    titleBlock.appendChild(kor);
    card.appendChild(titleBlock);

    // Value block
    const valBlock = document.createElement('div');
    valBlock.className = 'meddic-value' + (isMissing ? ' missing' : '');
    valBlock.textContent = value || '⚠️ 미수집 — 보강 필요';
    card.appendChild(valBlock);

    grid.appendChild(card);
  }
  container.appendChild(grid);

  // 하단 메시지
  const note = document.createElement('div');
  note.className = 'meddic-note';
  const filled = MEDDIC_DEFS.filter(d => {
    const v = meddic[d.field];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;
  note.innerHTML = `<strong>${filled}/6</strong> 요소 충족 ` +
    (filled === 6
      ? '— ✅ 모든 요소 확보, 클로징 단계 추진 가능'
      : `— ${6 - filled}개 보강 시 클로징 확률 통계적 최고치`);
  container.appendChild(note);
}
