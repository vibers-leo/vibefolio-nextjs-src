## 전략 문서 (개발 전 반드시 숙지)
- **전략 진단 리포트**: `data/STRATEGY_ANALYSIS.md`
- **PM 공통 지침**: 맥미니 루트 `pm.md`
- **gstack 빌더 철학**: 맥미니 루트 `gstack.md` — Boil the Lake, Search Before Building, 스프린트 프로세스
- **개발 프로세스**: Think → Plan → Build → Review → Test → Ship → Reflect
- **핵심 규칙**: 테스트 동시 작성, 새 패턴 도입 전 검색, 압축률 기반 추정

### 전략 핵심 요약
- 포트폴리오 플랫폼의 Burning Pain은 약함 → **채용담당자 활성화와 매칭 기능이 생존 조건**
- Q2 말까지 채용담당자 20명, 매칭 월 5건 이상 목표 설정 필수
- 무료 모델은 지속 불가능 → 6개월 내 Pro(₩4,900/월) 가격 책정 및 실행
- AI 자동 분석과 썸네일 생성은 차별화 강점이나, 커뮤니티/네트워크 기능 추가 필요

---

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

## AI 활용 패턴 (Groq + Gemini)

### 아키텍처
- **Primary**: Groq (`llama-3.3-70b-versatile`) — GROQ_API_KEY 있으면 우선 사용
- **Fallback**: Gemini (`gemini-2.0-flash`) — Groq 실패 또는 키 없을 때
- **이미지 생성**: Gemini 전용 (`gemini-2.5-flash-image`) — Groq 미지원
- **통합 클라이언트**: `src/lib/ai/client.ts` — `generateText()` 함수로 자동 전환

### 환경변수
- `GROQ_API_KEY` — Groq API 키 (primary)
- `GOOGLE_GENERATIVE_AI_API_KEY` — Google Generative AI (Gemini) API 키 (fallback + 이미지)

### Quick Post: URL → AI 자동 분석 (extract-url)
- **모델**: 텍스트 분석 Groq/Gemini (`generateText`), 이미지 생성 `gemini-2.5-flash-image`
- **API 라우트**: `src/app/api/projects/extract-url/route.ts`
- **흐름**:
  1. axios + cheerio로 URL 페이지 크롤링 (OG 메타데이터, 본문 텍스트, 기술스택 자동 감지)
  2. GitHub URL일 경우 GitHub API로 stars, language, topics, README 추가 수집
  3. **Phase 1 (runAIAnalysis)**: features, projectType, suggestedGenre, suggestedFields, targetAudience 구조화 추출
  4. **Phase 2 (generateAIDescription)**: 4~6문장 마케팅 소개글 생성
  5. 이미지: `og:image` 메타태그에서 추출 → Supabase Storage 백업
  6. **Phase 3 (generateAIThumbnail)**: OG 이미지 없으면 `gemini-2.5-flash-image`로 AI 썸네일 자동 생성 → Supabase 업로드
- **타임아웃**: 페이지 fetch 8초, GitHub API 5초, AI 분석 각 10초, AI 이미지 30초
- **재사용 패턴**: URL 입력만으로 콘텐츠 자동 채움이 필요한 모든 기능에 동일 패턴 적용 가능
- **응답 필드**: `isAIThumbnail: boolean` — AI 생성 썸네일 여부 표시

### AI 에이전트 3종 (Groq/Gemini)
- **마감일 추출**: `src/lib/ai/extractDeadline.ts` — 채용/공모전 텍스트에서 마감일 LLM 추출
- **피드백 요약**: 사용자 피드백을 요약
- **관심사 추천**: 사용자 활동 기반 추천

### Rate Limit (인메모리)
- **파일**: `src/lib/ai/rate-limit.ts`
- **방식**: IP 기반 비인증 10회/일, 인증 유저 20회/일
- **적용**: 모든 AI API 라우트 (`/api/ai/*`, `/api/projects/extract-url` 제외)
- **주의**: Vercel 서버리스 인스턴스 간 상태 비공유 (soft limit)

### 프롬프트 작성 가이드
- 한국어 우선 프롬프트
- JSON-only 출력 (마크다운 감싸기 제거 로직 포함)
- 필드별 제약조건 명시 (0-3개 fields, 정해진 genre 목록 등)
- 자연스러운 톤, 뻔한 서두 금지

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
- AI 통합 클라이언트: `src/lib/ai/client.ts` (Groq primary + Gemini fallback)
- AI URL 분석: `src/app/api/projects/extract-url/route.ts`
- AI 에이전트: `src/lib/ai/extractDeadline.ts`
- 홈: `src/app/HomeClient.tsx` (LazyImageCard로 가상화)
- 알림: `src/hooks/useNotifications.ts` (incremental insert 최적화됨)
- OKR: `OKR.md` (분기별 목표 및 진행 추적)

---

## AI Recipe 이미지 API

이 프로젝트는 **AI Recipe 중앙 이미지 서비스**를 사용합니다.

### 사용 가능한 함수

```typescript
import { searchStockImage, generateAIImage } from '@/lib/ai-recipe-client';
```

### Stock Image 검색
```typescript
const image = await searchStockImage('creative portfolio design', {
  orientation: 'landscape',
  size: 'medium',
});
// → { url, provider, alt, photographer, ... }
```

### AI 이미지 생성
```typescript
const image = await generateAIImage('modern portfolio thumbnail, minimalist creative design', {
  size: 'medium',
  provider: 'auto',
});
// → { url, prompt, provider }
```

### 주요 용도
- 포트폴리오 썸네일 AI 생성
- 프로젝트 커버 이미지
- OG 이미지 자동 생성

### 주의사항
- Server Action이나 API Route에서만 사용 (API 키 보호)
- Rate Limit: 1000회/일
- AI Recipe 서버 실행 필요: http://localhost:3300


## 세션로그 기록 (필수)
- 모든 개발 대화의 주요 내용을 `session-logs/` 폴더에 기록할 것
- 파일명: `YYYY-MM-DD_한글제목.md` / 내용: 한글
- 세션 종료 시, 마일스톤 달성 시, **컨텍스트 압축 전**에 반드시 저장
- 상세 포맷은 상위 CLAUDE.md 참조
