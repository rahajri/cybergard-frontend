'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  FileText,
  Eye,
  Edit,
  Copy,
  Sparkles,
  Loader2,
  Plus,
  HelpCircle,
  Share2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ViewModal from './components/ViewModal';
import DeleteQuestionnaireModal from './components/DeleteQuestionnaireModal';
import DuplicateQuestionnaireModal from './components/DuplicateQuestionnaireModal';
import ShareQuestionnaireModal from './components/ShareQuestionnaireModal';
import SuccessToast from '@/components/shared/SuccessToast';
import ErrorToast from '@/components/shared/ErrorToast';
import { toast } from 'sonner';
import {
  getQuestionnaires,
  getQuestionnairesStats,
  duplicateQuestionnaire,
  generateQuestionnaireEmbeddings,
  deleteQuestionnaire
} from '@/lib/api/questionnaires';

export default function QuestionnairesPage() {
  const router = useRouter();
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    questions: 0,
    ai_generated: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<any | null>(null);

  // États pour le loader de progression SSE
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateProgress, setDuplicateProgress] = useState(0);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const fetchQuestionnaires = async () => {
    setLoading(true);
    try {
      // Statistiques
      try {
        const s = await getQuestionnairesStats();
        setStats({
          total: s.total || 0,
          published: s.published || 0,
          questions: 0, // Not provided by API
          ai_generated: 0 // Not provided by API
        });
      } catch {
        // Ignore stats errors
      }

      // Liste des questionnaires
      const data = await getQuestionnaires();
      const list = (Array.isArray(data) ? data : []).map((q: unknown) => {
        const qObj = q as Record<string, unknown>;
        return {
          id: String(qObj?.id ?? qObj?.name ?? crypto.randomUUID()),
          name: (qObj?.name as string) ?? "Sans nom",
          questions_count: Number(qObj?.questions_count ?? qObj?.question_count ?? 0),
          created_at: (qObj?.created_at as string) ?? new Date().toISOString(),
          status: (qObj?.status as string) ?? 'draft',
          ai_generated: Boolean(qObj?.ai_generated),
          source_type: (qObj?.source_type as string) ?? 'manual',
          ai_model: qObj?.ai_model as string | undefined,
          has_embeddings: Boolean(qObj?.has_embeddings)
        };
      });

      setQuestionnaires(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setQuestionnaires([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const handleDeleteClick = (q: Record<string, unknown>) => {
    setSelectedQuestionnaire(q);
    setDeleteModalOpen(true);
  };

  const handleDuplicateClick = (q: Record<string, unknown>) => {
    setSelectedQuestionnaire(q);
    setDuplicateModalOpen(true);
  };

  const handleShareClick = (q: Record<string, unknown>) => {
    setSelectedQuestionnaire(q);
    setShareModalOpen(true);
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

      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token') || '';

      const params = new URLSearchParams();
      params.append('translate_to', translateToLanguage);
      if (token) {
        params.append('token', token);
      }

      const sseUrl = `${API}/api/v1/questionnaires/${selectedQuestionnaire.id}/duplicate/stream?${params.toString()}`;

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
            setIsDuplicating(false);
            toast.success(`✅ Questionnaire dupliqué et traduit en ${translateToLanguage.toUpperCase()} !`, {
              duration: 4000
            });
            fetchQuestionnaires();
          } else if (data.status === 'error') {
            eventSource.close();
            setIsDuplicating(false);
            toast.error(`❌ ${data.message || 'Erreur lors de la duplication'}`);
          }
        } catch {
          // Ignorer les erreurs de parsing
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsDuplicating(false);
        toast.error('❌ Connexion perdue avec le serveur');
      };
    } else {
      // Duplication simple sans traduction (rapide)
      try {
        toast.loading('Duplication en cours...', { id: 'duplicate' });

        await duplicateQuestionnaire(selectedQuestionnaire.id, translateToLanguage);

        toast.success(`✅ Questionnaire dupliqué avec succès !`, {
          id: 'duplicate',
          duration: 4000
        });

        setDuplicateModalOpen(false);
        await fetchQuestionnaires();
      } catch (error) {
        toast.error(`❌ ${error instanceof Error ? error.message : 'Erreur lors de la duplication'}`, {
          id: 'duplicate',
          duration: 5000
        });
      }
    }
  };

  const handleGenerateEmbeddings = async (questionnaireId: string) => {
    try {
      toast.loading('Génération des embeddings en cours...', { id: 'gen-embeddings' });

      await generateQuestionnaireEmbeddings(questionnaireId);

      toast.success(`✅ Embeddings générés avec succès !`, {
        id: 'gen-embeddings',
        duration: 4000
      });

      // Rafraîchir la liste
      await fetchQuestionnaires();
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : 'Erreur inconnue'}`, {
        id: 'gen-embeddings',
        duration: 5000
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuestionnaire) return;

    try {
      await deleteQuestionnaire(selectedQuestionnaire.id);

      setQuestionnaires(prev => prev.filter(item => item.id !== selectedQuestionnaire.id));
      setDeleteModalOpen(false);
      setSelectedQuestionnaire(null);
      fetchQuestionnaires();

      toast.custom((t) => (
        <SuccessToast
          title="Questionnaire supprimé"
          message="Toutes les données associées ont été supprimées"
          details={[
            { label: 'Nom', value: selectedQuestionnaire.name },
            { label: 'Questions', value: selectedQuestionnaire.questions_count },
            { label: 'Embeddings', value: selectedQuestionnaire.has_embeddings ? 'Supprimés' : 'Aucun' }
          ]}
        />
      ), { duration: 4000 });
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.custom((t) => (
        <ErrorToast
          title="Erreur lors de la suppression"
          message="Une erreur inattendue s'est produite"
          details={[
            { label: 'Questionnaire', value: selectedQuestionnaire.name }
          ]}
        />
      ), { duration: 5000 });
      setDeleteModalOpen(false);
      setSelectedQuestionnaire(null);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSourceBadge = (questionnaire: Record<string, unknown>) => {
    const sourceType = questionnaire.source_type || 'manual';

    if (sourceType === 'framework') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-600">
          📋 Framework
        </Badge>
      );
    } else if (sourceType === 'control_points') {
      return (
        <Badge className="bg-green-600">
          🎯 Points de contrôle
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          ✏️ Manuel
        </Badge>
      );
    }
  };

  const getStatusBadge = (questionnaire: Record<string, unknown>) => {
    if (questionnaire.status === 'published') {
      return (
        <Badge className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Publié
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

  const getEmbeddingBadge = (questionnaire: Record<string, unknown>) => {
    if (questionnaire.has_embeddings) {
      return (
        <Badge className="bg-green-600">
          ✅ Fait
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          ⏳ Non généré
        </Badge>
      );
    }
  };

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

      {/* 🔄 LOADER DE PROGRESSION SSE POUR DUPLICATION/TRADUCTION */}
      {isDuplicating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4 sm:mb-6">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-pink-600 animate-spin mx-auto" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Duplication & Traduction
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                {duplicateMessage}
              </p>

              {/* Barre de progression */}
              <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-600 h-3 sm:h-4 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${duplicateProgress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm font-medium text-pink-600">
                {duplicateProgress}% complété
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 HEADER STICKY - Responsive */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Section Gauche : Titre + Description */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Questionnaires
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Gestion des questionnaires d'audit multi-référentiels
                </p>
              </div>
            </div>

            {/* Section Droite : Boutons d'Action - Responsive */}
            <div className="flex items-center gap-2 sm:gap-3 justify-end">
              <Button onClick={fetchQuestionnaires} variant="outline" size="sm" className="group relative" title="Actualiser">
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden md:inline">Actualiser</span>
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap md:hidden z-10">
                  Actualiser
                </span>
              </Button>
              <Button
                onClick={() => router.push("/admin/questionnaires/nouveau")}
                variant="secondary"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau</span>
                <span className="sm:hidden text-sm">Nouv.</span>
              </Button>
              <Button
                onClick={() => router.push("/admin/questionnaires/generer")}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Générer via IA</span>
                <span className="sm:hidden text-sm">Générer</span>
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
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">Publiés</p>
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
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.questions.toLocaleString()}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1 truncate">IA Générés</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.ai_generated}</p>
                </div>
                <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau des Questionnaires - Responsive */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Questionnaires Créés ({questionnaires.length})</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Liste complète des questionnaires d'audit
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {questionnaires.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Aucun questionnaire créé</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Commencez par créer votre premier questionnaire.
                </p>
                <Button onClick={() => router.push("/admin/questionnaires/nouveau")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un Questionnaire
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Questionnaire</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Source</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Questions</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Embeddings</TableHead>
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
                            Créé le {formatDate(questionnaire.created_at)}
                          </div>
                          {questionnaire.ai_generated && (
                            <div className="text-[10px] sm:text-xs text-purple-600 flex items-center gap-1 mt-1">
                              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden sm:inline">Généré par IA</span>
                              <span className="sm:hidden">IA</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">{getSourceBadge(questionnaire)}</TableCell>

                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-600 text-[10px] sm:text-xs">
                            {questionnaire.questions_count} questions
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs sm:text-sm hidden lg:table-cell">{getEmbeddingBadge(questionnaire)}</TableCell>

                        <TableCell className="text-xs sm:text-sm">{getStatusBadge(questionnaire)}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedQuestionnaire(questionnaire);
                                setViewModalOpen(true);
                              }}
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
                              onClick={() => {
                                console.log('🖊️ Éditer questionnaire:', questionnaire.id);
                                if (!questionnaire.id) {
                                  toast.error('ID du questionnaire manquant');
                                  return;
                                }
                                router.push(`/admin/questionnaires/${questionnaire.id}`);
                              }}
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
                              onClick={() => handleGenerateEmbeddings(questionnaire.id)}
                              title={questionnaire.has_embeddings ? 'Régénérer les embeddings' : 'Générer les embeddings'}
                              className={`group relative p-1 sm:p-2 ${questionnaire.has_embeddings ? 'text-green-600 hover:text-green-700' : 'text-purple-600 hover:text-purple-700'}`}
                            >
                              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {questionnaire.has_embeddings ? 'Régénérer' : 'Générer'} embeddings
                              </span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateClick(questionnaire)}
                              title="Dupliquer le questionnaire"
                              className="group relative p-1 sm:p-2"
                            >
                              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Dupliquer
                              </span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShareClick(questionnaire)}
                              title={questionnaire.status === 'published' ? "Partager avec des organisations" : "Le questionnaire doit être publié pour être partagé"}
                              disabled={questionnaire.status !== 'published'}
                              className={`group relative p-1 sm:p-2 ${questionnaire.status === 'published' ? "text-indigo-600 hover:text-indigo-700" : "text-gray-400 cursor-not-allowed"}`}
                            >
                              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Partager
                              </span>
                            </Button>

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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                <div className="mt-4 px-4 sm:px-0 text-xs sm:text-sm text-muted-foreground">
                  {questionnaires.filter(q => q.status === 'published').length} sur {stats.total} questionnaires publiés
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
          aiGenerated={selectedQuestionnaire.ai_generated}
          hasEmbeddings={selectedQuestionnaire.has_embeddings}
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

      {/* Modal de partage */}
      {shareModalOpen && selectedQuestionnaire && (
        <ShareQuestionnaireModal
          questionnaire={selectedQuestionnaire}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedQuestionnaire(null);
          }}
          onSuccess={() => {
            fetchQuestionnaires();
          }}
        />
      )}
    </div>
  );
}
