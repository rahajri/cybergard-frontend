'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { KeycloakLogoutButton } from './KeycloakLogoutButton';
import { User, LogOut, Shield, ChevronDown, ExternalLink } from 'lucide-react';
import { getRoleLabel } from '@/utils/labels';

export function UserMenu() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Ouvrir Keycloak Account Console
  const openKeycloakAccount = () => {
    const keycloakAccountUrl = `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/account`;
    window.open(keycloakAccountUrl, '_blank');
    setIsOpen(false);
  };

  // Générer les initiales pour l'avatar
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  // Couleur du badge selon le rôle
  const getRoleBadgeColor = () => {
    const roleNormalized = user.role?.toLowerCase();
    switch (roleNormalized) {
      case 'super_admin':
      case 'platform_admin':
        return 'bg-red-900 text-white';
      case 'auditeur':
      case 'auditor':
        return 'bg-purple-900 text-white';
      case 'rssi':
        return 'bg-indigo-900 text-white';
      case 'dpo':
      case 'dir_conformite_dpo':
        return 'bg-blue-900 text-white';
      case 'chef_projet':
        return 'bg-green-900 text-white';
      case 'client':
        return 'bg-cyan-900 text-white';
      default:
        return 'bg-gray-900 text-white';
    }
  };

  // Utiliser le label depuis utils/labels.ts
  const roleLabel = getRoleLabel(user.role);

  return (
    <div className="relative">
      {/* Bouton du menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-800 transition-colors"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-800 to-red-900 flex items-center justify-center text-white font-bold flex-shrink-0">
          {initials}
        </div>

        {/* Info utilisateur */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>

        {/* Icône déroulant */}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <>
          {/* Overlay pour fermer en cliquant ailleurs */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-20 overflow-hidden">
            {/* Header du menu */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-800 to-red-900 flex items-center justify-center text-white font-bold text-lg">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* Badge rôle */}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor()}`}>
                <Shield className="w-3 h-3" />
                {roleLabel}
              </div>
            </div>

            {/* Options du menu */}
            <div className="p-2">
              <button
                className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors text-sm justify-between"
                onClick={openKeycloakAccount}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  Mon profil & Paramètres
                </div>
                <ExternalLink className="w-3 h-3 text-gray-500" />
              </button>

              <div className="px-3 py-1">
                <p className="text-xs text-gray-500 italic">
                  Géré via Keycloak
                </p>
              </div>

              <div className="border-t border-slate-700 my-2" />

              {/* Bouton de déconnexion */}
              <KeycloakLogoutButton className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-red-900/20 text-red-400 hover:text-red-300 transition-colors text-sm border-0 bg-transparent justify-start">
                <LogOut className="w-4 h-4" />
                Déconnexion
              </KeycloakLogoutButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
