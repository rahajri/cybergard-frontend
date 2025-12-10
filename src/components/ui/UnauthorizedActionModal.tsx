'use client';

import { useState, useMemo, useEffect } from 'react';
import { Lock, X, ShieldAlert, MessageSquare, Send, CheckCircle, Loader2, Check } from 'lucide-react';
import { Button } from './button';
import { authenticatedFetch } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export interface UnauthorizedActionModalProps {
  /** Modal ouvert ou fermé */
  isOpen: boolean;
  /** Callback de fermeture */
  onClose: () => void;
  /** Nom de l'action tentée (ex: "créer une campagne") */
  actionName: string;
  /** Code de la permission requise (ex: "CAMPAIGN_CREATE") */
  permissionCode?: string;
  /** Message personnalisé (optionnel) */
  customMessage?: string;
  /** Afficher le bouton pour contacter l'admin */
  showContactAdmin?: boolean;
}

// ============================================================================
// MAPPING DES PERMISSIONS PAR MODULE
// ============================================================================

interface PermissionInfo {
  code: string;
  label: string;
}

interface ModulePermissions {
  name: string;
  icon: string;
  color: string;
  permissions: PermissionInfo[];
}

const MODULES: Record<string, ModulePermissions> = {
  CAMPAIGN: {
    name: "Campagnes",
    icon: "📋",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    permissions: [
      { code: "CAMPAIGN_CREATE", label: "Créer des campagnes" },
      { code: "CAMPAIGN_READ", label: "Voir les campagnes" },
      { code: "CAMPAIGN_UPDATE", label: "Modifier des campagnes" },
      { code: "CAMPAIGN_DELETE", label: "Supprimer des campagnes" },
      { code: "CAMPAIGN_LAUNCH", label: "Lancer des campagnes" },
      { code: "CAMPAIGN_FREEZE", label: "Figer des campagnes" },
      { code: "CAMPAIGN_DOCUMENTS_READ", label: "Voir les documents des campagnes" },
    ]
  },
  GED: {
    name: "Documents (GED)",
    icon: "📁",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    permissions: [
      { code: "GED_READ", label: "Consulter les documents" },
      { code: "GED_CREATE", label: "Ajouter des documents" },
      { code: "GED_UPDATE", label: "Modifier des documents" },
      { code: "GED_DELETE", label: "Supprimer des documents" },
    ]
  },
  SCANNER: {
    name: "Scanner Externe",
    icon: "🔍",
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    permissions: [
      { code: "SCANNER_READ", label: "Consulter les scans" },
      { code: "SCANNER_CREATE", label: "Lancer des scans" },
      { code: "SCANNER_UPDATE", label: "Modifier les cibles" },
      { code: "SCANNER_DELETE", label: "Supprimer des scans" },
    ]
  },
  ACTIONS: {
    name: "Actions",
    icon: "⚡",
    color: "bg-violet-100 text-violet-800 border-violet-200",
    permissions: [
      { code: "ACTIONS_READ", label: "Consulter les actions" },
      { code: "ACTIONS_CREATE", label: "Créer des actions" },
      { code: "ACTIONS_UPDATE", label: "Modifier des actions" },
      { code: "ACTIONS_DELETE", label: "Supprimer des actions" },
    ]
  },
  ECOSYSTEM: {
    name: "Écosystème",
    icon: "🏢",
    color: "bg-green-100 text-green-800 border-green-200",
    permissions: [
      { code: "ECOSYSTEM_CREATE", label: "Créer des entités" },
      { code: "ECOSYSTEM_READ", label: "Voir l'écosystème" },
      { code: "ECOSYSTEM_UPDATE", label: "Modifier l'écosystème" },
      { code: "ECOSYSTEM_DELETE", label: "Supprimer des entités" },
    ]
  },
  USERS: {
    name: "Utilisateurs",
    icon: "👥",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    permissions: [
      { code: "USERS_CREATE", label: "Créer des utilisateurs" },
      { code: "USERS_READ", label: "Voir les utilisateurs" },
      { code: "USERS_UPDATE", label: "Modifier des utilisateurs" },
      { code: "USERS_DELETE", label: "Supprimer des utilisateurs" },
    ]
  },
  ROLE: {
    name: "Rôles",
    icon: "🔑",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    permissions: [
      { code: "ROLE_CREATE", label: "Créer des rôles" },
      { code: "ROLE_READ", label: "Voir les rôles" },
      { code: "ROLE_UPDATE", label: "Modifier des rôles" },
      { code: "ROLE_DELETE", label: "Supprimer des rôles" },
    ]
  },
  REPORT: {
    name: "Rapports",
    icon: "📊",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    permissions: [
      { code: "REPORT_CREATE", label: "Créer des rapports" },
      { code: "REPORT_READ", label: "Voir les rapports" },
      { code: "REPORT_UPDATE", label: "Modifier des rapports" },
      { code: "REPORT_DELETE", label: "Supprimer des rapports" },
    ]
  },
  ACTION_PLAN: {
    name: "Plans d'action",
    icon: "✅",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    permissions: [
      { code: "ACTION_PLAN_CREATE", label: "Créer des plans d'action" },
      { code: "ACTION_PLAN_READ", label: "Voir les plans d'action" },
      { code: "ACTION_PLAN_UPDATE", label: "Modifier des plans d'action" },
      { code: "ACTION_PLAN_DELETE", label: "Supprimer des plans d'action" },
    ]
  },
  QUESTIONNAIRE: {
    name: "Questionnaires",
    icon: "📝",
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    permissions: [
      { code: "QUESTIONNAIRE_CREATE", label: "Créer des questionnaires" },
      { code: "QUESTIONNAIRE_READ", label: "Voir les questionnaires" },
      { code: "QUESTIONNAIRE_UPDATE", label: "Modifier des questionnaires" },
      { code: "QUESTIONNAIRE_DELETE", label: "Supprimer des questionnaires" },
    ]
  },
  REFERENTIAL: {
    name: "Référentiels",
    icon: "📚",
    color: "bg-rose-100 text-rose-800 border-rose-200",
    permissions: [
      { code: "REFERENTIAL_CREATE", label: "Créer des référentiels" },
      { code: "REFERENTIAL_READ", label: "Voir les référentiels" },
      { code: "REFERENTIAL_UPDATE", label: "Modifier des référentiels" },
      { code: "REFERENTIAL_DELETE", label: "Supprimer des référentiels" },
    ]
  },
  EBIOS: {
    name: "EBIOS RM",
    icon: "🎯",
    color: "bg-red-100 text-red-800 border-red-200",
    permissions: [
      { code: "EBIOS_READ", label: "Consulter les analyses EBIOS" },
      { code: "EBIOS_CREATE", label: "Créer des analyses EBIOS" },
      { code: "EBIOS_UPDATE", label: "Modifier des analyses EBIOS" },
      { code: "EBIOS_DELETE", label: "Supprimer des analyses EBIOS" },
      { code: "EBIOS_FREEZE", label: "Figer une analyse EBIOS" },
      { code: "EBIOS_GENERATE", label: "Générer via IA (EBIOS)" },
    ]
  },
};

// Mapping permission code -> label
const PERMISSION_LABELS: Record<string, string> = {};
Object.values(MODULES).forEach(module => {
  module.permissions.forEach(perm => {
    PERMISSION_LABELS[perm.code] = perm.label;
  });
});

/**
 * Obtenir le label lisible d'une permission
 */
export function getPermissionLabel(permissionCode: string): string {
  return PERMISSION_LABELS[permissionCode] || permissionCode;
}

/**
 * Obtenir le module d'une permission à partir de son code
 */
function getModuleFromPermission(permissionCode: string): string | null {
  for (const [moduleKey, moduleData] of Object.entries(MODULES)) {
    if (moduleData.permissions.some(p => p.code === permissionCode)) {
      return moduleKey;
    }
  }
  return null;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function UnauthorizedActionModal({
  isOpen,
  onClose,
  actionName,
  permissionCode,
  customMessage,
  showContactAdmin = true
}: UnauthorizedActionModalProps) {
  // État pour le formulaire de demande
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Détecter le module à partir de la permission initiale
  const currentModule = useMemo(() => {
    if (!permissionCode) return null;
    return getModuleFromPermission(permissionCode);
  }, [permissionCode]);

  const moduleData = currentModule ? MODULES[currentModule] : null;

  // Initialiser automatiquement avec la permission qui a déclenché le modal
  // quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && permissionCode) {
      // Pré-sélectionner la permission qui a déclenché l'ouverture
      setSelectedPermissions([permissionCode]);
    }
    if (!isOpen) {
      // Reset quand le modal se ferme
      setSelectedPermissions([]);
      setShowRequestForm(false);
      setRequestMessage('');
      setRequestSent(false);
      setError(null);
    }
  }, [isOpen, permissionCode]);

  if (!isOpen) return null;

  const permissionLabel = permissionCode ? getPermissionLabel(permissionCode) : null;

  const togglePermission = (code: string) => {
    setSelectedPermissions(prev =>
      prev.includes(code)
        ? prev.filter(p => p !== code)
        : [...prev, code]
    );
  };

  const handleSendRequest = async () => {
    if (selectedPermissions.length === 0) {
      setError('Veuillez sélectionner au moins une permission');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Envoyer une demande pour chaque permission sélectionnée
      // ou une seule demande avec toutes les permissions
      const permissionsText = selectedPermissions
        .map(p => getPermissionLabel(p))
        .join(', ');

      const response = await authenticatedFetch('/api/v1/discussions/rights-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission_code: selectedPermissions.join(', '),
          action_name: moduleData ? `Module ${moduleData.name}` : actionName,
          message: requestMessage.trim()
            ? `${requestMessage}\n\nPermissions demandées:\n${permissionsText}`
            : `Permissions demandées:\n${permissionsText}`
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Erreur lors de l\'envoi de la demande');
      }

      setRequestSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    // Reset est géré par useEffect quand isOpen devient false
    onClose();
  };

  const handleOpenRequestForm = () => {
    // La permission est déjà pré-sélectionnée via useEffect
    setShowRequestForm(true);
  };

  // Vue après envoi réussi
  if (requestSent) {
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-8 text-center relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-xl font-semibold text-white">
              Demande envoyée !
            </h2>
          </div>

          <div className="px-6 py-6">
            <div className="text-center mb-6">
              <p className="text-gray-700 mb-4">
                Votre demande d'accès a été envoyée aux administrateurs.
              </p>
              <p className="text-sm text-gray-500">
                Vous recevrez une notification lorsque votre demande sera traitée.
                Vous pouvez également suivre la conversation dans le module <strong>Discussions</strong>.
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Vue formulaire de demande (style Discussions - teal) avec liste de permissions
  if (showRequestForm) {
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header style Discussions */}
          <div className="bg-teal-600 px-6 py-5 relative flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Demande de droits
                </h2>
                <p className="text-sm text-teal-100">
                  {moduleData ? `Module ${moduleData.name}` : 'Sélectionnez les permissions'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {/* Badge du module */}
            {moduleData && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 border ${moduleData.color}`}>
                <span>{moduleData.icon}</span>
                <span>{moduleData.name}</span>
              </div>
            )}

            {/* Liste des permissions à cocher */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Permissions demandées
              </label>
              <div className="space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
                {moduleData?.permissions.map((perm) => (
                  <label
                    key={perm.code}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPermissions.includes(perm.code)
                        ? 'bg-teal-50 border border-teal-200'
                        : 'bg-white border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedPermissions.includes(perm.code)
                          ? 'bg-teal-600 text-white'
                          : 'border-2 border-slate-300'
                      }`}
                    >
                      {selectedPermissions.includes(perm.code) && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perm.code)}
                      onChange={() => togglePermission(perm.code)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-700">{perm.label}</span>
                      {perm.code === permissionCode && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Action bloquée
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {selectedPermissions.length} permission(s) sélectionnée(s)
              </p>
            </div>

            {/* Zone de message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message (optionnel)
              </label>
              <div className="border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent">
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Expliquez pourquoi vous avez besoin de ces permissions..."
                  rows={3}
                  className="w-full px-4 py-3 resize-none focus:outline-none text-sm"
                  maxLength={2000}
                />
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-t border-slate-200">
                  <p className="text-xs text-slate-400">
                    {requestMessage.length} / 2000 caractères
                  </p>
                </div>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <X className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowRequestForm(false)}
                variant="outline"
                className="flex-1 text-slate-600 hover:bg-slate-100"
                disabled={isSending}
              >
                Retour
              </Button>
              <Button
                onClick={handleSendRequest}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                disabled={isSending || selectedPermissions.length === 0}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue initiale (action non autorisée)
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header avec icône */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-center relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-xl font-semibold text-white">
              Action non autorisée
            </h2>
          </div>

          {/* Contenu */}
          <div className="px-6 py-6">
            <div className="text-center mb-6">
              <p className="text-gray-700 mb-4">
                {customMessage || (
                  <>
                    Vous n'avez pas la permission de <strong>{actionName}</strong>.
                  </>
                )}
              </p>

              {permissionCode && (
                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Permission requise : <strong>{permissionLabel}</strong></span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500 text-center mb-6">
              Contactez votre administrateur si vous pensez que vous devriez avoir accès à cette fonctionnalité.
            </p>

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {showContactAdmin && permissionCode && (
                <Button
                  onClick={handleOpenRequestForm}
                  variant="outline"
                  className="flex-1 border-teal-300 text-teal-700 hover:bg-teal-50"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Demander l'accès
                </Button>
              )}

              <Button
                onClick={handleClose}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              >
                J'ai compris
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UnauthorizedActionModal;
