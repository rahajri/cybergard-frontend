'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Activity,
  Upload,
  BookOpen,
  Eye,
  Power,
  PowerOff,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DeleteConfirmModal from '@/app/components/shared/DeleteConfirmModal';
import SuccessToast from '@/components/shared/SuccessToast';
import ToggleActiveModal from './components/ToggleActiveModal';
import type { Framework, FrameworkStats } from '@/types/framework';
import {
  getCrossReferentialSummary,
  getFramework,
  getFrameworkHierarchy,
  toggleFrameworkActive,
  deleteFramework,
  generateFrameworkEmbeddings,
  exportFramework
} from '@/lib/api/frameworks';

export default function ReferentielsPage() {
  const router = useRouter();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [globalStats, setGlobalStats] = useState<FrameworkStats>({
    total_frameworks: 0,
    total_requirements: 0,
    total_embeddings: 0,
    total_mappings: 0,
    average_embedding_coverage: 0,
    frameworks_with_mappings: 0,
    last_sync: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<any | null>(null);
  const [successToast, setSuccessToast] = useState<any | null>(null);
  const [toggleModal, setToggleModal] = useState<any | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  const fetchCrossReferentialData = async () => {
    try {
      const data = await getCrossReferentialSummary();

      if (data && data.global_stats && data.frameworks) {
        const adaptedGlobalStats = {
          ...data.global_stats,
          last_sync: new Date().toISOString()
        };

        setGlobalStats(adaptedGlobalStats);
        setFrameworks(data.frameworks);
      } else {
        console.warn('Structure de données inattendue:', data);
        handleApiError();
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement données cross-référentiels:', error);
      setApiError(true);
      handleApiError();
      setLoading(false);
    }
  };

  const handleApiError = () => {
    setGlobalStats({
      total_frameworks: 0,
      total_requirements: 0,
      total_embeddings: 0,
      total_mappings: 0,
      average_embedding_coverage: 0,
      frameworks_with_mappings: 0,
      last_sync: new Date().toISOString()
    });
    setFrameworks([]);
  };

  const handleToggleActiveClick = (framework: Framework) => {
    setToggleModal({
      isOpen: true,
      frameworkId: framework.id,
      frameworkCode: framework.code,
      frameworkName: framework.name,
      currentStatus: framework.is_active
    });
  };

  const confirmToggleActive = async () => {
    if (!toggleModal) return;

    setIsTogglingActive(true);

    try {
      await toggleFrameworkActive(toggleModal.frameworkId, !toggleModal.currentStatus);

      setToggleModal(null);
      await fetchCrossReferentialData();

      setSuccessToast({
        isOpen: true,
        title: !toggleModal.currentStatus ? 'Référentiel activé' : 'Référentiel désactivé',
        message: `${toggleModal.frameworkCode} ${!toggleModal.currentStatus ? 'activé' : 'désactivé'} avec succès`,
        details: undefined
      });

    } catch (error) {
      console.error('Erreur toggle actif:', error);
      alert('Erreur lors du changement de statut');
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleDeleteFramework = async (frameworkId: string, frameworkCode: string) => {
    try {
      const data = await getFramework(frameworkId);

      let domainsCount = 0;
      try {
        const hierarchyData = await getFrameworkHierarchy(frameworkId);
        domainsCount = hierarchyData.statistics?.total_domains || 0;
      } catch {
        // Ignore hierarchy errors
      }

      setDeleteModal({
        isOpen: true,
        frameworkId,
        frameworkCode,
        frameworkName: data.name,
        stats: {
          requirements: data.statistics?.total_requirements || 0,
          domains: domainsCount
        }
      });

    } catch (error) {
      console.error('Erreur récupération stats:', error);
      alert('Erreur lors de la récupération des informations du référentiel');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;

    try {
      await deleteFramework(deleteModal.frameworkId);

      setDeleteModal(null);
      await fetchCrossReferentialData();

      setSuccessToast({
        isOpen: true,
        title: 'Suppression réussie',
        message: `Référentiel ${deleteModal.frameworkCode} supprimé`,
        details: undefined
      });

    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression du référentiel');
    }
  };

  const handleGenerateEmbeddings = async (frameworkId: string, frameworkCode: string) => {
    setGeneratingEmbeddings(frameworkId);

    try {
      await generateFrameworkEmbeddings(frameworkId);
      await fetchCrossReferentialData();

      setSuccessToast({
        isOpen: true,
        title: 'Embeddings générés',
        message: `Embeddings créés pour ${frameworkCode}`,
        details: undefined
      });

    } catch (error) {
      console.error('Erreur génération embeddings:', error);
      alert(`Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setGeneratingEmbeddings(null);
    }
  };

  const handleExportFramework = async (frameworkId: string, frameworkCode: string) => {
    try {
      await exportFramework(frameworkId, frameworkCode);

      setSuccessToast({
        isOpen: true,
        title: 'Export réussi',
        message: `${frameworkCode}.xlsx téléchargé`,
        details: undefined
      });

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erreur export:', error);
      alert(`Erreur lors de l'export : ${err.message}`);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmbeddingBadge = (framework: Framework) => {
    const coverage = framework.embedding_coverage || 0;

    if (coverage === 0) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      );
    } else if (coverage === 100) {
      return (
        <Badge className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Complet
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-600">
          <Clock className="w-3 h-3 mr-1" />
          Partiel ({coverage}%)
        </Badge>
      );
    }
  };

  useEffect(() => {
    fetchCrossReferentialData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-muted-foreground">Chargement des référentiels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">

      {/* HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Section Gauche : Titre + Description */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex-shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Référentiels
                </h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Gestion des référentiels de cybersécurité
                </p>
              </div>
            </div>

            {/* Section Droite : Boutons d'Action */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button onClick={fetchCrossReferentialData} variant="outline" size="sm" className="flex-shrink-0">
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
              <Button
                onClick={() => router.push("/admin/referentiels/import")}
                size="sm"
                className="bg-green-600 hover:bg-green-700 flex-shrink-0"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Importer</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu qui défile */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Total Référentiels</p>
                  <p className="text-xl sm:text-2xl font-bold">{globalStats.total_frameworks}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                  <Database className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Exigences Totales</p>
                  <p className="text-xl sm:text-2xl font-bold">{globalStats.total_requirements.toLocaleString()}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Réf. Actifs</p>
                  <p className="text-xl sm:text-2xl font-bold">{frameworks.filter((f) => f.is_active).length}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Dernière Synchro</p>
                  <p className="text-sm sm:text-base md:text-lg font-bold truncate">{formatDate(globalStats.last_sync)}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau des Référentiels */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Référentiels Importés ({frameworks.length})</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Liste complète des référentiels avec leurs statistiques
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {frameworks.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Database className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Aucun référentiel importé</h3>
                <p className="text-sm text-muted-foreground mb-4">Commencez par importer votre premier référentiel.</p>
                <Button onClick={() => router.push("/admin/referentiels/import")} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Importer un référentiel
                </Button>
              </div>
            ) : (
              <>
                {/* Version Mobile : Cards */}
                <div className="md:hidden space-y-3">
                  {frameworks.map((framework) => (
                    <Card key={framework.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-bold text-blue-600">{framework.code}</span>
                              {framework.is_active ? (
                                <Badge className="bg-green-600 text-[10px]">Actif</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px]">Inactif</Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium mt-1 line-clamp-1">{framework.name}</p>
                            <p className="text-[10px] text-muted-foreground">v{framework.version} • {formatDate(framework.import_date)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {framework.requirements_count} exigences
                          </Badge>
                          {getEmbeddingBadge(framework)}
                        </div>

                        <div className="flex items-center justify-end gap-1 border-t pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/referentiels/${framework.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActiveClick(framework)}
                          >
                            {framework.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateEmbeddings(framework.id, framework.code)}
                            disabled={generatingEmbeddings === framework.id}
                          >
                            {generatingEmbeddings === framework.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportFramework(framework.id, framework.code)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFramework(framework.id, framework.code)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Version Desktop : Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs lg:text-sm">Référentiel</TableHead>
                        <TableHead className="text-xs lg:text-sm">Exigences</TableHead>
                        <TableHead className="text-xs lg:text-sm">Embeddings</TableHead>
                        <TableHead className="text-xs lg:text-sm">Statut</TableHead>
                        <TableHead className="text-right text-xs lg:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {frameworks.map((framework) => (
                        <TableRow key={framework.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{framework.code}</div>
                            <div className="text-xs lg:text-sm text-muted-foreground line-clamp-1">
                              {framework.name} v{framework.version}
                            </div>
                            <div className="text-[10px] lg:text-xs text-muted-foreground">
                              Importé le {formatDate(framework.import_date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {framework.requirements_count}
                            </Badge>
                          </TableCell>
                          <TableCell>{getEmbeddingBadge(framework)}</TableCell>
                          <TableCell>
                            {framework.is_active ? (
                              <Badge className="bg-green-600 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Actif
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                                <PowerOff className="w-3 h-3 mr-1" />
                                Inactif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 lg:gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/referentiels/${framework.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActiveClick(framework)}
                              >
                                {framework.is_active ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateEmbeddings(framework.id, framework.code)}
                                disabled={generatingEmbeddings === framework.id}
                              >
                                {generatingEmbeddings === framework.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportFramework(framework.id, framework.code)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteFramework(framework.id, framework.code)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                  {frameworks.filter((f) => f.is_active).length} sur {globalStats.total_frameworks} référentiels actifs
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modales */}
      {deleteModal && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmDelete}
          title={`Supprimer ${deleteModal.frameworkCode}`}
          warningMessage={`Vous êtes sur le point de supprimer définitivement le référentiel ${deleteModal.frameworkName}.`}
          itemCode={deleteModal.frameworkCode}
          itemName={deleteModal.frameworkName}
          elements={[
            { count: deleteModal.stats.requirements, label: 'Exigences', color: 'blue' },
            { count: deleteModal.stats.domains, label: 'Domaines', color: 'green' }
          ]}
        />
      )}

      {toggleModal && (
        <ToggleActiveModal
          isOpen={toggleModal.isOpen}
          onClose={() => setToggleModal(null)}
          onConfirm={confirmToggleActive}
          frameworkCode={toggleModal.frameworkCode}
          frameworkName={toggleModal.frameworkName}
          currentStatus={toggleModal.currentStatus}
          isProcessing={isTogglingActive}
        />
      )}

      {successToast && successToast.isOpen && (
        <div className="fixed top-4 right-4 z-50">
          <SuccessToast
            title={successToast.title}
            message={successToast.message}
            details={successToast.details}
          />
        </div>
      )}
    </div>
  );
}
