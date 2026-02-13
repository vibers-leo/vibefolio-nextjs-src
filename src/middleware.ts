import { createServerClient, type CookieOptions } from '@supabase/ssr';
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

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // [Optimization] Fast-path: Only run Supabase logic for specific routes
  const isProtectedPath = url.pathname.startsWith('/admin') || 
                           url.pathname.startsWith('/mypage') ||
                           url.pathname.startsWith('/project/upload');

  if (!isProtectedPath) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // [Performance] getSession()은 쿠키만 읽으므로 빠름 (네트워크 호출 없음)
  // getUser()는 Supabase API 호출이므로 느리고 실패할 수 있음
  const { data: { session } } = await supabase.auth.getSession();

  // Admin protection: 세션 존재 여부만 체크
  // 상세 권한 체크(관리자 여부)는 클라이언트 사이드 AdminGuard에서 처리
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // 세션이 있으면 AdminGuard로 넘김 (관리자 여부는 클라이언트에서 판단)
  }

  return response;
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
