# Vibefolio — 디자인 가이드

> 상위 브랜드: 계발자들 (Vibers)

## 프로젝트 디자인 컨셉

바이브코더/AI 창작자를 위한 포트폴리오 플랫폼. shadcn/ui 기반의 깔끔한 뉴트럴 톤 디자인.
라이트/다크 모드를 모두 지원하며, HSL 기반 CSS 변수 시스템으로 테마를 관리한다.

## 타이포그래피

- 영문 기본: Geist Sans (`--font-geist-sans`)
- 코드/모노: Geist Mono (`--font-geist-mono`)
- 렌더링: `antialiased`
- HTML lang: `ko`

## 컬러 시스템 (shadcn/ui new-york, neutral 베이스)

모든 컬러는 HSL 기반 CSS 변수로 정의되며, `tailwind.config.ts`에서 `hsl(var(--변수명))` 형태로 참조한다.
`components.json`에서 `baseColor: "neutral"`, `style: "new-york"` 설정 확인.

### 시맨틱 컬러 토큰 (Tailwind 클래스)
| Tailwind 클래스 | CSS 변수 | 용도 |
|-----------------|----------|------|
| `bg-background` | `--background` | 페이지 배경 |
| `text-foreground` | `--foreground` | 기본 텍스트 |
| `bg-primary` | `--primary` | 주요 버튼, 강조 요소 |
| `text-primary-foreground` | `--primary-foreground` | Primary 위 텍스트 |
| `bg-secondary` | `--secondary` | 보조 버튼 |
| `text-secondary-foreground` | `--secondary-foreground` | Secondary 위 텍스트 |
| `bg-muted` | `--muted` | 비활성 배경 |
| `text-muted-foreground` | `--muted-foreground` | 비활성 텍스트 |
| `bg-accent` | `--accent` | 액센트 배경 (호버 등) |
| `text-accent-foreground` | `--accent-foreground` | 액센트 위 텍스트 |
| `bg-destructive` | `--destructive` | 삭제/에러 |
| `text-destructive-foreground` | `--destructive-foreground` | Destructive 위 텍스트 |
| `bg-card` | `--card` | 카드 배경 |
| `text-card-foreground` | `--card-foreground` | 카드 텍스트 |
| `bg-popover` | `--popover` | 팝오버 배경 |
| `text-popover-foreground` | `--popover-foreground` | 팝오버 텍스트 |
| `border-border` | `--border` | 테두리 |
| `border-input` | `--input` | 입력 필드 테두리 |
| `ring-ring` | `--ring` | 포커스 링 |

### 빌드 결과에서 확인된 실제 컬러값 (라이트 모드 기준)
- background: 흰색 계열 (`#FFFFFF`)
- foreground: 거의 검정 (neutral-900 계열)
- primary: 검정 (`#000000`, neutral-900)
- primary-foreground: 흰색
- secondary: 밝은 회색 계열
- muted: neutral-100 (`#FAFAFA` 계열)
- muted-foreground: neutral-400 (`#A3A3A3`)
- card-foreground: neutral-900 계열
- border: neutral-200 계열

### 프로젝트 고유 컬러 (Tailwind 직접 사용)
- 포인트 블루: `blue-600` (#2563EB), `blue-500` (#3B82F6)
- 시안: `#4ACAD4`, `#05BCC6` — 특수 UI 요소
- 파란 강조: `#4EABFF`
- 에러: `red-400` (#F87171), `red-500` (#EF4444)

### 다크 모드
- `darkMode: ["class"]` 설정 — `.dark` 클래스 토글 방식
- `@custom-variant dark (&:is(.dark *))` CSS 정의
- 다크 모드 시 자동으로 CSS 변수값 전환

## 레이아웃

- 컨테이너: 중앙 정렬, `padding: 2rem`
- 2xl 최대 너비: 1400px
- 헤더: 고정 (sticky), 높이 56px (모바일) / 64px (md)
- 콘텐츠 상단 여백: `pt-14 md:pt-16` (헤더 높이만큼)
- 최소 높이: `min-h-screen`

## 반응형 브레이크포인트

- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1400px (컨테이너 전용)

## 컴포넌트 규칙 (shadcn/ui 기반)

### 라운드 (border-radius)
- lg: `var(--radius)`
- md: `calc(var(--radius) - 2px)`
- sm: `calc(var(--radius) - 4px)`
- xl: `0.75rem` (12px)

### 버튼
- shadcn/ui Button 컴포넌트 사용
- variant: default, destructive, outline, secondary, ghost, link
- 최소 높이 44px (터치 영역)

### 카드
- `bg-card text-card-foreground`
- `rounded-xl shadow-sm`

### 모달/다이얼로그
- shadcn/ui Dialog, Drawer (Vaul) 사용
- `backdrop-blur` 배경

### 인풋
- `border-input` 테두리
- `focus-visible:ring-ring` 포커스 링

### 툴팁
- TooltipProvider가 루트 레이아웃에 설정됨
- shadcn/ui Tooltip 사용

## 애니메이션

- 아코디언: `accordion-down 0.2s ease-out`, `accordion-up 0.2s ease-out`
- 진입: `fade-in-0`, `zoom-in-95` (shadcn animate)
- 전환: `duration-200` ~ `duration-500`
- tailwindcss-animate 플러그인 사용

## 스크롤바

- 커스텀 스크롤바 숨기기: `.no-scrollbar` 유틸리티 클래스
- WebKit, IE/Edge, Firefox 모두 지원

## 접근성

- 최소 대비: 4.5:1 (일반 텍스트), 3:1 (큰 텍스트)
- 포커스 표시: `focus-visible:ring-ring`, `ring-offset-2`
- alt 텍스트 필수
- 키보드 내비게이션 지원
- shadcn/ui의 Radix UI 기반 접근성 내장
