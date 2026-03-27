// src/lib/supabase/admin.ts — 호환성 프록시
// DB/Auth는 Prisma + JWT로 대체됨. Storage만 유지.
import { getStorageClient } from '../supabase-storage';

const storageBase = getStorageClient();

function fromProxy(table: string) {
  console.warn(`[SupabaseAdmin Proxy] supabaseAdmin.from('${table}') 호출됨. Prisma로 마이그레이션하세요.`);
  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    is: () => chain,
    not: () => chain,
    or: () => chain,
    and: () => chain,
    gte: () => chain,
    lte: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => Promise.resolve({ data: null, error: { message: 'Supabase admin proxy - use Prisma' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: Function) => resolve({ data: [], error: null, count: 0 }),
  };
  return chain;
}

export const supabaseAdmin: any = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    admin: {
      getUserById: async () => ({ data: { user: null }, error: null }),
      deleteUser: async () => ({ error: null }),
    },
  },
  from: fromProxy,
  storage: storageBase?.storage || { from: () => ({ upload: async () => ({ data: null, error: { message: 'No storage' } }), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({ error: null }) }) },
};
