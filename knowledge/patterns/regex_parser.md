# KI: VANGUARD Regex Order Parser (v0.1)

## 📌 개요
점주가 입력한 자유 형식의 텍스트에서 품목(Name)과 수량(Quantity)을 추출하기 위한 결정론적(Deterministic) 파싱 패턴입니다. 

## 🧠 파싱 로직 (Pattern)
현재 VANGUARD 엔진은 두 가지 주요 패턴을 순차적으로 확인합니다.

### 1. [품목] [수량] 패턴 (예: "고기 5kg")
- **Regex:** `/^(.+?)\s+(\d+\s*\w*)$/`
- **설명:** 문자열 앞부분을 품목으로, 숫자로 시작하는 뒷부분을 수량으로 인식합니다.

### 2. [수량] [품목] 패턴 (예: "10팩 우유")
- **Regex:** `/^(\d+\s*\w*)\s+(.+?)$/`
- **설명:** 숫자로 시작하는 앞부분을 수량으로, 뒷부분을 품목으로 인식합니다.

### 3. Fallback (낙관적 매칭)
- 매칭되지 않는 텍스트는 전체를 품목명으로 간주하고 수량을 "1"로 기본 설정합니다.

## 🛠 코드 구현 (TypeScript)
```typescript
const match = line.trim().match(/^(.+?)\s+(\d+\s*\w*)$/) || line.trim().match(/^(\d+\s*\w*)\s+(.+?)$/);

if (match) {
  const name = match[1].match(/^\d/) ? match[2] : match[1];
  const qty = match[1].match(/^\d/) ? match[1] : match[2];
  return { name, quantity: qty };
}
```

## ⚠️ 한계점 및 리스크
- **단위 미기재:** "고기 한 박스"와 같은 한글 단위 표현은 현재 숫자 기반 Regex에서 누락될 수 있습니다.
- **다중 품목:** 한 줄에 여러 품목을 적는 경우(예: "고기 5kg와 야채") 오인식 가능성이 큽니다.
- **오타 대응:** "고기5kg" (공백 없음) 패턴은 현재 지원하지 않습니다.

## 🚀 향후 발전 계획 (AI Hybrid)
- **Phase 2:** Regex로 실패한 경우에 한해 LLM(Gemini) API를 호출하여 자연어 기반 보정(Reasoning)을 수행하는 하이브리드 인텔리전스 도입 예정.

---
**기록자:** 코디 개발부장
**날짜:** 2026-04-08
**상태:** Phase 0.1 검증 완료
