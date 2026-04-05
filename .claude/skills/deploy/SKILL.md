---
name: deploy
description: Build, commit, and push to deploy. Use when the user says "배포해줘", "푸시해줘", "깃푸시", or wants to deploy changes.
user-invocable: true
argument-hint: "[commit message]"
allowed-tools: Bash, Read, Glob
---

# /deploy - 빌드 → 커밋 → 푸시 자동화

## 절차

### 1. 빌드 검증
```bash
npm run build
```
빌드 실패 시 → 에러 분석 후 사용자에게 보고. 절대 실패 상태로 푸시하지 않음.

### 2. 변경사항 확인
```bash
git status
git diff --stat
```

### 3. 커밋 메시지 작성
- `$ARGUMENTS`가 있으면 해당 메시지 사용
- 없으면 변경사항 분석 후 자동 생성
- 형식: `feat:`, `fix:`, `perf:`, `docs:` 등 conventional commits
- Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com> 항상 포함

### 4. 스테이징 + 커밋
```bash
git add <변경된 파일들>  # .env, credentials 제외
git commit -m "<메시지>"
```

### 5. 푸시
```bash
git push
```

### 6. 결과 보고
- 커밋 해시 + 메시지
- 변경된 파일 수
- Vercel 자동 배포 트리거됨을 안내

## 주의사항
- `.env`, `.env.local`, `credentials` 파일은 절대 커밋하지 않음
- `middleware.ts`가 변경된 경우 → Supabase auth 사용 여부 경고
- 빌드 실패 시 → 에러 수정 제안 후 재빌드
