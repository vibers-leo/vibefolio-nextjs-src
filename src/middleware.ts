import { NextResponse, type NextRequest } from 'next/server';

/**
 * ============================================================
 *  [CRITICAL WARNING] 이 미들웨어에서 Supabase 인증을 사용하지 마세요!
 * ============================================================
 *
 * 이 프로젝트의 Supabase 클라이언트는 인증 토큰을 localStorage에 저장합니다.
 * Next.js 미들웨어는 서버(Edge Runtime)에서 실행되므로 localStorage에 접근 불가합니다.
 * 따라서 미들웨어에서 getUser(), getSession() 등을 호출하면 항상 null이 반환됩니다.
 *
 * [2026-02-13] 이 문제로 /admin 페이지가 일주일간 접근 불가했었습니다.
 *
 * 인증이 필요한 경우:
 * - /admin → AdminGuard 컴포넌트 (src/components/admin/AdminGuard.tsx)
 * - /mypage → 각 페이지 내 useAuth() hook
 * - /project/upload → 각 페이지 내 useAuth() hook
 * ============================================================
 */

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host');

  // Subdomain rewrite: review.vibefolio.net
  if (hostname === 'review.vibefolio.net') {
     // 1. review.vibefolio.net/ -> /review
     if (url.pathname === '/') {
       url.pathname = '/review';
       return NextResponse.rewrite(url);
     }
     
     // 2. review.vibefolio.net/[id] -> /review?projectId=[id]
     // Extract potential ID from path (e.g., /60)
     const pathParts = url.pathname.split('/').filter(Boolean);
     if (pathParts.length === 1 && !isNaN(Number(pathParts[0]))) {
         url.searchParams.set('projectId', pathParts[0]);
         url.pathname = '/review';
         return NextResponse.rewrite(url);
     }
  }

  // CORS: 모바일 앱(React Native) 및 웹 기반 Expo에서 API 호출 시 필요
  if (url.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '';
    const response = request.method === 'OPTIONS'
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next({ request: { headers: request.headers } });

    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // /admin, /mypage 등 보호 경로: 미들웨어에서 차단하지 않음
  // Supabase 클라이언트가 localStorage 기반이라 서버 미들웨어에서 세션을 읽을 수 없음
  // 인증/권한 체크는 클라이언트 사이드 AdminGuard 및 각 페이지에서 전담 처리
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
