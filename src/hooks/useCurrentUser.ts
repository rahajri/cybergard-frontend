// hooks/useCurrentUser.ts
/**
 * Hook personnalisé pour gérer l'utilisateur connecté
 * ✨ CORRIGÉ : Supporte les deux formats (camelCase et snake_case)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Interface supportant les deux formats
export interface UserData {
  id: string;
  email: string;
  // Format snake_case (backend Python)
  first_name?: string;
  last_name?: string;
  organization_id?: string;
  organization_name?: string;
  organization_domain?: string;
  tenant_id?: string;
  // Format camelCase (JavaScript/TypeScript)
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  organizationName?: string;
  organizationDomain?: string;
  tenantId?: string;
  // Commun
  role: string;
}

interface UseCurrentUserReturn {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  fullName: string;
  initials: string;
  organizationName: string;
  refreshUser: () => void;
  logout: () => void;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        console.log('❌ Pas de données user dans localStorage');
        setUser(null);
        setIsLoading(false);
        return;
      }

      const userData: UserData = JSON.parse(userStr);
      console.log('✅ Données utilisateur chargées:', userData);
      setUser(userData);
    } catch (error) {
      console.error('❌ Erreur lors du chargement de l\'utilisateur:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const refreshUser = () => {
    loadUser();
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; path=/; max-age=0';
      document.cookie = 'user=; path=/; max-age=0';
      setUser(null);
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
    router.push('/login');
  };

  // ✨ CORRIGÉ : Supporte les deux formats
  const firstName = user?.first_name || user?.firstName || '';
  const lastName = user?.last_name || user?.lastName || '';
  
  const fullName = user
    ? `${firstName} ${lastName}`.trim() || 'Utilisateur'
    : 'Chargement...';

  const initials = user
    ? `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?'
    : '?';

  const organizationName = 
    user?.organization_name || 
    user?.organizationName || 
    'Organisation';

  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
    fullName,
    initials,
    organizationName,
    refreshUser,
    logout,
  };
}

// Hook de protection de route
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('❌ Utilisateur non authentifié, redirection vers /login');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}

// Hook pour vérifier les permissions
export function useUserPermissions() {
  const { user } = useCurrentUser();

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => user?.role === role);
  };

  const isAdmin = (): boolean => {
    return hasAnyRole(['SUPER_ADMIN', 'TENANT_ADMIN', 'ORG_ADMIN']);
  };

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    currentRole: user?.role || null,
  };
}