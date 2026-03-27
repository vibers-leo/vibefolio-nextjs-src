// src/lib/supabase/client.ts — 호환성 프록시 (Supabase → JWT 전환)
// DB/Auth는 Prisma + JWT로 대체됨. Storage는 유지.
// 기존 컴포넌트의 supabase.auth.getSession()/getUser() 호출을 위한 프록시
import { getStorageClient } from '../supabase-storage';

const TOKEN_KEY = 'vf_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// JWT 토큰에서 페이로드 추출 (서명 검증은 서버에서)
function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

// Auth 프록시 객체 — 기존 supabase.auth.xxx 호출 호환
const authProxy = {
  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };
    const payload = decodeToken(token);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      return { data: { session: null }, error: null };
    }
    return {
      data: {
        session: {
          access_token: token,
          user: {
            id: payload.sub,
            email: payload.email,
            user_metadata: { role: payload.role },
            app_metadata: {},
          },
        },
      },
      error: null,
    };
  },
  async getUser(tokenOverride?: string) {
    const token = tokenOverride || getToken();
    if (!token) return { data: { user: null }, error: null };
    const payload = decodeToken(token);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      return { data: { user: null }, error: null };
    }
    return {
      data: {
        user: {
          id: payload.sub,
          email: payload.email,
          user_metadata: { role: payload.role },
          app_metadata: {},
        },
      },
      error: null,
    };
  },
  async signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    return { error: null };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: data.error } };
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      return {
        data: {
          user: { id: data.user.id, email: data.user.email, user_metadata: data.user },
          session: { access_token: data.token },
        },
        error: null,
      };
    } catch (e: any) {
      return { data: { user: null, session: null }, error: { message: e.message } };
    }
  },
  async signInWithOAuth({ provider, options }: any) {
    // OAuth는 현재 지원하지 않음 — 에러 반환
    console.warn('[Auth Proxy] OAuth 로그인은 현재 지원되지 않습니다. 이메일 로그인을 사용해주세요.');
    return { data: { url: null, provider }, error: { message: 'OAuth는 현재 지원되지 않습니다.' } };
  },
  async signUp({ email, password, options }: any) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname: options?.data?.nickname }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null }, error: { message: data.error } };
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      return { data: { user: { id: data.user.id, email: data.user.email } }, error: null };
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message } };
    }
  },
  async updateUser(updates: any) {
    // Profile 업데이트는 /api/users/[id] 사용
    return { data: { user: null }, error: null };
  },
  async refreshSession() {
    return { data: { session: null }, error: null };
  },
  onAuthStateChange(callback: Function) {
    // JWT 기반이므로 실시간 감지 불필요
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
};

// from() 프록시 — supabase.from('xxx') 호출에 대해 빈 체인 반환
function fromProxy(table: string) {
  console.warn(`[Supabase Proxy] supabase.from('${table}') 호출됨. Prisma로 마이그레이션하세요.`);
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
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => Promise.resolve({ data: null, error: { message: 'Supabase proxy - use Prisma' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: Function) => resolve({ data: [], error: null, count: 0 }),
  };
  return chain;
}

// Storage 클라이언트 기반 프록시
const storageBase = getStorageClient();

export const supabase: any = {
  auth: authProxy,
  from: fromProxy,
  storage: storageBase?.storage || { from: () => ({ upload: async () => ({ data: null, error: { message: 'No storage' } }), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({ error: null }) }) },
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({}),
  }),
  removeChannel: () => {},
};

export { supabase as createClient };
export function getSupabaseClient() { return supabase; }
