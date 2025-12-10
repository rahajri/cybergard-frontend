'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  ShieldAlert,
  LayoutDashboard,
  Target,
  Users,
  Crosshair,
  Layers,
  Grid3X3,
  ListChecks,
  FileText,
  Lock,
  RefreshCw,
  AlertTriangle,
  Plus,
  Sparkles,
  Building2,
  Loader2,
  Bot,
  Check,
  Square,
  CheckSquare,
  ChevronRight,
  Info,
  Ban,
  Network,
  Zap,
  Trash2,
  Eye,
  Edit,
  Calendar,
  User,
  Clock,
  Download
} from 'lucide-react';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { fetchWithAuth } from '@/lib/auth';
import AddRiskSourceModal, { RiskSourceFormData } from '@/components/ebios/AddRiskSourceModal';
import { EbiosActionDetailsModal } from '@/components/ebios/EbiosActionDetailsModal';
import { EbiosActionEditModal, EbiosActionFormData } from '@/components/ebios/EbiosActionEditModal';
import { EbiosActionAddModal, EbiosActionCreateData } from '@/components/ebios/EbiosActionAddModal';
import EbiosReportGenerationModal from '@/components/ebios/EbiosReportGenerationModal';
import EbiosReportPreviewModal from '@/components/ebios/EbiosReportPreviewModal';

// ==================== TYPES ====================

type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'FROZEN' | 'ARCHIVED';
type WorkshopType = 'AT1' | 'AT2' | 'AT3' | 'AT4' | 'AT5';

interface EbiosProject {
  id: string;
  name?: string;  // Alias pour label côté frontend
  label: string;  // Nom du projet (API retourne 'label')
  description: string | null;
  organization_id?: string;
  tenant_id?: string;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  frozen_at: string | null;
  start_date?: string;
  end_date?: string;
  progress_percent?: number;
  workshops_status?: Record<string, string>;
  workshops_progress?: Record<string, number>;
}

interface Workshop {
  id: string;
  project_id: string;
  workshop_type: WorkshopType;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progress: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface BusinessValue {
  id: string;
  label: string;  // API retourne 'label', pas 'name'
  description: string | null;
  criticality: number;
  is_selected: boolean;  // Sélection persistée en base
}

interface Asset {
  id: string;
  label: string;  // API retourne 'label', pas 'name'
  type: string;   // API retourne 'type', pas 'asset_type'
  description: string | null;
  criticality: number;
  linked_organism_id?: string;
  is_selected: boolean;  // Sélection persistée en base
}

interface FearedEvent {
  id: string;
  label: string;  // API retourne 'label', pas 'name'
  description: string | null;
  severity: number;
  dimension: string;
  linked_business_value_id?: string;
  linked_asset_id?: string;
  is_selected: boolean;  // Sélection persistée en base
}

// AT2 Types
interface RiskSourceObjective {
  id: string;
  source_id: string;
  label: string;
  description: string | null;
  is_selected: boolean;
  order_index: number;
}

interface RiskSource {
  id: string;
  project_id: string;
  label: string;
  description: string | null;
  relevance: number;  // 1-4
  justification: string | null;
  is_selected: boolean;
  source: string;  // 'AI' | 'MANUAL'
  objectives: RiskSourceObjective[];
  created_at: string;
}

// AT3 Types - Scénarios stratégiques
interface StrategicScenarioAsset {
  id: string;
  code: string;
  label: string;
}

interface StrategicScenario {
  id: string;
  code: string;
  title: string;
  description: string | null;
  risk_source_id: string | null;
  risk_source_code: string | null;
  risk_source_label: string | null;
  feared_event_id: string | null;
  feared_event_code: string | null;
  feared_event_label: string | null;
  assets: StrategicScenarioAsset[];
  severity: number | null;  // 1-4
  likelihood: number | null;  // 1-4
  justification: string | null;
  source: string;  // 'AI' | 'MANUAL'
  created_at: string;
  // Champs de calcul du risque stratégique
  risk_score: number;  // Gravité × Vraisemblance (1-16)
  risk_level: string;  // FAIBLE, MODERE, ELEVE, CRITIQUE
  matrix_x: number;  // Position X dans la matrice (Vraisemblance 1-4)
  matrix_y: number;  // Position Y dans la matrice (Gravité 1-4)
}

interface AT3WorkshopData {
  strategic_scenarios: StrategicScenario[];
  total_count: number;
  can_generate: boolean;
  generation_blocked_reason: string | null;
}

// AT4 Types - Scénarios opérationnels
interface OperationalStep {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  actor: string | null;
}

interface OperationalScenarioAsset {
  id: string;
  code: string;
  label: string;
}

interface OperationalScenario {
  id: string;
  code: string;
  title: string;
  description: string | null;
  strategic_scenario_id: string | null;
  strategic_scenario_code: string | null;
  strategic_scenario_title: string | null;
  risk_source_id: string | null;
  risk_source_code: string | null;
  risk_source_label: string | null;
  feared_event_id: string | null;
  feared_event_code: string | null;
  feared_event_label: string | null;
  assets: OperationalScenarioAsset[];
  steps: OperationalStep[];
  severity: number;
  likelihood: number;
  risk_score: number;
  risk_level: string;
  source: string;  // 'AI' | 'MANUAL'
  created_at: string;
}

interface AT4WorkshopData {
  operational_scenarios: OperationalScenario[];
  total_count: number;
  can_generate: boolean;
  generation_blocked_reason: string | null;
}

// AT5 Types - Matrice des risques
interface MatrixCell {
  severity: number;  // 1-4 (axe Y)
  likelihood: number;  // 1-4 (axe X)
  scenario_count: number;
  max_risk_band: string;  // FAIBLE, MODERE, IMPORTANT, CRITIQUE
  scenario_ids: string[];
}

interface MatrixScenario {
  id: string;
  code: string;
  title: string;
  type: string;  // 'strategic' | 'operational'
  risk_source_code: string | null;
  risk_source_label: string | null;
  feared_event_code: string | null;
  feared_event_label: string | null;
  severity: number;
  likelihood: number;
  risk_score: number;
  risk_level: string;
  assets: string[];
}

interface AT5WorkshopData {
  project_id: string;
  project_name: string;
  can_build: boolean;
  blocked_reason: string | null;
  matrix: MatrixCell[];
  scenarios: MatrixScenario[];
  stats: {
    total_scenarios: number;
    by_risk_level: Record<string, number>;
    critical_count: number;
    important_count: number;
    cells_with_scenarios: number;
  };
}

// AT6 Types - Actions (cohérent avec module Campagnes)
type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
type ActionPriority = 'P1' | 'P2' | 'P3';  // P1=Critique, P2=Important, P3=Normal
type ActionSeverity = 'critical' | 'major' | 'minor' | 'info';

interface ActionItem {
  id: number;
  code_action: string;
  titre: string;
  description: string;
  categorie: string;  // Préventive, Détective, Corrective, Pilotage
  priorite: ActionPriority;
  severity?: ActionSeverity;
  objectif: string;
  justification: string;
  effort: string;  // Faible, Moyen, Élevé
  cout_estime: string;  // Faible, Moyen, Élevé
  sources_couvertes: string[];
  biens_supports: string[];
  scenarios_couverts: string[];
  risque_initial: number | null;
  risque_cible: number | null;
  responsable_suggere: string;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  delai_recommande: string;
  due_date?: string;
  statut: ActionStatus;
  references_normatives: string[];
  source: 'AI' | 'MANUAL';
}

interface AT6ActionsData {
  success: boolean;
  actions: ActionItem[];
  total: number;
  generated_at: string | null;
  message: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ==================== LIMITES EBIOS RM ====================
// Ces limites correspondent à celles définies dans le backend (ebios.py)

interface ElementLimits {
  recommended: [number, number];  // [min, max] recommandé
  max: number;                    // Limite dure (blocage)
  labelSingular: string;
  labelPlural: string;
}

const EBIOS_LIMITS: Record<string, ElementLimits> = {
  business_values: {
    recommended: [5, 10],
    max: 15,
    labelSingular: 'valeur métier',
    labelPlural: 'valeurs métier'
  },
  assets: {
    recommended: [8, 15],
    max: 20,
    labelSingular: 'bien support',
    labelPlural: 'biens supports'
  },
  feared_events: {
    recommended: [5, 10],
    max: 15,
    labelSingular: 'événement redouté',
    labelPlural: 'événements redoutés'
  },
  risk_sources: {
    recommended: [5, 12],
    max: 15,
    labelSingular: 'source de risque',
    labelPlural: 'sources de risques'
  }
};

type LimitStatus = 'ok' | 'warning' | 'blocked';

const getLimitStatus = (count: number, elementType: string): LimitStatus => {
  const limits = EBIOS_LIMITS[elementType];
  if (!limits) return 'ok';

  if (count >= limits.max) return 'blocked';
  if (count > limits.recommended[1]) return 'warning';
  return 'ok';
};

const getLimitMessage = (count: number, elementType: string): string | null => {
  const limits = EBIOS_LIMITS[elementType];
  if (!limits) return null;

  const status = getLimitStatus(count, elementType);

  if (status === 'blocked') {
    return `Limite atteinte : pour garantir une analyse lisible, le nombre de ${limits.labelPlural} est limité à ${limits.max}. Supprimez ou fusionnez certains éléments avant d'en ajouter de nouveaux.`;
  }

  if (status === 'warning') {
    return `Vous avez défini ${count} ${limits.labelPlural}. Au-delà de ${limits.recommended[1]}, l'analyse peut devenir difficile à exploiter. Vous pouvez continuer, mais pensez à regrouper ou fusionner les éléments proches.`;
  }

  return null;
};

// Composant pour afficher le compteur avec limites
interface LimitCounterProps {
  count: number;
  elementType: string;
  showTooltip?: boolean;
  showBadge?: boolean;  // Pour éviter la redondance avec LimitAlertBanner
}

const LimitCounter: React.FC<LimitCounterProps> = ({ count, elementType, showTooltip = true, showBadge = true }) => {
  const limits = EBIOS_LIMITS[elementType];
  if (!limits) return null;

  const status = getLimitStatus(count, elementType);
  const [recMin, recMax] = limits.recommended;

  const statusColors = {
    ok: 'text-gray-600',
    warning: 'text-amber-600',
    blocked: 'text-red-600'
  };

  const badgeColors = {
    ok: 'bg-gray-100 text-gray-700',
    warning: 'bg-amber-100 text-amber-800 border border-amber-300',
    blocked: 'bg-red-100 text-red-800 border border-red-300'
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${statusColors[status]}`}>
        ({count} / recommandé {recMin}–{recMax})
      </span>
      {showTooltip && (
        <div className="group relative">
          <Info className={`w-4 h-4 ${status === 'ok' ? 'text-gray-400' : status === 'warning' ? 'text-amber-500' : 'text-red-500'} cursor-help`} />
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-20">
            <p className="font-semibold mb-1">Conseil EBIOS RM</p>
            <p>Pour une analyse exploitable, il est recommandé de limiter cette liste entre <strong>{recMin} et {recMax} éléments</strong>.</p>
            <p className="mt-1 text-gray-300">Limite maximale : {limits.max}</p>
            <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
      {showBadge && status !== 'ok' && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${badgeColors[status]}`}>
          {status === 'warning' ? '⚠️ Au-delà du recommandé' : '❌ Limite atteinte'}
        </span>
      )}
    </div>
  );
};

// Composant pour les bandeaux d'alerte
interface LimitAlertBannerProps {
  count: number;
  elementType: string;
}

const LimitAlertBanner: React.FC<LimitAlertBannerProps> = ({ count, elementType }) => {
  const message = getLimitMessage(count, elementType);
  const status = getLimitStatus(count, elementType);

  if (!message || status === 'ok') return null;

  if (status === 'blocked') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
        <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-800 font-medium">Limite atteinte</p>
          <p className="text-sm text-red-700 mt-1">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-amber-800 font-medium">Attention</p>
        <p className="text-sm text-amber-700 mt-1">{message}</p>
      </div>
    </div>
  );
};

// ==================== HELPERS ====================

const getStatusLabel = (status: ProjectStatus): string => {
  const labels: Record<ProjectStatus, string> = {
    'DRAFT': 'Brouillon',
    'IN_PROGRESS': 'En cours',
    'FROZEN': 'Figé',
    'ARCHIVED': 'Archivé'
  };
  return labels[status] || status;
};

const getStatusColor = (status: ProjectStatus): string => {
  const colors: Record<ProjectStatus, string> = {
    'DRAFT': 'bg-gray-100 text-gray-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'FROZEN': 'bg-purple-100 text-purple-800',
    'ARCHIVED': 'bg-amber-100 text-amber-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getSeverityColor = (severity: number): string => {
  if (severity === 4) return 'bg-red-100 text-red-800 border-red-200';
  if (severity === 3) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (severity === 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-green-100 text-green-800 border-green-200';
};

const getSeverityLabel = (severity: number): string => {
  const labels: Record<number, string> = {
    1: 'Faible',
    2: 'Modéré',
    3: 'Important',
    4: 'Critique'
  };
  return labels[severity] || 'Non défini';
};

// ==================== COMPOSANT PRINCIPAL ====================

export default function EbiosProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<EbiosProject | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | WorkshopType | 'actions' | 'reports'>('overview');

  // AT1 Data
  const [businessValues, setBusinessValues] = useState<BusinessValue[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [fearedEvents, setFearedEvents] = useState<FearedEvent[]>([]);

  // AT2 Data
  const [riskSources, setRiskSources] = useState<RiskSource[]>([]);
  const [loadingAT2, setLoadingAT2] = useState(false);

  // Modal states
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [populateLoading, setPopulateLoading] = useState(false);

  // AT1 Selection states (pour générer AT2)
  const [selectedBusinessValues, setSelectedBusinessValues] = useState<Set<string>>(new Set());
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectedFearedEvents, setSelectedFearedEvents] = useState<Set<string>>(new Set());
  const [generatingAT2, setGeneratingAT2] = useState(false);
  const [showLimitWarningModal, setShowLimitWarningModal] = useState(false);

  // AT2 Modal state
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);

  // AT3 Data - Scénarios stratégiques
  const [strategicScenarios, setStrategicScenarios] = useState<StrategicScenario[]>([]);
  const [at3CanGenerate, setAt3CanGenerate] = useState(false);
  const [at3BlockedReason, setAt3BlockedReason] = useState<string | null>(null);
  const [loadingAT3, setLoadingAT3] = useState(false);
  const [generatingAT3, setGeneratingAT3] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<StrategicScenario | null>(null);
  const [showDeleteScenarioModal, setShowDeleteScenarioModal] = useState(false);

  // AT4 Data - Scénarios opérationnels
  const [operationalScenarios, setOperationalScenarios] = useState<OperationalScenario[]>([]);
  const [at4CanGenerate, setAt4CanGenerate] = useState(false);
  const [at4BlockedReason, setAt4BlockedReason] = useState<string | null>(null);
  const [loadingAT4, setLoadingAT4] = useState(false);
  const [generatingAT4, setGeneratingAT4] = useState(false);
  const [operationalScenarioToDelete, setOperationalScenarioToDelete] = useState<OperationalScenario | null>(null);
  const [showDeleteOperationalScenarioModal, setShowDeleteOperationalScenarioModal] = useState(false);

  // AT5 Data - Matrice des risques
  const [at5Data, setAt5Data] = useState<AT5WorkshopData | null>(null);
  const [loadingAT5, setLoadingAT5] = useState(false);
  const [at5ViewType, setAt5ViewType] = useState<'strategic' | 'operational' | 'combined'>('operational');
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [analyzingMatrix, setAnalyzingMatrix] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAiAnalysisPanel, setShowAiAnalysisPanel] = useState(false);

  // AT6 - Plan d'actions
  const [generatingActionPlan, setGeneratingActionPlan] = useState(false);
  const [actionsData, setActionsData] = useState<AT6ActionsData | null>(null);
  const [loadingActions, setLoadingActions] = useState(false);

  // AT6 - Modales et états d'actions
  const [viewingAction, setViewingAction] = useState<ActionItem | null>(null);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [addingAction, setAddingAction] = useState(false);
  const [deletingAction, setDeletingAction] = useState<ActionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ type: ModalType; message: string } | null>(null);

  // Modale de génération de rapport
  const [showReportModal, setShowReportModal] = useState(false);

  // Liste des rapports générés
  interface GeneratedEbiosReport {
    id: string;
    title: string;
    description: string | null;
    report_scope: string;
    status: string;
    file_name: string | null;
    file_size_bytes: number | null;
    generated_at: string | null;
    generated_by_name: string | null;
    download_url: string;
  }
  const [generatedReports, setGeneratedReports] = useState<GeneratedEbiosReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Confirmation de suppression de rapport
  const [showDeleteReportConfirm, setShowDeleteReportConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [deleteReportResult, setDeleteReportResult] = useState<{ type: ModalType; message: string } | null>(null);

  // Preview de rapport
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportToPreview, setReportToPreview] = useState<GeneratedEbiosReport | null>(null);

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'AT1', label: 'AT1 - Cadrage', icon: Target },
    { id: 'AT2', label: 'AT2 - Sources', icon: Users },
    { id: 'AT3', label: 'AT3 - Stratégique', icon: Crosshair },
    { id: 'AT4', label: 'AT4 - Opérationnel', icon: Layers },
    { id: 'AT5', label: 'AT5 - Matrice', icon: Grid3X3 },
    { id: 'actions', label: 'Actions', icon: ListChecks },
    { id: 'reports', label: 'Rapports', icon: FileText }
  ];

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadAT1Data();  // Charger aussi pour l'overview (compteurs)
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'AT1' && projectId) {
      loadAT1Data();  // Recharger si on va sur l'onglet AT1
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab === 'AT2' && projectId) {
      loadAT2Data();  // Charger les sources de risques
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab === 'AT3' && projectId) {
      loadAT3Data();  // Charger les scénarios stratégiques
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab === 'AT4' && projectId) {
      loadAT4Data();  // Charger les scénarios opérationnels
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab === 'AT5' && projectId) {
      loadAT5Data();  // Charger la matrice des risques
    }
  }, [activeTab, projectId, at5ViewType]);

  useEffect(() => {
    if (activeTab === 'actions' && projectId) {
      loadActionsData();  // Charger les actions générées
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab === 'reports' && projectId) {
      loadReportsData();  // Charger les rapports générés
    }
  }, [activeTab, projectId]);

  // ==================== API CALLS ====================

  const loadProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}`);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setProject(data);

      // Note: workshops endpoint not implemented yet, progress calculated from individual AT data

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading project:', err);
      setError(error.message || 'Erreur lors du chargement du projet');
    } finally {
      setLoading(false);
    }
  };

  const loadAT1Data = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/workshop/at1`);
      if (response.ok) {
        const data = await response.json();
        const bvData = data.business_values || [];
        const assetData = data.assets || [];
        const feData = data.feared_events || [];

        setBusinessValues(bvData);
        setAssets(assetData);
        setFearedEvents(feData);

        // Initialiser les sélections depuis is_selected de la base
        setSelectedBusinessValues(new Set(bvData.filter((bv: BusinessValue) => bv.is_selected).map((bv: BusinessValue) => bv.id)));
        setSelectedAssets(new Set(assetData.filter((a: Asset) => a.is_selected).map((a: Asset) => a.id)));
        setSelectedFearedEvents(new Set(feData.filter((fe: FearedEvent) => fe.is_selected).map((fe: FearedEvent) => fe.id)));
      }
    } catch (err) {
      console.error('Error loading AT1 data:', err);
    }
  };

  const loadAT2Data = async () => {
    setLoadingAT2(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/workshop/at2`);
      if (response.ok) {
        const data = await response.json();
        setRiskSources(data.risk_sources || []);
      }
    } catch (err) {
      console.error('Error loading AT2 data:', err);
    } finally {
      setLoadingAT2(false);
    }
  };

  const loadAT3Data = async () => {
    setLoadingAT3(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/workshop/at3`);
      if (response.ok) {
        const data: AT3WorkshopData = await response.json();
        setStrategicScenarios(data.strategic_scenarios || []);
        setAt3CanGenerate(data.can_generate);
        setAt3BlockedReason(data.generation_blocked_reason);
      }
    } catch (err) {
      console.error('Error loading AT3 data:', err);
    } finally {
      setLoadingAT3(false);
    }
  };

  const handleGenerateAT3 = async () => {
    // Ne plus vérifier at3CanGenerate côté frontend - le backend fera la validation
    setGeneratingAT3(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/generate-at3`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la génération');
      }

      // Afficher un toast de succès avec effet de fondu (durée 4s)
      toast.success(
        `✅ ${data.scenarios_created} scénarios stratégiques générés avec succès ! Vous êtes redirigé vers l'Atelier 4.`,
        { duration: 4000 }
      );

      // Recharger les données AT3
      await loadAT3Data();

      // Rediriger vers AT4 après un court délai pour que l'utilisateur voie le message
      setTimeout(() => {
        setActiveTab('AT4');
      }, 1500);

    } catch (err) {
      console.error('Error generating AT3:', err);
      toast.error(
        err instanceof Error ? err.message : 'Erreur lors de la génération des scénarios stratégiques',
        { duration: 5000 }
      );
    } finally {
      setGeneratingAT3(false);
    }
  };

  // Ouvrir le modal de confirmation de suppression
  const handleDeleteScenarioClick = (scenario: StrategicScenario) => {
    setScenarioToDelete(scenario);
    setShowDeleteScenarioModal(true);
  };

  // Confirmer la suppression du scénario
  const handleConfirmDeleteScenario = async () => {
    if (!scenarioToDelete) return;

    try {
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/risk/projects/${projectId}/strategic-scenarios/${scenarioToDelete.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast.success('Scénario supprimé');
      loadAT3Data();
    } catch (err) {
      console.error('Error deleting scenario:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setShowDeleteScenarioModal(false);
      setScenarioToDelete(null);
    }
  };

  // ==================== AT4 API CALLS ====================

  const loadAT4Data = async () => {
    setLoadingAT4(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/workshop/at4`);
      if (response.ok) {
        const data: AT4WorkshopData = await response.json();
        setOperationalScenarios(data.operational_scenarios || []);
        setAt4CanGenerate(data.can_generate);
        setAt4BlockedReason(data.generation_blocked_reason);
      }
    } catch (err) {
      console.error('Error loading AT4 data:', err);
    } finally {
      setLoadingAT4(false);
    }
  };

  const loadAT5Data = async () => {
    setLoadingAT5(true);
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/risk/projects/${projectId}/workshop/at5?view_type=${at5ViewType}`
      );
      if (response.ok) {
        const data: AT5WorkshopData = await response.json();
        setAt5Data(data);
        setSelectedCell(null);  // Reset selection when view changes
      }
    } catch (err) {
      console.error('Error loading AT5 data:', err);
    } finally {
      setLoadingAT5(false);
    }
  };

  const handleAnalyzeMatrix = async () => {
    setAnalyzingMatrix(true);
    setAiAnalysis(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/at5/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view_type: at5ViewType })
      });
      const data = await response.json();
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
        setShowAiAnalysisPanel(true);
        toast.success('Analyse IA générée avec succès');
      } else {
        toast.error(data.error || 'Erreur lors de l\'analyse');
      }
    } catch (err) {
      console.error('Error analyzing matrix:', err);
      toast.error('Erreur lors de l\'analyse de la matrice');
    } finally {
      setAnalyzingMatrix(false);
    }
  };

  // AT6 - Chargement des actions
  const loadActionsData = async () => {
    setLoadingActions(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/actions`);
      if (response.ok) {
        const data: AT6ActionsData = await response.json();
        setActionsData(data);
      }
    } catch (err) {
      console.error('Error loading actions:', err);
    } finally {
      setLoadingActions(false);
    }
  };

  // Rapports - Chargement des rapports générés
  const loadReportsData = async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/reports`);
      if (response.ok) {
        const data = await response.json();
        setGeneratedReports(data.items || []);
      } else {
        const errorData = await response.json();
        setReportsError(errorData.detail || 'Erreur lors du chargement des rapports');
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setReportsError('Erreur lors du chargement des rapports');
    } finally {
      setLoadingReports(false);
    }
  };

  // Rapports - Télécharger un rapport
  const handleDownloadReport = async (report: GeneratedEbiosReport) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}${report.download_url}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = report.file_name || `rapport_ebios_${report.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Téléchargement démarré');
      } else {
        toast.error('Erreur lors du téléchargement');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  // Rapports - Ouvrir la modal de confirmation de suppression
  const handleDeleteReportClick = (reportId: string) => {
    setReportToDelete(reportId);
    setShowDeleteReportConfirm(true);
  };

  // Rapports - Confirmer la suppression
  const handleConfirmDeleteReport = async () => {
    if (!reportToDelete) return;

    setShowDeleteReportConfirm(false);

    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/reports/${reportToDelete}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setDeleteReportResult({
          type: 'success',
          message: 'Le rapport a été supprimé avec succès.'
        });
        toast.success('Rapport supprimé');
        loadReportsData();
      } else {
        const errorData = await response.json();
        setDeleteReportResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la suppression du rapport.'
        });
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      setDeleteReportResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la suppression.'
      });
    } finally {
      setReportToDelete(null);
    }
  };

  // AT6 - Génération du plan d'actions avec l'IA
  const handleGenerateActionPlan = async () => {
    setGeneratingActionPlan(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/generate-action-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la génération du plan d\'actions');
      }

      toast.success(`Plan d'actions généré : ${data.actions_created || 0} actions créées`);

      // Recharger les actions et naviguer vers l'onglet Actions
      await loadActionsData();
      setActiveTab('actions');

    } catch (err) {
      console.error('Error generating action plan:', err);
      const error = err as Error;
      toast.error(error.message || 'Erreur lors de la génération du plan d\'actions');
    } finally {
      setGeneratingActionPlan(false);
    }
  };

  const handleGenerateAT4 = async () => {
    console.log('🚀 [AT4] Début génération AT4 pour projet:', projectId);
    setGeneratingAT4(true);
    try {
      console.log('📤 [AT4] Appel API generate-at4...');
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/generate-at4`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})  // Body JSON vide requis par Pydantic
      });

      const data = await response.json();
      console.log('📥 [AT4] Réponse API:', response.status, data);

      if (!response.ok) {
        console.error('❌ [AT4] Erreur API:', data);
        throw new Error(data.detail || 'Erreur lors de la génération');
      }

      if (data.scenarios_created === 0) {
        console.warn('⚠️ [AT4] 0 scénarios créés:', data.message);
        toast.error(
          '⚠️ Aucun scénario opérationnel généré. ' + (data.message || 'Veuillez vérifier les données AT3.'),
          { duration: 5000 }
        );
      } else {
        console.log('✅ [AT4] Succès:', data.scenarios_created, 'scénarios créés');
        toast.success(
          data.message || `✅ ${data.scenarios_created} scénarios opérationnels générés avec succès !`,
          { duration: 4000 }
        );
      }

      // Recharger les données AT4 et naviguer vers l'onglet AT4
      await loadAT4Data();
      setActiveTab('AT4');

    } catch (err) {
      console.error('Error generating AT4:', err);
      toast.error(
        err instanceof Error ? err.message : 'Erreur lors de la génération des scénarios opérationnels',
        { duration: 5000 }
      );
    } finally {
      setGeneratingAT4(false);
    }
  };

  const handleDeleteOperationalScenarioClick = (scenario: OperationalScenario) => {
    setOperationalScenarioToDelete(scenario);
    setShowDeleteOperationalScenarioModal(true);
  };

  // Générer AT4 pour un scénario stratégique spécifique
  const handleGenerateAT4ForScenario = async (scenarioId: string) => {
    setGeneratingAT4(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/generate-at4`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategic_scenario_ids: [scenarioId] })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la génération');
      }

      if (data.scenarios_created === 0) {
        toast.error(
          '⚠️ Aucun scénario opérationnel généré. ' + (data.message || 'Veuillez vérifier les données.'),
          { duration: 5000 }
        );
      } else {
        toast.success(
          data.message || `✅ ${data.scenarios_created} scénarios opérationnels générés ! Redirection vers AT4...`,
          { duration: 3000 }
        );

        // Rediriger vers AT4 après un court délai
        setTimeout(() => {
          setActiveTab('AT4');
          loadAT4Data();
        }, 1000);
      }

    } catch (err) {
      console.error('Error generating AT4 for scenario:', err);
      toast.error(
        err instanceof Error ? err.message : 'Erreur lors de la génération des scénarios opérationnels',
        { duration: 5000 }
      );
    } finally {
      setGeneratingAT4(false);
    }
  };

  const handleConfirmDeleteOperationalScenario = async () => {
    if (!operationalScenarioToDelete) return;

    try {
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/risk/projects/${projectId}/operational-scenarios/${operationalScenarioToDelete.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast.success('Scénario opérationnel supprimé');
      loadAT4Data();
    } catch (err) {
      console.error('Error deleting operational scenario:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setShowDeleteOperationalScenarioModal(false);
      setOperationalScenarioToDelete(null);
    }
  };

  const handleFreezeProject = async () => {
    setFreezeLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/freeze`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Projet figé avec succès');
        setShowFreezeModal(false);
        loadProject();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du gel');
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Erreur lors du gel du projet');
    } finally {
      setFreezeLoading(false);
    }
  };

  const handlePopulateAT1 = async () => {
    setPopulateLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/populate-at1`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `AT1 pré-rempli : ${data.data.business_values_added} valeurs métier, ` +
          `${data.data.assets_added} biens supports, ${data.data.feared_events_added} événements redoutés`
        );
        // Recharger les données AT1
        loadAT1Data();
        loadProject();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du pré-remplissage');
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Erreur lors du pré-remplissage AT1');
    } finally {
      setPopulateLoading(false);
    }
  };

  // ==================== AT1 SELECTION HELPERS ====================

  // Fonction pour sauvegarder la sélection en base
  const saveSelectionToBackend = async (elementType: string, elementId: string, isSelected: boolean) => {
    try {
      await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/workshop/at1/toggle-selection`, {
        method: 'PATCH',
        body: JSON.stringify({
          element_type: elementType,
          element_id: elementId,
          is_selected: isSelected
        })
      });
    } catch (err) {
      console.error(`Erreur lors de la sauvegarde de la sélection ${elementType}:`, err);
      toast.error('Erreur lors de la sauvegarde de la sélection');
    }
  };

  const toggleBusinessValue = (id: string) => {
    setSelectedBusinessValues(prev => {
      const newSet = new Set(prev);
      const newIsSelected = !newSet.has(id);
      if (newIsSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      // Sauvegarder en base
      saveSelectionToBackend('business_value', id, newIsSelected);
      return newSet;
    });
  };

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      const newIsSelected = !newSet.has(id);
      if (newIsSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      // Sauvegarder en base
      saveSelectionToBackend('asset', id, newIsSelected);
      return newSet;
    });
  };

  const toggleFearedEvent = (id: string) => {
    setSelectedFearedEvents(prev => {
      const newSet = new Set(prev);
      const newIsSelected = !newSet.has(id);
      if (newIsSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      // Sauvegarder en base
      saveSelectionToBackend('feared_event', id, newIsSelected);
      return newSet;
    });
  };

  const selectAllBusinessValues = async () => {
    const newIsSelected = selectedBusinessValues.size !== businessValues.length;
    if (newIsSelected) {
      setSelectedBusinessValues(new Set(businessValues.map(bv => bv.id)));
    } else {
      setSelectedBusinessValues(new Set());
    }
    // Sauvegarder tous les changements en base
    for (const bv of businessValues) {
      await saveSelectionToBackend('business_value', bv.id, newIsSelected);
    }
  };

  const selectAllAssets = async () => {
    const newIsSelected = selectedAssets.size !== assets.length;
    if (newIsSelected) {
      setSelectedAssets(new Set(assets.map(a => a.id)));
    } else {
      setSelectedAssets(new Set());
    }
    // Sauvegarder tous les changements en base
    for (const a of assets) {
      await saveSelectionToBackend('asset', a.id, newIsSelected);
    }
  };

  const selectAllFearedEvents = async () => {
    const newIsSelected = selectedFearedEvents.size !== fearedEvents.length;
    if (newIsSelected) {
      setSelectedFearedEvents(new Set(fearedEvents.map(fe => fe.id)));
    } else {
      setSelectedFearedEvents(new Set());
    }
    // Sauvegarder tous les changements en base
    for (const fe of fearedEvents) {
      await saveSelectionToBackend('feared_event', fe.id, newIsSelected);
    }
  };

  const clearAllSelections = async () => {
    setSelectedBusinessValues(new Set());
    setSelectedAssets(new Set());
    setSelectedFearedEvents(new Set());
    // Sauvegarder tous les changements en base
    for (const bv of businessValues) {
      await saveSelectionToBackend('business_value', bv.id, false);
    }
    for (const a of assets) {
      await saveSelectionToBackend('asset', a.id, false);
    }
    for (const fe of fearedEvents) {
      await saveSelectionToBackend('feared_event', fe.id, false);
    }
  };

  const getTotalSelected = () => {
    return selectedBusinessValues.size + selectedAssets.size + selectedFearedEvents.size;
  };

  // Vérifie si les limites recommandées sont dépassées
  const hasExceededRecommendedLimits = () => {
    const bvStatus = getLimitStatus(businessValues.length, 'business_values');
    const assetStatus = getLimitStatus(assets.length, 'assets');
    const feStatus = getLimitStatus(fearedEvents.length, 'feared_events');
    return bvStatus !== 'ok' || assetStatus !== 'ok' || feStatus !== 'ok';
  };

  // Génère le message d'avertissement pour le modal
  const getLimitWarningMessage = (): string => {
    const warnings: string[] = [];

    if (getLimitStatus(businessValues.length, 'business_values') !== 'ok') {
      warnings.push(`${businessValues.length} valeurs métier (recommandé: 5-10)`);
    }
    if (getLimitStatus(assets.length, 'assets') !== 'ok') {
      warnings.push(`${assets.length} biens supports (recommandé: 8-15)`);
    }
    if (getLimitStatus(fearedEvents.length, 'feared_events') !== 'ok') {
      warnings.push(`${fearedEvents.length} événements redoutés (recommandé: 5-10)`);
    }

    return `Vous avez un nombre élevé d'éléments dans cet atelier:\n\n• ${warnings.join('\n• ')}\n\nCela va générer beaucoup de scénarios dans les ateliers suivants. Voulez-vous continuer quand même ?`;
  };

  const handleGenerateAT2Click = () => {
    if (getTotalSelected() === 0) {
      toast.error('Veuillez sélectionner au moins un élément');
      return;
    }

    // Vérifier si les limites recommandées sont dépassées
    if (hasExceededRecommendedLimits()) {
      setShowLimitWarningModal(true);
      return;
    }

    // Sinon, générer directement
    executeGenerateAT2();
  };

  const executeGenerateAT2 = async () => {
    setShowLimitWarningModal(false);
    setGeneratingAT2(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/generate-at2`, {
        method: 'POST',
        body: JSON.stringify({
          business_value_ids: Array.from(selectedBusinessValues),
          asset_ids: Array.from(selectedAssets),
          feared_event_ids: Array.from(selectedFearedEvents)
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`AT2 généré : ${data.risk_sources_created || 0} sources de risques créées`);
        clearAllSelections();
        setActiveTab('AT2');
        loadProject();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la génération');
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Erreur lors de la génération AT2');
    } finally {
      setGeneratingAT2(false);
    }
  };

  // Gardé pour compatibilité
  const handleGenerateAT2 = handleGenerateAT2Click;

  // Handler pour sauvegarder une nouvelle source de risque
  const handleSaveRiskSource = async (formData: RiskSourceFormData) => {
    // Vérifier la limite EBIOS
    if (getLimitStatus(riskSources.length, 'risk_sources') === 'blocked') {
      toast.error('Limite atteinte : le nombre de sources de risques est limité à 15');
      throw new Error('Limite atteinte');
    }

    const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects/${projectId}/risk-sources`, {
      method: 'POST',
      body: JSON.stringify({
        reference: formData.reference,
        label: formData.label,
        description: formData.description || null,
        justification: formData.justification,
        relevance: formData.relevance,
        objectives: formData.objectives.map(obj => ({
          label: obj.label,
          description: obj.description || null
        })),
        is_selected: formData.is_selected
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erreur lors de l\'enregistrement');
    }

    toast.success('Source de risque ajoutée avec succès');
    // Recharger les données AT2
    loadAT2Data();
  };

  // ==================== RENDER HELPERS ====================

  const getWorkshopProgress = (workshopType: WorkshopType): number => {
    // Utiliser workshops_progress du projet si disponible
    if (project?.workshops_progress && project.workshops_progress[workshopType] !== undefined) {
      return project.workshops_progress[workshopType];
    }
    // Fallback sur l'ancien système
    const workshop = workshops.find(w => w.workshop_type === workshopType);
    return workshop?.progress || 0;
  };

  const getOverallProgress = (): number => {
    // Utiliser progress_percent du projet si disponible
    if (project?.progress_percent !== undefined) {
      return project.progress_percent;
    }
    // Fallback sur l'ancien calcul
    if (workshops.length === 0) return 0;
    const totalProgress = workshops.reduce((sum, w) => sum + (w.progress || 0), 0);
    return Math.round(totalProgress / 5);
  };

  // ==================== RENDER TABS ====================

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progression</p>
              <p className="text-2xl font-bold text-gray-900">{getOverallProgress()}%</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <Target className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full"
              style={{ width: `${getOverallProgress()}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valeurs métier</p>
              <p className="text-2xl font-bold text-gray-900">{businessValues.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Événements redoutés</p>
              <p className="text-2xl font-bold text-gray-900">{fearedEvents.length}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Biens supports</p>
              <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Layers className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bouton Peupler AT1 depuis IA - affiché si tout est vide */}
      {businessValues.length === 0 && assets.length === 0 && fearedEvents.length === 0 && project?.status !== 'FROZEN' && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg mr-4">
                <Bot className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pré-remplir l&apos;Atelier 1 avec l&apos;IA</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Utilisez les échanges de l&apos;assistant IA lors de la création pour pré-remplir automatiquement
                  les valeurs métier, biens supports et événements redoutés.
                </p>
              </div>
            </div>
            <button
              onClick={handlePopulateAT1}
              disabled={populateLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {populateLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Peupler depuis l&apos;IA
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Workshops Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progression des ateliers</h3>
        <div className="space-y-4">
          {(['AT1', 'AT2', 'AT3', 'AT4', 'AT5'] as WorkshopType[]).map((at) => {
            const progress = getWorkshopProgress(at);
            const labels: Record<WorkshopType, string> = {
              'AT1': 'Cadrage et socle de sécurité',
              'AT2': 'Sources de risques',
              'AT3': 'Scénarios stratégiques',
              'AT4': 'Scénarios opérationnels',
              'AT5': 'Traitement des risques'
            };

            return (
              <div key={at} className="flex items-center">
                <div className="w-32 font-medium text-gray-900">{at}</div>
                <div className="flex-1 mr-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{labels[at]}</span>
                    <span className="text-gray-900 font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        progress === 100 ? 'bg-green-500' :
                        progress > 0 ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab(at)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {progress === 0 ? 'Commencer' : 'Continuer'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du projet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {project?.description && (
            <div className="col-span-2">
              <span className="text-gray-500">Description :</span>
              <p className="mt-1 text-gray-900">{project.description}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Créé le :</span>
            <span className="ml-2 text-gray-900">
              {project?.created_at ? new Date(project.created_at).toLocaleDateString('fr-FR') : '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Dernière modification :</span>
            <span className="ml-2 text-gray-900">
              {project?.updated_at ? new Date(project.updated_at).toLocaleDateString('fr-FR') : '-'}
            </span>
          </div>
          {project?.frozen_at && (
            <div className="col-span-2">
              <span className="text-gray-500">Figé le :</span>
              <span className="ml-2 text-red-600 font-medium">
                {new Date(project.frozen_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAT1 = () => (
    <div className="space-y-6">
      {/* Header AT1 - Sticky */}
      <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Atelier 1 - Cadrage et socle de sécurité</h3>
            <p className="text-sm text-gray-600">
              Définissez les valeurs métier, biens supports et événements redoutés
            </p>
          </div>
          <div className="flex items-center gap-3">
            {project?.status !== 'FROZEN' && getTotalSelected() > 0 && (
              <button
                onClick={clearAllSelections}
                className="px-4 py-2 rounded-lg transition-colors flex items-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
              >
                Tout désélectionner ({getTotalSelected()})
              </button>
            )}
            {project?.status !== 'FROZEN' && getTotalSelected() > 0 && (
              <button
                onClick={handleGenerateAT2Click}
                disabled={generatingAT2}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 shadow-sm"
              >
                {generatingAT2 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Générer AT2 ({getTotalSelected()} éléments)
                  </>
                )}
              </button>
            )}
            {project?.status !== 'FROZEN' && (
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Générer avec IA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bonnes pratiques EBIOS RM */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Bonnes pratiques EBIOS RM</h4>
            <p className="text-sm text-blue-800">
              Pour garder une analyse lisible et exploitable, nous vous recommandons :
            </p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• <strong>5 à 10</strong> valeurs métier</li>
              <li>• <strong>8 à 15</strong> biens supports</li>
              <li>• <strong>5 à 10</strong> événements redoutés</li>
            </ul>
            <p className="mt-2 text-xs text-blue-600">
              Au-delà de ces volumes, le nombre de scénarios générés peut devenir difficile à exploiter.
              L&apos;outil vous alertera automatiquement si vous dépassez ces seuils.
            </p>
          </div>
        </div>
      </div>

      {/* Instruction de sélection */}
      {project?.status !== 'FROZEN' && (businessValues.length > 0 || assets.length > 0 || fearedEvents.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">
              <strong>Cliquez sur les éléments</strong> pour les sélectionner et générer l&apos;Atelier 2 (Sources de risques).
              {getTotalSelected() > 0 && (
                <span className="ml-2 text-red-600">
                  ({getTotalSelected()} sélectionné{getTotalSelected() > 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Business Values */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center flex-wrap gap-2">
            {businessValues.length > 0 && project?.status !== 'FROZEN' && (
              <button
                onClick={selectAllBusinessValues}
                className="mr-3 p-1 hover:bg-gray-100 rounded"
                title={selectedBusinessValues.size === businessValues.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              >
                {selectedBusinessValues.size === businessValues.length && businessValues.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : selectedBusinessValues.size > 0 ? (
                  <div className="w-5 h-5 border-2 border-blue-600 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                  </div>
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Valeurs métier
            </h4>
            <LimitCounter
              count={businessValues.length}
              elementType="business_values"
              showBadge={getLimitStatus(businessValues.length, 'business_values') !== 'blocked'}
            />
            {selectedBusinessValues.size > 0 && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {selectedBusinessValues.size} sélectionnée{selectedBusinessValues.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {project?.status !== 'FROZEN' && (
            <button
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center ${
                getLimitStatus(businessValues.length, 'business_values') === 'blocked'
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={getLimitStatus(businessValues.length, 'business_values') === 'blocked'}
              title={getLimitStatus(businessValues.length, 'business_values') === 'blocked' ? 'Limite atteinte' : 'Ajouter une valeur métier'}
            >
              {getLimitStatus(businessValues.length, 'business_values') === 'blocked' ? (
                <Ban className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Ajouter
            </button>
          )}
        </div>

        {/* Bandeau d'alerte si limites dépassées */}
        <LimitAlertBanner count={businessValues.length} elementType="business_values" />

        {businessValues.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucune valeur métier définie</p>
            <p className="text-sm mt-1">Utilisez l&apos;IA pour générer automatiquement les valeurs métier</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businessValues.map((value) => {
              const isSelected = selectedBusinessValues.has(value.id);
              const canSelect = project?.status !== 'FROZEN';
              return (
                <div
                  key={value.id}
                  onClick={() => canSelect && toggleBusinessValue(value.id)}
                  className={`p-4 border rounded-lg transition-all ${
                    canSelect ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      {canSelect && (
                        <div className="mr-3 mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div>
                        <h5 className="font-medium text-gray-900">{value.label}</h5>
                        {value.description && <p className="text-sm text-gray-600 mt-1">{value.description}</p>}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(value.criticality)}`}>
                      Criticité: {value.criticality}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assets */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center flex-wrap gap-2">
            {assets.length > 0 && project?.status !== 'FROZEN' && (
              <button
                onClick={selectAllAssets}
                className="mr-3 p-1 hover:bg-gray-100 rounded"
                title={selectedAssets.size === assets.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              >
                {selectedAssets.size === assets.length && assets.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-green-600" />
                ) : selectedAssets.size > 0 ? (
                  <div className="w-5 h-5 border-2 border-green-600 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-sm" />
                  </div>
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-green-600" />
              Biens supports
            </h4>
            <LimitCounter
              count={assets.length}
              elementType="assets"
              showBadge={getLimitStatus(assets.length, 'assets') !== 'blocked'}
            />
            {selectedAssets.size > 0 && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                {selectedAssets.size} sélectionné{selectedAssets.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {project?.status !== 'FROZEN' && (
            <button
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center ${
                getLimitStatus(assets.length, 'assets') === 'blocked'
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={getLimitStatus(assets.length, 'assets') === 'blocked'}
              title={getLimitStatus(assets.length, 'assets') === 'blocked' ? 'Limite atteinte' : 'Ajouter un bien support'}
            >
              {getLimitStatus(assets.length, 'assets') === 'blocked' ? (
                <Ban className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Ajouter
            </button>
          )}
        </div>

        {/* Bandeau d'alerte si limites dépassées */}
        <LimitAlertBanner count={assets.length} elementType="assets" />

        {assets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun bien support défini</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assets.map((asset) => {
              const isSelected = selectedAssets.has(asset.id);
              const canSelect = project?.status !== 'FROZEN';
              return (
                <div
                  key={asset.id}
                  onClick={() => canSelect && toggleAsset(asset.id)}
                  className={`p-4 border rounded-lg transition-all ${
                    canSelect ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                  }`}
                >
                  <div className="flex items-start">
                    {canSelect && (
                      <div className="mr-3 mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-green-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{asset.label}</h5>
                      {asset.description && <p className="text-sm text-gray-600 mt-1">{asset.description}</p>}
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {asset.type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feared Events */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center flex-wrap gap-2">
            {fearedEvents.length > 0 && project?.status !== 'FROZEN' && (
              <button
                onClick={selectAllFearedEvents}
                className="mr-3 p-1 hover:bg-gray-100 rounded"
                title={selectedFearedEvents.size === fearedEvents.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              >
                {selectedFearedEvents.size === fearedEvents.length && fearedEvents.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-orange-600" />
                ) : selectedFearedEvents.size > 0 ? (
                  <div className="w-5 h-5 border-2 border-orange-600 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-orange-600 rounded-sm" />
                  </div>
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}
            <h4 className="font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
              Événements redoutés
            </h4>
            <LimitCounter
              count={fearedEvents.length}
              elementType="feared_events"
              showBadge={getLimitStatus(fearedEvents.length, 'feared_events') !== 'blocked'}
            />
            {selectedFearedEvents.size > 0 && (
              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                {selectedFearedEvents.size} sélectionné{selectedFearedEvents.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {project?.status !== 'FROZEN' && (
            <button
              className={`px-3 py-1.5 text-sm border rounded-lg flex items-center ${
                getLimitStatus(fearedEvents.length, 'feared_events') === 'blocked'
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={getLimitStatus(fearedEvents.length, 'feared_events') === 'blocked'}
              title={getLimitStatus(fearedEvents.length, 'feared_events') === 'blocked' ? 'Limite atteinte' : 'Ajouter un événement redouté'}
            >
              {getLimitStatus(fearedEvents.length, 'feared_events') === 'blocked' ? (
                <Ban className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Ajouter
            </button>
          )}
        </div>

        {/* Bandeau d'alerte si limites dépassées */}
        <LimitAlertBanner count={fearedEvents.length} elementType="feared_events" />

        {fearedEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun événement redouté défini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fearedEvents.map((event) => {
              const isSelected = selectedFearedEvents.has(event.id);
              const canSelect = project?.status !== 'FROZEN';
              return (
                <div
                  key={event.id}
                  onClick={() => canSelect && toggleFearedEvent(event.id)}
                  className={`p-4 border rounded-lg transition-all ${
                    canSelect ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                      : getSeverityColor(event.severity) + ' hover:ring-2 hover:ring-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      {canSelect && (
                        <div className="mr-3 mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-orange-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div>
                        <h5 className="font-medium">{event.label}</h5>
                        {event.description && <p className="text-sm mt-1 opacity-80">{event.description}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/50">
                        Gravité: {getSeverityLabel(event.severity)}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                        {event.dimension === 'CONFIDENTIALITY' ? 'Confidentialité' :
                         event.dimension === 'INTEGRITY' ? 'Intégrité' : 'Disponibilité'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Helper pour afficher le niveau de pertinence
  const getRelevanceLabel = (relevance: number): string => {
    const labels: Record<number, string> = {
      1: 'Faible',
      2: 'Modéré',
      3: 'Élevé',
      4: 'Très élevé'
    };
    return labels[relevance] || 'Non défini';
  };

  const getRelevanceColor = (relevance: number): string => {
    if (relevance === 4) return 'bg-red-100 text-red-800 border-red-200';
    if (relevance === 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (relevance === 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const renderAT2 = () => {
    if (loadingAT2) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin mr-3" />
          <span className="text-gray-600">Chargement des sources de risques...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header AT2 - Sticky */}
        <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Atelier 2 - Sources de risques</h3>
              <p className="text-sm text-gray-600">
              Identification et évaluation des sources de risques et leurs objectifs visés
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAT2Data}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </button>
            {project?.status !== 'FROZEN' && (
              <button
                onClick={() => setShowAddSourceModal(true)}
                disabled={getLimitStatus(riskSources.length, 'risk_sources') === 'blocked'}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                  getLimitStatus(riskSources.length, 'risk_sources') === 'blocked'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {getLimitStatus(riskSources.length, 'risk_sources') === 'blocked' ? (
                  <Ban className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Ajouter une source
              </button>
            )}
            {/* Bouton Générer AT3 */}
            {riskSources.filter(s => s.is_selected).length > 0 && project?.status !== 'FROZEN' && (
              <button
                onClick={handleGenerateAT3}
                disabled={generatingAT3}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
              >
                {generatingAT3 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération AT3...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    Générer AT3 via IA
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Bonnes pratiques */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Bonnes pratiques EBIOS RM</h4>
              <p className="text-sm text-blue-800">
                Les sources de risques représentent les acteurs malveillants (cybercriminels, États, insiders...)
                et leurs objectifs. Recommandation : <strong>5 à 12 sources de risques</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Compteur et alerte */}
        <div className="flex items-center gap-4">
          <LimitCounter count={riskSources.length} elementType="risk_sources" />
        </div>
        <LimitAlertBanner count={riskSources.length} elementType="risk_sources" />

        {/* Liste des sources de risques */}
        {riskSources.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune source de risque</h3>
            <p className="text-gray-600 mb-6">
              Retournez à l&apos;Atelier 1, sélectionnez des éléments et cliquez sur &quot;Générer AT2&quot;
              pour identifier les sources de risques pertinentes.
            </p>
            <button
              onClick={() => setActiveTab('AT1')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l&apos;Atelier 1
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {riskSources.map((source, index) => (
              <div
                key={source.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {/* Header de la source */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <Users className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          SR{String(index + 1).padStart(2, '0')} - {source.label}
                          {source.source === 'AI' && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full flex items-center">
                              <Bot className="w-3 h-3 mr-1" />
                              IA
                            </span>
                          )}
                        </h4>
                        {source.description && (
                          <p className="text-sm text-gray-600 mt-1">{source.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getRelevanceColor(source.relevance)}`}>
                        Pertinence: {getRelevanceLabel(source.relevance)}
                      </span>
                      {source.is_selected && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center">
                          <Check className="w-3 h-3 mr-1" />
                          Retenue
                        </span>
                      )}
                    </div>
                  </div>
                  {source.justification && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 font-medium mb-1">Justification</p>
                      <p className="text-sm text-gray-700">{source.justification}</p>
                    </div>
                  )}
                </div>

                {/* Objectifs visés */}
                {source.objectives && source.objectives.length > 0 && (
                  <div className="p-4 bg-gray-50">
                    <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Target className="w-4 h-4 mr-2 text-gray-500" />
                      Objectifs visés ({source.objectives.length})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {source.objectives.map((objective) => (
                        <div
                          key={objective.id}
                          className="p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-2">
                            {objective.is_selected ? (
                              <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{objective.label}</p>
                              {objective.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{objective.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper pour afficher la gravité
  const getSeverityLabel = (severity: number | null): string => {
    switch (severity) {
      case 1: return 'Faible';
      case 2: return 'Modérée';
      case 3: return 'Importante';
      case 4: return 'Critique';
      default: return 'Non évaluée';
    }
  };

  const getSeverityColor = (severity: number | null): string => {
    switch (severity) {
      case 1: return 'bg-green-100 text-green-800 border-green-200';
      case 2: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 4: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Helper pour afficher la vraisemblance (4 niveaux)
  const getLikelihoodLabel = (likelihood: number | null): string => {
    switch (likelihood) {
      case 1: return 'Très faible';
      case 2: return 'Faible';
      case 3: return 'Modérée';
      case 4: return 'Élevée';
      default: return 'Non évaluée';
    }
  };

  const getLikelihoodColor = (likelihood: number | null): string => {
    switch (likelihood) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Helper pour afficher le niveau de risque stratégique
  const getRiskLevelLabel = (riskLevel: string | null): string => {
    switch (riskLevel) {
      case 'FAIBLE': return 'Faible';
      case 'MODERE': return 'Modéré';
      case 'ELEVE':
      case 'IMPORTANT': return 'Important';
      case 'CRITIQUE': return 'Critique';
      default: return 'Non évalué';
    }
  };

  const getRiskLevelColor = (riskLevel: string | null): string => {
    switch (riskLevel) {
      case 'FAIBLE': return 'bg-green-500 text-white';
      case 'MODERE': return 'bg-yellow-500 text-white';
      case 'ELEVE':
      case 'IMPORTANT': return 'bg-orange-500 text-white';
      case 'CRITIQUE': return 'bg-red-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // Version pour le texte AT5 (badges)
  const getRiskLevelTextColor = (level: string): string => {
    const colors: Record<string, string> = {
      'CRITIQUE': 'text-red-600 bg-red-50',
      'IMPORTANT': 'text-orange-600 bg-orange-50',
      'ELEVE': 'text-orange-600 bg-orange-50',
      'MODERE': 'text-yellow-600 bg-yellow-50',
      'FAIBLE': 'text-green-600 bg-green-50'
    };
    return colors[level] || 'text-gray-600 bg-gray-50';
  };

  const renderAT3 = () => {
    if (loadingAT3) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin mr-3" />
          <span className="text-gray-600">Chargement des scénarios stratégiques...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header AT3 - Sticky */}
        <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Atelier 3 - Scénarios stratégiques</h3>
              <p className="text-sm text-gray-600">
                Analyse des chaînes d&apos;attaque permettant aux sources de risques d&apos;atteindre vos événements redoutés
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAT3Data}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </button>
              {project?.status !== 'FROZEN' && strategicScenarios.length > 0 && (
                <button
                  onClick={handleGenerateAT4}
                  disabled={generatingAT4}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {generatingAT4 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Génération AT4...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Générer AT4 via IA
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message si génération bloquée */}
        {!at3CanGenerate && at3BlockedReason && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Génération impossible</h4>
                <p className="text-sm text-amber-800">{at3BlockedReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bonnes pratiques */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Scénarios stratégiques EBIOS RM</h4>
              <p className="text-sm text-blue-800">
                Les scénarios stratégiques représentent les chaînes d&apos;attaque de haut niveau.
                Chaque scénario lie une <strong>source de risque</strong> à un ou plusieurs <strong>biens supports</strong>
                pour atteindre un <strong>événement redouté</strong>.
                L&apos;IA génère entre 2 et 6 scénarios basés sur vos données AT1 et AT2.
              </p>
            </div>
          </div>
        </div>

        {/* Compteur */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            {strategicScenarios.length} scénario{strategicScenarios.length !== 1 ? 's' : ''} stratégique{strategicScenarios.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Liste des scénarios */}
        {strategicScenarios.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
            <Crosshair className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun scénario stratégique</h3>
            <p className="text-gray-600 mb-6">
              {at3CanGenerate
                ? "Cliquez sur \"Générer les scénarios\" pour créer automatiquement les scénarios stratégiques à partir de vos données AT1 et AT2."
                : at3BlockedReason || "Complétez d'abord les ateliers AT1 et AT2 pour générer les scénarios stratégiques."
              }
            </p>
            {at3CanGenerate && (
              <button
                onClick={handleGenerateAT3}
                disabled={generatingAT3}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center disabled:opacity-50"
              >
                {generatingAT3 ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5 mr-2" />
                    Générer les scénarios stratégiques
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {strategicScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {/* En-tête du scénario */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-bold rounded-full">
                        {scenario.code}
                      </span>
                      <h4 className="font-semibold text-gray-900">{scenario.title}</h4>
                      {scenario.source === 'AI' && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          IA
                        </span>
                      )}
                    </div>
                    {project?.status !== 'FROZEN' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleGenerateAT4ForScenario(scenario.id)}
                          disabled={generatingAT4}
                          className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Générer les scénarios opérationnels pour ce scénario"
                        >
                          {generatingAT4 ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          Générer AT4 via IA
                        </button>
                        <button
                          onClick={() => handleDeleteScenarioClick(scenario)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer ce scénario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contenu du scénario */}
                <div className="p-4 space-y-4">
                  {/* Description */}
                  {scenario.description && (
                    <p className="text-gray-600 text-sm">{scenario.description}</p>
                  )}

                  {/* Source de risque */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 font-medium min-w-[140px]">Source de risque :</span>
                    <span className="text-sm text-gray-900">
                      {scenario.risk_source_code && scenario.risk_source_label
                        ? `${scenario.risk_source_code} - ${scenario.risk_source_label}`
                        : <span className="text-gray-400 italic">Non définie</span>
                      }
                    </span>
                  </div>

                  {/* Biens supports ciblés */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 font-medium min-w-[140px]">Biens supports :</span>
                    <div className="flex flex-wrap gap-2">
                      {scenario.assets.length > 0 ? (
                        scenario.assets.map((asset) => (
                          <span
                            key={asset.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {asset.code} - {asset.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm italic">Non définis</span>
                      )}
                    </div>
                  </div>

                  {/* Événement redouté */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 font-medium min-w-[140px]">Événement redouté :</span>
                    <span className="text-sm text-gray-900">
                      {scenario.feared_event_code && scenario.feared_event_label
                        ? `${scenario.feared_event_code} - ${scenario.feared_event_label}`
                        : <span className="text-gray-400 italic">Non défini</span>
                      }
                    </span>
                  </div>

                  {/* Évaluations avec Badge Risque Stratégique Premium */}
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Gravité :</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(scenario.severity)}`}>
                        {getSeverityLabel(scenario.severity)} ({scenario.severity || 0})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Vraisemblance :</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getLikelihoodColor(scenario.likelihood)}`}>
                        {getLikelihoodLabel(scenario.likelihood)} ({scenario.likelihood || 0})
                      </span>
                    </div>

                    {/* Badge Risque Stratégique avec Info-bulle Premium */}
                    <div className="relative group ml-auto">
                      <div className="flex items-center gap-2 cursor-help">
                        <span className="text-sm font-medium text-gray-700">Risque stratégique :</span>
                        <span className={`px-3 py-1.5 text-sm font-bold rounded-full shadow-md transition-transform group-hover:scale-105 ${getRiskLevelColor(scenario.risk_level)}`}>
                          {scenario.risk_score || 0} ({getRiskLevelLabel(scenario.risk_level)})
                        </span>
                      </div>

                      {/* Info-bulle Premium au survol */}
                      <div className="absolute bottom-full right-0 mb-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30">
                        <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4">
                          {/* Flèche */}
                          <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"></div>

                          <h5 className="font-semibold text-sm mb-2 text-red-300">
                            📊 Risque stratégique = G × V
                          </h5>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300">Gravité (G) :</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                scenario.severity === 4 ? 'bg-red-500' :
                                scenario.severity === 3 ? 'bg-orange-500' :
                                scenario.severity === 2 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}>
                                {getSeverityLabel(scenario.severity)} ({scenario.severity || 0})
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-gray-300">Vraisemblance (V) :</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                scenario.likelihood === 4 ? 'bg-red-500' :
                                scenario.likelihood === 3 ? 'bg-orange-500' :
                                scenario.likelihood === 2 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}>
                                {getLikelihoodLabel(scenario.likelihood)} ({scenario.likelihood || 0})
                              </span>
                            </div>

                            <div className="border-t border-gray-700 pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300 font-medium">Score total :</span>
                                <span className="text-white font-bold">
                                  {scenario.risk_score || 0} / 16
                                </span>
                              </div>
                            </div>

                            {/* Mini barre de progression */}
                            <div className="mt-2">
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    scenario.risk_level === 'CRITIQUE' ? 'bg-red-500' :
                                    scenario.risk_level === 'ELEVE' ? 'bg-orange-500' :
                                    scenario.risk_level === 'MODERE' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${((scenario.risk_score || 0) / 16) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAT4 = () => {
    if (loadingAT4) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin mr-3" />
          <span className="text-gray-600">Chargement des scénarios opérationnels...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header AT4 - Sticky */}
        <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Atelier 4 - Scénarios opérationnels</h3>
              <p className="text-sm text-gray-600">
                Définissez des scénarios opérationnels détaillés à partir des scénarios stratégiques de l&apos;atelier 3
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAT4Data}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </button>
              {/* Bouton génération matrice AT5 si des scénarios existent */}
              {operationalScenarios.length > 0 && project?.status !== 'FROZEN' && (
                <button
                  onClick={() => setActiveTab('AT5')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Générer la matrice (AT5)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message si génération bloquée */}
        {!at4CanGenerate && at4BlockedReason && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Génération impossible</h4>
                <p className="text-sm text-amber-800">{at4BlockedReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bonnes pratiques */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Scénarios opérationnels EBIOS RM</h4>
              <p className="text-sm text-blue-800">
                Les scénarios opérationnels décrivent concrètement comment une source de risque exploite vos biens supports
                pour provoquer un événement redouté. Chaque scénario détaille les <strong>étapes d&apos;attaque</strong>,
                les <strong>biens supports ciblés</strong> et permet d&apos;évaluer le <strong>risque opérationnel</strong> (G × V).
              </p>
            </div>
          </div>
        </div>

        {/* Compteur */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            {operationalScenarios.length} scénario{operationalScenarios.length !== 1 ? 's' : ''} opérationnel{operationalScenarios.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Liste des scénarios opérationnels */}
        {operationalScenarios.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
            <Layers className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun scénario opérationnel</h3>
            <p className="text-gray-600 mb-6">
              {strategicScenarios.length > 0
                ? "Retournez à l'atelier 3 (Scénarios stratégiques) et cliquez sur \"Génération AT4...\" pour créer automatiquement les scénarios opérationnels."
                : "Complétez d'abord l'atelier 3 (scénarios stratégiques) pour pouvoir générer les scénarios opérationnels."
              }
            </p>
            {/* Indicateur de génération en cours si lancée depuis AT3 */}
            {generatingAT4 ? (
              <div className="flex items-center justify-center gap-3 px-6 py-3 bg-red-50 text-red-700 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération en cours...
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('AT3')}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
              >
                <Crosshair className="w-5 h-5 mr-2" />
                Aller à l&apos;atelier 3 (AT3)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {operationalScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {/* En-tête du scénario */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-bold rounded-full">
                        {scenario.code}
                      </span>
                      <h4 className="font-semibold text-gray-900">{scenario.title}</h4>
                      {scenario.source === 'AI' && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          IA
                        </span>
                      )}
                    </div>
                    {project?.status !== 'FROZEN' && (
                      <button
                        onClick={() => handleDeleteOperationalScenarioClick(scenario)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer ce scénario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenu du scénario */}
                <div className="p-4 space-y-4">
                  {/* Description */}
                  {scenario.description && (
                    <p className="text-gray-600 text-sm">{scenario.description}</p>
                  )}

                  {/* Scénario stratégique lié */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 font-medium min-w-[160px]">Scénario stratégique :</span>
                    <span className="text-sm text-gray-900">
                      {scenario.strategic_scenario_code && scenario.strategic_scenario_title ? (
                        <button
                          onClick={() => setActiveTab('AT3')}
                          className="text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
                        >
                          {scenario.strategic_scenario_code} - {scenario.strategic_scenario_title}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">Non défini</span>
                      )}
                    </span>
                  </div>

                  {/* Source de risque */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 font-medium min-w-[160px]">Source de risque :</span>
                    <span className="text-sm text-gray-900">
                      {scenario.risk_source_code && scenario.risk_source_label
                        ? `${scenario.risk_source_code} - ${scenario.risk_source_label}`
                        : <span className="text-gray-400 italic">Non définie</span>
                      }
                    </span>
                  </div>

                  {/* Biens supports ciblés */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 font-medium min-w-[160px]">Biens supports :</span>
                    <div className="flex flex-wrap gap-2">
                      {scenario.assets && scenario.assets.length > 0 ? (
                        scenario.assets.map((asset) => (
                          <span
                            key={asset.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {asset.code} - {asset.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm italic">Non définis</span>
                      )}
                    </div>
                  </div>

                  {/* Événement redouté */}
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500 font-medium min-w-[160px]">Événement redouté :</span>
                    <span className="text-sm text-gray-900">
                      {scenario.feared_event_code && scenario.feared_event_label
                        ? `${scenario.feared_event_code} - ${scenario.feared_event_label}`
                        : <span className="text-gray-400 italic">Non défini</span>
                      }
                    </span>
                  </div>

                  {/* Étapes d'attaque (chaîne opérationnelle) */}
                  {scenario.steps && scenario.steps.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        Chaîne opérationnelle ({scenario.steps.length} étape{scenario.steps.length > 1 ? 's' : ''})
                      </h5>
                      <div className="space-y-2 pl-2">
                        {scenario.steps
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((step, index) => (
                            <div key={step.id} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                                {step.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                                )}
                                {step.actor && (
                                  <p className="text-xs text-gray-400 mt-0.5 italic">Acteur : {step.actor}</p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Évaluations avec Badge Risque Opérationnel Premium */}
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Gravité :</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(scenario.severity)}`}>
                        {getSeverityLabel(scenario.severity)} ({scenario.severity || 0})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Vraisemblance :</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getLikelihoodColor(scenario.likelihood)}`}>
                        {getLikelihoodLabel(scenario.likelihood)} ({scenario.likelihood || 0})
                      </span>
                    </div>

                    {/* Badge Risque Opérationnel avec Info-bulle Premium */}
                    <div className="relative group ml-auto">
                      <div className="flex items-center gap-2 cursor-help">
                        <span className="text-sm font-medium text-gray-700">Risque opérationnel :</span>
                        <span className={`px-3 py-1.5 text-sm font-bold rounded-full shadow-md transition-transform group-hover:scale-105 ${getRiskLevelColor(scenario.risk_level)}`}>
                          {scenario.risk_score || 0} ({getRiskLevelLabel(scenario.risk_level)})
                        </span>
                      </div>

                      {/* Info-bulle Premium au survol */}
                      <div className="absolute bottom-full right-0 mb-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30">
                        <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4">
                          {/* Flèche */}
                          <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900"></div>

                          <h5 className="font-semibold text-sm mb-2 text-orange-300">
                            📊 Risque opérationnel = G × V
                          </h5>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300">Gravité (G) :</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                scenario.severity === 4 ? 'bg-red-500' :
                                scenario.severity === 3 ? 'bg-orange-500' :
                                scenario.severity === 2 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}>
                                {getSeverityLabel(scenario.severity)} ({scenario.severity || 0})
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-gray-300">Vraisemblance (V) :</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                scenario.likelihood === 4 ? 'bg-red-500' :
                                scenario.likelihood === 3 ? 'bg-orange-500' :
                                scenario.likelihood === 2 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}>
                                {getLikelihoodLabel(scenario.likelihood)} ({scenario.likelihood || 0})
                              </span>
                            </div>

                            <div className="border-t border-gray-700 pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300 font-medium">Score total :</span>
                                <span className="text-white font-bold">
                                  {scenario.risk_score || 0} / 16
                                </span>
                              </div>
                            </div>

                            {/* Mini barre de progression */}
                            <div className="mt-2">
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    scenario.risk_level === 'CRITIQUE' ? 'bg-red-500' :
                                    scenario.risk_level === 'ELEVE' ? 'bg-orange-500' :
                                    scenario.risk_level === 'MODERE' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${((scenario.risk_score || 0) / 16) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Fonction utilitaire pour obtenir la couleur de la cellule
  const getCellColor = (severity: number, likelihood: number): string => {
    const score = severity * likelihood;
    if (score >= 12) return 'bg-red-500 hover:bg-red-600';  // Critique
    if (score >= 8) return 'bg-orange-500 hover:bg-orange-600';  // Important
    if (score >= 4) return 'bg-yellow-400 hover:bg-yellow-500';  // Modéré
    return 'bg-green-500 hover:bg-green-600';  // Faible
  };

  const renderAT5 = () => {
    // Labels des axes
    const severityLabels = ['', 'Mineure', 'Significative', 'Importante', 'Critique'];
    const likelihoodLabels = ['', 'Très faible', 'Faible', 'Modérée', 'Élevée'];

    // Obtenir les scénarios d'une cellule
    const getScenariosForCell = (cell: MatrixCell): MatrixScenario[] => {
      if (!at5Data) return [];
      return at5Data.scenarios.filter(s => cell.scenario_ids.includes(s.id));
    };

    return (
      <div className="space-y-6">
        {/* Header AT5 - Sticky */}
        <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Atelier 5 - Matrice des risques</h3>
              <p className="text-sm text-gray-600">
                Visualisez la répartition des scénarios de risques selon la gravité et la vraisemblance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAT5Data}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </button>
              {at5Data && at5Data.can_build && (
                <>
                  <button
                    onClick={handleAnalyzeMatrix}
                    disabled={analyzingMatrix}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                  >
                    {analyzingMatrix ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        Analyser la matrice
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateActionPlan}
                    disabled={generatingActionPlan}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                  >
                    {generatingActionPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer le plan d&apos;actions avec l&apos;IA
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sélecteur de vue */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 w-fit">
          <button
            onClick={() => setAt5ViewType('operational')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              at5ViewType === 'operational'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Vue opérationnelle
          </button>
          <button
            onClick={() => setAt5ViewType('strategic')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              at5ViewType === 'strategic'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Vue stratégique
          </button>
          <button
            onClick={() => setAt5ViewType('combined')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              at5ViewType === 'combined'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Vue combinée
          </button>
        </div>

        {loadingAT5 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            <span className="ml-3 text-gray-600">Chargement de la matrice...</span>
          </div>
        ) : !at5Data?.can_build ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
            <Grid3X3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Matrice non disponible</h3>
            <p className="text-gray-600 mb-6">
              {at5Data?.blocked_reason || 'Aucun scénario disponible pour construire la matrice.'}
            </p>
            <button
              onClick={() => setActiveTab('AT4')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Aller à l&apos;Atelier 4
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Matrice 4x4 */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Matrice des risques</h4>
                <div className="text-sm text-gray-500">
                  Risque = Gravité × Vraisemblance
                </div>
              </div>

              {/* Grille 4x4 avec labels */}
              <div className="flex">
                {/* Labels axe Y (Gravité) */}
                <div className="flex flex-col justify-around pr-2 text-right text-xs text-gray-600" style={{ width: '100px' }}>
                  <div className="h-20 flex items-center justify-end">4 - {severityLabels[4]}</div>
                  <div className="h-20 flex items-center justify-end">3 - {severityLabels[3]}</div>
                  <div className="h-20 flex items-center justify-end">2 - {severityLabels[2]}</div>
                  <div className="h-20 flex items-center justify-end">1 - {severityLabels[1]}</div>
                </div>

                {/* Matrice */}
                <div className="flex-1">
                  <div className="grid grid-cols-4 gap-1">
                    {/* Parcourir de haut en bas (G=4 à G=1) et de gauche à droite (V=1 à V=4) */}
                    {[4, 3, 2, 1].map((g) =>
                      [1, 2, 3, 4].map((v) => {
                        const cell = at5Data.matrix.find(c => c.severity === g && c.likelihood === v);
                        const isSelected = selectedCell?.severity === g && selectedCell?.likelihood === v;
                        return (
                          <button
                            key={`${g}-${v}`}
                            onClick={() => cell && setSelectedCell(cell)}
                            className={`h-20 rounded-md flex flex-col items-center justify-center text-white font-medium transition-all ${getCellColor(g, v)} ${
                              isSelected ? 'ring-4 ring-red-500 ring-offset-2' : ''
                            } ${cell?.scenario_count === 0 ? 'opacity-40' : ''}`}
                            title={`G=${g}, V=${v} (Score: ${g * v})`}
                          >
                            {cell && cell.scenario_count > 0 && (
                              <>
                                <span className="text-lg font-bold">{cell.scenario_count}</span>
                                <span className="text-xs opacity-90">scénario{cell.scenario_count > 1 ? 's' : ''}</span>
                              </>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Labels axe X (Vraisemblance) */}
                  <div className="grid grid-cols-4 gap-1 mt-2 text-center text-xs text-gray-600">
                    <div>1 - {likelihoodLabels[1]}</div>
                    <div>2 - {likelihoodLabels[2]}</div>
                    <div>3 - {likelihoodLabels[3]}</div>
                    <div>4 - {likelihoodLabels[4]}</div>
                  </div>
                  <div className="text-center text-sm font-medium text-gray-700 mt-2">
                    Vraisemblance →
                  </div>
                </div>

                {/* Label vertical Gravité */}
                <div className="flex items-center justify-center pl-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  <span className="text-sm font-medium text-gray-700">← Gravité</span>
                </div>
              </div>

              {/* Légende */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className="text-xs text-gray-600">Faible (1-3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-400"></div>
                  <span className="text-xs text-gray-600">Modéré (4-7)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-500"></div>
                  <span className="text-xs text-gray-600">Important (8-11)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-xs text-gray-600">Critique (12-16)</span>
                </div>
              </div>
            </div>

            {/* Panel de détail */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h4 className="font-semibold text-gray-900">
                  {selectedCell
                    ? `Scénarios G=${selectedCell.severity}, V=${selectedCell.likelihood}`
                    : 'Sélectionnez une cellule'}
                </h4>
                {selectedCell && (
                  <p className="text-sm text-gray-600">
                    Score: {selectedCell.severity * selectedCell.likelihood} - {getRiskLevelLabel(selectedCell.max_risk_band)}
                  </p>
                )}
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                {!selectedCell ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Cliquez sur une cellule de la matrice pour voir les scénarios
                  </p>
                ) : getScenariosForCell(selectedCell).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Aucun scénario dans cette cellule
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getScenariosForCell(selectedCell).map((scenario) => (
                      <div
                        key={scenario.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-red-300 transition-colors cursor-pointer"
                        onClick={() => setActiveTab(scenario.type === 'strategic' ? 'AT3' : 'AT4')}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            scenario.type === 'strategic' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {scenario.code}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${getRiskLevelColor(scenario.risk_level)}`}>
                            {scenario.risk_score}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{scenario.title}</p>
                        {scenario.risk_source_code && (
                          <p className="text-xs text-gray-500 mt-1">
                            Source: {scenario.risk_source_code}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistiques */}
        {at5Data?.can_build && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{at5Data.stats.total_scenarios}</div>
              <div className="text-sm text-gray-600">Scénarios totaux</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{at5Data.stats.critical_count}</div>
              <div className="text-sm text-red-700">Risques critiques</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">{at5Data.stats.important_count}</div>
              <div className="text-sm text-orange-700">Risques importants</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{at5Data.stats.cells_with_scenarios}</div>
              <div className="text-sm text-gray-600">Cellules actives</div>
            </div>
          </div>
        )}

        {/* Panel Analyse IA */}
        {showAiAnalysisPanel && aiAnalysis && (
          <div className="bg-white border border-red-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-red-900">Analyse IA de la matrice</h4>
              </div>
              <button
                onClick={() => setShowAiAnalysisPanel(false)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
            <div className="p-6 prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkshopPlaceholder = (workshopType: WorkshopType) => {
    const workshopInfo: Record<WorkshopType, { title: string; description: string; icon: React.ElementType }> = {
      'AT1': { title: 'Cadrage', description: 'Valeurs métier, biens supports, événements redoutés', icon: Target },
      'AT2': { title: 'Sources de risques', description: 'Identification et évaluation des sources de risques', icon: Users },
      'AT3': { title: 'Scénarios stratégiques', description: 'Cartographie des parties prenantes et scénarios', icon: Network },
      'AT4': { title: 'Scénarios opérationnels', description: 'Modes opératoires et chemins d\'attaque', icon: Zap },
      'AT5': { title: 'Traitement des risques', description: 'Matrice des risques et plan de traitement', icon: Grid3X3 }
    };

    const info = workshopInfo[workshopType];

    return (
      <div className="space-y-6">
        {/* Header Atelier - Sticky */}
        <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Atelier {workshopType.replace('AT', '')} - {info.title}
              </h3>
              <p className="text-sm text-gray-600">{info.description}</p>
            </div>
            <div className="flex items-center gap-3">
              {project?.status !== 'FROZEN' && (
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer avec IA
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenu placeholder */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
          <Grid3X3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            En cours de développement
          </h3>
          <p className="text-gray-600 mb-6">{info.description}</p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-amber-700">
              Cette section est en cours de développement.
              {project?.status !== 'FROZEN' && (
                <> Complétez d&apos;abord les ateliers précédents pour débloquer cette section.</>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Helper pour couleur de priorité (format P1/P2/P3 aligné sur Campagnes)
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'P1':
        return {
          label: 'Critique',
          color: 'bg-red-100 text-red-800 border-red-200',
          dotColor: 'bg-red-500'
        };
      case 'P2':
        return {
          label: 'Important',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-500'
        };
      case 'P3':
      default:
        return {
          label: 'Normal',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500'
        };
    }
  };

  // Helper pour statuts (aligné sur module Campagnes)
  const getStatusConfig = (status: ActionStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'En attente',
          color: 'bg-gray-100 text-gray-700',
          dotColor: 'bg-gray-400'
        };
      case 'in_progress':
        return {
          label: 'En cours',
          color: 'bg-blue-100 text-blue-700',
          dotColor: 'bg-blue-500'
        };
      case 'completed':
        return {
          label: 'Terminé',
          color: 'bg-green-100 text-green-700',
          dotColor: 'bg-green-500'
        };
      case 'blocked':
        return {
          label: 'Bloqué',
          color: 'bg-red-100 text-red-700',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          label: 'En attente',
          color: 'bg-gray-100 text-gray-700',
          dotColor: 'bg-gray-400'
        };
    }
  };

  // Helper pour couleur de catégorie
  const getCategoryColor = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('préventive') || c.includes('prevention')) return 'bg-blue-100 text-blue-800';
    if (c.includes('détection') || c.includes('detection')) return 'bg-purple-100 text-purple-800';
    if (c.includes('organisation')) return 'bg-indigo-100 text-indigo-800';
    if (c.includes('fournisseur') || c.includes('contractuel')) return 'bg-teal-100 text-teal-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Helper pour icône de catégorie
  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('préventive') || c.includes('prevention')) return <ShieldAlert className="w-4 h-4" />;
    if (c.includes('détection') || c.includes('detection')) return <Target className="w-4 h-4" />;
    if (c.includes('organisation')) return <Users className="w-4 h-4" />;
    if (c.includes('fournisseur') || c.includes('contractuel')) return <Building2 className="w-4 h-4" />;
    return <ListChecks className="w-4 h-4" />;
  };

  const renderActions = () => {
    const hasActions = actionsData && actionsData.actions && actionsData.actions.length > 0;

    // Helpers pour les bordures de statut (style Campagnes)
    const getStatusBorderColor = (status: ActionStatus) => {
      switch (status) {
        case 'pending': return 'border-l-gray-400';
        case 'in_progress': return 'border-l-blue-500';
        case 'completed': return 'border-l-green-500';
        case 'blocked': return 'border-l-red-500';
        default: return 'border-l-gray-400';
      }
    };

    const getStatusIcon = (status: ActionStatus) => {
      switch (status) {
        case 'pending': return Clock;
        case 'in_progress': return RefreshCw;
        case 'completed': return Check;
        case 'blocked': return AlertTriangle;
        default: return Clock;
      }
    };

    // Stats calculées
    const stats = hasActions ? {
      total: actionsData.actions.length,
      pending: actionsData.actions.filter(a => a.statut === 'pending').length,
      in_progress: actionsData.actions.filter(a => a.statut === 'in_progress').length,
      completed: actionsData.actions.filter(a => a.statut === 'completed').length,
      blocked: actionsData.actions.filter(a => a.statut === 'blocked').length,
      critical: actionsData.actions.filter(a => a.priorite === 'P1').length,
    } : { total: 0, pending: 0, in_progress: 0, completed: 0, blocked: 0, critical: 0 };

    return (
      <div className="space-y-6">
        {/* Header Actions - Sticky */}
        <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-red-600" />
                Plan d&apos;actions EBIOS RM
              </h3>
              <p className="text-sm text-gray-600">
                Mesures de traitement des risques identifiés
                {hasActions && ` • ${stats.total} action(s)`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasActions && (
                <button
                  onClick={loadActionsData}
                  disabled={loadingActions}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingActions ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
              )}
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center shadow-sm"
                onClick={() => setAddingAction(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une action
              </button>
              {!hasActions ? (
                <button
                  onClick={handleGenerateActionPlan}
                  disabled={generatingActionPlan}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-sm disabled:opacity-50"
                >
                  {generatingActionPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Générer avec l&apos;IA
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center shadow-sm"
                  onClick={() => setShowReportModal(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Générer le rapport
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards - Style Campagnes */}
        {hasActions && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ListChecks className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">En attente</p>
                  <p className="text-2xl font-bold text-gray-700">{stats.pending}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">En cours</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Terminées</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Critiques</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loadingActions && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <span className="ml-3 text-gray-600">Chargement des actions...</span>
          </div>
        )}

        {/* Empty state */}
        {!loadingActions && !hasActions && (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-lg shadow-sm">
            <ListChecks className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune action générée</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Cliquez sur le bouton &quot;Générer avec l&apos;IA&quot; pour créer automatiquement un plan d&apos;actions basé sur l&apos;analyse des risques.
            </p>
            <button
              onClick={handleGenerateActionPlan}
              disabled={generatingActionPlan}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Générer le plan d&apos;actions
            </button>
          </div>
        )}

        {/* Liste des Actions - Style Campagnes avec border-l-4 */}
        {!loadingActions && hasActions && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold flex items-center text-gray-800">
                <Target className="w-5 h-5 mr-2 text-red-600" />
                Actions ({stats.total})
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {actionsData.actions.map((action) => {
                const statusConfig = getStatusConfig(action.statut);
                const priorityConfig = getPriorityConfig(action.priorite);
                const StatusIcon = getStatusIcon(action.statut);

                return (
                  <div
                    key={action.id}
                    className={`p-5 border-l-4 ${getStatusBorderColor(action.statut)} hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Titre et badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* Code action */}
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-mono font-semibold rounded">
                            {action.code_action}
                          </span>
                          <h3 className="text-base font-semibold text-gray-900 truncate max-w-xl">
                            {action.titre}
                          </h3>
                          {/* Statut */}
                          <span className={`px-2.5 py-1 ${statusConfig.color} text-xs rounded-full flex items-center`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </span>
                          {/* Priorité */}
                          <span className={`px-2 py-0.5 ${priorityConfig.color} text-xs rounded-full flex items-center gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`}></span>
                            {action.priorite}
                          </span>
                          {/* Catégorie */}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(action.categorie)}`}>
                            {action.categorie}
                          </span>
                          {/* Source */}
                          {action.source === 'AI' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                              IA
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{action.description}</p>

                        {/* Scénarios couverts */}
                        {action.scenarios_couverts && action.scenarios_couverts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {action.scenarios_couverts.slice(0, 5).map((scenario, index) => (
                              <span
                                key={`${action.id}-scenario-${index}`}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                              >
                                {scenario}
                                {action.risque_initial !== null && action.risque_cible !== null && (
                                  <span className="ml-1 text-gray-500">
                                    ({action.risque_initial}→{action.risque_cible})
                                  </span>
                                )}
                              </span>
                            ))}
                            {action.scenarios_couverts.length > 5 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                +{action.scenarios_couverts.length - 5}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Métadonnées */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          {action.responsable_suggere && (
                            <div className="flex items-center">
                              <User className="w-3.5 h-3.5 mr-1.5" />
                              {action.assigned_user_name || action.responsable_suggere}
                              {!action.assigned_user_id && (
                                <span className="ml-1 text-orange-500">(suggéré)</span>
                              )}
                            </div>
                          )}
                          {(action.delai_recommande || action.due_date) && (
                            <div className="flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1.5" />
                              {action.due_date
                                ? new Date(action.due_date).toLocaleDateString('fr-FR')
                                : action.delai_recommande}
                            </div>
                          )}
                          {action.effort && (
                            <div className="flex items-center">
                              <Zap className="w-3.5 h-3.5 mr-1.5" />
                              Effort: {action.effort}
                            </div>
                          )}
                          {action.cout_estime && (
                            <div className="flex items-center">
                              <Building2 className="w-3.5 h-3.5 mr-1.5" />
                              Coût: {action.cout_estime}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Boutons d'actions - Style Campagnes */}
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => setViewingAction(action)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Voir
                        </button>
                        <button
                          onClick={() => setEditingAction(action)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Éditer
                        </button>
                        <button
                          onClick={() => setDeletingAction(action)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer avec info de génération */}
            {actionsData.generated_at && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                Plan généré le {new Date(actionsData.generated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats footer */}
        {!loadingActions && hasActions && (
          <div className="flex flex-wrap justify-between items-center text-sm text-gray-500">
            <div>
              {stats.completed} terminée(s) sur {stats.total} • {stats.in_progress} en cours • {stats.blocked} bloquée(s)
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReports = () => {
    // Helper pour formater la taille du fichier
    const formatFileSize = (bytes: number | null): string => {
      if (!bytes) return '-';
      if (bytes < 1024) return `${bytes} o`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

    // Helper pour formater la date
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Helper pour obtenir le badge du scope
    const getScopeBadge = (scope: string) => {
      if (scope === 'ebios_consolidated' || scope === 'consolidated') {
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Consolidé</span>;
      }
      if (scope === 'ebios_individual' || scope === 'individual') {
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Individuel</span>;
      }
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">{scope}</span>;
    };

    return (
      <div className="space-y-6">
        {/* Header Rapports - Sticky */}
        <div className="sticky top-[120px] z-20 bg-gray-50 -mx-8 px-8 py-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Rapports EBIOS RM</h3>
              <p className="text-sm text-gray-600">
                Exportez votre analyse sous forme de rapport complet ou exécutif
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadReportsData()}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Actualiser la liste"
              >
                <RefreshCw className={`w-4 h-4 ${loadingReports ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Générer un rapport
              </button>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {reportsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {reportsError}
          </div>
        )}

        {/* Chargement */}
        {loadingReports && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-red-600 animate-spin mr-3" />
            <span className="text-gray-600">Chargement des rapports...</span>
          </div>
        )}

        {/* Liste des rapports */}
        {!loadingReports && generatedReports.length > 0 && (
          <div className="grid gap-4">
            {generatedReports.map((report) => (
              <div
                key={report.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-50 rounded-lg">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{report.title}</h4>
                        {getScopeBadge(report.report_scope)}
                      </div>
                      {report.description && (
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Généré le {formatDate(report.generated_at)}</span>
                        {report.generated_by_name && (
                          <span>par {report.generated_by_name}</span>
                        )}
                        <span>{formatFileSize(report.file_size_bytes)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReportToPreview(report);
                        setShowReportPreview(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Aperçu"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadReport(report)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Télécharger"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteReportClick(report.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* État vide */}
        {!loadingReports && generatedReports.length === 0 && !reportsError && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun rapport généré
            </h3>
            <p className="text-gray-600 mb-6">
              Générez votre premier rapport EBIOS RM pour documenter votre analyse des risques.
            </p>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Générer un rapport
            </button>
          </div>
        )}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || 'Projet non trouvé'}</p>
          <Link
            href="/client/ebios"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster position="top-right" richColors />

      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/client/ebios"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <ShieldAlert className="w-7 h-7 mr-3 text-red-600" />
                    {project.label || project.name}
                  </h1>
                  <span className={`ml-4 px-3 py-1 text-sm rounded-full ${getStatusColor(project.status)}`}>
                    {project.status === 'FROZEN' && <Lock className="w-3 h-3 inline mr-1" />}
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Analyse EBIOS Risk Manager
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadProject()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </button>

              {project.status === 'IN_PROGRESS' && getOverallProgress() >= 80 && (
                <button
                  onClick={() => setShowFreezeModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Figer l&apos;analyse
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-8">
          <nav className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'AT1' && renderAT1()}
        {activeTab === 'AT2' && renderAT2()}
        {activeTab === 'AT3' && renderAT3()}
        {activeTab === 'AT4' && renderAT4()}
        {activeTab === 'AT5' && renderAT5()}
        {activeTab === 'actions' && renderActions()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Modal d'ajout d'une source de risque */}
      <AddRiskSourceModal
        isOpen={showAddSourceModal}
        onClose={() => setShowAddSourceModal(false)}
        onSave={handleSaveRiskSource}
        projectId={projectId}
        existingSourcesCount={riskSources.length}
      />

      {/* Modal d'avertissement des limites AT1 avant génération AT2 */}
      <ConfirmModal
        isOpen={showLimitWarningModal}
        onClose={() => setShowLimitWarningModal(false)}
        onConfirm={executeGenerateAT2}
        title="Nombre élevé d'éléments"
        message={getLimitWarningMessage()}
        type="confirm"
        confirmText="Continuer quand même"
        cancelText="Revenir pour simplifier"
        confirmButtonColor="red"
      />

      {/* Freeze Modal */}
      <ConfirmModal
        isOpen={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        onConfirm={handleFreezeProject}
        title="Figer l&apos;analyse EBIOS RM"
        message="Cette action est irréversible. Une fois figée, l'analyse ne pourra plus être modifiée (sauf les risques résiduels). La matrice des risques sera calculée et les actions pourront être générées."
        type="confirm"
        confirmText="Oui, figer l'analyse"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Modal de confirmation de suppression d'un scénario stratégique */}
      <ConfirmModal
        isOpen={showDeleteScenarioModal}
        onClose={() => {
          setShowDeleteScenarioModal(false);
          setScenarioToDelete(null);
        }}
        onConfirm={handleConfirmDeleteScenario}
        title="Supprimer le scénario stratégique"
        message={scenarioToDelete
          ? `Êtes-vous sûr de vouloir supprimer le scénario "${scenarioToDelete.code} - ${scenarioToDelete.title}" ?\n\nCette action est irréversible.`
          : 'Êtes-vous sûr de vouloir supprimer ce scénario ?'
        }
        type="confirm"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Modal de confirmation de suppression d'un scénario opérationnel */}
      <ConfirmModal
        isOpen={showDeleteOperationalScenarioModal}
        onClose={() => {
          setShowDeleteOperationalScenarioModal(false);
          setOperationalScenarioToDelete(null);
        }}
        onConfirm={handleConfirmDeleteOperationalScenario}
        title="Supprimer le scénario opérationnel"
        message={operationalScenarioToDelete
          ? `Êtes-vous sûr de vouloir supprimer le scénario opérationnel "${operationalScenarioToDelete.code} - ${operationalScenarioToDelete.title}" ?\n\nCette action est irréversible.`
          : 'Êtes-vous sûr de vouloir supprimer ce scénario opérationnel ?'
        }
        type="confirm"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* AT6 - Modal de détails d'une action */}
      {viewingAction && (
        <EbiosActionDetailsModal
          isOpen={true}
          onClose={() => setViewingAction(null)}
          action={viewingAction}
        />
      )}

      {/* AT6 - Modal d'édition d'une action */}
      {editingAction && (
        <EbiosActionEditModal
          isOpen={true}
          onClose={() => setEditingAction(null)}
          action={editingAction}
          studyId={projectId}
          onSave={async (updatedAction: EbiosActionFormData) => {
            setIsSavingAction(true);
            try {
              // Appel API pour mettre à jour l'action
              const response = await fetchWithAuth(`/api/v1/ebios/projects/${projectId}/actions/${updatedAction.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedAction),
              });

              if (response.ok) {
                toast.success('Action mise à jour avec succès');
                // Recharger les actions
                loadActionsData();
                setEditingAction(null);
              } else {
                const error = await response.json();
                toast.error(error.detail || 'Erreur lors de la mise à jour');
              }
            } catch (error) {
              console.error('Erreur lors de la mise à jour:', error);
              toast.error('Erreur lors de la mise à jour de l\'action');
            } finally {
              setIsSavingAction(false);
            }
          }}
        />
      )}

      {/* AT6 - Modal d'ajout d'une action */}
      {addingAction && (
        <EbiosActionAddModal
          isOpen={true}
          onClose={() => setAddingAction(false)}
          studyId={projectId}
          onSave={async (newAction: EbiosActionCreateData) => {
            setIsSavingAction(true);
            try {
              const response = await fetchWithAuth(`/api/v1/ebios/projects/${projectId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAction),
              });

              if (response.ok) {
                toast.success('Action créée avec succès');
                loadActionsData();
                setAddingAction(false);
              } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de la création');
              }
            } catch (error) {
              console.error('Erreur lors de la création:', error);
              toast.error('Erreur lors de la création de l\'action');
            } finally {
              setIsSavingAction(false);
            }
          }}
        />
      )}

      {/* AT6 - Modal de confirmation de suppression d'action */}
      {deletingAction && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingAction(null)}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              const response = await fetchWithAuth(`/api/v1/ebios/projects/${projectId}/actions/${deletingAction.id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                setDeleteResult({
                  type: 'success',
                  message: `L'action "${deletingAction.code_action}" a été supprimée avec succès.`
                });
                // Recharger les actions
                loadActionsData();
              } else {
                const error = await response.json();
                setDeleteResult({
                  type: 'error',
                  message: error.message || 'Erreur lors de la suppression'
                });
              }
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              setDeleteResult({
                type: 'error',
                message: 'Erreur lors de la suppression de l\'action'
              });
            } finally {
              setIsDeleting(false);
              setDeletingAction(null);
            }
          }}
          title="Supprimer l'action"
          message={`Êtes-vous sûr de vouloir supprimer l'action "${deletingAction.code_action} - ${deletingAction.titre}" ?\n\nCette action est irréversible.`}
          type="confirm"
          confirmText={isDeleting ? "Suppression..." : "Supprimer"}
          cancelText="Annuler"
          confirmButtonColor="red"
        />
      )}

      {/* AT6 - Modal de résultat de suppression */}
      {deleteResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteResult(null)}
          title={deleteResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={deleteResult.message}
          type={deleteResult.type}
        />
      )}

      {/* Rapports - Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteReportConfirm}
        onClose={() => {
          setShowDeleteReportConfirm(false);
          setReportToDelete(null);
        }}
        onConfirm={handleConfirmDeleteReport}
        title="Supprimer le rapport"
        message="Voulez-vous vraiment supprimer ce rapport ? Cette action est irréversible."
        type="confirm"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Rapports - Modal de résultat de suppression */}
      {deleteReportResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteReportResult(null)}
          title={deleteReportResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={deleteReportResult.message}
          type={deleteReportResult.type}
        />
      )}

      {/* Modal de prévisualisation de rapport EBIOS RM */}
      {reportToPreview && (
        <EbiosReportPreviewModal
          isOpen={showReportPreview}
          onClose={() => {
            setShowReportPreview(false);
            setReportToPreview(null);
          }}
          reportId={reportToPreview.id}
          reportTitle={reportToPreview.title}
          fileName={reportToPreview.file_name || undefined}
        />
      )}

      {/* Modal de génération de rapport EBIOS RM */}
      <EbiosReportGenerationModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        projectId={projectId}
        projectName={project?.label || project?.name || 'Projet EBIOS'}
        projectStatus={project?.status || 'DRAFT'}
        onSuccess={() => {
          toast.success('Rapport généré avec succès');
          setShowReportModal(false);
          // Recharger la liste des rapports
          loadReportsData();
        }}
      />
    </div>
  );
}
