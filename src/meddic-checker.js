// MEDDIC 6요소 + DMU 핵심 역할 누락 점검 — Discovery 가이드
//
// 점검 항목:
//   M  Metrics              — 정량 가치 수집됐나?
//   E  Economic Buyer       — 예산 결정권자 식별됐나?
//   D  Decision Criteria    — 의사결정 기준 명확한가?
//   D  Decision Process     — 의사결정 절차 + 일정 파악됐나?
//   I  Identify Pain        — 핵심 고통 정량화됐나?
//   C  Champion             — 사내 옹호자 발굴됐나?
// + 외부 정보:
//   - 경쟁사 식별
//   - Blocker 파악 + 우회 전략
//   - 본사/규제 영향 확인

export function checkMeddic(data) {
  const items = [];
  const peopleById = new Map((data.people || []).map(p => [p.id, p]));
  const meddic = data.meddic || {};

  // 1. Metrics
  if (isEmpty(meddic.metrics)) {
    items.push({
      key: 'M', kind: 'meddic', severity: 'high',
      label: 'Metrics — 정량 가치 미수집',
      message: '"불편하다"가 아닌 "월 X시간 / 연 Y원" 수준의 정량 효과 확인 필요',
    });
  }

  // 2. Economic Buyer
  if (isEmpty(meddic.economic_buyer)) {
    items.push({
      key: 'E', kind: 'meddic', severity: 'high',
      label: 'Economic Buyer — 예산 결정권자 미식별',
      message: '실제 예산을 승인할 수 있는 임원이 누구인지 명확히 확인 (보통 본부장 이상)',
    });
  } else {
    const eb = peopleById.get(meddic.economic_buyer);
    if (eb && eb.tone === 'unknown') {
      items.push({
        key: 'E', kind: 'meddic', severity: 'medium',
        label: `EB(${eb.name}) 우호도 미파악`,
        message: 'EB와 직접 미팅 또는 정보 입수 필요',
      });
    }
  }

  // 3. Decision Criteria
  if (isEmpty(meddic.decision_criteria)) {
    items.push({
      key: 'D', kind: 'meddic', severity: 'high',
      label: 'Decision Criteria — 의사결정 기준 미수집',
      message: '기능/가격/지원/도입사례 중 무엇을 기준으로 비교하는지 확인',
    });
  }

  // 4. Decision Process
  if (isEmpty(meddic.decision_process)) {
    items.push({
      key: 'D', kind: 'meddic', severity: 'high',
      label: 'Decision Process — 의사결정 절차/일정 미수집',
      message: 'RFP → 기술검토 → POC → 결재 단계와 각 일정 확인 필요',
    });
  }

  // 5. Identify Pain
  if (isEmpty(meddic.pain)) {
    items.push({
      key: 'I', kind: 'meddic', severity: 'high',
      label: 'Pain — 핵심 고통 미수집',
      message: '못 풀면 사업에 미치는 구체적 영향 (매출/비용/리스크) 정량화 필요',
    });
  }

  // 6. Champion
  if (isEmpty(meddic.champion)) {
    items.push({
      key: 'C', kind: 'meddic', severity: 'high',
      label: 'Champion — 사내 옹호자 부재',
      message: '우리 솔루션을 사내에서 적극 추진해줄 인물 발굴 필수. POC 전 발굴 권장',
    });
  } else {
    // Champion이 있어도 직책이 너무 낮으면 경고
    const ch = peopleById.get(meddic.champion);
    if (ch) {
      const lowTitleKeywords = ['사원', '대리', '주임', '인턴'];
      if (lowTitleKeywords.some(k => (ch.title || '').includes(k))) {
        items.push({
          key: 'C', kind: 'meddic', severity: 'medium',
          label: `Champion(${ch.name}) 직급 낮음`,
          message: '실무진 Champion만으로는 임원 결재 어려움. 상위 추가 Champion 필요',
        });
      }
    }
  }

  // 7. Blocker 식별 + 우회 전략
  const blockers = (data.people || []).filter(p => p.dmu_role === 'BL');
  if (blockers.length > 0) {
    blockers.forEach(b => {
      items.push({
        key: 'BL', kind: 'risk', severity: 'high',
        label: `🚨 Blocker — ${b.name}(${b.title || ''})`,
        message: `반대 입장 인물. 1:1 미팅으로 우려 청취 + 우회 전략 수립 필요. ${b.notes ? '메모: ' + b.notes : ''}`,
      });
    });
  }

  // 8. 경쟁사 식별 여부
  const competitors = (data.influences || []).filter(i => i.category === '경쟁사');
  if (competitors.length === 0) {
    items.push({
      key: 'COMP', kind: 'risk', severity: 'medium',
      label: '경쟁사 정보 미수집',
      message: '다른 벤더 검토 중인지, 경쟁 솔루션의 강점·약점 파악 필요',
    });
  }

  // 9. Tone "unknown" 인물 (특히 EB, DM)
  const criticalUnknown = (data.people || []).filter(p =>
    !p.is_client && ['EB', 'DM'].includes(p.dmu_role) && (p.tone === 'unknown' || !p.tone));
  criticalUnknown.forEach(p => {
    items.push({
      key: 'TONE', kind: 'discovery', severity: 'medium',
      label: `${p.dmu_role}(${p.name}) 우호도 미상`,
      message: `${p.title || ''} 의 우리에 대한 입장 파악 필요`,
    });
  });

  // 10. 본사 영향 (글로벌 케이스)
  const hqInfluence = (data.influences || []).find(i => i.category === '본사');
  if (hqInfluence && hqInfluence.tone === 'tense') {
    items.push({
      key: 'HQ', kind: 'risk', severity: 'medium',
      label: `🌐 본사 영향 (${hqInfluence.label})`,
      message: '본사 정책/표준이 강한 영향력 — 본사 직접 어프로치 또는 우회 전략 필요',
    });
  }

  // 11. 자녀 포함 LLM 보고 missing
  for (const m of (data.missing || [])) {
    if (m.severity === 'high' || !m.severity) {
      items.push({
        key: 'LLM', kind: 'discovery', severity: 'high',
        label: m.label || 'LLM 보고 누락',
        message: m.hint || m.message || '',
      });
    }
  }

  return dedupe(items);
}

function isEmpty(v) {
  return v === undefined || v === null || v === '' ||
    (Array.isArray(v) && v.length === 0);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(it => {
    const k = it.label + '|' + it.message;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
