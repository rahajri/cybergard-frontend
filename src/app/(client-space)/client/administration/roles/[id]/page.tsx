'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Lock,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { invalidatePermissionsCache } from '@/hooks/usePermissions';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';

// ============================================================================
// TYPES
// ============================================================================

interface PermissionData {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface PermissionsGrouped {
  general: Record<string, Record<string, PermissionData>>;
  workflow: Record<string, Record<string, PermissionData>>;
  dependencies: Record<string, string[]>;
}

interface RoleDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  users_count: number;
  permissions_count: number;
  permissions: PermissionData[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ROLES NON MODIFIABLES (reserves au platform admin)
// ============================================================================

const READONLY_ROLES = ['ADMIN', 'SUPER_ADMIN'];

// ============================================================================
// CONFIGURATION DES MODULES
// ============================================================================

const MODULE_LABELS: Record<string, string> = {
  campaign: 'Campagnes',
  questionnaire: 'Questionnaires',
  users: 'Utilisateurs',
  ged: 'GED (Documents)',
  referential: 'Referentiels',
  dashboard: 'Dashboards',
  ecosystem: 'Ecosystemes',
  action: 'Actions',
  report: 'Rapports',
  reports: 'Rapports', // Alias pour workflow
  scanner: 'Scanner Externe (ASM)',
  ebios: 'EBIOS RM (Gestion des risques)'
};

const ACTION_LABELS: Record<string, string> = {
  // CRUD
  read: 'Lecture',
  create: 'Creation',
  update: 'Modification',
  delete: 'Suppression',
  write: 'Écriture',
  // Workflow
  validate: 'Validation',
  request_changes: 'Demande modif.',
  close: 'Cloture',
  // Scanner
  execute: 'Exécution',
  report: 'Rapports IA',
  // EBIOS RM
  freeze: 'Figer',
  generate: 'Générer (IA)',
  export: 'Exporter'
};

const GENERAL_MODULES_ORDER = [
  'campaign',
  'questionnaire',
  'users',
  'ged',
  'referential',
  'dashboard',
  'ecosystem',
  'action',
  'report',
  'scanner',
  'ebios'
];

const WORKFLOW_MODULES_ORDER = ['campaign', 'reports'];

const CRUD_ACTIONS_ORDER = ['read', 'create', 'update', 'write', 'delete', 'execute', 'report', 'freeze', 'generate', 'export'];
const WORKFLOW_ACTIONS_ORDER = ['validate', 'request_changes', 'close'];

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;

  // State
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [permissionsGrouped, setPermissionsGrouped] = useState<PermissionsGrouped | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general', 'workflow']));

  // Determiner si le role est en lecture seule (seulement ADMIN et SUPER_ADMIN)
  const isReadonly = role ? READONLY_ROLES.includes(role.code) : false;

  // ============================================================================
  // CHARGEMENT DES DONNEES
  // ============================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Utilisateur non connecte');
      }

      const currentUser = JSON.parse(userStr);
      const tenantId = currentUser.tenantId;

      // Charger le role avec ses permissions
      const roleResponse = await fetch(
        `/api/v1/roles/${roleId}?tenant_id=${tenantId}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!roleResponse.ok) {
        if (roleResponse.status === 404) {
          throw new Error('Role non trouve');
        }
        throw new Error('Erreur lors du chargement du role');
      }

      const roleData = await roleResponse.json();
      setRole(roleData);

      // Initialiser les permissions selectionnees
      const initialPermissions = new Set<string>(
        roleData.permissions?.map((p: PermissionData) => p.id) || []
      );
      setSelectedPermissions(initialPermissions);

      // Charger les permissions groupees
      const permissionsResponse = await fetch(
        `/api/v1/roles/permissions/grouped`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setPermissionsGrouped(permissionsData);
      }

      console.log('[ROLE] Charge:', roleData.name);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[ROLE] Erreur:', err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (roleId) {
      loadData();
    }
  }, [roleId, loadData]);

  // ============================================================================
  // GESTION DES PERMISSIONS
  // ============================================================================

  const togglePermission = (permissionId: string, permissionCode: string) => {
    if (isReadonly) return;

    const newSelected = new Set(selectedPermissions);
    const isEnabling = !newSelected.has(permissionId);

    if (isEnabling) {
      // Activer la permission
      newSelected.add(permissionId);

      // Activer automatiquement les dependances
      if (permissionsGrouped?.dependencies[permissionCode]) {
        for (const depCode of permissionsGrouped.dependencies[permissionCode]) {
          const depId = findPermissionIdByCode(depCode);
          if (depId) {
            newSelected.add(depId);
          }
        }
      }
    } else {
      // Desactiver la permission
      newSelected.delete(permissionId);

      // Desactiver les permissions qui dependent de celle-ci
      for (const [code, deps] of Object.entries(permissionsGrouped?.dependencies || {})) {
        if (deps.includes(permissionCode)) {
          const depId = findPermissionIdByCode(code);
          if (depId) {
            newSelected.delete(depId);
          }
        }
      }
    }

    setSelectedPermissions(newSelected);
    setHasChanges(true);
    setSaveMessage(null);
  };

  const findPermissionIdByCode = (code: string): string | null => {
    if (!permissionsGrouped) return null;

    // Chercher dans general
    for (const module of Object.values(permissionsGrouped.general)) {
      for (const perm of Object.values(module)) {
        if (perm.code === code) return perm.id;
      }
    }

    // Chercher dans workflow
    for (const module of Object.values(permissionsGrouped.workflow)) {
      for (const perm of Object.values(module)) {
        if (perm.code === code) return perm.id;
      }
    }

    return null;
  };

  const toggleAllForModule = (
    moduleKey: string,
    type: 'general' | 'workflow',
    enable: boolean
  ) => {
    if (isReadonly) return;

    const modulePerms = type === 'general'
      ? permissionsGrouped?.general[moduleKey]
      : permissionsGrouped?.workflow[moduleKey];

    if (!modulePerms) return;

    const newSelected = new Set(selectedPermissions);

    for (const perm of Object.values(modulePerms)) {
      if (enable) {
        newSelected.add(perm.id);
        // Activer les dependances
        if (permissionsGrouped?.dependencies[perm.code]) {
          for (const depCode of permissionsGrouped.dependencies[perm.code]) {
            const depId = findPermissionIdByCode(depCode);
            if (depId) newSelected.add(depId);
          }
        }
      } else {
        newSelected.delete(perm.id);
      }
    }

    setSelectedPermissions(newSelected);
    setHasChanges(true);
    setSaveMessage(null);
  };

  const toggleAllForAction = (action: string, type: 'general' | 'workflow', enable: boolean) => {
    if (isReadonly) return;

    const modules = type === 'general' ? permissionsGrouped?.general : permissionsGrouped?.workflow;
    if (!modules) return;

    const newSelected = new Set(selectedPermissions);

    for (const [, modulePerms] of Object.entries(modules)) {
      const perm = modulePerms[action];
      if (perm) {
        if (enable) {
          newSelected.add(perm.id);
          // Activer les dependances
          if (permissionsGrouped?.dependencies[perm.code]) {
            for (const depCode of permissionsGrouped.dependencies[perm.code]) {
              const depId = findPermissionIdByCode(depCode);
              if (depId) newSelected.add(depId);
            }
          }
        } else {
          newSelected.delete(perm.id);
          // Desactiver les dependants
          for (const [code, deps] of Object.entries(permissionsGrouped?.dependencies || {})) {
            if (deps.includes(perm.code)) {
              const depId = findPermissionIdByCode(code);
              if (depId) newSelected.delete(depId);
            }
          }
        }
      }
    }

    setSelectedPermissions(newSelected);
    setHasChanges(true);
    setSaveMessage(null);
  };

  // ============================================================================
  // SAUVEGARDE
  // ============================================================================

  const handleSave = async () => {
    if (!role || isReadonly) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const userStr = localStorage.getItem('user');
      const currentUser = JSON.parse(userStr || '{}');
      const tenantId = currentUser.tenantId;

      const response = await fetch(
        `/api/v1/roles/${roleId}/permissions?tenant_id=${tenantId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            permission_ids: Array.from(selectedPermissions)
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la sauvegarde');
      }

      setSaveMessage({ type: 'success', text: 'Permissions enregistrees avec succes' });
      setHasChanges(false);

      // Invalider le cache des permissions pour tous les utilisateurs de ce rôle
      invalidatePermissionsCache();

      // Recharger les donnees
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setSaveMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isModuleFullyEnabled = (moduleKey: string, type: 'general' | 'workflow'): boolean => {
    const modulePerms = type === 'general'
      ? permissionsGrouped?.general[moduleKey]
      : permissionsGrouped?.workflow[moduleKey];

    if (!modulePerms) return false;

    return Object.values(modulePerms).every((perm) => selectedPermissions.has(perm.id));
  };

  const isActionFullyEnabled = (action: string, type: 'general' | 'workflow'): boolean => {
    const modules = type === 'general' ? permissionsGrouped?.general : permissionsGrouped?.workflow;
    if (!modules) return false;

    let hasAtLeastOne = false;
    for (const modulePerms of Object.values(modules)) {
      if (modulePerms[action]) {
        hasAtLeastOne = true;
        if (!selectedPermissions.has(modulePerms[action].id)) {
          return false;
        }
      }
    }

    return hasAtLeastOne;
  };

  // ============================================================================
  // RENDU
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du role...</p>
        </div>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorDisplay
          type={getErrorTypeFromMessage(error || 'Role non trouvé')}
          customMessage={error || 'Role non trouvé'}
          onRetry={loadData}
          showBack={true}
          showHome={true}
          permissionCode={extractPermissionCodeFromMessage(error || '')}
          actionName="Gestion des Permissions du Rôle"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <button
                  onClick={() => router.push('/client/administration/roles')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Retour aux roles"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className={`p-2 rounded-lg ${role.is_system ? 'bg-purple-100' : 'bg-indigo-100'}`}>
                  {role.is_system ? (
                    <Lock className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Shield className="w-6 h-6 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
                  <p className="text-sm text-gray-500">
                    Code: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{role.code}</span>
                    {role.is_system && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Lock className="w-3 h-3 mr-1" />
                        Role systeme
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {role.description && (
                <p className="mt-1 text-sm text-gray-600 ml-[60px]">{role.description}</p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {hasChanges && (
                <span className="text-sm text-amber-600 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  Modifications non sauvegardees
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || isReadonly || !hasChanges}
                className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                  isReadonly || !hasChanges
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message de sauvegarde */}
      {saveMessage && (
        <div className={`mx-8 mt-4 p-4 rounded-lg flex items-center ${
          saveMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {saveMessage.text}
        </div>
      )}

      {/* Avertissement role en lecture seule (uniquement ADMIN et SUPER_ADMIN) */}
      {isReadonly && (
        <div className="mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center text-amber-700">
          <Lock className="w-5 h-5 mr-2" />
          <span>Ce role est reserve a l'administration de la plateforme et ne peut pas etre modifie.</span>
        </div>
      )}

      {/* Contenu Principal */}
      <div className="flex-1 max-w-[1600px] mx-auto px-8 py-8 w-full">
        {/* Stats du role */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Utilisateurs assignes</p>
            <p className="text-2xl font-bold text-gray-900">{role.users_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Permissions actives</p>
            <p className="text-2xl font-bold text-gray-900">{selectedPermissions.size}</p>
          </div>
        </div>

        {/* ================================================================== */}
        {/* TABLEAU 1 - PERMISSIONS GENERALES (CRUD) */}
        {/* ================================================================== */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8 overflow-hidden">
          <button
            onClick={() => toggleSection('general')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200 hover:from-indigo-100 hover:to-indigo-150 transition-colors"
          >
            <div className="flex items-center">
              {expandedSections.has('general') ? (
                <ChevronDown className="w-5 h-5 text-indigo-600 mr-2" />
              ) : (
                <ChevronRight className="w-5 h-5 text-indigo-600 mr-2" />
              )}
              <Shield className="w-5 h-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-indigo-900">Permissions generales (CRUD)</h2>
            </div>
            <span className="text-sm text-indigo-600">
              {Object.keys(permissionsGrouped?.general || {}).length} modules
            </span>
          </button>

          {expandedSections.has('general') && permissionsGrouped && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                      Module
                    </th>
                    {CRUD_ACTIONS_ORDER.map((action) => (
                      <th
                        key={action}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <div className="flex flex-col items-center">
                          <span className="mb-2">{ACTION_LABELS[action]}</span>
                          {!isReadonly && (
                            <button
                              onClick={() => toggleAllForAction(action, 'general', !isActionFullyEnabled(action, 'general'))}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                              title={isActionFullyEnabled(action, 'general') ? 'Tout desactiver' : 'Tout activer'}
                            >
                              {isActionFullyEnabled(action, 'general') ? (
                                <ToggleRight className="w-4 h-4" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tout
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {GENERAL_MODULES_ORDER.filter((m) => permissionsGrouped.general[m]).map((moduleKey) => {
                    const modulePerms = permissionsGrouped.general[moduleKey];
                    const isFullyEnabled = isModuleFullyEnabled(moduleKey, 'general');

                    return (
                      <tr key={moduleKey} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                              <Shield className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="font-medium text-gray-900">
                              {MODULE_LABELS[moduleKey] || moduleKey}
                            </span>
                          </div>
                        </td>
                        {CRUD_ACTIONS_ORDER.map((action) => {
                          const perm = modulePerms[action];
                          if (!perm) {
                            return (
                              <td key={action} className="px-4 py-4 text-center">
                                <span className="text-gray-300">—</span>
                              </td>
                            );
                          }

                          const isEnabled = selectedPermissions.has(perm.id);

                          return (
                            <td key={action} className="px-4 py-4 text-center">
                              <div className="flex justify-center">
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={() => togglePermission(perm.id, perm.code)}
                                  disabled={isReadonly}
                                  className={isReadonly ? 'opacity-50 cursor-not-allowed' : ''}
                                />
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-4 text-center">
                          {!isReadonly && (
                            <button
                              onClick={() => toggleAllForModule(moduleKey, 'general', !isFullyEnabled)}
                              className={`p-2 rounded-lg transition-colors ${
                                isFullyEnabled
                                  ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={isFullyEnabled ? 'Tout desactiver' : 'Tout activer'}
                            >
                              {isFullyEnabled ? (
                                <ToggleRight className="w-5 h-5" />
                              ) : (
                                <ToggleLeft className="w-5 h-5" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* TABLEAU 2 - PERMISSIONS WORKFLOW */}
        {/* ================================================================== */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('workflow')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 hover:from-purple-100 hover:to-purple-150 transition-colors"
          >
            <div className="flex items-center">
              {expandedSections.has('workflow') ? (
                <ChevronDown className="w-5 h-5 text-purple-600 mr-2" />
              ) : (
                <ChevronRight className="w-5 h-5 text-purple-600 mr-2" />
              )}
              <CheckCircle className="w-5 h-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-purple-900">Permissions Workflow (Validation)</h2>
            </div>
            <span className="text-sm text-purple-600">
              {Object.keys(permissionsGrouped?.workflow || {}).length} modules
            </span>
          </button>

          {expandedSections.has('workflow') && permissionsGrouped && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                      Module Workflow
                    </th>
                    {WORKFLOW_ACTIONS_ORDER.map((action) => {
                      // Verifier si au moins un module a cette action
                      const hasThisAction = Object.values(permissionsGrouped.workflow).some(
                        (m) => m[action]
                      );
                      if (!hasThisAction) return null;

                      return (
                        <th
                          key={action}
                          className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          <div className="flex flex-col items-center">
                            <span className="mb-2">{ACTION_LABELS[action]}</span>
                            {!isReadonly && (
                              <button
                                onClick={() => toggleAllForAction(action, 'workflow', !isActionFullyEnabled(action, 'workflow'))}
                                className="text-xs text-purple-600 hover:text-purple-800 flex items-center"
                                title={isActionFullyEnabled(action, 'workflow') ? 'Tout desactiver' : 'Tout activer'}
                              >
                                {isActionFullyEnabled(action, 'workflow') ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tout
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {WORKFLOW_MODULES_ORDER.filter((m) => permissionsGrouped.workflow[m]).map((moduleKey) => {
                    const modulePerms = permissionsGrouped.workflow[moduleKey];
                    const isFullyEnabled = isModuleFullyEnabled(moduleKey, 'workflow');

                    return (
                      <tr key={moduleKey} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-purple-50 rounded-lg mr-3">
                              <CheckCircle className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="font-medium text-gray-900">
                              {MODULE_LABELS[moduleKey] || moduleKey}
                            </span>
                          </div>
                        </td>
                        {WORKFLOW_ACTIONS_ORDER.map((action) => {
                          // Verifier si cette colonne existe pour un module quelconque
                          const columnExists = Object.values(permissionsGrouped.workflow).some(
                            (m) => m[action]
                          );
                          if (!columnExists) return null;

                          const perm = modulePerms[action];
                          if (!perm) {
                            return (
                              <td key={action} className="px-4 py-4 text-center">
                                <span className="text-gray-300">—</span>
                              </td>
                            );
                          }

                          const isEnabled = selectedPermissions.has(perm.id);

                          return (
                            <td key={action} className="px-4 py-4 text-center">
                              <div className="flex justify-center">
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={() => togglePermission(perm.id, perm.code)}
                                  disabled={isReadonly}
                                  className={isReadonly ? 'opacity-50 cursor-not-allowed' : ''}
                                />
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-4 text-center">
                          {!isReadonly && (
                            <button
                              onClick={() => toggleAllForModule(moduleKey, 'workflow', !isFullyEnabled)}
                              className={`p-2 rounded-lg transition-colors ${
                                isFullyEnabled
                                  ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={isFullyEnabled ? 'Tout desactiver' : 'Tout activer'}
                            >
                              {isFullyEnabled ? (
                                <ToggleRight className="w-5 h-5" />
                              ) : (
                                <ToggleLeft className="w-5 h-5" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info sur les dependances */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Dependances automatiques</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li><strong>Modification</strong> necessite <strong>Lecture</strong></li>
                <li><strong>Suppression</strong> necessite <strong>Modification</strong> et <strong>Lecture</strong></li>
                <li>Les dependances sont activees/desactivees automatiquement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
