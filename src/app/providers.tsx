'use client';

// Import CSS ici pour s'assurer qu'il est chargé via un Client Component
import './globals.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Désactiver refetch automatique au focus de la fenêtre
            refetchOnWindowFocus: false,
            // Désactiver retry automatique en cas d'erreur
            retry: 1,
            // Données valides pendant 5 minutes
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
