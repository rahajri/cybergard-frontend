/**
 * Fetch Interceptor - Gestion automatique des erreurs 401 (token expiré)
 *
 * Ce fichier wrappe la fonction fetch native pour intercepter les erreurs 401
 * et rediriger automatiquement vers la page de login
 */

// Type pour stocker la référence originale
type FetchFunction = typeof fetch;

let isInterceptorSetup = false;

/**
 * Configure l'intercepteur fetch global
 * À appeler une seule fois au démarrage de l'application
 */
export function setupFetchInterceptor() {
  if (isInterceptorSetup || typeof window === 'undefined') {
    return;
  }

  const originalFetch: FetchFunction = window.fetch;

  window.fetch = async function interceptedFetch(
    ...args: Parameters<FetchFunction>
  ): Promise<Response> {
    try {
      const response = await originalFetch(...args);

      // Si la réponse est 401 Unauthorized
      if (response.status === 401) {
        console.warn('⚠️  Token expiré - Redirection vers /login');

        // Nettoyer le localStorage (tokens Keycloak)
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }

        // Rediriger vers la page de login
        window.location.href = '/login';

        // Retourner la réponse quand même pour éviter les erreurs
        // mais le redirect aura lieu
        return response;
      }

      return response;
    } catch (error) {
      // Propager les erreurs réseau normales
      throw error;
    }
  };

  isInterceptorSetup = true;
  console.log('✅ Fetch interceptor configuré - Gestion automatique des 401');
}

/**
 * Réinitialise l'intercepteur (utile pour les tests)
 */
export function resetFetchInterceptor() {
  isInterceptorSetup = false;
}
