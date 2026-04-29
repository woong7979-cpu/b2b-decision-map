# B2B 의사결정 구조도 자동 생성

미팅 노트를 입력하면 **고객사 조직구조도 + 의사결정 영향맵 + MEDDIC 점검표**를 자동 생성하는 영업 디스커버리 도구.

> 사회복지 가계도/생태도 도구의 알고리즘을 B2B 영업 현장으로 이식한 콘셉트 MVP.
> 📌 미팅 노트는 서버에 저장되지 않습니다.

---

## ✨ 기능

- 📝 **미팅 노트 입력** → Claude API로 인물·관계·MEDDIC 자동 추출
- 🏢 **조직구조도** SVG — 보고 라인 + DMU 역할 칩 + 우호도 톤
- 🌐 **의사결정 영향맵** — 자사 ↔ 고객사 + 외부 영향 (본사·경쟁·컨설팅·SI·도입사례·규제)
- 🎯 **MEDDIC 점검표** — 6요소 누락 자동 알림 + Blocker/경쟁사 위험 신호
- 🎁 **5개 가상 케이스** — 대기업/외국계/공공/스타트업/SMB 시연

---



## 🏷️ DMU 역할 (MEDDIC 기반)

| 코드 | 역할 | 설명 |
|---|---|---|
| EB | Economic Buyer | 예산 결정권자 (보통 임원/CFO) |
| DM | Decision Maker | 최종 결재 책임자 |
| CH | Champion | 사내 옹호자 (우리 편) |
| TB | Technical Buyer | 기술 평가자 (IT/보안) |
| UB | User Buyer | 실사용자 |
| CO | Coach | 정보 제공자 |
| GK | Gatekeeper | 정보 통제 (구매/법무) |
| BL | Blocker | 반대자 |

---

## 🎨 우호도 톤

| 표시 | 의미 |
|---|---|
| 🟢 positive | 우호 / 우리에게 호의적 |
| ⚪ neutral | 중립 |
| 🟡 caution | 신중 / 검토 중 |
| 🔴 negative | 적대 / 경쟁사 옹호 |
| ⚫ unknown | 정보 미상 |

---

## 🗂️ 프로젝트 구조

```
B2B_의사결정도/
├── index.html
├── styles.css
├── src/
│   ├── render-orgchart.js
│   ├── render-influencemap.js
│   ├── meddic-checker.js
│   └── sample-case.js
├── api/parse.js              # Vercel Serverless + Claude
├── package.json
├── vercel.json
└── README.md
```

---

## 🔒 보안

- API 키는 서버사이드(`api/parse.js`)에서만 사용 — 브라우저 노출 없음
- 미팅 노트는 1회 호출 후 폐기 — 자체 서버 저장 없음
- 실제 고객 정보는 익명화 후 입력 권장

---

## 📚 참고

- MEDDIC Sales Methodology
- Gartner B2B Buying Journey Research
