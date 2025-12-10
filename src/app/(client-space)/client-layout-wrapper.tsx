'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    // Rôles autorisés pour l'espace client :
    // - 'client' : Utilisateurs mappés depuis RSSI, DIR_CONFORMITE_DPO, CHEF_PROJET, etc.
    // - 'auditor' : Auditeurs (retourné par le backend en anglais depuis AUDITEUR)
    // - 'auditeur' : Alias français (rétrocompatibilité)
    <ProtectedRoute requiredRole={['client', 'auditor', 'auditeur']}>
      {children}
    </ProtectedRoute>
  );
}
