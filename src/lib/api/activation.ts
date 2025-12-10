const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ActivateAccountRequest {
  token: string;
  password: string;
}

export interface ActivateAccountResponse {
  message: string;
  user_id: string;
}

/**
 * Active un compte utilisateur avec un token d'activation
 * @param token - Token d'activation reçu par email
 * @param password - Mot de passe choisi par l'utilisateur
 * @returns Informations de l'activation
 * @throws Error si l'activation échoue
 */
export async function activateAccount(
  token: string,
  password: string
): Promise<ActivateAccountResponse> {
  const response = await fetch(`${API_BASE}/api/v1/activation/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de l\'activation du compte');
  }

  return response.json();
}
