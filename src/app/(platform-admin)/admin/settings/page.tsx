'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, User, Building, Lock, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
        <p className="text-gray-400">Gérez vos préférences et la sécurité de votre compte</p>
      </div>

      <div className="space-y-6">
        {/* Sécurité du compte */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Sécurité du compte</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Mot de passe</p>
                <p className="text-sm text-gray-400">Dernière modification il y a 30 jours</p>
              </div>
              <Button
                onClick={() => setIsPasswordModalOpen(true)}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Modifier
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div>
                <p className="text-white font-medium">Authentification à deux facteurs (2FA)</p>
                <p className="text-sm text-gray-400">Ajoutez une couche de sécurité supplémentaire</p>
              </div>
              <Button
                onClick={() => {
                  // Redirection vers Keycloak pour configurer 2FA
                  window.location.href = `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/account/#/security/signingin`;
                }}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Configurer
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Notifications par email</p>
                <p className="text-sm text-gray-400">Recevez des alertes de sécurité par email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div>
                <p className="text-white font-medium">Notifications dans l'application</p>
                <p className="text-sm text-gray-400">Afficher les notifications dans l'interface</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Compte Keycloak */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Compte Keycloak</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-400 mb-4">
              Accédez à votre compte Keycloak pour gérer vos informations personnelles,
              votre sécurité et vos sessions actives.
            </p>
            <Button
              onClick={() => {
                window.open(
                  `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/account`,
                  '_blank'
                );
              }}
              className="bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800"
            >
              Ouvrir mon compte Keycloak
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          // Optionnel: afficher une notification de succès
          console.log('Mot de passe changé avec succès');
        }}
      />
    </div>
  );
}
