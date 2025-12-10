'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Target,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Play,
  Pause,
  Download,
  MoreVertical,
  Eye,
  X,
  File,
  FileImage,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Globe2,
  Building2,
  FileBarChart
} from 'lucide-react';
import { getUser, fetchWithAuth } from '@/lib/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { ActionPlanEmptyState } from '@/components/action-plan/ActionPlanEmptyState';
import { PublishedActionPlanGrouped } from '@/components/action-plan/PublishedActionPlanGrouped';
import { useActionPlan, ActionPlanError } from '@/hooks/useActionPlan';
import GenerateReportModal from '@/components/modals/GenerateReportModal';
import { reportsApi, GeneratedReport } from '@/lib/api/reports';
import ReportCard from '@/components/reports/ReportCard';
import { ErrorDisplay, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Campaign {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'ongoing' | 'late' | 'frozen' | 'completed' | 'cancelled';
  launch_date: string | null;
  due_date: string | null;
  frozen_date: string | null;
  created_at: string;
  questionnaire_id: string;
  created_by?: string;
}

interface CampaignKPIs {
  global_progress: number;
  total_questions: number;
  answered_questions: number;
  validated_questions: number;
  entities_count: number;
  entities_completed: number;
  contributors_active: number;
  contributors_total: number;
  nc_major: number;
  nc_minor: number;
  documents_provided: number;
  documents_required: number;
  days_elapsed: number;
  days_remaining: number | null;
}

interface Stakeholder {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'owner' | 'manager' | 'auditor' | 'viewer';
  assigned_at: string;
}

interface CampaignDetails {
  campaign: Campaign;
  kpis: CampaignKPIs;
  stakeholders: Stakeholder[];
}

interface EntityProgress {
  entity_id: string;
  entity_name: string;
  invited_at: string;
  progress_percent: number;
  questions_answered: number;
  questions_total: number;
  last_activity: string | null;
  is_inactive: boolean;
}

interface ContributorProgress {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  entity_id: string;
  entity_name: string;
  progress_percent: number;
  questions_answered: number;
  questions_total: number;
  is_active: boolean;
  last_activity: string | null;
}

interface CampaignProgress {
  entities: EntityProgress[];
  contributors: ContributorProgress[];
}

interface EntityScope {
  entity_id: string;
  entity_name: string;
  entity_type: string | null;
  country: string | null;
  sector: string | null;
  added_at: string;
  contributors_count: number;
  last_audit_date: string | null;
  last_audit_score: number | null;
}

interface CampaignScope {
  entities: EntityScope[];
  total_count: number;
}

interface DocumentFile {
  id: string;
  answer_id: string;
  audit_id: string;
  question_id: string;
  question_text: string;
  question_order: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_size_mb: number;
  mime_type: string;
  file_extension: string | null;
  attachment_type: string;
  description: string | null;
  virus_scan_status: string;
  is_safe: boolean;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_by_email: string | null;
  uploaded_at: string;
  entity_id: string | null;
  entity_name: string | null;
}

interface DocumentStats {
  total_questions_requiring_docs: number;
  questions_with_docs: number;
  total_documents: number;
  total_size_mb: number;
  by_type: Record<string, number>;
  by_entity: Record<string, number>;
}

interface CampaignDocuments {
  stats: DocumentStats;
  documents: DocumentFile[];
  total_count: number;
}

type TabType = 'overview' | 'progress' | 'scope' | 'validation' | 'actions' | 'documents' | 'reports';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params?.id as string;
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<CampaignDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<CampaignProgress | null>(null);
  const [scopeData, setScopeData] = useState<CampaignScope | null>(null);
  const [documentsData, setDocumentsData] = useState<CampaignDocuments | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingScope, setLoadingScope] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; progress: number } | null>(null);
  const [reminderResult, setReminderResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentFile | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [freezeResult, setFreezeResult] = useState<{ type: ModalType; message: string } | null>(null);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [crossRefData, setCrossRefData] = useState<any>(null);
  const [loadingCrossRef, setLoadingCrossRef] = useState(false);
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [reportInitialScope, setReportInitialScope] = useState<'consolidated' | 'entity' | undefined>(undefined);
  const [reportsData, setReportsData] = useState<GeneratedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  // États d'erreur pour les onglets
  const [documentsError, setDocumentsError] = useState<{ message: string; code: number; permissionCode?: string } | null>(null);
  const [reportsError, setReportsError] = useState<{ message: string; code: number; permissionCode?: string } | null>(null);

  // Hook pour le plan d'action
  const { data: actionPlanData, isLoading: isLoadingActionPlan, error: actionPlanError } = useActionPlan(campaignId);

  // Gérer le paramètre ?tab= dans l'URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'progress', 'scope', 'validation', 'actions', 'documents', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  useEffect(() => {
    if (campaignId) {
      loadCampaignDetails();
      loadCrossRefData();
    }
  }, [campaignId]);

  const loadCampaignDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaignId}/details`);

      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      } else {
        setError('Impossible de charger les détails de la campagne');
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const loadProgressData = async () => {
    try {
      setLoadingProgress(true);
      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaignId}/progress`);

      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      } else {
        console.error('Impossible de charger les données de progression');
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la progression:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const loadScopeData = async () => {
    try {
      setLoadingScope(true);
      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaignId}/scope`);

      if (response.ok) {
        const data = await response.json();
        setScopeData(data);
      } else {
        console.error('Impossible de charger les données du périmètre');
      }
    } catch (err) {
      console.error('Erreur lors du chargement du périmètre:', err);
    } finally {
      setLoadingScope(false);
    }
  };

  const loadDocumentsData = async () => {
    try {
      setLoadingDocuments(true);
      setDocumentsError(null);
      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaignId}/documents`);

      if (response.ok) {
        const data = await response.json();
        setDocumentsData(data);
      } else {
        // Capturer l'erreur avec le code HTTP
        let errorMessage = 'Impossible de charger les documents';
        let permissionCode: string | undefined;

        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
            permissionCode = extractPermissionCodeFromMessage(errorMessage);
          }
        } catch {
          // Ignore JSON parse errors
        }

        setDocumentsError({
          message: errorMessage,
          code: response.status,
          permissionCode: permissionCode || (response.status === 403 ? 'CAMPAIGN_DOCUMENTS_READ' : undefined)
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des documents:', err);
      setDocumentsError({
        message: 'Une erreur est survenue',
        code: 0
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadReportsData = async () => {
    try {
      setLoadingReports(true);
      setReportsError(null);
      const response = await reportsApi.listByCampaign(campaignId, {
        version: 'latest',
      });
      setReportsData(response.items || []);
    } catch (err) {
      console.error('Erreur lors du chargement des rapports:', err);

      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      const permissionCode = extractPermissionCodeFromMessage(errorMessage);

      // Si 404, afficher liste vide
      if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        setReportsData([]);
      } else if (errorMessage.includes('403') || errorMessage.includes('Permission') || errorMessage.includes('permission')) {
        // Erreur 403 - permission refusée
        setReportsError({
          message: errorMessage,
          code: 403,
          permissionCode: permissionCode || 'REPORT_READ'
        });
      } else {
        // Autre erreur
        setReportsError({
          message: errorMessage,
          code: 0,
          permissionCode
        });
      }
    } finally {
      setLoadingReports(false);
    }
  };

  const loadCrossRefData = async () => {
    try {
      setLoadingCrossRef(true);
      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaignId}/cross-referential-coverage`);

      if (response.ok) {
        const data = await response.json();
        setCrossRefData(data);
      } else {
        console.error('Impossible de charger la couverture cross-référentielle');
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la couverture cross-référentielle:', err);
    } finally {
      setLoadingCrossRef(false);
    }
  };

  // Fonction pour obtenir l'icône selon le type de fichier
  const getFileIcon = (extension: string | null, mimeType: string) => {
    if (!extension) return <File className="w-5 h-5 text-gray-400" />;

    const ext = extension.toLowerCase();

    if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <FileImage className="w-5 h-5 text-blue-500" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (['md', 'txt'].includes(ext)) {
      return <FileText className="w-5 h-5 text-gray-500" />;
    }

    return <File className="w-5 h-5 text-gray-400" />;
  };

  // Fonction pour toggle l'expand/collapse d'une entité
  const toggleEntityExpand = (entityName: string) => {
    setExpandedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityName)) {
        newSet.delete(entityName);
      } else {
        newSet.add(entityName);
      }
      return newSet;
    });
  };

  // Fonction pour télécharger un document
  const handleDownloadDocument = async (doc: DocumentFile) => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/attachments/${doc.id}/download`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.original_filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Erreur lors du téléchargement du document');
      }
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      alert('Erreur lors du téléchargement du document');
    }
  };

  // Fonction pour prévisualiser un document
  const handlePreviewDocument = (doc: DocumentFile) => {
    const canPreview = doc.file_extension &&
      ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(doc.file_extension.toLowerCase());

    if (canPreview) {
      setPreviewDocument(doc);
      setShowPreviewModal(true);
    } else {
      // Télécharger directement si pas de prévisualisation possible
      handleDownloadDocument(doc);
    }
  };

  const openReminderModal = (entityId: string, entityName: string, progressPercent: number) => {
    // Vérifier que la progression est < 100%
    if (progressPercent >= 100) {
      setReminderResult({
        success: false,
        message: `${entityName} a déjà complété l'audit (100%). Aucune relance nécessaire.`
      });
      setShowReminderModal(true);
      return;
    }

    setSelectedEntity({ id: entityId, name: entityName, progress: progressPercent });
    setShowReminderModal(true);
  };

  const sendReminder = async () => {
    if (!selectedEntity) return;

    try {
      setSendingReminder(selectedEntity.id);
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/campaigns/${campaignId}/entities/${selectedEntity.id}/remind`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.errors && result.errors.length > 0) {
          setReminderResult({
            success: true,
            message: `Relance envoyée à ${result.emails_sent}/${result.total_members} membres.\n\nErreurs:\n${result.errors.join('\n')}`
          });
        } else {
          setReminderResult({
            success: true,
            message: `Relance envoyée avec succès à ${result.emails_sent} membre(s) de ${selectedEntity.name}.`
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setReminderResult({
          success: false,
          message: errorData.detail || 'Erreur lors de l\'envoi de la relance'
        });
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi de la relance:', err);
      setReminderResult({
        success: false,
        message: 'Une erreur est survenue lors de l\'envoi de la relance'
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const closeReminderModal = () => {
    setShowReminderModal(false);
    setSelectedEntity(null);
    setReminderResult(null);
  };

  // Geler la campagne - Étape 1 : Afficher confirmation
  const handleFreezeCampaignClick = () => {
    setShowFreezeConfirm(true);
  };

  // Geler la campagne - Étape 2 : Exécution après confirmation
  const handleFreezeCampaign = async () => {
    try {
      setFreezing(true);
      setShowFreezeConfirm(false);

      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaignId}/freeze`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();

        // Mettre à jour le statut local IMMÉDIATEMENT pour cacher le bouton
        if (details && details.campaign) {
          const updatedDetails = {
            ...details,
            campaign: {
              ...details.campaign,
              status: 'frozen' as Campaign['status'],
              frozen_date: result.frozen_date
            }
          };
          setDetails(updatedDetails);
        }

        // Afficher le message de succès
        setFreezeResult({
          type: 'success',
          message: 'Campagne figée avec succès. Rechargement de la page...'
        });

        // Recharger la page après 1.5s pour mettre à jour le hook useActionPlan
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const error = await response.json();
        setFreezeResult({
          type: 'error',
          message: error.detail || 'Erreur lors du gel de la campagne'
        });
      }
    } catch (err) {
      console.error('Erreur lors du gel:', err);
      setFreezeResult({
        type: 'error',
        message: 'Une erreur est survenue lors du gel de la campagne'
      });
    } finally {
      setFreezing(false);
    }
  };

  // Charger les données selon l'onglet actif
  useEffect(() => {
    if (activeTab === 'progress' && !progressData) {
      loadProgressData();
    } else if (activeTab === 'scope' && !scopeData) {
      loadScopeData();
    } else if (activeTab === 'documents' && !documentsData) {
      loadDocumentsData();
    } else if (activeTab === 'reports' && reportsData.length === 0) {
      loadReportsData();
    }
  }, [activeTab]);

  const getStatusBadge = (status: Campaign['status']) => {
    const statusConfig = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
      ongoing: { label: 'En cours', className: 'bg-blue-100 text-blue-700' },
      late: { label: 'En retard', className: 'bg-orange-100 text-orange-700' },
      frozen: { label: 'Figée', className: 'bg-purple-100 text-purple-700' },
      completed: { label: 'Terminée', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
    };

    const config = statusConfig[status];
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Récupère le rôle de l'utilisateur actuel dans cette campagne
  const getCurrentUserRole = (): Stakeholder['role'] | null => {
    if (!details?.stakeholders) return null;

    const currentUser = getUser();
    if (!currentUser) return null;

    const stakeholder = details.stakeholders.find(s => s.user_id === currentUser.id);
    return stakeholder?.role || null;
  };

  // Vérifie si l'utilisateur peut accéder aux documents
  // L'utilisateur doit avoir la permission GED_READ ET CAMPAIGN_READ
  const canAccessDocuments = (): boolean => {
    return hasPermission('GED_READ') && hasPermission('CAMPAIGN_READ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la campagne...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Campagne introuvable'}</p>
          <Link
            href="/client/campagnes"
            className="mt-4 inline-block text-purple-600 hover:text-purple-700"
          >
            ← Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const { campaign, kpis, stakeholders } = details;

  return (
    <div className="min-h-screen flex flex-col client" data-section="campaign-detail">
      {/* Header Sticky - Pattern GUIDE_HEADER_STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/client/campagnes"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
                  {getStatusBadge(campaign.status)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Créée le {formatDate(campaign.created_at)}
                  {campaign.launch_date && ` • Lancée le ${formatDate(campaign.launch_date)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {campaign.status === 'draft' && (
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Lancer la campagne
                </button>
              )}
              {campaign.status === 'ongoing' && (
                <button
                  onClick={handleFreezeCampaignClick}
                  disabled={freezing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pause className="w-4 h-4" />
                  {freezing ? 'Gel en cours...' : 'Figer la campagne'}
                </button>
              )}
              {/* Menu Exporter avec dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exporter
                  <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showExportMenu && (
                  <>
                    {/* Overlay pour fermer le menu */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <FileBarChart className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold text-gray-900">Générer un rapport</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Choisissez le type de rapport à générer</p>
                      </div>

                      <div className="p-2">
                        {/* Option Rapport Consolidé */}
                        <button
                          onClick={() => {
                            setShowExportMenu(false);
                            setReportInitialScope('consolidated');
                            setShowGenerateReportModal(true);
                          }}
                          className="w-full p-3 rounded-lg hover:bg-purple-50 transition-colors text-left group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                              <Globe2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Rapport Consolidé</p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Vue globale de tous les organismes de la campagne
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Comparatif</span>
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">NC globales</span>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Option Rapport Individuel */}
                        <button
                          onClick={() => {
                            setShowExportMenu(false);
                            setReportInitialScope('entity');
                            setShowGenerateReportModal(true);
                          }}
                          className="w-full p-3 rounded-lg hover:bg-blue-50 transition-colors text-left group mt-1"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Rapport Individuel</p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Rapport détaillé pour un organisme spécifique
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Score dédié</span>
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Benchmarking</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="p-2 bg-gray-50 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                          {kpis.entities_count} organisme{kpis.entities_count > 1 ? 's' : ''} dans cette campagne
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
      {/* KPI Cards */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Progression globale */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Progression globale</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.global_progress}%</span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${kpis.global_progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {kpis.answered_questions}/{kpis.total_questions} questions
              </p>
            </div>
          </div>

          {/* Organismes audités */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Organismes audités</span>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.entities_completed}</span>
              <span className="text-lg text-gray-500">/ {kpis.entities_count}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {kpis.entities_completed} complété{kpis.entities_completed > 1 ? 's' : ''}
            </p>
          </div>

          {/* Contributeurs */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Contributeurs actifs</span>
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.contributors_active}</span>
              <span className="text-lg text-gray-500">/ {kpis.contributors_total}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {Math.round((kpis.contributors_active / kpis.contributors_total) * 100)}% de participation
            </p>
          </div>

          {/* Temps écoulé */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Temps écoulé</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.days_elapsed}</span>
              <span className="text-lg text-gray-500">jours</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {kpis.days_remaining !== null
                ? `${kpis.days_remaining} jours restants`
                : 'Pas de deadline'}
            </p>
          </div>

          {/* NC Majeures */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">NC Majeures</span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-600">{kpis.nc_major}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Non-conformités critiques</p>
          </div>

          {/* NC Mineures */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">NC Mineures</span>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-orange-600">{kpis.nc_minor}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Points d'amélioration</p>
          </div>

          {/* Réponses validées */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Réponses validées</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.validated_questions}</span>
              <span className="text-lg text-gray-500">/ {kpis.answered_questions}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {kpis.answered_questions - kpis.validated_questions} en attente
            </p>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Documents</span>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{kpis.documents_provided}</span>
              <span className="text-lg text-gray-500">/ {kpis.documents_required}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {Math.round((kpis.documents_provided / kpis.documents_required) * 100)}% fournis
            </p>
          </div>

          {/* Couverture Cross-Référentielle */}
          {crossRefData && crossRefData.frameworks_coverage && crossRefData.frameworks_coverage.length > 0 && crossRefData.frameworks_coverage.map((fw: any) => (
            <div key={fw.framework_code} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-sm p-5 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">{fw.framework_name}</span>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-900">{fw.coverage_percentage}%</span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      fw.coverage_percentage >= 15 ? 'bg-green-500' :
                      fw.coverage_percentage >= 10 ? 'bg-blue-500' :
                      fw.coverage_percentage >= 5 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(fw.coverage_percentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  {fw.requirements_covered}/{fw.total_requirements} requirements
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', label: 'Vue d\'ensemble', icon: Target },
                { id: 'progress', label: 'Progression', icon: TrendingUp },
                { id: 'scope', label: 'Périmètre', icon: Users },
                { id: 'validation', label: 'Validation', icon: CheckCircle },
                { id: 'actions', label: 'Actions', icon: AlertCircle },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'reports', label: 'Rapports', icon: FileBarChart },
              ]
                .filter(tab => {
                  // Filtrer l'onglet Documents si l'utilisateur n'a pas les droits
                  if (tab.id === 'documents' && !canAccessDocuments()) {
                    return false;
                  }
                  return true;
                })
                .map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`
                        flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors
                        ${isActive
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                  <p className="text-gray-600">{campaign.description || 'Aucune description'}</p>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Équipe de la campagne</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stakeholders.map((stakeholder) => (
                      <div key={stakeholder.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-semibold">
                            {stakeholder.first_name[0]}{stakeholder.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {stakeholder.first_name} {stakeholder.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{stakeholder.email}</p>
                        </div>
                        <span className={`
                          px-2 py-1 text-xs font-medium rounded
                          ${stakeholder.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                            stakeholder.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                            stakeholder.role === 'auditor' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'}
                        `}>
                          {stakeholder.role === 'owner' ? 'Propriétaire' :
                           stakeholder.role === 'manager' ? 'Pilote' :
                           stakeholder.role === 'auditor' ? 'Auditeur' :
                           'Observateur'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-6">
                {/* Niveau 2 : Progression par Organisme */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Progression par organisme</h2>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Organisme
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invité le
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Progression
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dernière activité
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loadingProgress ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                              Chargement...
                            </td>
                          </tr>
                        ) : progressData && progressData.entities.length > 0 ? (
                          progressData.entities.map((entity) => (
                            <tr key={entity.entity_id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{entity.entity_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(entity.invited_at).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-purple-600 h-2 rounded-full"
                                      style={{ width: `${entity.progress_percent}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">{entity.progress_percent}%</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {entity.questions_answered}/{entity.questions_total} questions
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entity.last_activity
                                  ? new Date(entity.last_activity).toLocaleString('fr-FR')
                                  : 'Jamais'}
                                {entity.is_inactive && (
                                  <span className="ml-2 text-red-600">🔴</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => openReminderModal(entity.entity_id, entity.entity_name, entity.progress_percent)}
                                  disabled={sendingReminder === entity.entity_id || campaign.status === 'completed'}
                                  className={`px-3 py-1 rounded transition-colors ${
                                    campaign.status === 'completed'
                                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                                      : sendingReminder === entity.entity_id
                                        ? 'text-gray-500 cursor-wait'
                                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                  }`}
                                  title={campaign.status === 'completed' ? 'Campagne terminée - Relance désactivée' : 'Relancer les contributeurs'}
                                >
                                  {sendingReminder === entity.entity_id ? '⏳ Envoi...' : '📧 Relancer'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                              Aucun organisme dans le périmètre
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Niveau 3 : Progression par Contributeur */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Progression par contributeur</h2>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contributeur
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Organisme
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Progression
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loadingProgress ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                              Chargement...
                            </td>
                          </tr>
                        ) : progressData && progressData.contributors.length > 0 ? (
                          progressData.contributors.map((contributor) => (
                            <tr key={contributor.user_id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {contributor.first_name} {contributor.last_name}
                                </div>
                                <div className="text-xs text-gray-500">{contributor.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {contributor.entity_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{ width: `${contributor.progress_percent}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">{contributor.progress_percent}%</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {contributor.questions_answered}/{contributor.questions_total}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {contributor.is_active ? (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                                    ✅ Actif
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                                    🔴 Inactif
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  disabled={campaign.status === 'completed'}
                                  className={`px-3 py-1 border rounded ${
                                    campaign.status === 'completed'
                                      ? 'text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
                                      : 'text-blue-600 hover:text-blue-800 border-blue-300 hover:bg-blue-50'
                                  }`}
                                  title={campaign.status === 'completed' ? 'Campagne terminée - Relance désactivée' : 'Relancer le contributeur'}
                                >
                                  📧 Relancer
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                              Aucun contributeur assigné
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scope' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Périmètre de la campagne</h2>
                    <p className="text-sm text-gray-500 mt-1">Organismes audités dans cette campagne</p>
                  </div>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Modifier le périmètre
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingScope ? (
                    <div className="text-center py-12 text-gray-500 col-span-full">
                      Chargement...
                    </div>
                  ) : scopeData && scopeData.entities.length > 0 ? (
                    scopeData.entities.map((entity) => (
                      <Link
                        key={entity.entity_id}
                        href={`/client/administration/entities/${entity.entity_id}`}
                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer block"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors">
                              {entity.entity_name}
                            </h3>
                            {entity.entity_type && (
                              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                {entity.entity_type}
                              </span>
                            )}
                          </div>
                          {entity.country && (
                            <span className="text-2xl">{entity.country === 'FR' ? '🇫🇷' : '🌍'}</span>
                          )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          {entity.sector && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Secteur:</span>
                              <span>{entity.sector}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Contributeurs:</span>
                            <span>{entity.contributors_count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Ajouté le:</span>
                            <span>{new Date(entity.added_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        {entity.last_audit_date && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-xs text-gray-500">Dernier audit</div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-gray-700">
                                {new Date(entity.last_audit_date).toLocaleDateString('fr-FR')}
                              </span>
                              {entity.last_audit_score !== null && (
                                <span className={`text-sm font-semibold ${
                                  entity.last_audit_score >= 70 ? 'text-green-600' :
                                  entity.last_audit_score >= 40 ? 'text-orange-600' :
                                  'text-red-600'
                                }`}>
                                  {entity.last_audit_score}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500 col-span-full">
                      Aucun organisme dans le périmètre
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'validation' && (
              <div className="text-center py-12 text-gray-500">
                Interface de validation (à implémenter)
              </div>
            )}

            {activeTab === 'actions' && (
              <div>
                {isLoadingActionPlan ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Chargement du plan d'action...</p>
                  </div>
                ) : actionPlanError ? (
                  // Erreur lors du chargement du plan d'action
                  <ErrorDisplay
                    type={(actionPlanError as ActionPlanError).statusCode === 403 ? 'forbidden' : 'generic'}
                    customMessage={actionPlanError.message}
                    showRetry={false}
                    showBack={false}
                    showHome={false}
                    permissionCode={(actionPlanError as ActionPlanError).permissionCode || ((actionPlanError as ActionPlanError).statusCode === 403 ? 'ACTIONS_READ' : undefined)}
                    actionName="Plan d'Action"
                  />
                ) : actionPlanData?.action_plan === null ? (
                  // État NOT_STARTED : Aucun plan d'action généré
                  <ActionPlanEmptyState
                    campaignId={campaignId}
                    totalQuestions={kpis.total_questions}
                    campaignStatus={actionPlanData?.campaign_status}
                    canGenerate={actionPlanData?.can_generate ?? false}
                  />
                ) : actionPlanData?.action_plan?.status === 'GENERATING' ? (
                  // État GENERATING : Génération en cours (à implémenter Phase 2)
                  <div className="text-center py-12 text-gray-500">
                    Génération en cours... (Composant ActionPlanGenerating à implémenter)
                  </div>
                ) : actionPlanData?.action_plan?.status === 'DRAFT' || actionPlanData?.action_plan?.status === 'PUBLISHED' ? (
                  // État DRAFT ou PUBLISHED : Afficher le plan d'action
                  // DRAFT = éditable (campagne figée), PUBLISHED = lecture seule (campagne terminée)
                  <PublishedActionPlanGrouped
                    campaignId={campaignId}
                    onActionPlanDeleted={() => router.push(`/client/campagnes/${campaignId}/action-plan/generation`)}
                    onUnpublish={() => {
                      // Recharger les données de la campagne après dépublication
                      loadCampaignDetails();
                    }}
                    campaignStatus={campaign.status}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    État inconnu
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                {loadingDocuments ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Chargement des documents...</p>
                  </div>
                ) : documentsData ? (
                  <>
                    {/* Statistiques globales */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Documents uploadés</span>
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {documentsData.stats.total_documents}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {documentsData.stats.total_size_mb} MB au total
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Questions documentées</span>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {documentsData.stats.questions_with_docs}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {documentsData.stats.total_questions_requiring_docs > 0
                            ? `sur ${documentsData.stats.total_questions_requiring_docs} requises`
                            : 'questions avec preuves'}
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Par type</span>
                          <FileText className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="mt-2 space-y-1">
                          {Object.entries(documentsData.stats.by_type).slice(0, 3).map(([type, count]) => (
                            <div key={type} className="flex justify-between text-xs">
                              <span className="text-gray-600 capitalize">{type}</span>
                              <span className="font-medium text-gray-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Par organisme</span>
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="mt-2 space-y-1">
                          {Object.entries(documentsData.stats.by_entity).slice(0, 3).map(([entity, count]) => (
                            <div key={entity} className="flex justify-between text-xs">
                              <span className="text-gray-600 truncate">{entity}</span>
                              <span className="font-medium text-gray-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Liste des documents */}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Documents uploadés ({documentsData.documents.length})
                      </h2>

                      {documentsData.documents.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600">Aucun document uploadé pour cette campagne</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Les contributeurs peuvent uploader des documents depuis leur interface d'audit
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Grouper les documents par entité */}
                          {Object.entries(
                            documentsData.documents.reduce((acc, doc) => {
                              const entityName = doc.entity_name || 'Non assigné';
                              if (!acc[entityName]) {
                                acc[entityName] = [];
                              }
                              acc[entityName].push(doc);
                              return acc;
                            }, {} as Record<string, DocumentFile[]>)
                          ).map(([entityName, docs]) => (
                            <div key={entityName} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              {/* En-tête de l'entité avec chevron */}
                              <button
                                onClick={() => toggleEntityExpand(entityName)}
                                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 transition-colors border-b border-gray-200"
                              >
                                <div className="flex items-center space-x-3">
                                  {expandedEntities.has(entityName) ? (
                                    <ChevronDown className="w-5 h-5 text-purple-600" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-purple-600" />
                                  )}
                                  <Users className="w-5 h-5 text-purple-600" />
                                  <div className="text-left">
                                    <div className="text-base font-semibold text-gray-900">
                                      {entityName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {docs.length} document{docs.length > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {expandedEntities.has(entityName) ? 'Cliquer pour fermer' : 'Cliquer pour voir les documents'}
                                </div>
                              </button>

                              {/* Liste des documents (visible si expanded) */}
                              {expandedEntities.has(entityName) && (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Document
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Question
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Uploadé par
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Taille
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Statut
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {docs.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                              {getFileIcon(doc.file_extension, doc.mime_type)}
                                              <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={doc.original_filename}>
                                                  {doc.original_filename}
                                                </div>
                                                <div className="text-xs text-gray-500 capitalize">
                                                  {doc.attachment_type}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                Q{doc.question_order}
                                              </span>
                                              <div className="text-xs text-gray-500 truncate max-w-xs" title={doc.question_text}>
                                                {doc.question_text}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            {doc.uploaded_by_name ? (
                                              <div className="text-sm text-gray-900">
                                                {doc.uploaded_by_name}
                                              </div>
                                            ) : (
                                              <span className="text-sm text-gray-400 italic">Inconnu</span>
                                            )}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                              {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                              })}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {new Date(doc.uploaded_at).toLocaleTimeString('fr-FR', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {doc.file_size_mb.toFixed(2)} MB
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            {doc.is_safe ? (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Vérifié
                                              </span>
                                            ) : doc.virus_scan_status === 'pending' ? (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                                <Clock className="w-3 h-3 mr-1" />
                                                En cours
                                              </span>
                                            ) : doc.virus_scan_status === 'skipped' ? (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                Non scanné
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Attention
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                              {/* Bouton Prévisualiser */}
                                              {doc.file_extension && ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(doc.file_extension.toLowerCase()) ? (
                                                <button
                                                  onClick={() => handlePreviewDocument(doc)}
                                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                                                  title="Prévisualiser"
                                                >
                                                  <Eye className="w-4 h-4 mr-1.5" />
                                                  Voir
                                                </button>
                                              ) : null}

                                              {/* Bouton Télécharger */}
                                              <button
                                                onClick={() => handleDownloadDocument(doc)}
                                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors"
                                                title="Télécharger"
                                              >
                                                <Download className="w-4 h-4 mr-1.5" />
                                                Télécharger
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : documentsError ? (
                  // Erreur lors du chargement des documents
                  <ErrorDisplay
                    type={documentsError.code === 403 ? 'forbidden' : 'generic'}
                    customMessage={documentsError.message}
                    onRetry={loadDocumentsData}
                    showRetry={true}
                    showBack={false}
                    showHome={false}
                    permissionCode={documentsError.permissionCode}
                    actionName="Documents de la Campagne"
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                {/* Header avec bouton de génération */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Rapports générés</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Consultez et téléchargez les rapports d'audit de cette campagne
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReportInitialScope(undefined);
                      setShowGenerateReportModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <FileBarChart className="w-4 h-4" />
                    Générer un rapport
                  </button>
                </div>

                {loadingReports ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Chargement des rapports...</p>
                  </div>
                ) : reportsError ? (
                  // Erreur lors du chargement des rapports
                  <ErrorDisplay
                    type={reportsError.code === 403 ? 'forbidden' : 'generic'}
                    customMessage={reportsError.message}
                    onRetry={loadReportsData}
                    showRetry={true}
                    showBack={false}
                    showHome={false}
                    permissionCode={reportsError.permissionCode}
                    actionName="Rapports de la Campagne"
                  />
                ) : reportsData.length === 0 ? (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-50 rounded-full mb-4">
                      <FileBarChart size={32} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Aucun rapport généré
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Commencez par générer votre premier rapport d'audit en cliquant sur le bouton ci-dessous.
                    </p>
                    <button
                      onClick={() => {
                        setReportInitialScope(undefined);
                        setShowGenerateReportModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-200"
                    >
                      <FileBarChart size={18} />
                      Générer un rapport
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Stats rapides */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-800">Total</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{reportsData.length}</p>
                          </div>
                          <FileBarChart className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-800">Finaux</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">
                              {reportsData.filter(r => r.status === 'final').length}
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-800">Consolidés</p>
                            <p className="text-2xl font-bold text-purple-900 mt-1">
                              {reportsData.filter(r => r.report_scope === 'consolidated').length}
                            </p>
                          </div>
                          <Globe2 className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-800">Individuels</p>
                            <p className="text-2xl font-bold text-orange-900 mt-1">
                              {reportsData.filter(r => r.report_scope === 'entity').length}
                            </p>
                          </div>
                          <Building2 className="w-8 h-8 text-orange-600" />
                        </div>
                      </div>
                    </div>

                    {/* Liste des rapports */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {reportsData.map((report) => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          onDelete={() => loadReportsData()}
                          onRegenerate={() => loadReportsData()}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div> {/* End flex-1 wrapper */}

      {/* Modal de prévisualisation des documents */}
      {showPreviewModal && previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(previewDocument.file_extension, previewDocument.mime_type)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {previewDocument.original_filename}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {previewDocument.file_size_mb.toFixed(2)} MB • Uploadé le {new Date(previewDocument.uploaded_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadDocument(previewDocument)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewDocument(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {previewDocument.file_extension?.toLowerCase() === 'pdf' ? (
                <iframe
                  src={`${API_BASE}/api/v1/attachments/${previewDocument.id}/download?inline=true`}
                  className="w-full h-full min-h-[600px] rounded-lg border border-gray-300 bg-white"
                  title={previewDocument.original_filename}
                />
              ) : ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(previewDocument.file_extension?.toLowerCase() || '') ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={`${API_BASE}/api/v1/attachments/${previewDocument.id}/download?inline=true`}
                    alt={previewDocument.original_filename}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Prévisualisation non disponible pour ce type de fichier</p>
                  <button
                    onClick={() => handleDownloadDocument(previewDocument)}
                    className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le fichier
                  </button>
                </div>
              )}
            </div>

            {/* Footer avec infos supplémentaires */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Question :</span>
                  <p className="font-medium text-gray-900">Q{previewDocument.question_order}</p>
                </div>
                <div>
                  <span className="text-gray-500">Organisme :</span>
                  <p className="font-medium text-gray-900">{previewDocument.entity_name || 'Non assigné'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type :</span>
                  <p className="font-medium text-gray-900 capitalize">{previewDocument.attachment_type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Statut :</span>
                  <p className="font-medium">
                    {previewDocument.is_safe ? (
                      <span className="text-green-700">✓ Vérifié</span>
                    ) : previewDocument.virus_scan_status === 'pending' ? (
                      <span className="text-yellow-700">⏳ En cours</span>
                    ) : (
                      <span className="text-gray-600">Non scanné</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de relance */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {reminderResult ? 'Résultat de la relance' : 'Confirmation de relance'}
              </h3>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {reminderResult ? (
                <div className={`flex items-start gap-3 ${reminderResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  <div className="flex-shrink-0 mt-1">
                    {reminderResult.success ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{reminderResult.message}</p>
                  </div>
                </div>
              ) : selectedEntity ? (
                <div>
                  <p className="text-gray-700 mb-4">
                    Envoyer une relance à tous les membres de <strong>{selectedEntity.name}</strong> ?
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium mb-1">📊 Progression actuelle : {selectedEntity.progress}%</p>
                    <p className="text-xs">Un email de relance sera envoyé à tous les membres actifs de cette entité avec leur lien magique d'accès.</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {reminderResult ? (
                <button
                  onClick={closeReminderModal}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Fermer
                </button>
              ) : (
                <>
                  <button
                    onClick={closeReminderModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={sendingReminder !== null}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={sendReminder}
                    disabled={sendingReminder !== null}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingReminder !== null ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      'Confirmer'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de gel */}
      <ConfirmModal
        isOpen={showFreezeConfirm}
        onClose={() => setShowFreezeConfirm(false)}
        onConfirm={handleFreezeCampaign}
        title="Figer la campagne"
        message="Êtes-vous sûr de vouloir figer cette campagne ? Cette action est irréversible et aucune modification ne sera plus possible (réponses, fichiers, etc.)."
        type="confirm"
        confirmText="Oui, figer la campagne"
        cancelText="Annuler"
        confirmButtonColor="purple"
      />

      {/* Modal de résultat du gel */}
      {freezeResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setFreezeResult(null)}
          title={freezeResult.type === 'success' ? 'Campagne figée' : 'Erreur'}
          message={freezeResult.message}
          type={freezeResult.type}
        />
      )}

      {/* Modal de génération de rapport */}
      <GenerateReportModal
        isOpen={showGenerateReportModal}
        onClose={() => {
          setShowGenerateReportModal(false);
          setReportInitialScope(undefined); // Reset le scope initial
        }}
        campaignId={campaignId}
        initialScope={reportInitialScope}
        onSuccess={() => {
          setShowGenerateReportModal(false);
          setReportInitialScope(undefined);
          // Rafraîchir la liste des rapports
          loadReportsData();
        }}
      />
    </div>
  );
}
