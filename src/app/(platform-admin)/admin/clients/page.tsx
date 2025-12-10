'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Crown,
  RefreshCw,
  Eye,
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trash2,
  Search,
  Power,
  PowerOff,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DeleteOrganizationModal from './components/DeleteOrganizationModal';
import ToggleOrganizationActive from './components/ToggleOrganizationActive';
import ViewClientModal from './components/ViewClientModal';
import SuccessToast from '@/components/shared/SuccessToast';
import { toast } from 'sonner';
import type { Organization } from '@/types/organization';
import type { ClientStats } from '@/types/stats';
import {
  getOrganizations,
  getOrganizationsStats,
  getUserCountByOrganization,
  deleteOrganization,
  toggleOrganizationActive
} from '@/lib/api/organizations';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Organization[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    total_clients: 0,
    active_clients: 0,
    inactive_clients: 0,
    total_users: 0,
    premium_clients: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Organization | null>(null);
  const [userCount, setUserCount] = useState(0);

  const fetchClients = async () => {
    try {
      setLoading(true);

      const data = await getOrganizations(1000);
      const organizations = data.items || [];

      const premiumClients = organizations.filter((c) =>
        ['professional', 'enterprise'].includes(c.subscription_type)
      ).length;

      let statsData: ClientStats = {
        total_clients: organizations.length,
        active_clients: organizations.filter((c) => c.is_active).length,
        inactive_clients: organizations.filter((c) => !c.is_active).length,
        total_users: organizations.reduce((sum, c) => sum + (c.employee_count || 0), 0),
        premium_clients: premiumClients
      };

      try {
        const realStats = await getOrganizationsStats();
        statsData = {
          total_clients: realStats.total_clients || organizations.length,
          active_clients: realStats.active_clients || organizations.filter((c) => c.is_active).length,
          inactive_clients: realStats.inactive_clients || organizations.filter((c) => !c.is_active).length,
          total_users: realStats.total_users || organizations.reduce((sum, c) => sum + (c.employee_count || 0), 0),
          premium_clients: premiumClients
        };
      } catch {
        // Utilise les stats calculées localement si l'endpoint stats échoue
      }

      setClients(organizations);
      setStats(statsData);
      setError(null);

    } catch (err) {
      console.error('Erreur chargement clients:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchUserCount = async (organizationId: string): Promise<number> => {
    try {
      const count = await getUserCountByOrganization(organizationId);
      console.log('📊 Nombre d\'utilisateurs pour organisation', organizationId, ':', count);
      return count;
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      return 0;
    }
  };

  const handleOpenView = async (client: Organization) => {
    setSelectedClient(client);
    const count = await fetchUserCount(client.id);
    setUserCount(count);
    setViewModalOpen(true);
  };

  const handleOpenDelete = async (client: Organization) => {
    setSelectedClient(client);
    const count = await fetchUserCount(client.id);
    setUserCount(count);
    setDeleteModalOpen(true);
  };

  const handleOpenToggle = async (client: Organization) => {
    setSelectedClient(client);
    const count = await fetchUserCount(client.id);
    setUserCount(count);
    setToggleModalOpen(true);
  };

  const handleDeleteOrganization = async () => {
    if (!selectedClient) return;

    try {
      await deleteOrganization(selectedClient.id);

      toast.custom(() => (
        <SuccessToast
          title="Client supprimé !"
          message={`${selectedClient.name} a été supprimé avec succès`}
          details={[
            { label: 'Utilisateurs supprimés', value: userCount },
            { label: 'Organisation', value: selectedClient.name }
          ]}
        />
      ));

      setDeleteModalOpen(false);
      setSelectedClient(null);

      await fetchClients();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async () => {
    if (!selectedClient) return;

    try {
      await toggleOrganizationActive(selectedClient.id, !selectedClient.is_active);

      const action = selectedClient.is_active ? 'désactivé' : 'activé';
      toast.custom(() => (
        <SuccessToast
          title={`Client ${action} !`}
          message={`${selectedClient.name} a été ${action} avec succès`}
          details={[
            { label: 'Utilisateurs impactés', value: userCount },
            { label: 'Nouveau statut', value: !selectedClient.is_active ? 'Actif' : 'Inactif' }
          ]}
        />
      ));

      setToggleModalOpen(false);
      setSelectedClient(null);

      await fetchClients();
    } catch (error) {
      console.error('Erreur toggle:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification');
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.sector?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && client.is_active) ||
                         (statusFilter === 'inactive' && !client.is_active);

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubscriptionBadge = (type: string) => {
    const config: { [key: string]: { className: string; label: string } } = {
      free: { className: 'bg-gray-100 text-gray-600', label: 'Gratuit' },
      professional: { className: 'bg-blue-100 text-blue-600', label: 'Professionnel' },
      enterprise: { className: 'bg-yellow-100 text-yellow-700', label: 'Enterprise' }
    };

    const cfg = config[type] || config.free;

    return (
      <Badge variant="secondary" className={cfg.className}>
        {cfg.label}
      </Badge>
    );
  };

  const getSizeBadge = (category?: string, count?: number) => {
    if (count) {
      return <span className="text-sm text-muted-foreground">{count} employés</span>;
    }

    const labels: { [key: string]: string } = {
      'MIC': 'Micro-entreprise',
      'PME': 'PME',
      'ETI': 'ETI',
      'GE': 'Grande Entreprise',
      'micro': 'Micro (1-10)',
      'small': 'Petite (11-50)',
      'medium': 'Moyenne (51-250)',
      'large': 'Grande (251+)'
    };

    return (
      <span className="text-sm text-muted-foreground">
        {category ? labels[category] || category : 'Non renseigné'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchClients}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">

      {/* 🔥 STICKY HEADER - Responsive */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Titre - Responsive */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Clients
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Gestion des organisations clientes et des tenants
                </p>
              </div>
            </div>

            {/* Actions - Responsive */}
            <div className="flex items-center gap-2 sm:gap-3 justify-end">
              <Button
                onClick={fetchClients}
                variant="outline"
                size="sm"
                className="group relative"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden md:inline">Actualiser</span>
                {/* Tooltip mobile */}
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap md:hidden z-10">
                  Actualiser
                </span>
              </Button>
              <Button
                onClick={() => router.push('/admin/clients/nouveau')}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau client</span>
                <span className="sm:hidden text-sm">Nouveau</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu qui défile */}
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* Statistiques - Grid responsive 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Total Clients</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total_clients}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Clients Actifs</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.active_clients}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Clients Premium</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.premium_clients}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-yellow-100 text-yellow-600 flex-shrink-0">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Utilisateurs Total</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total_users}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche et filtres - Responsive */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>

              <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as 'active' | 'inactive' | 'all')}>
                <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] text-sm">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs uniquement</SelectItem>
                  <SelectItem value="inactive">Inactifs uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des Clients - Responsive */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Organisations Clientes ({filteredClients.length})</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Liste complète des organisations clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Aucun client trouvé'
                    : 'Aucun client enregistré'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Commencez par créer votre premier client'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => router.push('/admin/clients/nouveau')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau client
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Client</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Abonnement</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Taille</TableHead>
                      <TableHead className="text-xs sm:text-sm">Statut</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden xl:table-cell">Créé le</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="font-medium truncate max-w-[150px] sm:max-w-none">{client.name}</div>
                          {client.domain && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{client.domain}</div>
                          )}
                          {client.sector && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none hidden sm:block">{client.sector}</div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">{getSubscriptionBadge(client.subscription_type)}</TableCell>

                        <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                          {getSizeBadge(client.category || client.size_category, client.workforce || client.employee_count)}
                        </TableCell>

                        <TableCell className="text-xs sm:text-sm">
                          {client.is_active ? (
                            <Badge className="bg-green-600 text-[10px] sm:text-xs">
                              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              <span className="hidden sm:inline">Actif</span>
                              <span className="sm:hidden">✓</span>
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] sm:text-xs">
                              <PowerOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                              <span className="hidden sm:inline">Inactif</span>
                              <span className="sm:hidden">✗</span>
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-xs sm:text-sm hidden xl:table-cell">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {formatDate(client.created_at)}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenView(client)}
                              className="group relative p-1 sm:p-2"
                              title="Voir les détails"
                            >
                              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Voir
                              </span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/clients/${client.id}/edit`)}
                              className="group relative p-1 sm:p-2"
                              title="Éditer"
                            >
                              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Éditer
                              </span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenToggle(client)}
                              className="group relative p-1 sm:p-2"
                              title={client.is_active ? "Désactiver" : "Activer"}
                            >
                              {client.is_active ? <PowerOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {client.is_active ? "Désactiver" : "Activer"}
                              </span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(client)}
                              className="group relative p-1 sm:p-2"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Supprimer
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                <div className="mt-4 px-4 sm:px-0 text-xs sm:text-sm text-muted-foreground">
                  {stats.active_clients} sur {stats.total_clients} clients actifs
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </main>

      {/* Modals */}
      {selectedClient && (
        <>
          {viewModalOpen && (
            <ViewClientModal
              isOpen={viewModalOpen}
              onClose={() => {
                setViewModalOpen(false);
                setSelectedClient(null);
              }}
              client={selectedClient}
              userCount={userCount}
            />
          )}

          <DeleteOrganizationModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedClient(null);
            }}
            onConfirm={handleDeleteOrganization}
            organizationName={selectedClient.name}
            organizationDomain={selectedClient.domain}
            userCount={userCount}
            tenantId={selectedClient.tenant_id}
          />

          <ToggleOrganizationActive
            isOpen={toggleModalOpen}
            onClose={() => {
              setToggleModalOpen(false);
              setSelectedClient(null);
            }}
            onConfirm={handleToggleActive}
            currentStatus={selectedClient.is_active}
            organizationName={selectedClient.name}
            organizationDomain={selectedClient.domain}
            userCount={userCount}
          />
        </>
      )}
    </div>
  );
}
