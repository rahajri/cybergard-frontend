'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getUser, getRedirectUrl } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: Array<'platform_admin' | 'super_admin' | 'client' | 'auditor'>;
}

export default function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = getToken();
      const user = getUser();

      // Pages publiques qui ne nécessitent pas d'authentification
      const publicPaths = ['/login', '/forgot-password'];
      const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

      if (isPublicPath) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Vérifier si l'utilisateur est connecté
      if (!token || !user) {
        router.replace('/login');
        return;
      }

      // Vérifier les rôles si spécifiés
      if (requiredRoles && !requiredRoles.includes(user.role as 'platform_admin' | 'super_admin' | 'client' | 'auditor')) {
        // Rediriger vers le tableau de bord approprié
        const redirectUrl = getRedirectUrl(user.role);
        router.replace(redirectUrl);
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router, requiredRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Le router.replace() s'occupe de la redirection
  }

  return <>{children}</>;
}