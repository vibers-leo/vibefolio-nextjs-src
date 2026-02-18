-- ============================================================
-- push_tokens: 모바일 앱 푸시 알림 토큰 저장
-- 앱에서 Expo Push Token을 등록하면 이 테이블에 저장됨
-- 알림 생성 시 이 테이블을 조회하여 Expo Push API로 전송
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

-- 인덱스: user_id로 빠른 조회 (알림 전송 시 사용)
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

-- RLS 활성화
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 유저는 자신의 토큰만 조회 가능
CREATE POLICY "Users can view own push tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- 유저는 자신의 토큰만 등록 가능
CREATE POLICY "Users can insert own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 유저는 자신의 토큰만 삭제 가능
CREATE POLICY "Users can delete own push tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 유저는 자신의 토큰만 업데이트 가능
CREATE POLICY "Users can update own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role은 모든 토큰 조회 가능 (서버에서 푸시 전송 시)
-- supabaseAdmin은 기본적으로 RLS를 bypass하므로 별도 정책 불필요

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();
