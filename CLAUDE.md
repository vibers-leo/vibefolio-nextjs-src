# Vibefolio - Claude Code 지침

## 프로젝트 개요
- **서비스**: Vibefolio - 크리에이터/디자이너 포트폴리오 플랫폼
- **스택**: Next.js 14 (App Router) + Supabase + TypeScript + Tailwind CSS
- **배포**: Vercel (vibefolio.net), Supabase Auth는 localStorage 기반

## 커뮤니케이션
- 한국어로 소통. 기술 용어는 영문 그대로 사용 가능
- 간결하게. 장황한 설명보다 핵심만
- 작업 완료 후 바로 git push까지 진행하라는 요청이 많음 → 빌드 확인 후 즉시 커밋/푸시

## 작업 원칙

### 1. 임팩트 우선
- 체감되는 변화가 큰 작업 위주로 진행
- 미세한 최적화(폰트 웨이트 줄이기, 번들 사이즈 소폭 개선 등)는 건드리지 않기
- "큰 차이 없다면 건드리지 말자"가 기본 마인드

### 2. 견고함 (Hardening)
- 문제가 해결되면 같은 문제가 재발하지 않도록 방어 조치 필수
- 경고 주석, 타임아웃, fallback, 로깅 등을 추가
- 디버그 로그는 `IS_DEV` 체크로 프로덕션에서 노출 방지

### 3. 불필요한 변경 금지
- 요청하지 않은 리팩토링, 코드 정리, 주석 추가 하지 않기
- 동작하는 코드는 건드리지 않기
- 새 파일 생성은 최소화, 기존 파일 수정 선호

### 4. AI/에이전트 지향
- 플랫폼 차별화를 위해 AI 기능 적극 도입 (크롤링, 추천, 자동화)
- MCP, Tavily, Claude API 등 활용에 열려 있음
- "더 나은 플랫폼으로 탈바꿈"이 장기 목표

## 기술 제약 (Critical)

### Supabase Auth = localStorage
- **절대로** `middleware.ts`에서 Supabase 인증 사용 금지
- 서버 미들웨어는 localStorage 접근 불가 → getUser()/getSession() 항상 null
- 인증/권한은 반드시 클라이언트 컴포넌트에서 처리 (AdminGuard, useAuth)
- 이 실수로 관리자 페이지가 1주일간 접근 불가했던 전례 있음 (2026-02-13)

### 관리자 인증 체계
- 이메일 화이트리스트: `src/lib/auth/admins.ts`
- AuthContext에서 `isAdmin = emailCheck || roleCheck`
- AdminGuard: 클라이언트 사이드 가드 (`src/components/admin/AdminGuard.tsx`)

## 크롤링 시스템
- 채용: Wanted API (안정적)
- 공모전: **Tavily AI 검색이 PRIMARY**, Wevity/ThinkContest HTML 파싱은 보조
- 매일 6AM UTC Vercel Cron 실행
- TAVILY_API_KEY 환경변수 필요

## OKR 기반 작업 지침

프로젝트 루트의 `OKR.md`에 분기별 목표가 정의되어 있다. 모든 작업은 OKR과 정렬되어야 한다.

### 작업 전 체크
- 이 작업이 어떤 Objective에 기여하는가?
- 기여하는 KR이 있다면, 어떤 Initiative에 해당하는가?
- KR과 무관한 작업이라면 정말 지금 해야 하는 작업인가?

### 작업 후 체크
- OKR.md의 해당 Initiative에 [x] 완료 표시를 해야 하는가?
- 진행 상황 추적 테이블에 업데이트가 필요한가?

### OKR 원칙
- **Output이 아닌 Outcome**: "기능을 만들었다"가 아니라 "지표가 개선되었다"에 집중
- **측정 가능**: 모든 개선에는 측정 가능한 결과가 따라야 함
- **70% 달성 = 성공**: 목표가 도전적이므로 완벽을 추구하지 않음

## 주요 파일
- 미들웨어: `src/middleware.ts` (서브도메인 리라이트만, 인증 NO)
- 인증: `src/lib/auth/AuthContext.tsx`, `src/lib/auth/admins.ts`
- 관리자: `src/app/admin/`, `src/components/admin/`
- 크롤러: `src/lib/crawlers/crawler.ts`, `src/lib/crawlers/search_mcp.ts`
- 홈: `src/app/HomeClient.tsx` (LazyImageCard로 가상화)
- 알림: `src/hooks/useNotifications.ts` (incremental insert 최적화됨)
- OKR: `OKR.md` (분기별 목표 및 진행 추적)
