'use client';

import '@/app/styles/client-header.css';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import { UnauthorizedActionModal } from '@/components/ui/UnauthorizedActionModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  ShieldAlert,
  Plus,
  Play,
  CheckCircle,
  Eye,
  FileText,
  Calendar,
  BarChart3,
  RefreshCw,
  Edit,
  Trash2,
  Lock,
  Archive
} from 'lucide-react';

// Types pour les projets EBIOS RM
type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'FROZEN' | 'ARCHIVED';

interface EbiosProject {
  id: string;
  name?: string;
  label: string;  // L'API retourne 'label' pas 'name'
  description: string | null;
  organization_id?: string;
  tenant_id?: string;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  frozen_at: string | null;
  workshops_progress?: {
    AT1: number;
    AT2: number;
    AT3: number;
    AT4: number;
    AT5: number;
  };
  progress_percent?: number;  // L'API retourne 'progress_percent'
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Labels pour les statuts
const getProjectStatusLabel = (status: ProjectStatus): string => {
  const labels: Record<ProjectStatus, string> = {
    'DRAFT': 'Brouillon',
    'IN_PROGRESS': 'En cours',
    'FROZEN': 'Figé',
    'ARCHIVED': 'Archivé'
  };
  return labels[status] || status;
};

export default function EbiosPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [projects, setProjects] = useState<EbiosProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État pour le modal d'action non autorisée
  const [unauthorizedModal, setUnauthorizedModal] = useState<{
    isOpen: boolean;
    actionName: string;
    permissionCode: string;
  }>({ isOpen: false, actionName: '', permissionCode: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fonction pour vérifier une permission et exécuter une action ou afficher le modal
  const checkPermissionAndExecute = (
    permissionCode: string,
    actionName: string,
    action: () => void
  ) => {
    if (hasPermission(permissionCode)) {
      action();
    } else {
      setUnauthorizedModal({
        isOpen: true,
        actionName,
        permissionCode,
      });
    }
  };

  // Handler pour créer un nouveau projet
  const handleNewProject = () => {
    checkPermissionAndExecute(
      'EBIOS_CREATE',
      'créer un nouveau projet EBIOS RM',
      () => router.push('/client/ebios/nouveau')
    );
  };

  // Handler pour ouvrir un projet (modification/consultation)
  const handleEditProject = (projectId: string) => {
    checkPermissionAndExecute(
      'EBIOS_UPDATE',
      'accéder à ce projet EBIOS RM',
      () => router.push(`/client/ebios/${projectId}`)
    );
  };

  // Handler pour supprimer un projet
  const handleDeleteProject = (projectId: string) => {
    checkPermissionAndExecute(
      'EBIOS_DELETE',
      'supprimer ce projet EBIOS RM',
      () => {
        // TODO: Implémenter la suppression
        console.log('Delete project', projectId);
      }
    );
  };

  // Handler pour figer un projet
  const handleFreezeProject = async (projectId: string) => {
    checkPermissionAndExecute(
      'EBIOS_FREEZE',
      'figer ce projet EBIOS RM',
      async () => {
        try {
          const response = await fetch(`${API_BASE}/api/v1/risk/projects/${projectId}/freeze`, {
            method: 'POST',
            credentials: 'include'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erreur lors du gel du projet');
          }

          // Rafraîchir la liste
          fetchProjects();
        } catch (err: unknown) {
          const error = err as Error;
          console.error('Error freezing project:', err);
          alert(`❌ Erreur lors du gel :\n${error.message}`);
        }
      }
    );
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/risk/projects`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setProjects(data.items || data || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching EBIOS projects:', err);
      setError(error.message || 'Erreur lors du chargement des projets EBIOS RM');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const badges: Record<ProjectStatus, React.ReactElement> = {
      'DRAFT': <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full flex items-center"><FileText className="w-3 h-3 mr-1" />{getProjectStatusLabel('DRAFT')}</span>,
      'IN_PROGRESS': <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center"><Play className="w-3 h-3 mr-1" />{getProjectStatusLabel('IN_PROGRESS')}</span>,
      'FROZEN': <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full flex items-center"><Lock className="w-3 h-3 mr-1" />{getProjectStatusLabel('FROZEN')}</span>,
      'ARCHIVED': <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full flex items-center"><Archive className="w-3 h-3 mr-1" />{getProjectStatusLabel('ARCHIVED')}</span>
    };
    return badges[status];
  };

  const getStatusColor = (status: ProjectStatus) => {
    const colors: Record<ProjectStatus, string> = {
      'DRAFT': 'bg-gray-50 border-gray-200',
      'IN_PROGRESS': 'bg-blue-50 border-blue-200',
      'FROZEN': 'bg-purple-50 border-purple-200',
      'ARCHIVED': 'bg-amber-50 border-amber-200'
    };
    return colors[status];
  };

  // Statistiques
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'IN_PROGRESS').length,
    frozen: projects.filter(p => p.status === 'FROZEN').length,
    draft: projects.filter(p => p.status === 'DRAFT').length,
    averageProgress: projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + (p.progress_percent || 0), 0) / projects.length)
      : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen px-8 pt-2 pb-8 client flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des projets EBIOS RM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col client" data-section="ebios">
        {/* Header Sticky même en cas d'erreur */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <ShieldAlert className="w-8 h-8 mr-3 text-red-600" />
                  EBIOS Risk Manager
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Analyse des risques selon la méthode ANSSI
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu erreur */}
        <div className="flex-1">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={fetchProjects}
            showBack={false}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error)}
            actionName="Gestion EBIOS RM"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col client" data-section="ebios">
      {/* Header Sticky - Pattern GUIDE_HEADER_STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ShieldAlert className="w-8 h-8 mr-3 text-red-600" />
                EBIOS Risk Manager
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Analyse des risques selon la méthode ANSSI
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchProjects}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </button>
              <button
                onClick={handleNewProject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Projet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Projets</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Cours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                <p className="text-sm text-blue-600">Actifs</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Figés</p>
                <p className="text-2xl font-bold text-gray-900">{stats.frozen}</p>
                <p className="text-sm text-purple-600">Finalisés</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Progression Moyenne</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
                <p className="text-sm text-gray-600">Tous projets</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Liste des projets */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-red-600" />
            Projets EBIOS RM ({projects.length})
          </h2>

          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`border rounded-lg p-6 ${getStatusColor(project.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{project.label || project.name}</h3>
                        {getStatusBadge(project.status)}
                      </div>

                      {project.description && (
                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        {project.frozen_at && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Lock className="w-4 h-4 mr-2" />
                            Figé le {new Date(project.frozen_at).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600 group relative">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          <span className="font-medium">{project.progress_percent || 0}% complété</span>

                          {/* Tooltip au survol */}
                          <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-10 shadow-xl">
                            <div className="font-semibold mb-2 text-gray-100">Progression par atelier</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-300">AT1 - Cadrage :</span>
                                <span className="font-medium text-white">{project.workshops_progress?.AT1 || 0}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-300">AT2 - Sources :</span>
                                <span className="font-medium text-white">{project.workshops_progress?.AT2 || 0}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-300">AT3 - Scénarios stratégiques :</span>
                                <span className="font-medium text-white">{project.workshops_progress?.AT3 || 0}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-300">AT4 - Scénarios opérationnels :</span>
                                <span className="font-medium text-white">{project.workshops_progress?.AT4 || 0}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-300">AT5 - Traitement :</span>
                                <span className="font-medium text-white">{project.workshops_progress?.AT5 || 0}%</span>
                              </div>
                            </div>
                            {/* Petite flèche */}
                            <div className="absolute left-4 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Progression globale</span>
                          <span className="text-sm text-gray-600">{project.progress_percent || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (project.progress_percent || 0) === 100 ? 'bg-green-600' :
                              (project.progress_percent || 0) >= 50 ? 'bg-red-600' : 'bg-orange-600'
                            }`}
                            style={{ width: `${project.progress_percent || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Mini progress bars par atelier */}
                      <div className="grid grid-cols-5 gap-2 mt-3">
                        {(['AT1', 'AT2', 'AT3', 'AT4', 'AT5'] as const).map((workshop) => (
                          <div key={workshop} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">{workshop}</div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-red-500"
                                style={{ width: `${project.workshops_progress?.[workshop] || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Link
                        href={`/client/ebios/${project.id}`}
                        className="p-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {project.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => handleEditProject(project.id)}
                            className="p-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50 inline-flex items-center"
                            title="Modifier le projet"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-2 text-gray-600 hover:text-red-600 border border-gray-300 rounded-lg hover:bg-red-50"
                            title="Supprimer le projet"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {project.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleFreezeProject(project.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                          title="Figer le projet"
                        >
                          <Lock className="w-4 h-4" />
                          Figer
                        </button>
                      )}

                      {project.status === 'FROZEN' && (
                        <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                          Rapport
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              {/* Icône illustrative */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6">
                <ShieldAlert className="w-10 h-10 text-red-400" />
              </div>

              {/* Titre principal */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                🛡️ Aucun projet EBIOS RM n&apos;a encore été créé
              </h3>

              {/* Description */}
              <p className="text-base text-gray-600 mb-6 max-w-2xl mx-auto">
                Lancez votre première analyse de risques selon la méthode EBIOS Risk Manager de l&apos;ANSSI.
              </p>

              {/* Liste des bénéfices */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-xl mx-auto text-left">
                <p className="font-semibold text-gray-900 mb-4 text-center">
                  👉 Créez un projet EBIOS RM pour :
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span><strong>AT1</strong> - Définir le périmètre et les valeurs métier</span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span><strong>AT2</strong> - Identifier les sources de risques</span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span><strong>AT3</strong> - Élaborer les scénarios stratégiques</span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span><strong>AT4</strong> - Construire les scénarios opérationnels</span>
                  </li>
                  <li className="flex items-start text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span><strong>AT5</strong> - Traiter les risques et générer le plan d&apos;action</span>
                  </li>
                </ul>
              </div>

              {/* Bouton d'action principal */}
              <button
                onClick={handleNewProject}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-base font-semibold shadow-lg hover:shadow-xl inline-flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouveau Projet EBIOS RM
              </button>

              {/* Aide supplémentaire */}
              <p className="text-sm text-gray-500 mt-6">
                Besoin d&apos;aide ? Consultez la{' '}
                <a href="https://cyber.gouv.fr/la-methode-ebios-risk-manager" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 underline">
                  documentation ANSSI
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Actions en bas */}
        {projects.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {stats.inProgress} projets en cours • {stats.frozen} figés • {stats.draft} brouillons
            </div>

            <div className="flex space-x-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Matrice des risques
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Exporter
              </button>
            </div>
          </div>
        )}
      </div> {/* End Content Container */}

      {/* Modal pour action non autorisée */}
      <UnauthorizedActionModal
        isOpen={unauthorizedModal.isOpen}
        onClose={() => setUnauthorizedModal({ ...unauthorizedModal, isOpen: false })}
        actionName={unauthorizedModal.actionName}
        permissionCode={unauthorizedModal.permissionCode}
      />
    </div>
  );
}
