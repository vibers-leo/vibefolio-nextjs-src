---
name: review
description: Review code changes for quality and security. Use when reviewing staged changes, recent commits, or specific files.
user-invocable: true
argument-hint: "[file path or commit hash]"
context: fork
agent: Explore
allowed-tools: Bash, Read, Glob, Grep
---

# /review - 코드 리뷰

## 사용법
- `/review` — 현재 스테이징/언스테이징된 변경사항 리뷰
- `/review src/lib/auth/` — 특정 디렉토리 리뷰
- `/review HEAD~3..HEAD` — 최근 3개 커밋 리뷰

## 리뷰 절차

### 1. 변경사항 수집
```bash
git diff          # 언스테이징 변경
git diff --cached # 스테이징 변경
# 또는 $ARGUMENTS가 커밋 범위면
git diff $ARGUMENTS
```

### 2. 체크리스트

#### 보안 (Critical)
- [ ] `middleware.ts`에서 Supabase auth 사용 여부 → **절대 금지** (localStorage 기반이라 서버에서 불가)
- [ ] `.env` 값이 하드코딩되어 있지 않은지
- [ ] SQL injection 위험 (`raw()`, 문자열 연결 쿼리)
- [ ] XSS 위험 (`dangerouslySetInnerHTML`, 사용자 입력 직접 렌더)
- [ ] 인증 우회 가능성 (API 라우트에서 auth 체크 누락)

#### 성능
- [ ] 불필요한 `loadNotifications()` 전체 재조회 (incremental insert 패턴 사용해야 함)
- [ ] 큰 리스트에서 LazyImageCard 미사용
- [ ] N+1 쿼리 (루프 안에서 DB 호출)
- [ ] 불필요한 리렌더 (useEffect 의존성 배열 누락)

#### 프로젝트 규칙 (CLAUDE.md)
- [ ] 요청하지 않은 리팩토링/코드 정리 여부
- [ ] IS_DEV 체크 없는 console.log
- [ ] 불필요한 새 파일 생성

### 3. 결과 보고

```markdown
## 리뷰 결과

### 🔴 Critical (반드시 수정)
- ...

### 🟡 Warning (권장 수정)
- ...

### 🟢 Good (잘한 점)
- ...

### 📊 요약
- 변경 파일: N개
- 추가: +N줄, 삭제: -N줄
- 위험도: 낮음/중간/높음
```
