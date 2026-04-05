/**
 * 인메모리 Rate Limiter (Gemini API 비용 절감)
 *
 * Vercel Serverless 환경에서는 인스턴스 간 공유되지 않으므로
 * 완벽한 차단은 아니지만 기본 방어로 충분함.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp (ms)
}

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24시간
const GUEST_LIMIT = 10;   // 비로그인 IP 기반
const USER_LIMIT = 20;    // 로그인 사용자
const MAX_ENTRIES = 100;

const store = new Map<string, RateLimitEntry>();

function cleanup() {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = isAuthenticated ? USER_LIMIT : GUEST_LIMIT;
  const key = isAuthenticated ? `user:${identifier}` : `ip:${identifier}`;

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    cleanup();
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - entry.count };
}
