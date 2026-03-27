// src/lib/supabase.ts — 호환성 프록시 (Storage 전용)
import { getStorageClient } from './supabase-storage';

export const supabase = getStorageClient() || ({} as any);
