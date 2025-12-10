import { refreshAccessToken as keycloakRefreshToken } from './keycloak-config';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;  // Tous les rôles possibles (AUDITEUR, SUPER_ADMIN, RSSI, DPO, etc.)
  roles?: string[];  // Liste complète des rôles
  organizationId?: string;
  organizationName?: string;
  tenantId?: string;
}

// ============================================================================
// GESTION DU RAFRAÎCHISSEMENT AUTOMATIQUE DU TOKEN
// ============================================================================

// Timestamp de la dernière activité (dernière requête API)
let lastActivityTimestamp: number = Date.now();

// Flag pour éviter les rafraîchissements multiples simultanés
let isRefreshing = false;

// Promesse en cours de rafraîchissement (pour éviter les requêtes parallèles)
let refreshPromise: Promise<boolean> | null = null;

// Durée avant expiration où on rafraîchit le token (5 minutes avant)
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Durée d'inactivité après laquelle on ne rafraîchit plus (30 minutes)
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Décode le payload d'un JWT sans vérifier la signature
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Vérifie si le token va bientôt expirer
 */
function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // Si on ne peut pas décoder, considérer comme expirant

  const expirationTime = payload.exp * 1000; // Convertir en millisecondes
  const timeUntilExpiry = expirationTime - Date.now();

  return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS;
}

/**
 * Vérifie si le token est déjà expiré
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;

  return Date.now() >= payload.exp * 1000;
}

/**
 * Rafraîchit le token d'accès via Keycloak
 * Retourne true si le rafraîchissement a réussi, false sinon
 *
 * IMPORTANT: Cette fonction NE supprime PAS les tokens en cas d'échec.
 * C'est le FetchInterceptor qui décidera de la redirection.
 */
async function refreshToken(): Promise<boolean> {
  // Si un rafraîchissement est déjà en cours, attendre le résultat
  if (isRefreshing && refreshPromise) {
    console.log('🔄 [Auth] Rafraîchissement déjà en cours, attente...');
    return refreshPromise;
  }

  const refreshTokenValue = localStorage.getItem('refreshToken');
  if (!refreshTokenValue) {
    console.warn('⚠️ [Auth] Pas de refresh token disponible');
    return false;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      console.log('🔄 [Auth] Rafraîchissement du token en cours...');

      const tokens = await keycloakRefreshToken(refreshTokenValue);

      // Mettre à jour les tokens dans localStorage
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('idToken', tokens.idToken);

      // Mettre à jour le cookie également
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `token=${tokens.accessToken}; path=/; ${isSecure ? 'secure;' : ''} samesite=lax; max-age=${7 * 24 * 60 * 60}`;

      console.log('✅ [Auth] Token rafraîchi avec succès, nouveau token valide');
      lastActivityTimestamp = Date.now();

      return true;
    } catch (error) {
      console.error('❌ [Auth] Erreur lors du rafraîchissement du token:', error);
      // NE PAS supprimer les tokens ici - laisser le FetchInterceptor décider
      // Le refresh token de Keycloak peut avoir expiré (30 min par défaut)
      console.warn('⚠️ [Auth] Le refresh token est peut-être expiré. Session terminée.');

      // Supprimer les tokens SEULEMENT si l'erreur indique un refresh token invalide
      const errorStr = String(error);
      if (errorStr.includes('400') || errorStr.includes('invalid_grant') || errorStr.includes('expired')) {
        console.log('🔒 [Auth] Refresh token invalide/expiré, nettoyage des tokens...');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('user');
      }

      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Met à jour le timestamp de dernière activité
 */
export function updateLastActivity(): void {
  lastActivityTimestamp = Date.now();
}

/**
 * Vérifie si l'utilisateur est actif (a fait une action récemment)
 */
function isUserActive(): boolean {
  return Date.now() - lastActivityTimestamp < INACTIVITY_THRESHOLD_MS;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export function setAuthData(token: string, user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    // Stocker également dans les cookies pour les requêtes API
    // httpOnly=false car on a besoin d'y accéder depuis le client
    // secure=true en production, false en dev (http://localhost)
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `token=${token}; path=/; ${isSecure ? 'secure;' : ''} samesite=lax; max-age=${7 * 24 * 60 * 60}`; // 7 jours
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearAuthData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Supprimer également le cookie
    document.cookie = 'token=; path=/; max-age=0';
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Sauvegarde l'URL courante pour redirection après login
 */
export function saveReturnUrl(url?: string): void {
  if (typeof window !== 'undefined') {
    const returnUrl = url || window.location.pathname + window.location.search;
    // Ne pas sauvegarder les URLs de login/callback
    if (!returnUrl.startsWith('/auth/') && !returnUrl.startsWith('/login')) {
      localStorage.setItem('returnUrl', returnUrl);
    }
  }
}

/**
 * Récupère et supprime l'URL de retour sauvegardée
 */
export function getAndClearReturnUrl(): string | null {
  if (typeof window !== 'undefined') {
    const returnUrl = localStorage.getItem('returnUrl');
    if (returnUrl) {
      localStorage.removeItem('returnUrl');
      return returnUrl;
    }
  }
  return null;
}

export function getRedirectUrl(role: User['role']): string {
  // D'abord vérifier s'il y a une URL de retour sauvegardée
  const returnUrl = getAndClearReturnUrl();
  if (returnUrl) {
    return returnUrl;
  }

  // Normaliser le rôle en minuscules pour la comparaison
  const normalizedRole = role?.toLowerCase();

  // Sinon, rediriger vers le dashboard par défaut selon le rôle
  switch (normalizedRole) {
    case 'platform_admin':
    case 'super_admin':
      return '/admin/dashboard';
    case 'client':
    case 'auditor':
    case 'auditeur':
    default:
      return '/client/dashboard';
  }
}

// ❌ Fonction login() supprimée - Authentification gérée uniquement par Keycloak

/**
 * Effectue une requête fetch avec le token d'authentification
 *
 * FONCTIONNALITÉ CLÉ : Rafraîchissement automatique du token
 * - Avant chaque requête, vérifie si le token va bientôt expirer
 * - Si oui, rafraîchit le token automatiquement via Keycloak
 * - Tant que l'utilisateur est actif, il ne sera jamais déconnecté
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Construire l'URL complète si c'est un chemin relatif
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  // Mettre à jour le timestamp d'activité
  updateLastActivity();

  // Récupérer le token actuel
  let token = getToken();

  // Si on a un token et qu'il va bientôt expirer (ou est déjà expiré), le rafraîchir
  if (token && isUserActive()) {
    if (isTokenExpired(token)) {
      console.log('⚠️ Token expiré, tentative de rafraîchissement...');
      const refreshed = await refreshToken();
      if (refreshed) {
        token = getToken(); // Récupérer le nouveau token
      } else {
        // Échec du rafraîchissement, la requête échouera avec 401
        console.warn('❌ Impossible de rafraîchir le token expiré');
      }
    } else if (isTokenExpiringSoon(token)) {
      console.log('🔄 Token expire bientôt, rafraîchissement proactif...');
      const refreshed = await refreshToken();
      if (refreshed) {
        token = getToken(); // Récupérer le nouveau token
      }
      // Si le rafraîchissement échoue, on continue avec le token actuel (encore valide)
    }
  }

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  console.log(`📡 [fetchWithAuth] Requête vers ${fullUrl.replace(/.*\/api/, '/api')}`);

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Si on reçoit un 401, tenter un dernier rafraîchissement et rejouer la requête
  if (response.status === 401 && isUserActive()) {
    console.log('🔄 [fetchWithAuth] 401 reçu, tentative de rafraîchissement du token...');
    const refreshed = await refreshToken();

    if (refreshed) {
      // Rejouer la requête avec le nouveau token
      const newToken = getToken();
      if (newToken) {
        console.log('✅ [fetchWithAuth] Token rafraîchi, rejeu de la requête...');
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(fullUrl, {
          ...options,
          headers,
        });
      }
    } else {
      console.warn('❌ [fetchWithAuth] Échec du rafraîchissement, 401 renvoyé');
    }
  }

  if (response.ok) {
    console.log(`✅ [fetchWithAuth] Réponse ${response.status} OK`);
  } else {
    console.warn(`⚠️ [fetchWithAuth] Réponse ${response.status}`);
  }

  return response;
}