'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { getKeycloakLogoutUrl } from '@/lib/keycloak-config';
import { clearAuthData } from '@/lib/auth';

interface KeycloakLogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function KeycloakLogoutButton({ className, children }: KeycloakLogoutButtonProps) {
  const handleLogout = () => {
    // Récupérer l'idToken avant de nettoyer
    const idToken = localStorage.getItem('idToken');

    // Nettoyer les données locales
    clearAuthData();
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');

    // Rediriger vers la déconnexion Keycloak avec id_token_hint
    const logoutUrl = getKeycloakLogoutUrl(window.location.origin, idToken || undefined);
    window.location.href = logoutUrl;
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      className={className}
    >
      {children || (
        <>
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </>
      )}
    </Button>
  );
}
