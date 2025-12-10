'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Save,
  X,
  Plus,
  Trash2,
  Edit,
  Shield,
  UserCog,
  Mail,
  Phone
} from 'lucide-react';

// Types
interface Organization {
  id: string;
  tenant_id: string;
  name: string;
  domain?: string;
  email?: string;
  phone?: string;
  country_code: string;
  category?: string;
  activity?: string;
  workforce?: number;
  siret?: string;
  naf?: string;
  naf_title?: string;
  subscription_type: string;
  is_active: boolean;
  max_suppliers: number;
  max_auditors: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'super_admin' | 'tenant_admin' | 'org_admin' | 'auditor' | 'user';
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login?: string;
}

interface TenantStats {
  total_users: number;
  active_users: number;
  max_users: number;
  remaining_slots: number;
  role_breakdown: Record<string, number>;
}

// Composants
const OrganizationEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  // État
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'users'>('info');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formulaire organisation
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    email: '',
    phone: '',
    siret: '',
    workforce: '',
  });

  // Charger les données
  useEffect(() => {
    loadOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      
      // Charger l'organisation
      const orgRes = await fetch(`/api/admin/organizations/${organizationId}`);
      if (!orgRes.ok) throw new Error('Organisation non trouvée');
      const orgData = await orgRes.json();
      setOrganization(orgData);
      
      // Initialiser le formulaire
      setFormData({
        name: orgData.name || '',
        domain: orgData.domain || '',
        email: orgData.email || '',
        phone: orgData.phone || '',
        siret: orgData.siret || '',
        workforce: orgData.workforce?.toString() || '',
      });

      // Charger les admins du tenant
      const adminsRes = await fetch(`/api/admin/users/tenant/${orgData.tenant_id}/admins`);
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.items || []);
      }

      // Charger les stats
      const statsRes = await fetch(`/api/admin/users/tenant/${orgData.tenant_id}/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      const updateData = {
        name: formData.name,
        domain: formData.domain || null,
        email: formData.email || null,
        phone: formData.phone || null,
        siret: formData.siret || null,
        workforce: formData.workforce ? parseInt(formData.workforce) : null,
      };

      const res = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Erreur de mise à jour');
      }

      const updated = await res.json();
      setOrganization(updated);
      setSuccess('Organisation mise à jour avec succès');
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erreur de suppression');

      setAdmins(admins.filter(u => u.id !== userId));
      setSuccess('Utilisateur supprimé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Erreur de modification du statut');

      const updated = await res.json();
      setAdmins(admins.map(u => u.id === userId ? updated : u));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de modification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Organisation non trouvée</h2>
          <button
            onClick={() => router.push('/admin/clients')}
            className="text-blue-600 hover:underline"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                <p className="text-gray-600">
                  {organization.domain || 'Aucun domaine'} • {organization.subscription_type}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/admin/clients')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Fermer
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Onglets */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Informations
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Utilisateurs Admin
                  {stats && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {stats.active_users}/{stats.max_users}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6">
            {activeTab === 'info' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Informations générales */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Informations générales
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom de l'organisation *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Domaine
                      </label>
                      <input
                        type="text"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="exemple.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contact@exemple.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+33 1 23 45 67 89"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Informations métier */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Informations métier
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SIRET
                      </label>
                      <input
                        type="text"
                        value={formData.siret}
                        onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                        placeholder="12345678901234"
                        maxLength={14}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effectif
                      </label>
                      <input
                        type="number"
                        value={formData.workforce}
                        onChange={(e) => setFormData({ ...formData, workforce: e.target.value })}
                        placeholder="50"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push('/admin/clients')}
                    className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                
                {/* En-tête et statistiques */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Gestion des utilisateurs admin
                    </h3>
                    {stats && (
                      <p className="text-sm text-gray-600 mt-1">
                        {stats.active_users} utilisateurs actifs sur {stats.max_users} maximum
                        {stats.remaining_slots > 0 && (
                          <span className="text-green-600 ml-2">
                            ({stats.remaining_slots} places disponibles)
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    disabled={!!(stats && stats.remaining_slots === 0)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un admin
                  </button>
                </div>

                {/* Liste des utilisateurs */}
                <div className="space-y-4">
                  {admins.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Aucun utilisateur admin</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Ajoutez des utilisateurs pour gérer cette organisation
                      </p>
                    </div>
                  ) : (
                    admins.map((user) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${
                            user.is_active ? 'bg-green-100' : 'bg-gray-300'
                          }`}>
                            {user.role === 'tenant_admin' ? (
                              <Shield className="w-5 h-5 text-green-600" />
                            ) : (
                              <UserCog className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                user.role === 'tenant_admin' 
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {user.role === 'tenant_admin' ? 'Admin Tenant' : 'Admin Organisation'}
                              </span>
                              {!user.is_active && (
                                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                                  Inactif
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                            {user.phone && (
                              <p className="text-sm text-gray-500 mt-0.5">{user.phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleUserStatus(user.id)}
                            className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
                            title={user.is_active ? 'Désactiver' : 'Activer'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:bg-white rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'ajout d'utilisateur */}
      {showAddUserModal && (
        <AddUserModal
          tenantId={organization.tenant_id}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            setShowAddUserModal(false);
            loadOrganization();
          }}
        />
      )}
    </div>
  );
};

// Composant Modal pour ajouter un utilisateur
const AddUserModal = ({ 
  tenantId, 
  onClose, 
  onSuccess 
}: { 
  tenantId: string; 
  onClose: () => void; 
  onSuccess: () => void; 
}) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    role: 'org_admin' as 'tenant_admin' | 'org_admin',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tenant_id: tenantId,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Erreur de création');
      }

      onSuccess();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Ajouter un utilisateur admin</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prénom *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="org_admin">Admin Organisation</option>
              <option value="tenant_admin">Admin Tenant</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Création...' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationEditPage;
