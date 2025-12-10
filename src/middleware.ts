import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages publiques - autoriser sans authentification
  const publicPaths = ['/login', '/forgot-password', '/auth/callback', '/activate-account', '/audit/access'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Ressources statiques - autoriser
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Page racine - rediriger vers login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Pour les pages publiques, laisser passer
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Pour les pages protégées, on laisse le client-side gérer la redirection
  // car localStorage (où sont stockés les tokens Keycloak) n'est pas accessible côté serveur
  // La protection réelle se fera via les composants ProtectedRoute
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};