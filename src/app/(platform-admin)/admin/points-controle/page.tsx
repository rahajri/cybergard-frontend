'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Activity,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Power,
  PowerOff,
  Sparkles,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Target,
  Search,
  Network
} from 'lucide-react';
import { toast } from 'sonner';
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
import DeleteConfirmModal from '@/app/components/shared/DeleteConfirmModal';
import SuccessToast from '@/components/shared/SuccessToast';
import ToggleActiveModal from './components/ToggleActiveModal';

type Framework = {
  id: string;
  code: string;
  name: string;
  version: string;
  requirements_count: number;
  control_points_count: number;
  coverage_percentage: number;
  is_active: boolean;
  import_date: string;
  ai_generated?: boolean;
};

type Stats = {
  total_frameworks: number;
  total_requirements: number;
  active_frameworks: number;
  last_sync: string;
};

export default function PointsControlePage() {
  const router = useRouter();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_frameworks: 0,
    total_requirements: 0,
    active_frameworks: 0,
    last_sync: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // États pour les modales
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/control-points/frameworks-with-pc`);
      if (!res.ok) throw new Error('Erreur chargement');

      const data = await res.json();

      const items: Framework[] = (data.frameworks || []).map((f: unknown) => {
        const fw = f as Record<string, unknown>;
        return {
          id: fw.id as string,
          code: fw.code as string,
          name: fw.name as string,
          version: fw.version as string,
          requirements_count: (fw.requirements_count as number) ?? 0,
          control_points_count: (fw.control_points_count as number) ?? 0,
          coverage_percentage: (fw.coverage_percentage as number) ?? 0,
          is_active: (typeof fw.is_active === 'boolean') ? fw.is_active : true,
          import_date: (fw.import_date as string) || (fw.created_at as string) || new Date().toISOString(),
          ai_generated: Boolean(fw.ai_generated),
        };
      });

      setFrameworks(items);
      setStats({
        total_frameworks: data.total ?? items.length,
        total_requirements: items.reduce((sum, it) => sum + (it.requirements_count || 0), 0),
        active_frameworks: items.filter((f: Framework) => f.is_active).length,
        last_sync: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur:', error);
      setFrameworks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateEmbeddings = async (frameworkId: string) => {
    setGeneratingEmbeddings(frameworkId);
    try {
      const res = await fetch(`${API}/api/v1/frameworks/${frameworkId}/generate-embeddings`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Erreur génération');

      await fetchData();

      toast.custom(() => (
        <SuccessToast
          title="Embeddings générés"
          message="Les embeddings ont été générés avec succès"
        />
      ), { duration: 5000 });
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setGeneratingEmbeddings(null);
    }
  };

  const handleToggleActive = (framework: Framework) => {
    setSelectedFramework(framework);
    setToggleModalOpen(true);
  };

  const confirmToggleActive = async () => {
    if (!selectedFramework) return;

    try {
      const res = await fetch(`${API}/api/v1/frameworks/${selectedFramework.id}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !selectedFramework.is_active })
      });

      if (!res.ok) throw new Error('Erreur changement statut');

      await fetchData();

      toast.custom(() => (
        <SuccessToast
          title={`Référentiel ${!selectedFramework.is_active ? 'activé' : 'désactivé'}`}
          message={`Le référentiel ${selectedFramework.code} est maintenant ${!selectedFramework.is_active ? 'actif' : 'inactif'}`}
          details={[
            { label: 'Code', value: selectedFramework.code },
            { label: 'Statut', value: !selectedFramework.is_active ? 'Actif' : 'Inactif' }
          ]}
        />
      ), { duration: 5000 });
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleDelete = (framework: Framework) => {
    setSelectedFramework(framework);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedFramework) return;

    try {
      const res = await fetch(
        `${API}/api/v1/control-points/framework/${selectedFramework.id}/control-points`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Erreur suppression des PCs');

      await fetchData();

      toast.custom(() => (
        <SuccessToast
          title="Points de contrôle supprimés"
          message="Tous les PC du référentiel ont été supprimés"
          details={[
            { label: 'Référentiel', value: selectedFramework.code },
            { label: 'PC supprimés', value: selectedFramework.control_points_count || 0 }
          ]}
        />
      ), { duration: 5000 });

      setDeleteModalOpen(false);
      setSelectedFramework(null);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPcBadge = (pcCount: number) => {
    if (pcCount > 0) {
      return (
        <Badge className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          {pcCount} PC(s)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        Aucun
      </Badge>
    );
  };

  const filteredFrameworks = frameworks.filter(fw => {
    const matchesSearch = fw.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fw.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && fw.is_active) ||
                         (statusFilter === 'inactive' && !fw.is_active);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des points de contrôle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* 🔥 HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Section Gauche : Titre + Description */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Points de Contrôle
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Validation et gestion des points de contrôle de sécurité
                </p>
              </div>
            </div>

            {/* Section Droite : Boutons */}
            <div className="flex items-center gap-2 sm:gap-3 justify-end flex-wrap">
              <Button onClick={fetchData} variant="outline" size="sm" className="group relative" title="Actualiser">
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden md:inline">Actualiser</span>
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap md:hidden z-10">
                  Actualiser
                </span>
              </Button>
              <Button
                onClick={() => router.push("/admin/points-controle/cross-referentiels")}
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 group relative"
                title="Cross-Référentiels"
              >
                <Network className="w-4 h-4 sm:mr-2" />
                <span className="hidden lg:inline">Cross-Référentiels</span>
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap lg:hidden z-10">
                  Cross-Référentiels
                </span>
              </Button>
              <Button
                onClick={() => router.push("/admin/points-controle/generation")}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 group relative"
                title="Générer via IA"
              >
                <Sparkles className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Générer via IA</span>
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap sm:hidden z-10">
                  Générer via IA
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu qui défile */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Total Référentiels</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total_frameworks}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                  <Database className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Exigences Totales</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total_requirements.toLocaleString()}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Référentiels Actifs</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.active_frameworks}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Dernière Synchro</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold truncate">{formatDate(stats.last_sync)}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche et filtres */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Barre de recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Rechercher un référentiel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>

              {/* Filtre statut */}
              <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as 'all' | 'active' | 'inactive')}>
                <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] text-sm sm:text-base">
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

        {/* Tableau des Référentiels */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Référentiels avec Points de Contrôle ({filteredFrameworks.length})</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm hidden sm:block">
              Gestion des points de contrôle par référentiel
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {filteredFrameworks.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <Database className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Aucun référentiel trouvé'
                    : 'Aucun référentiel importé'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Commencez par importer un référentiel'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Référentiel</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Exigences</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Points de Contrôle</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Couverture</TableHead>
                        <TableHead className="text-xs sm:text-sm">Statut</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFrameworks.map((fw) => (
                        <TableRow key={fw.id}>
                          <TableCell className="py-2 sm:py-4">
                            <div className="font-medium text-sm sm:text-base">{fw.code}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                              {fw.name} v{fw.version}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                              Importé le {formatDate(fw.import_date)}
                            </div>
                            {fw.ai_generated && (
                              <div className="text-[10px] sm:text-xs text-purple-600 flex items-center gap-1 mt-1">
                                <Sparkles className="w-3 h-3" />
                                <span className="hidden sm:inline">Généré via IA</span>
                                <span className="sm:hidden">IA</span>
                              </div>
                            )}
                            {/* Mobile: afficher PC count inline */}
                            <div className="sm:hidden mt-1">
                              {getPcBadge(fw.control_points_count || 0)}
                            </div>
                          </TableCell>

                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-600 text-xs">
                              {fw.requirements_count}
                            </Badge>
                          </TableCell>

                          <TableCell className="hidden sm:table-cell">{getPcBadge(fw.control_points_count || 0)}</TableCell>

                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-600 text-xs">
                              {`${fw.coverage_percentage?.toFixed?.(2) ?? 0}%`}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {fw.is_active ? (
                              <Badge className="bg-green-600 text-[10px] sm:text-xs">
                                <CheckCircle className="w-3 h-3 mr-0.5 sm:mr-1" />
                                <span className="hidden sm:inline">Actif</span>
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] sm:text-xs">
                                <PowerOff className="w-3 h-3 mr-0.5 sm:mr-1" />
                                <span className="hidden sm:inline">Inactif</span>
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5 sm:gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/points-controle/${fw.id}`)}
                                className="p-1 sm:p-2 group relative"
                                title="Voir les détails"
                              >
                                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Voir
                                </span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(fw)}
                                className="p-1 sm:p-2 group relative hidden sm:flex"
                                title={fw.is_active ? 'Désactiver' : 'Activer'}
                              >
                                {fw.is_active ? (
                                  <PowerOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                ) : (
                                  <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                )}
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  {fw.is_active ? 'Désactiver' : 'Activer'}
                                </span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateEmbeddings(fw.id)}
                                disabled={generatingEmbeddings === fw.id}
                                className="p-1 sm:p-2 group relative hidden md:flex"
                                title="Générer embeddings"
                              >
                                {generatingEmbeddings === fw.id ? (
                                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                )}
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Embeddings
                                </span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/referentiels/${fw.id}/export`)}
                                className="p-1 sm:p-2 group relative hidden lg:flex"
                                title="Exporter"
                              >
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Exporter
                                </span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(fw)}
                                className="p-1 sm:p-2 group relative"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
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

                <div className="mt-3 sm:mt-4 px-4 sm:px-0 pb-4 sm:pb-0 text-xs sm:text-sm text-muted-foreground">
                  {filteredFrameworks.length} référentiel(s) avec Points de Contrôle
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modales */}
      {deleteModalOpen && selectedFramework && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedFramework(null);
          }}
          onConfirm={confirmDelete}
          title="Confirmation de suppression"
          warningMessage="Vous êtes sur le point de supprimer définitivement tous les points de contrôle du référentiel"
          itemCode={selectedFramework.code}
          itemName={selectedFramework.name}
          elements={[
            { count: selectedFramework.control_points_count || 0, label: "Points de contrôle", color: "blue" },
            { count: selectedFramework.requirements_count || 0, label: "Liaisons avec exigences", color: "green" },
            { count: "∞", label: "Embeddings et mappings associés", color: "yellow" },
          ]}
        />
      )}

      {toggleModalOpen && selectedFramework && (
        <ToggleActiveModal
          isOpen={toggleModalOpen}
          onClose={() => {
            setToggleModalOpen(false);
            setSelectedFramework(null);
          }}
          onConfirm={confirmToggleActive}
          currentStatus={selectedFramework.is_active}
          itemCode={selectedFramework.code}
          itemName={selectedFramework.name}
        />
      )}
    </div>
  );
}
