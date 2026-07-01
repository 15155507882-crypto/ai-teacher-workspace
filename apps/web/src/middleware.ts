import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS/i.test(ua);
  const url = request.nextUrl.clone();

  // 已经是移动端地址就不重定向
  if (url.hostname === 'localhost' && url.port === '8099') return NextResponse.next();
  if (url.hostname !== 'localhost' && url.pathname.startsWith('/m/')) return NextResponse.next();

  if (isMobile) {
    // 手机端重定向到移动版
    const host = request.headers.get('host') || 'localhost:8080';
    const baseHost = host.split(':')[0];
    const mobileUrl = new URL(request.url);
    mobileUrl.host = `${baseHost}:8099`;
    return NextResponse.redirect(mobileUrl, 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|_next|favicon).*)',
};
