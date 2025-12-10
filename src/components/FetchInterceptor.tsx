'use client';

import { useEffect } from 'react';

/**
 * Composant qui initialise l'intercepteur fetch global
 * pour gérer automatiquement les erreurs 401 (token expiré)
 *
 * NOTE: Ce composant agit comme un "filet de sécurité" final.
 * Le rafraîchissement automatique du token est géré par fetchWithAuth() dans lib/auth.ts.
 * Ce composant ne redirige que si le rafraîchissement échoue définitivement.
 *
 * IMPORTANT: Ce composant NE DOIT PAS interférer avec le mécanisme de refresh.
 * Il ne redirige que si :
 * - On reçoit un 401
 * - ET il n'y a plus de token NI de refreshToken dans le localStorage
 * - ET on n'est pas déjà en train de se déconnecter
 */
export default function FetchInterceptor() {
  useEffect(() => {
    // Sauvegarder la fonction fetch originale
    const originalFetch = window.fetch;

    // Flag pour éviter les redirections multiples
    let redirectionPending = false;

    // Remplacer fetch par notre version qui gère les 401
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Si le token est expiré (401)
      if (response.status === 401) {
        const currentPath = window.location.pathname;

        // NE PAS rediriger pour les routes auditées (Magic Links) - elles gèrent leur propre auth
        if (currentPath.startsWith('/audite') || currentPath.startsWith('/audit/access')) {
          console.log('🔒 [FetchInterceptor] 401 sur route audité - ignoré');
          return response;
        }

        // NE PAS rediriger si c'est une requête vers Keycloak (refresh token en cours)
        const requestUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
        if (requestUrl.includes('/protocol/openid-connect/token')) {
          console.log('🔄 [FetchInterceptor] 401 sur Keycloak endpoint - refresh en cours');
          return response;
        }

        // NE PAS rediriger si c'est une requête vers l'API backend (fetchWithAuth gère)
        if (requestUrl.includes('/api/v1/')) {
          console.log('🔄 [FetchInterceptor] 401 sur API backend - laissé à fetchWithAuth');
          return response;
        }

        // Éviter les redirections multiples
        if (redirectionPending) {
          return response;
        }

        // Attendre un délai plus long pour laisser fetchWithAuth tenter le rafraîchissement
        setTimeout(() => {
          // Vérifier si on a VRAIMENT plus de tokens
          const currentToken = localStorage.getItem('token');
          const currentRefreshToken = localStorage.getItem('refreshToken');

          // Ne rediriger que si TOUS les tokens sont absents
          if (!currentToken && !currentRefreshToken && !redirectionPending) {
            redirectionPending = true;
            console.log('🔒 [FetchInterceptor] Plus aucun token, redirection vers /login');

            // Nettoyer le localStorage (par sécurité)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('idToken');

            // Rediriger vers login seulement si on n'est pas déjà sur /login ou /auth
            if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/auth')) {
              window.location.href = '/login';
            }
          } else {
            console.log('🔄 [FetchInterceptor] Token(s) présent(s), pas de redirection');
          }
        }, 3000); // Délai de 3 secondes pour vraiment laisser le temps au refresh
      }

      return response;
    };

    // Cleanup: restaurer fetch original au démontage du composant
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null; // Ce composant ne rend rien
}
