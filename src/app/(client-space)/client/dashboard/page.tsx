'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2,
  ClipboardList,
  Clock,
  ArrowRight,
  Zap,
  BarChart3,
  Shield,
  AlertCircle,
  Lightbulb,
  FileText,
  Users,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authenticatedFetch } from '@/lib/api';

// Types pour les données du dashboard
interface DashboardStats {
  globalScore: number;
  internalScore: number;
  externalScore: number;
  scoreTrend: number;
  lastCampaign: {
    title: string | null;
    date: string | null;
  };
  campaigns: {
    inProgress: number;
    draft: number;
    completed: number;
    overdue: number;
    pendingEntities: number;
  };
  referentials: Array<{
    name: string;
    code: string;
    score: number;
    isLow: boolean;
  }>;
  criticalActions: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    daysOverdue: number;
    priority: string;
    status: string;
  }>;
  pendingApprovalsCount: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    daysRemaining: number;
  }>;
  entitiesAtRisk: Array<{
    id: string;
    name: string;
    score: number;
    overdueActions: number;
  }>;
  recentActivity: Array<{
    type: string;
    date: string | null;
    message: string;
    color: string;
    campaignTitle?: string;
  }>;
  aiInsights: Array<{
    type: string;
    icon: string;
    message: string;
    action: string;
  }>;
  quickStats: {
    totalEntities: number;
    totalMembers: number;
    totalActions: number;
    completedActions: number;
  };
}

export default function ClientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/v1/dashboard/stats');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
      setError('Impossible de charger les données du dashboard');
      // Données de fallback pour démonstration
      setStats({
        globalScore: 72,
        internalScore: 78,
        externalScore: 65,
        scoreTrend: 4,
        lastCampaign: { title: 'Audit ISO 27001 - 2024', date: '2024-11-15' },
        campaigns: { inProgress: 2, draft: 1, completed: 5, overdue: 0, pendingEntities: 14 },
        referentials: [
          { name: 'ISO 27001', code: 'ISO27001', score: 74, isLow: false },
          { name: 'NIS2', code: 'NIS2', score: 58, isLow: true },
          { name: 'RGPD', code: 'RGPD', score: 69, isLow: false },
          { name: 'DORA', code: 'DORA', score: 62, isLow: false }
        ],
        criticalActions: [
          { id: '1', title: 'MFA non déployé', dueDate: '2024-11-01', daysOverdue: 14, priority: 'high', status: 'in_progress' },
          { id: '2', title: 'Segmentation réseau insuffisante', dueDate: '2024-11-08', daysOverdue: 8, priority: 'high', status: 'pending' }
        ],
        pendingApprovalsCount: 3,
        upcomingDeadlines: [
          { id: '3', title: 'Mise à jour politique de sécurité', dueDate: '2024-12-05', daysRemaining: 4 },
          { id: '4', title: 'Formation sensibilisation', dueDate: '2024-12-07', daysRemaining: 6 }
        ],
        entitiesAtRisk: [
          { id: '1', name: 'Filiale Allemagne', score: 48, overdueActions: 3 },
          { id: '2', name: 'Fournisseur Cloud X', score: 52, overdueActions: 2 },
          { id: '3', name: 'Pôle RH', score: 56, overdueActions: 1 }
        ],
        recentActivity: [
          { type: 'questionnaire_submitted', date: new Date().toISOString(), message: 'Filiale France a soumis son questionnaire', color: 'green' },
          { type: 'action_validated', date: new Date(Date.now() - 3600000).toISOString(), message: '6 actions ont été validées', color: 'blue' },
          { type: 'campaign_created', date: new Date(Date.now() - 86400000).toISOString(), message: 'Nouvelle campagne : Audit NIS2 Q1 2025', color: 'primary' }
        ],
        aiInsights: [
          { type: 'warning', icon: 'alert', message: 'Votre conformité NIS2 (58%) est inférieure au seuil recommandé.', action: 'Prioriser les actions NIS2' },
          { type: 'critical', icon: 'clock', message: '2 actions sont en retard et nécessitent une attention immédiate.', action: 'Voir le plan d\'action' },
          { type: 'info', icon: 'building', message: '3 entités présentent un score de conformité inférieur à 60%.', action: 'Accompagner ces entités' }
        ],
        quickStats: { totalEntities: 47, totalMembers: 156, totalActions: 89, completedActions: 67 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Fonction pour formater les dates relatives
  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'il y a quelques minutes';
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays === 1) return 'hier';
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  // Composant Score Global - Thème bleu marine principal
  const GlobalScoreCard = () => {
    if (!stats) return null;
    const isPositive = stats.scoreTrend >= 0;

    return (
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0d2137] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Score de Conformité Global</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{stats.globalScore}%</span>
              <div className={`flex items-center text-sm ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {isPositive ? '+' : ''}{stats.scoreTrend}%
              </div>
            </div>
            <p className="text-blue-300 text-xs mt-2">vs trimestre précédent</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        {/* Scores Interne / Externe */}
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-blue-300 text-xs mb-1">Interne</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold">{stats.internalScore}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
              <div
                className="h-1.5 rounded-full bg-cyan-400"
                style={{ width: `${stats.internalScore}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <p className="text-blue-300 text-xs mb-1">Externe</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold">{stats.externalScore}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
              <div
                className="h-1.5 rounded-full bg-amber-400"
                style={{ width: `${stats.externalScore}%` }}
              />
            </div>
          </div>
        </div>

        {stats.lastCampaign.title && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-blue-300 text-xs">Dernière campagne consolidée</p>
            <p className="text-sm font-medium truncate">{stats.lastCampaign.title}</p>
          </div>
        )}
      </div>
    );
  };

  // Composant Campagnes - Accents bleu
  const CampaignsCard = () => {
    if (!stats) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#1e3a5f]" />
            Campagnes d'audit
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/client/campaigns')}
            className="text-[#1e3a5f] hover:text-[#2d4a6f] hover:bg-blue-50"
          >
            Voir tout <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-gray-700">En cours</span>
            <span className="text-lg font-bold text-[#1e3a5f]">{stats.campaigns.inProgress}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
            <span className="text-sm text-gray-700">En attente de réponses</span>
            <span className="text-lg font-bold text-amber-600">{stats.campaigns.pendingEntities} entités</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
            <span className="text-sm text-gray-700">Terminées</span>
            <span className="text-lg font-bold text-emerald-600">{stats.campaigns.completed}</span>
          </div>
          {stats.campaigns.overdue > 0 && (
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-gray-700">En retard</span>
              <span className="text-lg font-bold text-red-600">{stats.campaigns.overdue}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          <Button
            onClick={() => router.push('/client/campaigns/new')}
            className="flex-1 bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Créer une campagne
          </Button>
        </div>
      </div>
    );
  };

  // Composant Conformité par Référentiel
  const ReferentialsCard = () => {
    if (!stats) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#1e3a5f]" />
          Conformité par référentiel
        </h3>

        <div className="space-y-4">
          {stats.referentials.length > 0 ? (
            stats.referentials.map((ref, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{ref.code}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${ref.isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {ref.score}%
                    </span>
                    {ref.isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      ref.score >= 70 ? 'bg-emerald-500' :
                      ref.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${ref.score}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Aucune donnée de conformité disponible</p>
          )}
        </div>
      </div>
    );
  };

  // Composant Actions Prioritaires
  const ActionsCard = () => {
    if (!stats) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Actions prioritaires
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/client/actions')}
            className="text-[#1e3a5f] hover:text-[#2d4a6f] hover:bg-blue-50"
          >
            Voir le plan <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Actions critiques */}
        {stats.criticalActions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
              En retard ({stats.criticalActions.length})
            </p>
            <div className="space-y-2">
              {stats.criticalActions.slice(0, 3).map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{action.title}</p>
                    <p className="text-xs text-red-600">{action.daysOverdue} jours de retard</p>
                  </div>
                  <Clock className="w-4 h-4 text-red-500 flex-shrink-0 ml-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approbations en attente */}
        {stats.pendingApprovalsCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div>
                <p className="text-sm font-medium text-gray-900">En attente d'approbation</p>
                <p className="text-xs text-amber-600">{stats.pendingApprovalsCount} actions à valider</p>
              </div>
              <CheckCircle className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        )}

        {/* Échéances proches */}
        {stats.upcomingDeadlines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#1e3a5f] uppercase tracking-wide mb-2">
              Échéances dans 7 jours ({stats.upcomingDeadlines.length})
            </p>
            <div className="space-y-2">
              {stats.upcomingDeadlines.slice(0, 2).map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{action.title}</p>
                    <p className="text-xs text-[#1e3a5f]">Dans {action.daysRemaining} jours</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.criticalActions.length === 0 && stats.pendingApprovalsCount === 0 && stats.upcomingDeadlines.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Aucune action prioritaire</p>
        )}
      </div>
    );
  };

  // Composant Entités à Risque
  const EntitiesAtRiskCard = () => {
    if (!stats) return null;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            Entités à surveiller
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/client/administration')}
            className="text-[#1e3a5f] hover:text-[#2d4a6f] hover:bg-blue-50"
          >
            Voir tout <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {stats.entitiesAtRisk.length > 0 ? (
            stats.entitiesAtRisk.map((entity, index) => (
              <div key={entity.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    entity.score < 50 ? 'bg-red-500' : entity.score < 60 ? 'bg-amber-500' : 'bg-[#1e3a5f]'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entity.name}</p>
                    <p className="text-xs text-gray-500">
                      {entity.overdueActions > 0 && `${entity.overdueActions} actions en retard`}
                    </p>
                  </div>
                </div>
                <span className={`text-lg font-bold ${
                  entity.score < 50 ? 'text-red-600' : entity.score < 60 ? 'text-amber-600' : 'text-[#1e3a5f]'
                }`}>
                  {entity.score}%
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Toutes les entités sont conformes</p>
          )}
        </div>
      </div>
    );
  };

  // Composant Activité Récente
  const RecentActivityCard = () => {
    if (!stats) return null;

    const colorClasses: Record<string, string> = {
      green: 'bg-emerald-500',
      blue: 'bg-[#1e3a5f]',
      primary: 'bg-[#3b82f6]',
      amber: 'bg-amber-500',
      red: 'bg-red-500'
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-emerald-600" />
          Activité récente
        </h3>

        <div className="space-y-4">
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${colorClasses[activity.color] || 'bg-gray-400'}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{formatRelativeDate(activity.date)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Aucune activité récente</p>
          )}
        </div>
      </div>
    );
  };

  // Composant Insights IA - Thème bleu marine
  const AIInsightsCard = () => {
    if (!stats) return null;

    const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
      critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
      warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
      info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-[#1e3a5f]' },
      success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' }
    };

    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Recommandations IA
        </h3>

        <div className="space-y-3">
          {stats.aiInsights.map((insight, index) => {
            const style = typeStyles[insight.type] || typeStyles.info;
            return (
              <div key={index} className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
                <div className="flex items-start gap-3">
                  <Zap className={`w-5 h-5 flex-shrink-0 ${style.icon}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{insight.message}</p>
                    <button className="text-xs font-medium text-[#1e3a5f] hover:text-[#2d4a6f] mt-1">
                      {insight.action} →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Composant Actions Rapides - Thème bleu marine
  const QuickActionsCard = () => {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#1e3a5f]" />
          Actions rapides
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/client/campaigns/new')}
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-[#1e3a5f] hover:bg-blue-50 transition-all text-center group"
          >
            <ClipboardList className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-[#1e3a5f]" />
            <span className="block text-sm font-medium text-gray-600 group-hover:text-[#1e3a5f]">Lancer une campagne</span>
          </button>

          <button
            onClick={() => router.push('/client/administration/new-organism')}
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center group"
          >
            <Building2 className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-emerald-600" />
            <span className="block text-sm font-medium text-gray-600 group-hover:text-emerald-700">Ajouter une entité</span>
          </button>

          <button
            onClick={() => router.push('/client/reports')}
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-[#3b82f6] hover:bg-blue-50 transition-all text-center group"
          >
            <FileText className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-[#3b82f6]" />
            <span className="block text-sm font-medium text-gray-600 group-hover:text-[#3b82f6]">Générer un rapport</span>
          </button>

          <button
            onClick={() => router.push('/client/actions')}
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-center group"
          >
            <Target className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:text-amber-600" />
            <span className="block text-sm font-medium text-gray-600 group-hover:text-amber-700">Suivre les actions</span>
          </button>
        </div>
      </div>
    );
  };

  // Loading state - Thème bleu marine
  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Chargement du dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Tableau de bord Conformité
            </h1>
            <p className="text-gray-600 mt-1">
              Pilotage de votre conformité cybersécurité
            </p>
          </div>
          <Button
            onClick={fetchDashboardStats}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-blue-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">{error} - Affichage des données de démonstration</p>
          </div>
        )}
      </div>

      {/* Row 1: Score Global + Campagnes + Référentiels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <GlobalScoreCard />
        <CampaignsCard />
        <ReferentialsCard />
      </div>

      {/* Row 2: Actions Prioritaires + Entités à Risque */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ActionsCard />
        <EntitiesAtRiskCard />
      </div>

      {/* Row 3: Activité Récente + Insights IA + Actions Rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivityCard />
        <AIInsightsCard />
        <QuickActionsCard />
      </div>

      {/* Quick Stats Footer - Thème bleu marine */}
      {stats && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-[#1e3a5f] transition-colors">
            <p className="text-2xl font-bold text-[#1e3a5f]">{stats.quickStats.totalEntities}</p>
            <p className="text-xs text-gray-500">Entités</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-[#1e3a5f] transition-colors">
            <p className="text-2xl font-bold text-[#1e3a5f]">{stats.quickStats.totalMembers}</p>
            <p className="text-xs text-gray-500">Membres actifs</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-[#1e3a5f] transition-colors">
            <p className="text-2xl font-bold text-[#1e3a5f]">
              {stats.quickStats.completedActions}/{stats.quickStats.totalActions}
            </p>
            <p className="text-xs text-gray-500">Actions réalisées</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-[#1e3a5f] transition-colors">
            <p className="text-2xl font-bold text-[#1e3a5f]">
              {stats.quickStats.totalActions > 0
                ? Math.round((stats.quickStats.completedActions / stats.quickStats.totalActions) * 100)
                : 0}%
            </p>
            <p className="text-xs text-gray-500">Taux de complétion</p>
          </div>
        </div>
      )}
    </div>
  );
}
