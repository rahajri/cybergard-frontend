'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Page d'échange de Magic Link contre Token Keycloak
 *
 * Flow sécurisé :
 * 1. L'utilisateur clique sur le lien d'invitation (magic link)
 * 2. Cette page récupère le token depuis l'URL (?token=xxx)
 * 3. Appelle le backend pour échanger le magic_token contre un token Keycloak
 * 4. Stocke le token Keycloak en localStorage
 * 5. Redirige vers le questionnaire d'audit
 *
 * Architecture de sécurité :
 * - Magic token validé côté backend (JWT + BDD)
 * - Compte Keycloak temporaire créé pour l'audité
 * - Token Keycloak utilisé pour toutes les requêtes API
 * - Traçabilité complète dans Keycloak (audit trail)
 */
function MagicLinkAccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'exchanging' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const exchangeMagicLink = async () => {
      try {
        // Attendre que searchParams soit prêt (éviter les faux négatifs au premier rendu)
        if (!searchParams) {
          return;
        }

        // 1. Récupérer le magic token depuis l'URL
        const magicToken = searchParams.get('token');

        if (!magicToken) {
          // Rediriger vers la page d'accueil avec message d'erreur
          console.error('❌ Magic link invalide: token manquant dans l\'URL');
          router.replace('/?error=missing-token');
          return;
        }

        console.log('🔗 Magic token reçu, échange en cours...');
        setStatus('exchanging');

        // 2. Appeler l'endpoint backend pour échanger le token
        const response = await fetch('/api/v1/magic-link/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            magic_token: magicToken,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de l'authentification";
          try {
            const error = await response.json();
            errorMessage = error.detail || errorMessage;
          } catch {
            // Si la réponse n'est pas JSON (erreur 500 HTML par exemple)
            errorMessage = `Erreur serveur (${response.status})`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('✅ Token Keycloak reçu avec succès');

        // 3. Stocker le token Keycloak en localStorage
        // Utiliser 'token' comme clé principale pour compatibilité avec authenticatedFetch
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('access_token', data.access_token); // Backup pour rétrocompatibilité
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user_email', data.user_email);
        localStorage.setItem('auth_provider', 'keycloak_magic_link');

        // Optionnel : Stocker les infos de l'audit
        localStorage.setItem('audit_id', data.audit_id);
        localStorage.setItem('questionnaire_id', data.questionnaire_id);
        localStorage.setItem('campaign_id', data.campaign_id);

        setStatus('success');
        toast.success('Authentification réussie !');

        // 4. Rediriger vers le questionnaire après 1 seconde
        setTimeout(() => {
          // Vérifier si un paramètre question est présent pour focus automatique
          const questionId = searchParams.get('question');
          let redirectUrl = `/audite/${data.audit_id}/${data.questionnaire_id}`;

          // Ajouter le paramètre question si présent pour le focus automatique
          if (questionId) {
            redirectUrl += `?question=${questionId}`;
            console.log(`🎯 Redirection avec focus sur question: ${questionId}`);
          }

          console.log(`🎯 Redirection vers: ${redirectUrl}`);
          router.push(redirectUrl);
        }, 1000);

      } catch (error: unknown) {
      const err = error as Error;
        console.error('❌ Erreur échange magic link:', error);
        setStatus('error');
        setErrorMessage(err.message || 'Erreur inconnue');
        toast.error(err.message || "Erreur lors de l'authentification");
      }
    };

    exchangeMagicLink();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            CYBERGARD AI
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Accès sécurisé à votre audit
          </p>

          {/* États */}
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Vérification du lien...</p>
            </div>
          )}

          {status === 'exchanging' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Authentification en cours...</p>
              <p className="text-sm text-gray-500 mt-2">Connexion sécurisée via Keycloak</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-gray-700 font-medium">Authentification réussie !</p>
              <p className="text-sm text-gray-500 mt-2">Redirection vers votre questionnaire...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">Erreur d'authentification</p>
              <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              🔒 Connexion sécurisée - Votre accès est crypté et traçable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MagicLinkAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 mt-4">Chargement...</p>
          </div>
        </div>
      </div>
    }>
      <MagicLinkAccessContent />
    </Suspense>
  );
}
