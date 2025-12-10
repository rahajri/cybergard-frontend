/**
 * Configuration Keycloak pour CYBERGARD AI
 */

export const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'cyberguard',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'cyberguard-frontend',
};

export interface KeycloakUser {
  sub: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  preferred_username: string;
  realm_access?: {
    roles: string[];
  };
}

export interface KeycloakTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

/**
 * Génère l'URL de connexion Keycloak
 */
export function getKeycloakLoginUrl(redirectUri?: string): string {
  const redirect = redirectUri || `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'openid profile email',
  });

  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/auth?${params.toString()}`;
}

/**
 * Génère l'URL de déconnexion Keycloak
 * @param redirectUri - URL de redirection après déconnexion
 * @param idToken - ID Token pour une déconnexion propre (recommandé)
 */
export function getKeycloakLogoutUrl(redirectUri?: string, idToken?: string | null): string {
  const redirect = redirectUri || window.location.origin;
  const params = new URLSearchParams({
    post_logout_redirect_uri: redirect,
    client_id: keycloakConfig.clientId,
  });

  // Ajouter id_token_hint si disponible (recommandé par Keycloak pour éviter l'erreur)
  if (idToken && idToken !== 'null') {
    params.append('id_token_hint', idToken);
  }

  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre des tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<KeycloakTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: keycloakConfig.clientId,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(
    `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Récupère les informations de l'utilisateur depuis Keycloak
 */
export async function getKeycloakUserInfo(accessToken: string): Promise<KeycloakUser> {
  const response = await fetch(
    `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}

/**
 * Rafraîchit le token d'accès
 */
export async function refreshAccessToken(refreshToken: string): Promise<KeycloakTokens> {
  console.log('🔄 [Keycloak] Début du rafraîchissement du token...');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: keycloakConfig.clientId,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(
      `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Keycloak] Erreur refresh token:', response.status, errorText);
      throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ [Keycloak] Token rafraîchi, expire dans', data.expires_in, 'secondes');

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('❌ [Keycloak] Exception lors du refresh:', error);
    throw error;
  }
}

/**
 * Mappe les rôles Keycloak vers les rôles de l'application
 */
export function mapKeycloakRoleToAppRole(keycloakRoles: string[]): 'platform_admin' | 'client' | 'auditor' {
  if (keycloakRoles.includes('super_admin') || keycloakRoles.includes('tenant_admin')) {
    return 'platform_admin';
  }
  if (keycloakRoles.includes('auditor')) {
    return 'auditor';
  }
  if (keycloakRoles.includes('consultant')) {
    return 'client';
  }
  return 'client'; // Default role
}
