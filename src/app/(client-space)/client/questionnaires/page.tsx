'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText,
  Eye,
  Edit,
  Copy,
  Loader2,
  ClipboardList,
  Trash2,
  Lock,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api';
// Utiliser les mêmes composants que le module Admin
import ViewModal from '@/app/(platform-admin)/admin/questionnaires/components/ViewModal';
import DuplicateQuestionnaireModal from '@/app/(platform-admin)/admin/questionnaires/components/DuplicateQuestionnaireModal';
import DeleteQuestionnaireModal from '@/app/(platform-admin)/admin/questionnaires/components/DeleteQuestionnaireModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Questionnaire {
  id: string;
  name: string;
  status: string;
  source_type: string;
  ai_model?: string;
  created_at: string;
  questions_count: number;
  ai_generated: boolean;
  embeddings_count: number;
  has_embeddings: boolean;
  is_org_copy: boolean;
  parent_questionnaire_id?: string;
  owner_org_id?: string;
  [key: string]: unknown;
}

interface Stats {
  total: number;
  published: number;
  total_questions: number;
  org_copies: number;
}

export default function ClientQuestionnairesPage() {
  const router = useRouter();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    published: 0,
    total_questions: 0,
    org_copies: 0
  });
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);

  // Etats pour le loader de duplication
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateProgress, setDuplicateProgress] = useState(0);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const fetchQuestionnaires = async () => {
    setLoading(true);
    try {
      // Statistiques
      try {
        const statsRes = await authenticatedFetch(`${API_BASE}/api/v1/client/questionnaires/stats`);
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats({
            total: s.total || 0,
            published: s.published || 0,
            total_questions: s.total_questions || 0,
            org_copies: s.org_copies || 0
          });
        }
      } catch {
        // Ignore stats errors
      }

      // Liste des questionnaires
      const res = await authenticatedFetch(`${API_BASE}/api/v1/client/questionnaires/`);
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des questionnaires');
      }

      const data = await res.json();
      setQuestionnaires(Array.isArray(data) ? data : []);
    } catch (err) {
      setQuestionnaires([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const handleViewClick = (q: Questionnaire) => {
    setSelectedQuestionnaire(q);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (q: Questionnaire) => {
    if (!q.is_org_copy && q.source_type !== 'ORG_VARIANT') {
      toast.error('Seules les copies de questionnaires peuvent etre supprimees');
      return;
    }
    setSelectedQuestionnaire(q);
    setDeleteModalOpen(true);
  };

  const handleDuplicateClick = (q: Questionnaire) => {
    setSelectedQuestionnaire(q);
    setDuplicateModalOpen(true);
  };

  const handleDuplicateConfirm = async (translateToLanguage?: string) => {
    if (!selectedQuestionnaire) return;

    console.log('🔍 handleDuplicateConfirm called with:', translateToLanguage);

    // Utiliser SSE uniquement pour la traduction (plus long)
    if (translateToLanguage && translateToLanguage !== 'fr') {
      console.log('🚀 Using SSE for translation to:', translateToLanguage);
      setDuplicateModalOpen(false);
      setIsDuplicating(true);
      setDuplicateProgress(0);
      setDuplicateMessage('Initialisation...');

      const token = localStorage.getItem('token') || '';

      const params = new URLSearchParams();
      params.append('translate_to', translateToLanguage);
      if (token) {
        params.append('token', token);
      }

      const sseUrl = `${API_BASE}/api/v1/questionnaires/${selectedQuestionnaire.id}/duplicate/stream?${params.toString()}`;

      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.progress !== undefined) {
            setDuplicateProgress(data.progress);
          }
          if (data.message) {
            setDuplicateMessage(data.message);
          }
          if (data.status === 'completed') {
            eventSource.close();
            setDuplicateProgress(100);
            setDuplicateMessage('Duplication terminee !');

            setTimeout(() => {
              setIsDuplicating(false);
              setSelectedQuestionnaire(null);
              toast.success(`Questionnaire "${data.questionnaire?.name || 'copie'}" cree et traduit avec succes !`);
              fetchQuestionnaires();
            }, 500);
          }
          if (data.status === 'error') {
            eventSource.close();
            setIsDuplicating(false);
            setSelectedQuestionnaire(null);
            toast.error(data.message || 'Erreur lors de la duplication');
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsDuplicating(false);
        setSelectedQuestionnaire(null);
        toast.error('Erreur de connexion au serveur');
      };

      return;
    }

    // Duplication simple sans traduction
    setDuplicateModalOpen(false);
    setIsDuplicating(true);
    setDuplicateProgress(0);
    setDuplicateMessage('Duplication en cours...');

    try {
      // Utiliser le meme endpoint que Admin pour duplication simple
      const res = await authenticatedFetch(
        `${API_BASE}/api/v1/questionnaires/${selectedQuestionnaire.id}/duplicate`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erreur lors de la duplication');
      }

      const result = await res.json();
      setDuplicateProgress(100);
      setDuplicateMessage('Duplication terminee !');

      setTimeout(() => {
        setIsDuplicating(false);
        setSelectedQuestionnaire(null);
        toast.success(`Questionnaire "${result.name}" cree avec succes !`);
        fetchQuestionnaires();
      }, 500);

    } catch (error) {
      setIsDuplicating(false);
      setSelectedQuestionnaire(null);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la duplication');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuestionnaire) return;

    try {
      const res = await authenticatedFetch(
        `${API_BASE}/api/v1/client/questionnaires/${selectedQuestionnaire.id}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erreur lors de la suppression');
      }

      setDeleteModalOpen(false);
      setSelectedQuestionnaire(null);
      toast.success('Questionnaire supprime avec succes');
      fetchQuestionnaires();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
      setDeleteModalOpen(false);
      setSelectedQuestionnaire(null);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSourceBadge = (questionnaire: Questionnaire) => {
    // Questionnaire copie par le client
    if (questionnaire.is_org_copy || questionnaire.source_type === 'ORG_VARIANT') {
      return (
        <Badge className="bg-pink-600">
          <Copy className="w-3 h-3 mr-1" />
          Copie
        </Badge>
      );
    }

    // Questionnaire partage (MASTER)
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-600">
        <Lock className="w-3 h-3 mr-1" />
        Partage
      </Badge>
    );
  };

  const getStatusBadge = (questionnaire: Questionnaire) => {
    if (questionnaire.status === 'published') {
      return (
        <Badge className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Publie
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
          <AlertCircle className="w-3 h-3 mr-1" />
          Brouillon
        </Badge>
      );
    }
  };

  // Determine si l edition est autorisee
  const canEdit = (q: Questionnaire) => q.is_org_copy || q.source_type === 'ORG_VARIANT';

  // Determine si la suppression est autorisee
  const canDelete = (q: Questionnaire) => q.is_org_copy || q.source_type === 'ORG_VARIANT';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des questionnaires...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">

      {/* LOADER DE PROGRESSION POUR DUPLICATION */}
      {isDuplicating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4 sm:mb-6">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-pink-600 animate-spin mx-auto" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Duplication en cours
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                {duplicateMessage}
              </p>

              <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-600 h-3 sm:h-4 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${duplicateProgress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm font-medium text-pink-600">
                {duplicateProgress}% complete
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Section Gauche : Titre + Description */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Questionnaires
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Questionnaires d audit partages par l administrateur
                </p>
              </div>
            </div>

            {/* Section Droite : Bouton Actualiser uniquement */}
            <div className="flex items-center gap-2 sm:gap-3 justify-end">
              <Button onClick={fetchQuestionnaires} variant="outline" size="sm" className="group relative" title="Actualiser">
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden md:inline">Actualiser</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

          {/* Statistiques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Total Questionnaires</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total}</p>
                  </div>
                  <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Publies</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.published}</p>
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
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Questions Totales</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total_questions.toLocaleString()}</p>
                  </div>
                  <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Mes Copies</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.org_copies}</p>
                  </div>
                  <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-pink-100 text-pink-600 flex-shrink-0">
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des Questionnaires */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="truncate">Questionnaires Disponibles ({questionnaires.length})</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Questionnaires partages par l administrateur et vos copies personnalisees
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {questionnaires.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Aucun questionnaire disponible</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    L administrateur ne vous a pas encore partage de questionnaires.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Questionnaire</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Questions</TableHead>
                          <TableHead className="text-xs sm:text-sm">Statut</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questionnaires.map((questionnaire) => (
                          <TableRow key={questionnaire.id}>
                            <TableCell className="text-xs sm:text-sm">
                              <div className="font-medium truncate max-w-[150px] sm:max-w-none">{questionnaire.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none hidden sm:block">
                                Cree le {formatDate(questionnaire.created_at)}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs sm:text-sm hidden md:table-cell">{getSourceBadge(questionnaire)}</TableCell>

                            <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-600 text-[10px] sm:text-xs">
                                {questionnaire.questions_count} questions
                              </Badge>
                            </TableCell>

                            <TableCell className="text-xs sm:text-sm">{getStatusBadge(questionnaire)}</TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                {/* Bouton Voir - Toujours visible */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewClick(questionnaire)}
                                  className="group relative p-1 sm:p-2"
                                  title="Voir les details"
                                >
                                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Voir
                                  </span>
                                </Button>

                                {/* Bouton Editer - Redirige vers la page d edition */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/client/questionnaires/${questionnaire.id}`)}
                                  className="group relative p-1 sm:p-2"
                                  title="Éditer"
                                >
                                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Éditer
                                  </span>
                                </Button>

                                {/* Bouton Dupliquer - Toujours visible */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateClick(questionnaire)}
                                  title="Creer une copie personnalisee"
                                  className="group relative p-1 sm:p-2 text-pink-600 hover:text-pink-700"
                                >
                                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Dupliquer
                                  </span>
                                </Button>

                                {/* Bouton Supprimer - Visible seulement pour les copies */}
                                {canDelete(questionnaire) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(questionnaire)}
                                    className="group relative p-1 sm:p-2"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                      Supprimer
                                    </span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 px-4 sm:px-0 text-xs sm:text-sm text-muted-foreground">
                    {questionnaires.filter(q => q.is_org_copy || q.source_type === 'ORG_VARIANT').length} copie(s) personnalisee(s) sur {stats.total} questionnaires
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal de visualisation */}
      {viewModalOpen && selectedQuestionnaire && (
        <ViewModal
          questionnaire={selectedQuestionnaire}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedQuestionnaire(null);
          }}
          apiBaseUrl={`${API_BASE}/api/v1/client/questionnaires`}
        />
      )}

      {/* Modal de duplication */}
      {duplicateModalOpen && selectedQuestionnaire && (
        <DuplicateQuestionnaireModal
          isOpen={duplicateModalOpen}
          onClose={() => {
            setDuplicateModalOpen(false);
            setSelectedQuestionnaire(null);
          }}
          onConfirm={handleDuplicateConfirm}
          questionnaireName={selectedQuestionnaire.name}
          questionsCount={selectedQuestionnaire.questions_count}
        />
      )}

      {/* Modal de suppression */}
      {deleteModalOpen && selectedQuestionnaire && (
        <DeleteQuestionnaireModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedQuestionnaire(null);
          }}
          onConfirm={handleDeleteConfirm}
          questionnaireName={selectedQuestionnaire.name}
          questionsCount={selectedQuestionnaire.questions_count}
        />
      )}
    </div>
  );
}
