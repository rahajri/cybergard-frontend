import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { activateAccount } from '@/lib/api/activation';

/**
 * Hook pour gérer l'activation d'un compte utilisateur
 * Gère l'état de chargement, les erreurs, et la redirection après succès
 */
export function useActivation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleActivation = async (token: string, password: string) => {
    if (!token) {
      setError('Token d\'activation manquant');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await activateAccount(token, password);
      setSuccess(true);
      
      // Redirection après 3 secondes
      setTimeout(() => {
        router.push('/login?activated=true');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    success,
    handleActivation
  };
}
