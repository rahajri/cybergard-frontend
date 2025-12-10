'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';
import type { User } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: User['role'] | User['role'][];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('🔒 ProtectedRoute - État:', {
      isLoading,
      isAuthenticated,
      user: user ? { email: user.email, role: user.role } : null,
      requiredRole,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
    });

    if (!isLoading) {
      // Pas authentifié - rediriger vers login
      if (!isAuthenticated) {
        console.log('❌ Non authentifié, redirection vers', redirectTo);
        router.push(redirectTo);
        return;
      }

      // Vérifier le rôle requis
      if (requiredRole && user) {
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        // Normaliser en minuscules pour la comparaison
        const userRoleNormalized = user.role?.toLowerCase();
        const allowedRolesNormalized = allowedRoles.map(r => r?.toLowerCase());

        console.log('🎭 Vérification rôle:', {
          userRole: user.role,
          allowedRoles,
          isAllowed: allowedRolesNormalized.includes(userRoleNormalized)
        });

        if (!allowedRolesNormalized.includes(userRoleNormalized)) {
          // Pas le bon rôle - rediriger vers le dashboard approprié
          const defaultRoute = user.role === 'platform_admin' || user.role === 'super_admin'
            ? '/admin/dashboard'
            : '/client/dashboard';

          console.log('❌ Rôle non autorisé, redirection vers', defaultRoute);
          router.push(defaultRoute);
        } else {
          console.log('✅ Rôle autorisé, affichage du contenu');
        }
      } else {
        console.log('✅ Pas de rôle requis, affichage du contenu');
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router, redirectTo]);

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-black">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 animate-pulse">
            <Shield className="w-full h-full text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">CYBERGARD AI</h2>
          <p className="text-gray-300">Vérification de l'authentification...</p>
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // Pas authentifié - ne rien afficher (la redirection est en cours)
  if (!isAuthenticated) {
    return null;
  }

  // Vérifier le rôle
  if (requiredRole && user) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Normaliser en minuscules pour la comparaison
    const userRoleNormalized = user.role?.toLowerCase();
    const allowedRolesNormalized = allowedRoles.map(r => r?.toLowerCase());

    if (!allowedRolesNormalized.includes(userRoleNormalized)) {
      return null; // Redirection en cours
    }
  }

  // Tout est bon, afficher le contenu
  return <>{children}</>;
}
