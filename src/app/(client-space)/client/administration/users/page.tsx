'use client';
import '@/app/styles/client-header.css';
import React, { useState, useEffect } from 'react';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Settings,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  BarChart3,
  ClipboardList,
  Shield,
  Building2,
  Mail,
  Calendar,
  User,
  X
} from 'lucide-react';
import UserSuccessModal from '@/app/(client-space)/client/administration/components/UserSuccessModal';
import DeleteUserModal from '@/app/(client-space)/client/administration/components/DeleteUserModal';
import UserDetailsModal from '@/app/(client-space)/client/administration/components/UserDetailsModal';
import AddUserModal from '@/app/(client-space)/client/administration/components/AddUserModal';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  created_by?: string;
  organization_name?: string;
  evaluations_count?: number;
  actions_count?: number;
  deleted_at?: string | null;
}

interface Role {
  code: string;
  label: string;
  description: string;
}

interface KPIStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_actions: number;
  total_evaluations: number;
}

// ⚠️ IMPORTANT : SUPER_ADMIN est exclu de cette liste car c'est un rôle système
// réservé pour l'espace ADMIN (platform-admin). Il ne doit pas être assignable
// aux utilisateurs clients dans l'espace client.
const AVAILABLE_ROLES: Role[] = [
  { code: 'RSSI', label: 'RSSI', description: 'Responsable de la Sécurité des Systèmes d\'Information' },
  { code: 'RSSI_EXTERNE', label: 'RSSI Externe', description: 'RSSI externe à l\'organisation' },
  { code: 'DIR_CONFORMITE_DPO', label: 'Directeur Conformité / DPO', description: 'Délégué à la Protection des Données' },
  { code: 'DPO_EXTERNE', label: 'DPO Externe', description: 'DPO externe à l\'organisation' },
  { code: 'CHEF_PROJET', label: 'Chef de Projet', description: 'Responsable de projet' },
  { code: 'AUDITEUR', label: 'Auditeur', description: 'Réalise les audits' },
  { code: 'AUDITE_RESP', label: 'Audité Responsable', description: 'Responsable audité' },
  { code: 'AUDITE_CONTRIB', label: 'Audité Contributeur', description: 'Contributeur audité' }
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<KPIStats>({
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    total_actions: 0,
    total_evaluations: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createdUser, setCreatedUser] = useState<{name: string; email: string; role: string} | null>(null);


  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  useEffect(() => {
    filterUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, showInactive]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Utilisateur non connecté');
      }

      const currentUser = JSON.parse(userStr);
      const tenantId = currentUser.tenantId;
      const orgId = currentUser.organizationId;
      const orgName = currentUser.organizationName;

      console.log('🔍 [USERS] Chargement pour tenant:', tenantId);

      // Charger les utilisateurs
      const usersResponse = await fetch(
        `/api/v1/user-management/users?tenant_id=${tenantId}&is_active=${!showInactive}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!usersResponse.ok) {
        // Capturer le code HTTP et le message détaillé pour un affichage cohérent
        const errorData = await usersResponse.json().catch(() => ({}));
        const statusCode = usersResponse.status;
        const errorMessage = errorData.detail || usersResponse.statusText || 'Erreur inconnue';
        throw new Error(`Erreur ${statusCode}: ${errorMessage}`);
      }

      const usersData = await usersResponse.json();
      const usersList = usersData.items || [];

      // Ajouter le nom de l'organisation à chaque utilisateur
      const usersWithOrg = usersList.map((user: User) => ({
        ...user,
        organization_name: orgName,
        evaluations_count: user.evaluations_count || 0,
        actions_count: user.actions_count || 0
      }));

      setUsers(usersWithOrg);

      // Calculer les stats
      const activeCount = usersList.filter((u: User) => u.is_active).length;
      const inactiveCount = usersList.filter((u: User) => !u.is_active).length;
      const totalActions = usersWithOrg.reduce((sum: number, u: User) => sum + (u.actions_count || 0), 0);
      const totalEvaluations = usersWithOrg.reduce((sum: number, u: User) => sum + (u.evaluations_count || 0), 0);

      setStats({
        total_users: usersList.length,
        active_users: activeCount,
        inactive_users: inactiveCount,
        total_actions: totalActions,
        total_evaluations: totalEvaluations
      });

      console.log('✅ [USERS] Chargés:', usersList.length);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ [USERS] Erreur:', err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filtre recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(term) ||
        user.first_name?.toLowerCase().includes(term) ||
        user.last_name?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term)
      );
    }

    // Filtre actif/inactif
    if (!showInactive) {
      filtered = filtered.filter(user => user.is_active);
    }

    setFilteredUsers(filtered);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreateUser = async (userData: any) => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) throw new Error('Utilisateur non connecté');

    const currentUser = JSON.parse(userStr);
    const tenantId = currentUser.tenantId;
    const organizationId = currentUser.organizationId;  // ✅ AJOUTER ICI

    console.log('📤 Création utilisateur:', {
      email: userData.email,
      organization_id: organizationId,      // Vision Agile
      default_org_id: userData.default_org_id,  // ARES SERVICES
      tenant_id: tenantId
    });

    const response = await fetch('/api/v1/user-management/admin/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role_code: userData.role_code,
        organization_id: organizationId,        // Organisation principale (Vision Agile)
        default_org_id: userData.default_org_id, // Organisme sélectionné (ex: ARES SERVICES) - sera lié via user_organization_role
        tenant_id: tenantId,
        send_activation_email: true
      })
    });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la création');
      }

      const result = await response.json();
      console.log('✅ Utilisateur créé:', result);

      // Stocker les infos de l'utilisateur créé
      const roleLabel = getRoleLabel(userData.role_code as string);
      setCreatedUser({
        name: `${userData.first_name} ${userData.last_name}`,
        email: userData.email as string,
        role: roleLabel
      });

      // Ouvrir la modal de succès
      setSuccessModalOpen(true);
      
      // Recharger la liste
      await loadUsers();

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur création:', err);
      throw err;
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(
        `/api/v1/user-management/${selectedUser.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        // Essayer de récupérer le message d'erreur du backend
        let errorMessage = 'Erreur lors de la désactivation';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      console.log('✅ Utilisateur désactivé:', selectedUser.email);

      setDeleteModalOpen(false);
      setSelectedUser(null);
      await loadUsers();

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur désactivation:', err);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  const getRoleLabel = (roleCode: string): string => {
    // Cas spécial pour SUPER_ADMIN (ne devrait pas exister en client, mais au cas où)
    if (roleCode === 'SUPER_ADMIN') {
      return 'Super Administrateur (Système)';
    }
    
    const role = AVAILABLE_ROLES.find(r => r.code === roleCode);
    return role ? role.label : roleCode;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des utilisateurs...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-indigo-600" />
              Gestion des Utilisateurs
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez les accès et permissions de votre organisation
            </p>
          </div>
        </div>
        {/* Contenu erreur */}
        <div className="flex-1">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={loadUsers}
            showBack={false}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error)}
            actionName="Gestion des Utilisateurs"
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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="w-8 h-8 mr-3 text-indigo-600" />
                Gestion des Utilisateurs
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gérez les accès et permissions de votre organisation
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => window.location.href = '/client/administration/roles'}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <Shield className="w-4 h-4 mr-2" />
                Rôles & Permissions
              </button>
              <button 
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un utilisateur
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {/* Utilisateurs Actifs */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Utilisateurs Actifs</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{stats.active_users}</p>
              </div>
              <div className="p-3 bg-green-600 rounded-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Utilisateurs Inactifs */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Utilisateurs Inactifs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.inactive_users}</p>
              </div>
              <div className="p-3 bg-gray-600 rounded-lg">
                <XCircle className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Total Utilisateurs */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Total Utilisateurs</p>
                <p className="text-3xl font-bold text-indigo-900 mt-2">{stats.total_users}</p>
              </div>
              <div className="p-3 bg-indigo-600 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Actions Globales */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Actions</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total_actions}</p>
              </div>
              <div className="p-3 bg-blue-600 rounded-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Évaluations */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Évaluations</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats.total_evaluations}</p>
              </div>
              <div className="p-3 bg-purple-600 rounded-lg">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Barre de Recherche et Filtres */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou rôle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`px-4 py-3 rounded-lg border-2 transition-colors flex items-center ${
              showInactive
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showInactive ? 'Afficher actifs uniquement' : 'Afficher inactifs'}
          </button>
        </div>

        {/* Tableau des Utilisateurs */}
        <div className="bg-white border-2 border-indigo-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Liste des Utilisateurs</h2>
                  <p className="text-sm text-gray-600">
                    {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Société
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Évaluations
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operations
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm 
                          ? 'Aucun utilisateur ne correspond à votre recherche'
                          : 'Aucun utilisateur trouvé'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          {user.organization_name || 'N/A'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          <Shield className="w-3 h-3 mr-1" />
                          {getRoleLabel(user.role)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {user.evaluations_count || 0}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {user.actions_count || 0}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {user.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactif
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setDetailsModalOpen(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {user.is_active && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Désactiver"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {user.is_active && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                            <div
                              className="p-1 text-gray-400 cursor-not-allowed rounded"
                              title="Les administrateurs ne peuvent pas être supprimés"
                            >
                              <Trash2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info bas de page */}
        <div className="mt-6 flex justify-between items-center text-sm text-gray-500">
          <div>
            {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} affiché{filteredUsers.length > 1 ? 's' : ''}
            {searchTerm && ' (filtrés)'}
          </div>
        </div>
      </div>

      {/* Modal Création Utilisateur */}
      <AddUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        availableRoles={AVAILABLE_ROLES}
      />

      {/* Modal Succès */}
      {successModalOpen && createdUser && (
        <UserSuccessModal
          isOpen={successModalOpen}
          onClose={() => {
            setSuccessModalOpen(false);
            setCreatedUser(null);
          }}
          userName={createdUser.name}
          userEmail={createdUser.email}
          userRole={createdUser.role}
          autoRedirect={false}
        />
      )}

      {/* Modal Détails Utilisateur */}
      {detailsModalOpen && selectedUser && (
        <UserDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          roleLabel={getRoleLabel(selectedUser.role)}
        />
      )}

      {/* Modal Suppression/Désactivation */}
      {deleteModalOpen && selectedUser && (
        <DeleteUserModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedUser(null);
          }}
          onConfirm={handleDeactivateUser}
          userName={`${selectedUser.first_name} ${selectedUser.last_name}`}
          userEmail={selectedUser.email}
        />
      )}
    </div>
  );
}