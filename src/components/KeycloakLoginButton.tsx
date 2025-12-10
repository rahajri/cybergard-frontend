'use client';

import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { getKeycloakLoginUrl } from '@/lib/keycloak-config';

interface KeycloakLoginButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function KeycloakLoginButton({ className, children }: KeycloakLoginButtonProps) {
  const handleLogin = () => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const loginUrl = getKeycloakLoginUrl(redirectUri);

    console.log('🔑 Keycloak Login URL:', loginUrl);
    console.log('🔑 Redirect URI:', redirectUri);

    window.location.href = loginUrl;
  };

  return (
    <Button
      onClick={handleLogin}
      className={className || "w-full h-11 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-black text-white font-semibold shadow-lg hover:shadow-xl transition-all"}
    >
      {children || (
        <>
          <Shield className="w-5 h-5 mr-2" />
          Se connecter avec CYBERGARD AI
        </>
      )}
    </Button>
  );
}
