---
name: okr
description: Check OKR progress and update initiatives. Use when the user asks about OKR status, progress, or wants to update completed items.
user-invocable: true
argument-hint: "[check|update|next]"
allowed-tools: Read, Edit, Grep, Glob
---

# /okr - OKR 진행 현황 관리

## 사용법
- `/okr` 또는 `/okr check` — 현재 OKR 진행 현황 요약
- `/okr update` — 최근 작업 기반으로 Initiative 완료 표시 업데이트
- `/okr next` — 다음 우선순위 작업 추천

## check: 현황 확인

1. `OKR.md` 파일 읽기
2. 각 Objective별로:
   - Key Result 현재 상태 (추정치)
   - 완료/미완료 Initiative 수
   - 진행률 (%)
3. 한국어로 간결하게 보고:

```
## OKR 현황 (2026-02-14)

### O1: 피드백 생태계
- KR1.1 성장센터 50건/월: 현재 ~10건 (20%)
- KR1.2 미슐랭 30%: 현재 ~10% (33%)
- KR1.3 코멘트 3개/프로젝트: 현재 ~1개 (33%)
- Initiative: 2/5 완료

### O2: AI 기회 발견
...
```

## update: Initiative 업데이트

1. `OKR.md` 읽기
2. 최근 git log에서 완료된 작업 확인:
   ```bash
   git log --oneline -10
   ```
3. 관련 Initiative에 `[x]` 표시 + 날짜 + 설명 추가
4. 진행 상황 추적 테이블 업데이트
5. 변경 사항을 사용자에게 보여주고 확인 후 저장

## next: 다음 작업 추천

1. 미완료 Initiative 중 OKR 달성에 가장 임팩트가 큰 것 선별
2. 우선순위 기준:
   - KR 달성률이 가장 낮은 Objective의 Initiative 우선
   - 구현 난이도 대비 임팩트가 큰 것 우선
   - 의존성이 없는 독립 작업 우선
3. 추천 결과:
   ```
   ## 추천 다음 작업

   1. [O1] 미슐랭 평점 작성 UI 간소화
      - 이유: KR1.2 달성률이 33%로 가장 낮음
      - 임팩트: 평점 작성 허들 낮춰 참여율 증가
      - 예상 범위: MichelinRating.tsx 수정

   2. [O2] 크롤링 헬스 모니터링
      - 이유: KR2.1 측정 자체가 불가 (모니터링 없음)
      ...
   ```

## 관련 파일
- OKR 문서: `OKR.md`
- 프로젝트 지침: `CLAUDE.md`
