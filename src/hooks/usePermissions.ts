/**
 * Hook pour gérer les permissions de l'utilisateur
 * Récupère les permissions depuis l'API et permet de les vérifier
 */

import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface UserPermissions {
  permissions: string[];
  roles: string[];
  isLoading: boolean;
  error: string | null;
}

export interface UsePermissionsReturn extends UserPermissions {
  /** Vérifie si l'utilisateur a une permission spécifique */
  hasPermission: (permissionCode: string) => boolean;
  /** Vérifie si l'utilisateur a toutes les permissions listées */
  hasAllPermissions: (permissionCodes: string[]) => boolean;
  /** Vérifie si l'utilisateur a au moins une des permissions listées */
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  /** Vérifie si l'utilisateur a un rôle spécifique */
  hasRole: (roleCode: string) => boolean;
  /** Vérifie si l'utilisateur est admin (ADMIN ou SUPER_ADMIN) */
  isAdmin: boolean;
  /** Recharger les permissions */
  refreshPermissions: () => Promise<void>;
}

// ============================================================================
// CACHE LOCAL
// ============================================================================

// Cache des permissions pour éviter des appels API répétés
let cachedPermissions: string[] | null = null;
let cachedRoles: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// HOOK
// ============================================================================

export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<string[]>(cachedPermissions || []);
  const [roles, setRoles] = useState<string[]>(cachedRoles || []);
  const [isLoading, setIsLoading] = useState(!cachedPermissions);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    // Utiliser le cache si valide
    const now = Date.now();
    if (!forceRefresh && cachedPermissions && (now - cacheTimestamp) < CACHE_DURATION) {
      setPermissions(cachedPermissions);
      setRoles(cachedRoles || []);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/v1/auth/keycloak/me/permissions');

      if (!response.ok) {
        throw new Error('Impossible de charger les permissions');
      }

      const data = await response.json();

      // data peut être { permissions: [...], roles: [...] } ou directement [...]
      const perms = Array.isArray(data) ? data : (data.permissions || []);
      const userRoles = Array.isArray(data) ? [] : (data.roles || []);

      // Mettre en cache
      cachedPermissions = perms;
      cachedRoles = userRoles;
      cacheTimestamp = now;

      setPermissions(perms);
      setRoles(userRoles);
    } catch (err) {
      console.error('Erreur chargement permissions:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      // En cas d'erreur, on garde les permissions en cache si elles existent
      if (cachedPermissions) {
        setPermissions(cachedPermissions);
        setRoles(cachedRoles || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Fonctions de vérification
  const hasPermission = useCallback((permissionCode: string): boolean => {
    return permissions.includes(permissionCode);
  }, [permissions]);

  const hasAllPermissions = useCallback((permissionCodes: string[]): boolean => {
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions]);

  const hasRole = useCallback((roleCode: string): boolean => {
    return roles.includes(roleCode);
  }, [roles]);

  const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions(true);
  }, [fetchPermissions]);

  return {
    permissions,
    roles,
    isLoading,
    error,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    isAdmin,
    refreshPermissions,
  };
}

// ============================================================================
// HOOK SIMPLIFIÉ POUR UNE PERMISSION UNIQUE
// ============================================================================

/**
 * Hook simplifié pour vérifier une seule permission
 * Retourne un objet avec le statut et une fonction pour afficher le modal
 */
export function useCheckPermission(permissionCode: string) {
  const { hasPermission, isLoading } = usePermissions();
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);

  const isAllowed = hasPermission(permissionCode);

  /**
   * Exécute l'action si autorisé, sinon affiche le modal
   */
  const checkAndExecute = useCallback((action: () => void) => {
    if (isAllowed) {
      action();
    } else {
      setShowUnauthorizedModal(true);
    }
  }, [isAllowed]);

  const closeModal = useCallback(() => {
    setShowUnauthorizedModal(false);
  }, []);

  return {
    isAllowed,
    isLoading,
    showUnauthorizedModal,
    checkAndExecute,
    closeModal,
    permissionCode,
  };
}

// ============================================================================
// FONCTION UTILITAIRE POUR INVALIDER LE CACHE
// ============================================================================

/**
 * Invalide le cache des permissions (à appeler après changement de rôle, etc.)
 */
export function invalidatePermissionsCache() {
  cachedPermissions = null;
  cachedRoles = null;
  cacheTimestamp = 0;
}

export default usePermissions;
