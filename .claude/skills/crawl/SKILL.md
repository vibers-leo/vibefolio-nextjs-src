---
name: crawl
description: Trigger crawling and check results. Use when the user wants to run crawlers, check crawl status, or debug crawling issues.
user-invocable: true
argument-hint: "[type: all|contest|job] [keyword]"
allowed-tools: Bash, Read, Grep, Glob, WebFetch
---

# /crawl - 크롤링 실행 및 상태 확인

## 사용법
- `/crawl` — 전체 크롤링 실행
- `/crawl contest` — 공모전만 크롤링
- `/crawl job` — 채용만 크롤링
- `/crawl status` — 최근 크롤링 결과 확인
- `/crawl debug` — 크롤링 소스 상태 점검

## 크롤링 실행 절차

### 1. 실행
크롤링 API를 호출한다:
```
curl -s -X POST "https://vibefolio.net/api/crawl" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"type": "$ARGUMENTS"}'
```

만약 로컬에서 실행하려면 (`CRON_SECRET` 없이):
```
curl -s -X POST "http://localhost:3000/api/crawl" \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'
```

### 2. 결과 분석
응답 JSON에서 다음을 확인:
- `added`: 새로 추가된 항목 수
- `updated`: 업데이트된 항목 수
- `errors`: 에러 수
- `duration`: 소요 시간

### 3. 보고
결과를 한국어로 요약 보고:
- 크롤링 소스별 성공/실패
- 추가된 항목 수 + 타입별 분류
- LLM 마감일 추출 결과 (있는 경우)
- 에러가 있으면 원인 분석

## status 명령어
`/crawl status`가 요청된 경우:
- `src/app/api/crawl/route.ts`의 최근 로그를 확인
- Vercel 대시보드 또는 로컬 로그에서 마지막 크롤링 시간 확인

## debug 명령어
`/crawl debug`가 요청된 경우:
1. 크롤러 소스 파일 확인: `src/lib/crawlers/`
2. Tavily API 키 존재 여부 확인
3. 각 소스의 최근 에러 로그 분석
4. HTML 파서들의 타겟 URL 접근 가능 여부 테스트

## 관련 파일
- 크롤러 메인: `src/lib/crawlers/crawler.ts`
- AI 크롤링: `src/lib/crawlers/search_mcp.ts`
- API 라우트: `src/app/api/crawl/route.ts`
- LLM 마감일: `src/lib/ai/extractDeadline.ts`
- 소스 목록: `src/lib/crawlers/sources.ts`
