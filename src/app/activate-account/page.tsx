'use client';

import '@/app/styles/activate-account.css';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useActivation } from './hooks/useActivation';
import SuccessMessage from './components/SuccessMessage';
import ActivationForm from './components/ActivationForm';

/**
 * Contenu de la page d'activation
 * Gère l'affichage conditionnel entre le formulaire et le message de succès
 */
function ActivateAccountContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const { success } = useActivation();

  if (success) {
    return <SuccessMessage />;
  }

  return <ActivationForm token={token} />;
}

/**
 * Page d'activation de compte
 * Permet aux nouveaux utilisateurs de définir leur mot de passe
 */
export default function ActivateAccountPage() {
  return (
    <Suspense fallback={
      <div className="keycloak-container">
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{
            width: '3rem',
            height: '3rem',
            color: '#dc2626',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#9ca3af' }}>Chargement...</p>
        </div>
      </div>
    }>
      <ActivateAccountContent />
    </Suspense>
  );
}
