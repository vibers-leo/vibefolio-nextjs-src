// src/lib/supabase/client.ts — 호환성 프록시 (Supabase → JWT 전환)
// DB/Auth는 Prisma + JWT로 대체됨. @supabase/supabase-js 패키지 제거됨.

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
    console.warn('[Auth Proxy] OAuth 로그인은 현재 지원되지 않습니다.');
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
    return { data: { user: null }, error: null };
  },
  async refreshSession() {
    return { data: { session: null }, error: null };
  },
  onAuthStateChange(callback: Function) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  // exchangeCodeForSession — auth/callback에서 사용하던 메서드 (스텁)
  async exchangeCodeForSession(_code: string) {
    return { data: { session: null }, error: { message: 'Supabase Auth 제거됨 — JWT 사용' } };
  },
};

// from() 프록시 — supabase.from('xxx') 호출에 대해 빈 체인 반환
function fromProxy(table: string) {
  console.warn(`[Supabase Proxy] supabase.from('${table}') 호출됨. Prisma로 마이그레이션하세요.`);
  const chain: any = {
    select: (..._args: any[]) => chain,
    insert: (..._args: any[]) => chain,
    update: (..._args: any[]) => chain,
    delete: () => chain,
    upsert: (..._args: any[]) => chain,
    eq: (..._args: any[]) => chain,
    neq: (..._args: any[]) => chain,
    in: (..._args: any[]) => chain,
    is: (..._args: any[]) => chain,
    not: (..._args: any[]) => chain,
    or: (..._args: any[]) => chain,
    and: (..._args: any[]) => chain,
    gte: (..._args: any[]) => chain,
    lte: (..._args: any[]) => chain,
    order: (..._args: any[]) => chain,
    limit: (..._args: any[]) => chain,
    range: (..._args: any[]) => chain,
    single: () => Promise.resolve({ data: null, error: { message: 'Supabase proxy - use Prisma' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: Function) => resolve({ data: [], error: null, count: 0 }),
  };
  return chain;
}

const storageStub = {
  from: () => ({
    upload: async () => ({ data: null, error: { message: 'Storage 제거됨 — NCP 사용' } }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    remove: async () => ({ error: null }),
  }),
};

export const supabase: any = {
  auth: authProxy,
  from: fromProxy,
  storage: storageStub,
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({}),
  }),
  removeChannel: () => {},
};

export { supabase as createClient };
export function getSupabaseClient() { return supabase; }
