// src/lib/supabase/server.ts — 호환성 프록시 (Supabase SSR → JWT 대체 완료)
// 기존 코드와의 호환성을 위한 빈 export
export function createClient() {
  return {} as any;
}
