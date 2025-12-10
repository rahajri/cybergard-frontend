'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import {
  exchangeCodeForTokens
} from '@/lib/keycloak-config';
import { setAuthData, getRedirectUrl } from '@/lib/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Empêcher les doubles exécutions (React Strict Mode en dev)
    if (isProcessing) {
      console.log('⚠️ Callback déjà en cours de traitement, abandon');
      return;
    }

    const handleCallback = async () => {
      // Vérifier si on a déjà traité cette requête
      const code = searchParams.get('code');
      if (!code) return;

      const processedKey = `auth_processed_${code}`;
      if (sessionStorage.getItem(processedKey)) {
        console.log('⚠️ Code déjà traité, abandon');
        return;
      }

      setIsProcessing(true);
      sessionStorage.setItem(processedKey, 'true');

      try {
        // DEBUG: Afficher tous les paramètres de l'URL
        console.log('🔍 URL complète:', window.location.href);
        console.log('🔍 Tous les paramètres:', Array.from(searchParams.entries()));

        // Récupérer le code d'autorisation depuis l'URL
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Vérifier s'il y a une erreur Keycloak
        if (error) {
          throw new Error(`Erreur Keycloak: ${error} - ${errorDescription || 'Pas de description'}`);
        }

        if (!code) {
          throw new Error('Code d\'autorisation manquant');
        }

        console.log('✅ Code d\'autorisation reçu');

        // Échanger le code contre des tokens
        const redirectUri = `${window.location.origin}/auth/callback`;
        const tokens = await exchangeCodeForTokens(code, redirectUri);

        console.log('✅ Tokens reçus');

        // Récupérer les informations complètes de l'utilisateur depuis le backend
        // (inclut organizationId, tenantId, etc.)
        const userInfoResponse = await fetch('http://localhost:8000/api/v1/auth/keycloak/me', {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!userInfoResponse.ok) {
          // Gérer le cas spécifique de l'organisation désactivée
          if (userInfoResponse.status === 403) {
            try {
              const errorData = await userInfoResponse.json();
              console.log('❌ Erreur 403 reçue:', errorData);

              if (errorData.detail?.error === 'organization_inactive') {
                throw new Error(errorData.detail.message);
              }

              // Si c'est un autre type d'erreur 403
              if (typeof errorData.detail === 'string') {
                throw new Error(errorData.detail);
              }

              throw new Error('Accès refusé - Veuillez contacter l\'administrateur');
            } catch (jsonError) {
              // Si l'erreur vient de throw new Error ci-dessus, la relancer
              if (jsonError instanceof Error && jsonError.message.includes('organisation')) {
                throw jsonError;
              }
              if (jsonError instanceof Error && jsonError.message.includes('Accès refusé')) {
                throw jsonError;
              }
              // Si on ne peut pas parser la réponse JSON, erreur générique
              console.error('❌ Impossible de parser l\'erreur JSON:', jsonError);
              throw new Error('Accès refusé - Erreur lors de la lecture de la réponse serveur');
            }
          }
          throw new Error(`Erreur ${userInfoResponse.status}: Impossible de récupérer les informations utilisateur`);
        }

        const backendUserInfo = await userInfoResponse.json();

        console.log('✅ Informations utilisateur reçues du backend:', backendUserInfo);

        // ✅ Utiliser directement le rôle retourné par le backend (provenant de la BDD)
        // Le backend récupère le rôle depuis user_organization_role qui est la source de vérité
        const user = {
          id: backendUserInfo.id,
          email: backendUserInfo.email,
          firstName: backendUserInfo.firstName,
          lastName: backendUserInfo.lastName,
          role: backendUserInfo.role || 'client',  // Utiliser le rôle du backend
          organizationId: backendUserInfo.organizationId,
          organizationName: backendUserInfo.organizationName,
          tenantId: backendUserInfo.tenantId,
        };

        console.log('👤 Utilisateur final:', user);
        console.log('🎭 Rôle détecté:', user.role);

        // Sauvegarder les données d'authentification
        setAuthData(tokens.accessToken, user);

        // Sauvegarder aussi le refresh token
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('idToken', tokens.idToken);

        // Rediriger vers le dashboard approprié
        const redirectUrl = getRedirectUrl(user.role);

        console.log('✅ Authentification réussie');
        console.log('➡️  Redirection vers:', redirectUrl);

        // Utiliser window.location.href pour forcer un rechargement complet
        // Cela permet au AuthContext de détecter les nouvelles données localStorage
        window.location.href = redirectUrl;

      } catch (err: unknown) {
        const error = err as Error;
        console.error('❌ Erreur lors du callback Keycloak:', err);
        setError(error.message || 'Erreur d\'authentification');

        // Nettoyer le flag de traitement en cas d'erreur
        const code = searchParams.get('code');
        if (code) {
          sessionStorage.removeItem(`auth_processed_${code}`);
        }
        setIsProcessing(false);

        // Rediriger vers la page de login après 3 secondes
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, isProcessing]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-black">
        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-lg border border-red-800 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-900/30 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Erreur d'authentification</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <p className="text-gray-400 text-sm">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-black">
      <div className="bg-black/50 backdrop-blur-sm p-8 rounded-lg border border-red-800 max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 animate-pulse">
          <Shield className="w-full h-full text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">CYBERGARD AI</h2>
        <p className="text-gray-300">Authentification en cours...</p>
        <div className="mt-6 flex justify-center">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-black">
        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-lg border border-red-800 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 animate-pulse">
            <Shield className="w-full h-full text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">CYBERGARD AI</h2>
          <p className="text-gray-300">Chargement...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
