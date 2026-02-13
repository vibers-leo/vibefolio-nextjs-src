import { NextResponse, type NextRequest } from 'next/server';

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
