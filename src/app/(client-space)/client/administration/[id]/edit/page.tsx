// frontend/app/client/organizations/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Building2,
  Users,
  Save,
  ArrowLeft,
  Shield,
  Plus,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Organization {
  id: string;
  name: string;
  legal_name: string;
  siret?: string;
  siren?: string;
  main_email?: string;
  main_phone?: string;
  address_line1?: string;
  postal_code?: string;
  city?: string;
  tenant_id: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  permissions: {
    is_admin?: boolean;
    can_manage_users?: boolean;
    can_manage_audits?: boolean;
    can_manage_ecosystem?: boolean;
  };
}

interface Tenant {
  id: string;
  name: string;
  max_users: number;
  current_users: number;
}

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;

  // États
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Charger les données
  useEffect(() => {
    fetchOrganizationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'organisation
      const orgResponse = await fetch(`${API_BASE}/api/v1/admin/organizations/${organizationId}`);
      if (!orgResponse.ok) throw new Error('Erreur lors du chargement de l\'organisation');
      const orgData = await orgResponse.json();
      setOrganization(orgData);

      // Récupérer les utilisateurs
      let usersTotal = 0;
      const usersResponse = await fetch(
        `${API_BASE}/api/v1/users/organization/${organizationId}?tenant_id=${orgData.tenant_id}`
      );
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
        usersTotal = usersData.total || 0;
      }

      // Récupérer les infos du tenant
      // TODO: Créer endpoint pour récupérer tenant avec compteur d'utilisateurs
      setTenant({
        id: orgData.tenant_id,
        name: orgData.name,
        max_users: 10, // TODO: Récupérer depuis l'API
        current_users: usersTotal
      });
      
      setError('');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organization) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`${API_BASE}/api/v1/admin/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organization)
      });
      
      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
      
      setSuccess('Organisation mise à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = () => {
    setShowAddUserModal(true);
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) return;
    
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/users/${userId}/organization/${organizationId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) throw new Error('Erreur lors de la désactivation');
      
      // Recharger la liste
      fetchOrganizationData();
      setSuccess('Utilisateur désactivé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    }
  };

  const getRoleName = (roleCode: string): string => {
    const roleNames: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'RSSI': 'RSSI',
      'RSSI_EXTERNE': 'RSSI Externe',
      'DIR_CONFORMITE_DPO': 'Directeur Conformité / DPO',
      'DPO_EXTERNE': 'DPO Externe',
      'CHEF_PROJET': 'Chef de Projet',
      'AUDITEUR': 'Auditeur',
      'AUDITE_RESP': 'Audité (Responsable)',
      'AUDITE_CONTRIB': 'Audité (Contributeur)'
    };
    return roleNames[roleCode] || roleCode;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Organisation introuvable</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {organization.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Gestion de l'organisation et des utilisateurs
            </p>
          </div>
          
          <Button
            onClick={handleSaveOrganization}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="w-4 h-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Utilisateurs ({users.length})
          </TabsTrigger>
        </TabsList>

        {/* Onglet Informations */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'organisation</CardTitle>
              <CardDescription>
                Gérez les informations de votre organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom commercial</Label>
                  <Input
                    value={organization.name}
                    onChange={(e) => setOrganization({
                      ...organization,
                      name: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>Raison sociale</Label>
                  <Input
                    value={organization.legal_name}
                    onChange={(e) => setOrganization({
                      ...organization,
                      legal_name: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>SIRET</Label>
                  <Input
                    value={organization.siret || ''}
                    onChange={(e) => setOrganization({
                      ...organization,
                      siret: e.target.value
                    })}
                    placeholder="12345678901234"
                  />
                </div>
                
                <div>
                  <Label>Email principal</Label>
                  <Input
                    type="email"
                    value={organization.main_email || ''}
                    onChange={(e) => setOrganization({
                      ...organization,
                      main_email: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={organization.main_phone || ''}
                    onChange={(e) => setOrganization({
                      ...organization,
                      main_phone: e.target.value
                    })}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label>Adresse</Label>
                  <Input
                    value={organization.address_line1 || ''}
                    onChange={(e) => setOrganization({
                      ...organization,
                      address_line1: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>Code postal</Label>
                  <Input
                    value={organization.postal_code || ''}
                    onChange={(e) => setOrganization({
                      ...organization,
                      postal_code: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>Ville</Label>
                  <Input
                    value={organization.city || ''}
                    onChange={(e) => setOrganization({
                      ...organization,
                      city: e.target.value
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          {/* Alerte limite utilisateurs */}
          {tenant && tenant.current_users >= tenant.max_users && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ Limite d'utilisateurs atteinte ({tenant.current_users}/{tenant.max_users}).
                Contactez votre administrateur pour augmenter la limite.
              </AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Utilisateurs administrateurs</CardTitle>
                  <CardDescription>
                    Gérez les utilisateurs ayant accès à votre organisation
                  </CardDescription>
                </div>
                
                <Button
                  onClick={handleAddUser}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un utilisateur
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun utilisateur pour le moment</p>
                  <p className="text-sm mt-2">
                    Ajoutez un administrateur pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {user.first_name} {user.last_name}
                            </span>
                            {user.permissions.is_admin && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                                Admin
                              </span>
                            )}
                            {!user.is_active && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                Inactif
                              </span>
                            )}
                            {!user.is_email_verified && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                En attente
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getRoleName(user.role)}
                            {user.last_login_at && (
                              <> • Dernière connexion: {new Date(user.last_login_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Ouvrir modal d'édition
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal d'ajout d'utilisateur */}
      {showAddUserModal && (
        <AddUserModal
          organizationId={organizationId}
          tenantId={organization.tenant_id}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            setShowAddUserModal(false);
            fetchOrganizationData();
          }}
        />
      )}
    </div>
  );
}

// Composant Modal d'ajout d'utilisateur (sera créé séparément)
function AddUserModal({
  onClose,
  onSuccess
}: {
  organizationId: string;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return <div>Modal à implémenter</div>;
}