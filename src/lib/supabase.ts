// src/lib/supabase.ts — 호환성 프록시 (Supabase 패키지 제거됨)
import { getStorageClient } from './supabase-storage';

export const supabase = getStorageClient() || ({} as any);
