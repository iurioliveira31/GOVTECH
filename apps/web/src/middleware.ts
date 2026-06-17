import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/reset-password', '/_next', '/favicon.ico', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rotas públicas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Token armazenado em cookie para SSR (cookie é setado no login)
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
