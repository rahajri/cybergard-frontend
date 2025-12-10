'use client';
import '@/app/styles/client-header.css';
import React, { useState, useEffect } from 'react';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import {
  Shield,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Users,
  Key,
  Settings,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  users_count: number;
  permissions_count: number;
  created_at: string;
  updated_at: string;
}

interface RoleStats {
  total_roles: number;
  system_roles: number;
  custom_roles: number;
  total_users_with_roles: number;
  total_permissions: number;
}

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [stats, setStats] = useState<RoleStats>({
    total_roles: 0,
    system_roles: 0,
    custom_roles: 0,
    total_users_with_roles: 0,
    total_permissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeSystem, setIncludeSystem] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [includeSystem]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Utilisateur non connecte');
      }

      const currentUser = JSON.parse(userStr);
      const tenantId = currentUser.tenantId;

      console.log('[ROLES] Chargement pour tenant:', tenantId);

      // Charger les roles
      const rolesResponse = await fetch(
        `/api/v1/roles?tenant_id=${tenantId}&include_system=${includeSystem}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!rolesResponse.ok) {
        // Capturer le code HTTP et le message détaillé pour un affichage cohérent
        const errorData = await rolesResponse.json().catch(() => ({}));
        const statusCode = rolesResponse.status;
        const errorMessage = errorData.detail || rolesResponse.statusText || 'Erreur inconnue';
        throw new Error(`Erreur ${statusCode}: ${errorMessage}`);
      }

      const rolesData = await rolesResponse.json();
      setRoles(rolesData.items || []);

      // Charger les stats
      const statsResponse = await fetch(
        `/api/v1/roles/stats?tenant_id=${tenantId}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Charger les permissions
      const permissionsResponse = await fetch(
        `/api/v1/roles/permissions`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setPermissions(permissionsData.items || []);
      }

      console.log('[ROLES] Charges:', rolesData.items?.length || 0);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('[ROLES] Erreur:', err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Roles a ne jamais afficher (reserves au systeme)
  const HIDDEN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

  const filteredRoles = roles.filter(role => {
    // Exclure les roles reserves (ADMIN et SUPER_ADMIN)
    if (HIDDEN_ROLES.includes(role.code)) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      role.code.toLowerCase().includes(term) ||
      role.name.toLowerCase().includes(term) ||
      role.description?.toLowerCase().includes(term)
    );
  });

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: formData.code.toUpperCase().replace(/\s+/g, '_'),
          name: formData.name,
          description: formData.description || null,
          is_system: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la creation');
      }

      console.log('[ROLES] Role cree');
      setCreateModalOpen(false);
      setFormData({ code: '', name: '', description: '' });
      await loadData();

    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setFormError(null);
    setSubmitting(true);

    try {
      const userStr = localStorage.getItem('user');
      const currentUser = JSON.parse(userStr || '{}');
      const tenantId = currentUser.tenantId;

      const response = await fetch(`/api/v1/roles/${selectedRole.id}?tenant_id=${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la mise a jour');
      }

      console.log('[ROLES] Role mis a jour');
      setEditModalOpen(false);
      setSelectedRole(null);
      setFormData({ code: '', name: '', description: '' });
      await loadData();

    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setSubmitting(true);

    try {
      const userStr = localStorage.getItem('user');
      const currentUser = JSON.parse(userStr || '{}');
      const tenantId = currentUser.tenantId;

      const response = await fetch(`/api/v1/roles/${selectedRole.id}?tenant_id=${tenantId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }

      console.log('[ROLES] Role supprime');
      setDeleteModalOpen(false);
      setSelectedRole(null);
      await loadData();

    } catch (err: unknown) {
      const error = err as Error;
      alert(`Erreur: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description || ''
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const openDeleteModal = (role: Role) => {
    setSelectedRole(role);
    setDeleteModalOpen(true);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header Sticky même en cas d'erreur */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.location.href = '/client/administration/users'}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Retour aux utilisateurs"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Shield className="w-8 h-8 mr-3 text-indigo-600" />
                Gestion des Rôles
              </h1>
            </div>
          </div>
        </div>
        {/* Contenu erreur */}
        <div className="flex-1">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={loadData}
            showBack={true}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error)}
            actionName="Gestion des Rôles"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <button
                  onClick={() => window.location.href = '/client/administration/users'}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Retour aux utilisateurs"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Shield className="w-8 h-8 mr-3 text-indigo-600" />
                  Roles & Permissions
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-600 ml-11">
                Gerez les roles et leurs permissions associees
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setFormData({ code: '', name: '', description: '' });
                  setFormError(null);
                  setCreateModalOpen(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Creer un role
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {/* Total Roles */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Total Roles</p>
                <p className="text-3xl font-bold text-indigo-900 mt-2">{stats.total_roles}</p>
              </div>
              <div className="p-3 bg-indigo-600 rounded-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Roles Systeme */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Roles Systeme</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats.system_roles}</p>
              </div>
              <div className="p-3 bg-purple-600 rounded-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Roles Personnalises */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Roles Personnalises</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{stats.custom_roles}</p>
              </div>
              <div className="p-3 bg-green-600 rounded-lg">
                <Settings className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Utilisateurs avec Roles */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Utilisateurs</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total_users_with_roles}</p>
              </div>
              <div className="p-3 bg-blue-600 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Permissions</p>
                <p className="text-3xl font-bold text-amber-900 mt-2">{stats.total_permissions}</p>
              </div>
              <div className="p-3 bg-amber-600 rounded-lg">
                <Key className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Recherche */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Toggle Roles Systeme */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSystem}
                onChange={(e) => setIncludeSystem(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Afficher les roles systeme</span>
            </label>
          </div>
        </div>

        {/* Liste des Roles */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateurs
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cree le
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun role trouve</p>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-3 ${
                          role.is_system
                            ? 'bg-purple-100'
                            : 'bg-indigo-100'
                        }`}>
                          {role.is_system ? (
                            <Lock className={`w-5 h-5 text-purple-600`} />
                          ) : (
                            <Shield className={`w-5 h-5 text-indigo-600`} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{role.name}</p>
                          {role.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{role.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm font-mono rounded">
                        {role.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {role.is_system ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Lock className="w-3 h-3 mr-1" />
                          Systeme
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Settings className="w-3 h-3 mr-1" />
                          Personnalise
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                        <Users className="w-4 h-4 mr-1" />
                        {role.users_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
                        <Key className="w-4 h-4 mr-1" />
                        {role.permissions_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(role.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {!role.is_system && (
                          <>
                            <button
                              onClick={() => openEditModal(role)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(role)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                              disabled={role.users_count > 0}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => window.location.href = `/client/administration/roles/${role.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir les details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Creation */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Plus className="w-5 h-5 mr-2 text-indigo-600" />
                Creer un nouveau role
              </h2>
            </div>
            <form onSubmit={handleCreateRole}>
              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code du role *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ex: MANAGER"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Sera converti en majuscules</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du role *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ex: Manager"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Description du role..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creation...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Creer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edition */}
      {editModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Edit2 className="w-5 h-5 mr-2 text-indigo-600" />
                Modifier le role
              </h2>
            </div>
            <form onSubmit={handleUpdateRole}>
              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code du role
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">Le code ne peut pas etre modifie</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du role *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedRole(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {deleteModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                Supprimer le role
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600">
                Etes-vous sur de vouloir supprimer le role <strong>{selectedRole.name}</strong> ?
              </p>
              {selectedRole.users_count > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-700 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Ce role est assigne a {selectedRole.users_count} utilisateur(s). Vous devez d'abord retirer ce role a ces utilisateurs.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedRole(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                disabled={submitting || selectedRole.users_count > 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
