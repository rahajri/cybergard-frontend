/**
 * Helper pour les appels API avec authentification automatique
 */

import { saveReturnUrl } from './auth';

/**
 * Fetch avec authentification automatique via token localStorage
 * Gère automatiquement les erreurs 401 en redirigeant vers le login
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Récupérer le token depuis localStorage (clé 'token' utilisée par setAuthData)
  const token = localStorage.getItem('token');

  // Ajouter le header Authorization si le token existe
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Fusionner les headers
  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Envoyer les cookies aussi (fallback si header échoue)
  };

  const response = await fetch(url, finalOptions);

  // Si 401 Unauthorized, sauvegarder l'URL courante et rediriger vers login
  if (response.status === 401) {
    // Sauvegarder l'URL courante pour y revenir après le login
    saveReturnUrl();

    // Nettoyer les données d'auth obsolètes
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Rediriger vers le login Keycloak
    window.location.href = '/login';
  }

  return response;
}
