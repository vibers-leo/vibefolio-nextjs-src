// src/lib/supabase-storage.ts — Supabase Storage 전용 클라이언트 (DB/Auth 분리)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Storage 전용 클라이언트 (Auth/DB는 사용하지 않음)
export const storageClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

export function getStorageClient() {
  if (!storageClient) {
    console.warn('[Storage] Supabase Storage 미설정 — NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 누락');
  }
  return storageClient;
}
