'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['platform_admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}
