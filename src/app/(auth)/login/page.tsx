'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LOGIN_TEXT } from '@/constants/text';
import { KeycloakLoginButton } from '@/components/KeycloakLoginButton';
import Image from 'next/image';

export default function LoginPage() {
  // ✅ Authentification gérée uniquement par Keycloak

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#8B0000] p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-gray-700 bg-[#2c2c2c]">
          <CardHeader className="space-y-4 text-center pb-8 pt-8">
            {/* Logo Cybergard */}
            <div className="flex justify-center mb-4">
              <div className="relative w-60 h-60">
                <Image
                  src="/logo.png"
                  alt="Cybergard AI Logo"
                  width={240}
                  height={240}
                  className="drop-shadow-lg"
                  priority
                />
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-white">
                CYBERGARD AI
              </CardTitle>
              <CardDescription className="text-base text-gray-300">
                Plateforme d'audit cybersécurité multi-référentiels
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {/* ✅ Connexion uniquement via Keycloak */}
            <div className="space-y-4">
              <KeycloakLoginButton />

              <div className="text-center text-sm bg-amber-900/30 p-4 rounded-lg border border-amber-700/50">
                <p className="font-medium text-amber-200">
                  🔐 Authentification sécurisée via Keycloak
                </p>
                <p className="mt-2 text-xs text-amber-300/80">
                  Tous les utilisateurs doivent se connecter via le système centralisé d'authentification Keycloak.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-300">
            &copy; {new Date().getFullYear()} CYBERGARD AI. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}