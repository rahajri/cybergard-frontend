'use client';

import '@/app/styles/client-header.css';
import '@/app/styles/ecosystem.css';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Target,
  Play,
  Pause,
  Clock,
  FileText,
  Eye,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Filter,
  Download,
  History,
  Shield,
  BarChart3,
  PieChart,
  RefreshCw,
  ExternalLink,
  Settings,
  FolderOpen,
  Edit,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  User,
  X
} from 'lucide-react';
import { ActionDetailsModal } from '@/components/ui/ActionDetailsModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';

// Types
interface OrganismDetails {
  id: string;
  name: string;
  legal_name?: string;
  short_code?: string;
  stakeholder_type: 'internal' | 'external';
  entity_category?: string;
  status: 'active' | 'pending' | 'inactive';
  description?: string;
  siret?: string;
  city?: string;
  postal_code?: string;
  address_line1?: string;
  pole_id?: string;
  category_id?: string;
  created_at: string;
  logo_url?: string;
}

interface KPIs {
  members_count: number;
  campaigns: {
    total: number;
    in_progress: number;
    completed: number;
  };
  actions: {
    total: number;
    todo: number;
    in_progress: number;
    done: number;
    overdue: number;
  };
  compliance_level: number;
  next_due_date: string | null;
  last_report: {
    id: string | null;
    generated_at: string | null;
  };
}

interface CampaignAuditor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CampaignAuditee {
  id: string;
  name: string;
  email: string;
  roles: string[];
  entity_name: string;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  referential: {
    name: string;
    code: string;
  } | null;
  score: number;
  pending_actions: number;
  auditors?: CampaignAuditor[];
  auditees?: CampaignAuditee[];
}

interface Action {
  id: string;
  code_action: string;
  title: string;
  description: string;
  objective?: string;
  deliverables?: string;
  status: string;
  priority: string;
  severity: string;
  suggested_role?: string;
  recommended_due_days?: number;
  assigned_user_id?: string | null;
  assigned_user_name?: string;
  due_date: string | null;
  created_at: string | null;
  source_question_ids?: string[];
  control_point_ids?: string[];
  ai_justifications?: {
    why_action?: string;
    why_severity?: string;
    why_priority?: string;
    why_role?: string;
    why_due_days?: string;
  };
  campaign: {
    id: string;
    title: string;
  };
  domain_name: string | null;
  responsible_name: string | null;
  is_overdue: boolean;
}

interface ConformityDomain {
  id: string;
  name: string;
  code: string;
  total_questions: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  score: number;
}

interface Conformity {
  global_score: number;
  total_questions: number;
  domains: ConformityDomain[];
}

interface HistoryEvent {
  id: string;
  type: string;
  title: string;
  date: string | null;
  actor: string | null;
}

interface EntityMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  roles?: string[];
  is_active: boolean;
  created_at?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function OrganismDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const entityId = params?.id as string;

  // States
  const [organism, setOrganism] = useState<OrganismDetails | null>(null);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [conformity, setConformity] = useState<Conformity | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [members, setMembers] = useState<EntityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'actions' | 'conformity' | 'members' | 'history'>('overview');

  // Filtres
  const [actionStatusFilter, setActionStatusFilter] = useState<string>('all');
  const [actionPriorityFilter, setActionPriorityFilter] = useState<string>('all');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  // Modal action details
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  // Modal campaign details
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Modal member details
  const [selectedMember, setSelectedMember] = useState<EntityMember | null>(null);

  useEffect(() => {
    if (entityId) {
      loadAllData();
    }
  }, [entityId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les détails de l'organisme
      const orgResponse = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}`, {
        credentials: 'include'
      });

      if (!orgResponse.ok) {
        throw new Error('Organisme non trouvé');
      }

      const orgData = await orgResponse.json();
      setOrganism(orgData);

      // Charger les KPIs
      const kpisResponse = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/kpis`, {
        credentials: 'include'
      });
      if (kpisResponse.ok) {
        const kpisData = await kpisResponse.json();
        setKpis(kpisData);
      }

      // Charger les campagnes
      const campaignsResponse = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/campaigns?limit=10`, {
        credentials: 'include'
      });
      console.log('📊 Campaigns response status:', campaignsResponse.status);
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        console.log('📊 Campaigns data:', campaignsData);
        setCampaigns(campaignsData.items || []);
      } else {
        const errorText = await campaignsResponse.text();
        console.error('❌ Campaigns error:', errorText);
      }

      // Charger les actions
      const actionsResponse = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/actions?limit=20`, {
        credentials: 'include'
      });
      if (actionsResponse.ok) {
        const actionsData = await actionsResponse.json();
        setActions(actionsData.items || []);
      }

      // Charger la conformité
      const conformityResponse = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/conformity`, {
        credentials: 'include'
      });
      if (conformityResponse.ok) {
        const conformityData = await conformityResponse.json();
        setConformity(conformityData);
      }

      // Charger l'historique
      const historyResponse = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/history?limit=20`, {
        credentials: 'include'
      });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.items || []);
      }

      // Charger les membres
      const membersResponse = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/members`, {
        credentials: 'include'
      });
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(Array.isArray(membersData) ? membersData : []);
      }

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur chargement organisme:', err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des actions
  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      if (actionStatusFilter !== 'all' && a.status !== actionStatusFilter) return false;
      if (actionPriorityFilter !== 'all' && a.priority !== actionPriorityFilter) return false;
      return true;
    });
  }, [actions, actionStatusFilter, actionPriorityFilter]);

  // Regrouper les actions par campagne
  const actionsByCampaign = useMemo(() => {
    const grouped: Record<string, { campaign: { id: string; title: string }; actions: Action[] }> = {};

    filteredActions.forEach(action => {
      const campaignId = action.campaign.id;
      if (!grouped[campaignId]) {
        grouped[campaignId] = {
          campaign: action.campaign,
          actions: []
        };
      }
      grouped[campaignId].actions.push(action);
    });

    // Trier par nombre d'actions décroissant
    return Object.values(grouped).sort((a, b) => b.actions.length - a.actions.length);
  }, [filteredActions]);

  // Toggle expand campagne
  const toggleCampaignExpand = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  // Expand/Collapse all
  const expandAllCampaigns = () => {
    setExpandedCampaigns(new Set(actionsByCampaign.map(g => g.campaign.id)));
  };

  const collapseAllCampaigns = () => {
    setExpandedCampaigns(new Set());
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      active: (
        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Actif
        </span>
      ),
      pending: (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          En attente
        </span>
      ),
      inactive: (
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Inactif
        </span>
      )
    };
    return badges[status] || badges.pending;
  };

  const getCampaignStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      draft: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Brouillon</span>,
      active: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">En cours</span>,
      in_progress: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">En cours</span>,
      completed: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Terminée</span>,
      paused: <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Suspendue</span>
    };
    return badges[status] || badges.draft;
  };

  const getActionStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'done') {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">En retard</span>;
    }
    const badges: Record<string, React.ReactNode> = {
      todo: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">À faire</span>,
      in_progress: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">En cours</span>,
      done: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Terminée</span>,
      cancelled: <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">Annulée</span>
    };
    return badges[status] || badges.todo;
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, React.ReactNode> = {
      P1: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">P1</span>,
      P2: <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">P2</span>,
      P3: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold">P3</span>
    };
    return badges[priority] || null;
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign_created': return <ClipboardList className="w-4 h-4 text-blue-500" />;
      case 'action_created': return <Target className="w-4 h-4 text-orange-500" />;
      case 'report_generated': return <FileText className="w-4 h-4 text-green-500" />;
      default: return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'campaign_created': return 'Campagne créée';
      case 'action_created': return 'Action créée';
      case 'report_generated': return 'Rapport généré';
      default: return 'Événement';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getConformityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center client" data-section="administration">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'organisme...</p>
        </div>
      </div>
    );
  }

  if (error || !organism) {
    return (
      <div className="min-h-screen flex flex-col client" data-section="administration">
        <div className="flex-1 flex items-center justify-center">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error || 'Organisme non trouvé')}
            customMessage={error || 'Organisme non trouvé'}
            onRetry={loadAllData}
            showBack={true}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error || '')}
            actionName="Détail de l'Entité"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col client" data-section="administration">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <Link href="/client/administration" className="hover:text-emerald-600 transition-colors">
              Administration
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <Link href="/client/administration" className="hover:text-emerald-600 transition-colors">
              Écosystème
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-900 font-medium">{organism.name}</span>
          </div>

          {/* Header principal */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{organism.name}</h1>
                {organism.legal_name && organism.legal_name !== organism.name && (
                  <p className="text-gray-600 mt-1">{organism.legal_name}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  {getStatusBadge(organism.status)}
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full font-medium">
                    {organism.stakeholder_type === 'internal' ? 'Interne' : 'Externe'}
                  </span>
                  {organism.short_code && (
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full font-mono">
                      {organism.short_code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={loadAllData}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <Link
                href={`/client/campagnes/new?entity_id=${entityId}`}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center shadow-sm"
              >
                <Play className="w-4 h-4 mr-2" />
                Nouvelle campagne
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6 border-b border-gray-200">
            {[
              { key: 'overview', label: 'Vue d\'ensemble', icon: PieChart },
              { key: 'campaigns', label: 'Campagnes', icon: ClipboardList },
              { key: 'actions', label: 'Actions', icon: Target },
              { key: 'conformity', label: 'Conformité', icon: Shield },
              { key: 'members', label: 'Membres', icon: Users },
              { key: 'history', label: 'Historique', icon: History }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {/* Vue d'ensemble */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Membres */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Membres</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{kpis?.members_count || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">personnes associées</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Campagnes */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Campagnes</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{kpis?.campaigns.total || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {kpis?.campaigns.in_progress || 0} en cours • {kpis?.campaigns.completed || 0} terminées
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Actions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{kpis?.actions.total || 0}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{kpis?.actions.done || 0} terminées</span>
                      {(kpis?.actions.overdue || 0) > 0 && (
                        <span className="text-xs text-red-600 font-medium">• {kpis?.actions.overdue} en retard</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Conformité */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Conformité</p>
                    <p className={`text-3xl font-bold mt-1 ${
                      (kpis?.compliance_level || 0) >= 80 ? 'text-green-600' :
                      (kpis?.compliance_level || 0) >= 60 ? 'text-yellow-600' :
                      (kpis?.compliance_level || 0) >= 40 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {kpis?.compliance_level || 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">niveau global</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Infos supplémentaires */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Prochaine échéance */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  Prochaine échéance
                </h3>
                {kpis?.next_due_date ? (
                  <p className="text-lg font-medium text-gray-900">{formatDate(kpis.next_due_date)}</p>
                ) : (
                  <p className="text-gray-500">Aucune échéance planifiée</p>
                )}
              </div>

              {/* Dernier rapport */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Dernier rapport
                </h3>
                {kpis?.last_report.generated_at ? (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">{formatDate(kpis.last_report.generated_at)}</p>
                    <button className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center">
                      Voir <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500">Aucun rapport généré</p>
                )}
              </div>

              {/* Adresse */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  Localisation
                </h3>
                {organism.city ? (
                  <p className="text-gray-900">
                    {organism.address_line1 && <span className="block">{organism.address_line1}</span>}
                    {organism.postal_code} {organism.city}
                  </p>
                ) : (
                  <p className="text-gray-500">Adresse non renseignée</p>
                )}
              </div>
            </div>

            {/* Conformité par domaine (aperçu) */}
            {conformity && conformity.domains.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    Conformité par domaine
                  </h3>
                  <button
                    onClick={() => setActiveTab('conformity')}
                    className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center"
                  >
                    Voir tout <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="space-y-3">
                  {conformity.domains.slice(0, 5).map(domain => (
                    <div key={domain.id} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-600 truncate" title={domain.name}>
                        {domain.code}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            domain.score >= 80 ? 'bg-green-500' :
                            domain.score >= 60 ? 'bg-yellow-500' :
                            domain.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${domain.score}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-gray-900">
                        {domain.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campagnes récentes (aperçu) */}
            {campaigns.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    Campagnes récentes
                  </h3>
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center"
                  >
                    Voir tout <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map(campaign => (
                    <Link
                      key={campaign.id}
                      href={`/client/campagnes/${campaign.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ClipboardList className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{campaign.title}</p>
                          <p className="text-sm text-gray-500">
                            {campaign.referential?.code || 'Sans référentiel'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getCampaignStatusBadge(campaign.status)}
                        <span className="text-sm font-medium text-gray-900">{campaign.score}%</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onglet Campagnes */}
        {activeTab === 'campaigns' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Campagnes d'audit</h2>
                <Link
                  href={`/client/campagnes/new?entity_id=${entityId}`}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center text-sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Nouvelle campagne
                </Link>
              </div>
            </div>

            {campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campagne</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référentiel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {campaigns.map(campaign => (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link href={`/client/campagnes/${campaign.id}`} className="font-medium text-gray-900 hover:text-emerald-600">
                            {campaign.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {campaign.referential ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {campaign.referential.code}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4">{getCampaignStatusBadge(campaign.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${
                            campaign.score >= 80 ? 'text-green-600' :
                            campaign.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {campaign.score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {campaign.pending_actions > 0 ? (
                            <span className="text-orange-600">{campaign.pending_actions} en attente</span>
                          ) : (
                            <span className="text-green-600">Aucune</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedCampaign(campaign)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors inline-block"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune campagne</h3>
                <p className="text-gray-500 mb-4">Cet organisme n'a pas encore de campagne d'audit.</p>
                <Link
                  href={`/client/campagnes/new?entity_id=${entityId}`}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Créer une campagne
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Onglet Actions */}
        {activeTab === 'actions' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Plan d'action global</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filteredActions.length} action{filteredActions.length > 1 ? 's' : ''} dans {actionsByCampaign.length} campagne{actionsByCampaign.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Boutons expand/collapse */}
                  {actionsByCampaign.length > 0 && (
                    <div className="flex items-center gap-1 mr-2">
                      <button
                        onClick={expandAllCampaigns}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="Tout déplier"
                      >
                        Tout déplier
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={collapseAllCampaigns}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="Tout replier"
                      >
                        Tout replier
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={actionStatusFilter}
                      onChange={(e) => setActionStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="pending">À faire</option>
                      <option value="in_progress">En cours</option>
                      <option value="completed">Terminées</option>
                    </select>
                    <select
                      value={actionPriorityFilter}
                      onChange={(e) => setActionPriorityFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <option value="all">Toutes priorités</option>
                      <option value="P1">P1 - Critique</option>
                      <option value="P2">P2 - Important</option>
                      <option value="P3">P3 - Mineur</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {actionsByCampaign.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {actionsByCampaign.map(group => {
                  const isExpanded = expandedCampaigns.has(group.campaign.id);
                  const pendingCount = group.actions.filter(a => a.status === 'pending').length;
                  const inProgressCount = group.actions.filter(a => a.status === 'in_progress').length;
                  const completedCount = group.actions.filter(a => a.status === 'completed').length;
                  const overdueCount = group.actions.filter(a => a.is_overdue && a.status !== 'completed').length;

                  return (
                    <div key={group.campaign.id}>
                      {/* En-tête de campagne (cliquable) */}
                      <button
                        onClick={() => toggleCampaignExpand(group.campaign.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-blue-600" />
                              {group.campaign.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {group.actions.length} action{group.actions.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Stats rapides */}
                          {pendingCount > 0 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {pendingCount} à faire
                            </span>
                          )}
                          {inProgressCount > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {inProgressCount} en cours
                            </span>
                          )}
                          {completedCount > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {completedCount} terminée{completedCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {overdueCount > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              {overdueCount} en retard
                            </span>
                          )}
                          <Link
                            href={`/client/campagnes/${group.campaign.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Voir la campagne"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                          </Link>
                        </div>
                      </button>

                      {/* Liste des actions (collapsible) */}
                      {isExpanded && (
                        <div className="bg-gray-50 border-t border-gray-200">
                          <table className="w-full">
                            <thead className="bg-gray-100 border-b border-gray-200">
                              <tr>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entité</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priorité</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
                                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Échéance</th>
                                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {group.actions.map(action => (
                                <tr key={action.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-3">
                                    <div>
                                      <p className="font-medium text-gray-900 text-sm">{action.title}</p>
                                      {action.code_action && (
                                        <p className="text-xs text-gray-500 font-mono">{action.code_action}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-sm text-gray-600">
                                    {action.domain_name || '-'}
                                  </td>
                                  <td className="px-6 py-3">{getPriorityBadge(action.priority)}</td>
                                  <td className="px-6 py-3">{getActionStatusBadge(action.status, action.is_overdue)}</td>
                                  <td className="px-6 py-3 text-sm text-gray-600">
                                    {action.responsible_name || '-'}
                                  </td>
                                  <td className="px-6 py-3 text-sm">
                                    <span className={action.is_overdue && action.status !== 'completed' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                      {formatDate(action.due_date)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <button
                                      onClick={() => setSelectedAction(action)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors inline-block"
                                      title="Voir les détails"
                                    >
                                      <Eye className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune action</h3>
                <p className="text-gray-500">
                  {actionStatusFilter !== 'all' || actionPriorityFilter !== 'all'
                    ? 'Aucune action ne correspond aux filtres sélectionnés.'
                    : 'Cet organisme n\'a pas encore d\'actions correctives.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Onglet Conformité */}
        {activeTab === 'conformity' && (
          <div className="space-y-6">
            {/* Score global */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Score de conformité global</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Basé sur {conformity?.total_questions || 0} réponses aux exigences
                  </p>
                </div>
                <div className={`px-6 py-4 rounded-xl ${getConformityColor(conformity?.global_score || 0)}`}>
                  <p className="text-4xl font-bold">{conformity?.global_score || 0}%</p>
                </div>
              </div>
            </div>

            {/* Conformité par domaine */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Conformité par domaine</h2>
              </div>
              {conformity && conformity.domains.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {conformity.domains.map(domain => (
                    <div key={domain.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{domain.name}</h3>
                          <p className="text-sm text-gray-500">{domain.code} • {domain.total_questions} exigences</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConformityColor(domain.score)}`}>
                          {domain.score}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              domain.score >= 80 ? 'bg-green-500' :
                              domain.score >= 60 ? 'bg-yellow-500' :
                              domain.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${domain.score}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-green-600">{domain.compliant} conformes</span>
                          <span className="text-yellow-600">{domain.partial} partiels</span>
                          <span className="text-red-600">{domain.non_compliant} non conformes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée de conformité</h3>
                  <p className="text-gray-500">Les données de conformité apparaîtront après la réalisation d'audits.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet Membres */}
        {activeTab === 'members' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Membres de l'organisme</h2>
                  <p className="text-sm text-gray-500 mt-1">{members.length} personne{members.length > 1 ? 's' : ''} associée{members.length > 1 ? 's' : ''}</p>
                </div>
                <Link
                  href={`/client/administration/entities/${entityId}/members/new`}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center text-sm shadow-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter un membre
                </Link>
              </div>
            </div>

            {members.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {members.map(member => (
                  <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                          {member.first_name?.charAt(0) || ''}{member.last_name?.charAt(0) || ''}
                        </div>

                        {/* Infos principales */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {member.first_name} {member.last_name}
                            </h3>
                            {member.is_active ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Actif</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Inactif</span>
                            )}
                          </div>

                          {member.job_title && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                              <Briefcase className="w-3 h-3" />
                              {member.job_title}
                              {member.department && ` • ${member.department}`}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            {member.email && (
                              <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                                <Mail className="w-3.5 h-3.5" />
                                {member.email}
                              </a>
                            )}
                            {member.phone && (
                              <a href={`tel:${member.phone}`} className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                                <Phone className="w-3.5 h-3.5" />
                                {member.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rôles et actions */}
                      <div className="flex items-center gap-4">
                        {member.roles && member.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map((role, idx) => (
                              <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                {role === 'audite_resp' ? 'Responsable' :
                                 role === 'audite_contrib' ? 'Contributeur' :
                                 role === 'audite_viewer' ? 'Lecteur' : role}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => setSelectedMember(member)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun membre</h3>
                <p className="text-gray-500 mb-4">Cet organisme n'a pas encore de membres associés.</p>
                <Link
                  href={`/client/administration/entities/${entityId}/members/new`}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter un membre
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Historique des événements</h2>
            </div>
            {history.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {history.map(event => (
                  <div key={event.id} className="p-4 hover:bg-gray-50 flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {getEventTypeLabel(event.type)} • {formatDate(event.date)}
                        {event.actor && ` • par ${event.actor}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun événement</h3>
                <p className="text-gray-500">L'historique des événements apparaîtra ici.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal détails action */}
      {selectedAction && (
        <ActionDetailsModal
          isOpen={!!selectedAction}
          onClose={() => setSelectedAction(null)}
          action={{
            id: selectedAction.id,
            code_action: selectedAction.code_action,
            title: selectedAction.title,
            description: selectedAction.description || '',
            objective: selectedAction.objective,
            deliverables: selectedAction.deliverables,
            severity: (selectedAction.severity as 'critical' | 'major' | 'minor' | 'info') || 'minor',
            priority: selectedAction.priority as 'P1' | 'P2' | 'P3',
            suggested_role: selectedAction.suggested_role || selectedAction.responsible_name || '',
            recommended_due_days: selectedAction.recommended_due_days || 30,
            assigned_user_id: selectedAction.assigned_user_id,
            assigned_user_name: selectedAction.assigned_user_name || selectedAction.responsible_name || undefined,
            entity_id: entityId,
            entity_name: organism?.name,
            ai_justifications: selectedAction.ai_justifications,
          }}
        />
      )}

      {/* Modal détails campagne */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Couleur verte comme le menu Administration */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Détails de la campagne</h3>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Titre et référentiel */}
              <div>
                <h4 className="text-2xl font-bold text-gray-900">{selectedCampaign.title}</h4>
                {selectedCampaign.referential && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 border border-purple-200">
                      {selectedCampaign.referential.code} - {selectedCampaign.referential.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Badges : Statut et Score */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">Statut :</span>
                  {getCampaignStatusBadge(selectedCampaign.status)}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">Score :</span>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                    selectedCampaign.score >= 80 ? 'bg-green-100 text-green-700 border border-green-300' :
                    selectedCampaign.score >= 60 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                    'bg-red-100 text-red-700 border border-red-300'
                  }`}>
                    {selectedCampaign.score}%
                  </span>
                </div>
                {selectedCampaign.pending_actions > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Actions :</span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-700 border border-orange-300">
                      {selectedCampaign.pending_actions} en attente
                    </span>
                  </div>
                )}
              </div>

              {/* Période */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  Période de la campagne
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Date de début</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCampaign.start_date ? formatDate(selectedCampaign.start_date) : 'Non définie'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Date de fin</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedCampaign.end_date ? formatDate(selectedCampaign.end_date) : 'Non définie'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auditeurs (Parties prenantes internes) */}
              {selectedCampaign.auditors && selectedCampaign.auditors.length > 0 && (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <h5 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-emerald-600" />
                    Équipe d'audit ({selectedCampaign.auditors.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedCampaign.auditors.map((auditor) => (
                      <div
                        key={auditor.id}
                        className="bg-white rounded-lg p-3 border border-emerald-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                            {auditor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{auditor.name}</p>
                            <p className="text-sm text-gray-500">{auditor.email}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-300">
                          {auditor.role === 'auditor' ? 'Auditeur' :
                           auditor.role === 'lead_auditor' ? 'Chef de projet' :
                           auditor.role === 'reviewer' ? 'Relecteur' : auditor.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personnes auditées */}
              {selectedCampaign.auditees && selectedCampaign.auditees.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Personnes auditées ({selectedCampaign.auditees.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedCampaign.auditees.map((auditee) => (
                      <div
                        key={auditee.id}
                        className="bg-white rounded-lg p-3 border border-blue-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                            {auditee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{auditee.name}</p>
                            <p className="text-sm text-gray-500">{auditee.email}</p>
                            {auditee.entity_name && (
                              <p className="text-xs text-blue-600 mt-0.5">{auditee.entity_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {auditee.roles && auditee.roles.length > 0 ? (
                            auditee.roles.map((role, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300"
                              >
                                {role === 'audite_resp' ? 'Responsable' :
                                 role === 'audite_contrib' ? 'Contributeur' :
                                 role === 'audite_viewer' ? 'Lecture seule' : role}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Membre
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message si pas d'auditeurs ni d'audités */}
              {(!selectedCampaign.auditors || selectedCampaign.auditors.length === 0) &&
               (!selectedCampaign.auditees || selectedCampaign.auditees.length === 0) && (
                <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Aucun participant assigné à cette campagne</p>
                </div>
              )}

              {/* Informations complémentaires */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                  Informations
                </h5>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    <span className="font-medium">Créée le :</span>{' '}
                    {selectedCampaign.created_at ? formatDate(selectedCampaign.created_at) : 'Non disponible'}
                  </p>
                  <p>
                    <span className="font-medium">Organisme :</span>{' '}
                    {organism?.name || 'Non défini'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
              <Link
                href={`/client/campagnes/${selectedCampaign.id}`}
                className="px-4 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-medium flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir la campagne
              </Link>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails membre */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Couleur verte comme le menu Administration */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Détails du membre</h3>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* En-tête avec avatar et nom */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selectedMember.first_name?.charAt(0) || ''}{selectedMember.last_name?.charAt(0) || ''}
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </h4>
                  {selectedMember.job_title && (
                    <p className="text-gray-600 mt-1 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      {selectedMember.job_title}
                    </p>
                  )}
                  <div className="mt-2">
                    {selectedMember.is_active ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                        Actif
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full font-medium">
                        Inactif
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-500" />
                  Coordonnées
                </h5>
                <div className="space-y-3">
                  {selectedMember.email && (
                    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Mail className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Email</p>
                        <a
                          href={`mailto:${selectedMember.email}`}
                          className="text-gray-900 hover:text-emerald-600 transition-colors font-medium"
                        >
                          {selectedMember.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedMember.phone && (
                    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Téléphone</p>
                        <a
                          href={`tel:${selectedMember.phone}`}
                          className="text-gray-900 hover:text-emerald-600 transition-colors font-medium"
                        >
                          {selectedMember.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {!selectedMember.email && !selectedMember.phone && (
                    <p className="text-gray-500 text-sm italic">Aucune coordonnée renseignée</p>
                  )}
                </div>
              </div>

              {/* Informations professionnelles */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                  Informations professionnelles
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-500 font-medium">Fonction</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedMember.job_title || 'Non renseignée'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-500 font-medium">Département</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedMember.department || 'Non renseigné'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rôles */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h5 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-purple-600" />
                  Rôles dans l'organisme
                </h5>
                {selectedMember.roles && selectedMember.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.roles.map((role, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-purple-700 border border-purple-300 shadow-sm"
                      >
                        {role === 'audite_resp' ? '👤 Responsable audit' :
                         role === 'audite_contrib' ? '👥 Contributeur' :
                         role === 'audite_viewer' ? '👁️ Lecture seule' :
                         role === 'admin' ? '⚙️ Administrateur' :
                         role === 'manager' ? '📊 Manager' : role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">Aucun rôle attribué</p>
                )}
              </div>

              {/* Organisme */}
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h5 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-emerald-600" />
                  Organisme d'appartenance
                </h5>
                <div className="bg-white rounded-lg p-3 border border-emerald-200 flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{organism?.name || 'Non défini'}</p>
                    {organism?.stakeholder_type && (
                      <p className="text-sm text-gray-500">
                        {organism.stakeholder_type === 'internal' ? 'Organisme interne' : 'Organisme externe'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date de création */}
              {selectedMember.created_at && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Membre depuis :</span>{' '}
                    {formatDate(selectedMember.created_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
