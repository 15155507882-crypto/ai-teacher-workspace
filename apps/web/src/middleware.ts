import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS/i.test(ua);
  const pathname = request.nextUrl.pathname;

  // 已经在移动端路径或静态资源，跳过
  if (pathname.startsWith('/m/') || pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (isMobile) {
    // 跳转到同域名的移动端路径
    const url = request.nextUrl.clone();
    url.pathname = '/m' + (pathname === '/' ? '/' : pathname);
    return NextResponse.redirect(url, 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|_next|favicon|m/).*)',
};
