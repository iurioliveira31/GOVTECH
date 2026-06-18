import { type NextRequest, NextResponse } from 'next/server';

// Rotas completamente públicas — sem nenhuma verificação
const PUBLIC_PATHS = [
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/planos',
  '/_next',
  '/favicon.ico',
  '/api/webhook',   // Stripe webhook — NUNCA bloquear
  '/api/auth',      // callbacks de auth
];

// Rotas que usuário logado SEM plano pode acessar
const PLAN_SELECTION_PATHS = [
  '/onboarding/plano',
  '/conta/renovar',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isPlanSelectionPage(pathname: string): boolean {
  return PLAN_SELECTION_PATHS.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Sempre liberar rotas públicas e arquivos estáticos
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // 2. Verificar autenticação pelo cookie (setado no login)
  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verificar status da subscription pelo cookie (setado junto com o token)
  const subStatus = request.cookies.get('sub_status')?.value as
    | 'TRIALING'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'CANCELED'
    | 'EXPIRED'
    | undefined;

  const subPlan = request.cookies.get('sub_plan')?.value;
  const trialEndsAt = request.cookies.get('trial_ends_at')?.value;

  // Helper para verificar se o acesso está ativo
  function hasAccess(): boolean {
    if (!subStatus) return false;
    const now = Date.now();

    if (subStatus === 'TRIALING') {
      if (!trialEndsAt) return false;
      return new Date(trialEndsAt).getTime() > now;
    }
    if (subStatus === 'ACTIVE' || subStatus === 'PAST_DUE') return true;
    return false;
  }

  // 4. Páginas de seleção de plano: logado mas sem plano pode acessar
  if (isPlanSelectionPage(pathname)) {
    return NextResponse.next();
  }

  // 5. Sem subscription cadastrada → redirecionar para escolher plano
  if (!subStatus || !subPlan) {
    return NextResponse.redirect(new URL('/onboarding/plano', request.url));
  }

  // 6. Subscription expirada ou cancelada → redirecionar para renovar
  if (subStatus === 'CANCELED' || subStatus === 'EXPIRED') {
    return NextResponse.redirect(new URL('/conta/renovar', request.url));
  }

  // 7. Trial verificado por data
  if (subStatus === 'TRIALING' && !hasAccess()) {
    return NextResponse.redirect(new URL('/conta/renovar', request.url));
  }

  // 8. PAST_DUE: acesso liberado, app mostra banner (não bloqueia)
  // 9. Tudo ok
  const response = NextResponse.next();

  // Injetar headers para o app saber o status (útil para Server Components)
  if (subStatus) response.headers.set('x-sub-status', subStatus);
  if (subPlan) response.headers.set('x-sub-plan', subPlan);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
};
