'use client';

import { useEffect } from 'react';
import { setupFetchInterceptor } from '@/app/lib/fetch-interceptor';

/**
 * Provider qui configure l'intercepteur fetch au montage
 * Intercepte automatiquement les erreurs 401 et redirige vers /login
 */
export function FetchInterceptorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Configure l'intercepteur une seule fois au démarrage
    setupFetchInterceptor();
  }, []);

  return <>{children}</>;
}
