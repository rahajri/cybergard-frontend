'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Radar,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  ArrowLeft,
  User,
  Clock,
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Building2
} from 'lucide-react';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';

// Types
interface ActionPlanItem {
  id: string;
  vulnerability_id: string | null;
  code_action: string | null;
  title: string;
  description: string;
  recommendation: string | null;
  severity: string;
  priority: string;
  recommended_due_days: number;
  port: number | null;
  protocol: string | null;
  service_name: string | null;
  service_version: string | null;
  cve_ids: string[];
  cvss_score: number | null;
  status: string;
  included: boolean;
  suggested_role: string | null;
  assigned_user_id: string | null;
  entity_id: string | null;
  entity_name: string | null;
  order_index: number;
  // Justifications IA générées automatiquement
  ai_justifications?: {
    why_action?: string;
    why_severity?: string;
    why_priority?: string;
    why_role?: string;
    why_due_days?: string;
  };
}

interface ActionPlanDetail {
  id: string;
  scan_id: string;
  code_scan: string;
  status: string;
  target_value: string | null;
  target_type: string | null;
  exposure_score: number | null;
  total_items: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  validated_count: number;
  excluded_count: number;
  items: ActionPlanItem[];
  generated_at: string | null;
  published_at: string | null;
}

// Plus de données mock - le plan sera créé dynamiquement via l'API

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ScanActionPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [actionPlan, setActionPlan] = useState<ActionPlanDetail | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [resultModal, setResultModal] = useState<{ type: ModalType; message: string } | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  useEffect(() => {
    loadActionPlan();
  }, [scanId]);

  const loadActionPlan = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/action-plan`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setActionPlan(data);
      } else {
        // Pas de plan existant - afficher l'état vide
        setActionPlan(null);
      }
    } catch (error) {
      console.error('Error loading action plan:', error);
      setActionPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!actionPlan) return [];

    return actionPlan.items.filter(item => {
      if (!showExcluded && !item.included) return false;
      if (filterSeverity && item.severity !== filterSeverity) return false;
      return true;
    });
  }, [actionPlan, filterSeverity, showExcluded]);

  const stats = useMemo(() => {
    if (!actionPlan) return { included: 0, excluded: 0, validated: 0 };

    const included = actionPlan.items.filter(i => i.included).length;
    const excluded = actionPlan.items.filter(i => !i.included).length;
    const validated = actionPlan.items.filter(i => i.status === 'VALIDATED').length;

    return { included, excluded, validated };
  }, [actionPlan]);

  const toggleItemInclusion = async (itemId: string, included: boolean) => {
    if (!actionPlan) return;

    // Optimistic update
    setActionPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId ? { ...item, included } : item
        )
      };
    });

    try {
      await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/action-plan/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ included })
      });
    } catch (error) {
      console.error('Error updating item:', error);
      // Rollback on error
      loadActionPlan();
    }
  };

  const validateItem = async (itemId: string) => {
    if (!actionPlan) return;

    setActionPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId ? { ...item, status: 'VALIDATED' } : item
        )
      };
    });

    try {
      await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/action-plan/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'VALIDATED' })
      });
    } catch (error) {
      console.error('Error validating item:', error);
    }
  };

  const handlePublish = async () => {
    if (!actionPlan) return;

    setPublishing(true);
    setConfirmPublish(false);

    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/publish-actions`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la publication');
      }

      const result = await response.json();
      setResultModal({
        type: 'success',
        message: `${result.published_count} action(s) publiée(s) avec succès vers le module Actions.`
      });

      loadActionPlan();
    } catch (error) {
      console.error('Error publishing:', error);
      setResultModal({
        type: 'error',
        message: 'Erreur lors de la publication des actions'
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!actionPlan) return;

    setUnpublishing(true);
    setConfirmUnpublish(false);

    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/unpublish-actions`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la dépublication');
      }

      const result = await response.json();
      setResultModal({
        type: 'success',
        message: `${result.deleted_count} action(s) supprimée(s) du module Actions. Le plan est repassé en brouillon.`
      });

      loadActionPlan();
    } catch (error) {
      console.error('Error unpublishing:', error);
      setResultModal({
        type: 'error',
        message: 'Erreur lors de la dépublication des actions'
      });
    } finally {
      setUnpublishing(false);
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
      HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
      MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
      LOW: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' }
    };
    return colors[severity] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      P1: 'bg-red-600',
      P2: 'bg-orange-500',
      P3: 'bg-gray-500'
    };
    return colors[priority] || 'bg-gray-400';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center client">
        <div className="text-center">
          <Radar className="w-12 h-12 text-cyan-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement du plan d'action...</p>
        </div>
      </div>
    );
  }

  if (!actionPlan) {
    return (
      <div className="min-h-screen flex flex-col client" data-section="scanner">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Link href="/client/scanner" className="hover:text-cyan-600">Scanner</Link>
              <ChevronRight className="w-4 h-4 mx-1" />
              <Link href="/client/scanner/action-plan" className="hover:text-cyan-600">Plan d'Action</Link>
              <ChevronRight className="w-4 h-4 mx-1" />
              <span className="text-gray-900">Scan {scanId.substring(0, 8)}...</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-cyan-600" />
              Plan d'Action
            </h1>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-cyan-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Aucun plan d'action</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Ce scan n'a pas encore de plan d'action associé. Pour générer un plan d'action à partir des vulnérabilités détectées, utilisez la page de génération.
            </p>
            <div className="space-y-3">
              <Link
                href="/client/scanner/action-plan"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 font-medium shadow-lg shadow-cyan-500/25 transition-all"
              >
                <Radar className="w-5 h-5 mr-2" />
                Générer un Plan d'Action
              </Link>
              <Link
                href={`/client/scanner/scans/${scanId}`}
                className="inline-flex items-center justify-center w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour au détail du scan
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const includedCount = actionPlan.items.filter(i => i.included).length;

  return (
    <div className="min-h-screen flex flex-col client" data-section="scanner">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Link href="/client/scanner" className="hover:text-cyan-600">Scanner</Link>
                <ChevronRight className="w-4 h-4 mx-1" />
                <Link href="/client/scanner/action-plan" className="hover:text-cyan-600">Plan d'Action</Link>
                <ChevronRight className="w-4 h-4 mx-1" />
                <span className="text-gray-900">{actionPlan.code_scan}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-cyan-600" />
                Plan d'Action - {actionPlan.code_scan}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Cible: {actionPlan.target_value} | {actionPlan.total_items} actions proposées
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                actionPlan.status === 'PUBLISHED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {actionPlan.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
              </span>

              {actionPlan.status !== 'PUBLISHED' ? (
                <button
                  onClick={() => setConfirmPublish(true)}
                  disabled={publishing || includedCount === 0}
                  className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center"
                >
                  {publishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publier ({includedCount})
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmUnpublish(true)}
                  disabled={unpublishing}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {unpublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Dépublication...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Dépublier
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-900">{actionPlan.total_items}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-sm text-red-600">Critical</div>
            <div className="text-2xl font-bold text-red-700">{actionPlan.critical_count}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="text-sm text-orange-600">High</div>
            <div className="text-2xl font-bold text-orange-700">{actionPlan.high_count}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="text-sm text-yellow-600">Medium</div>
            <div className="text-2xl font-bold text-yellow-700">{actionPlan.medium_count}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-sm text-blue-600">Low</div>
            <div className="text-2xl font-bold text-blue-700">{actionPlan.low_count}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-sm text-green-600">Incluses</div>
            <div className="text-2xl font-bold text-green-700">{stats.included}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filtrer par sévérité:</span>
              <div className="flex space-x-2">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
                  const colors = getSeverityColor(sev);
                  const isActive = filterSeverity === sev;
                  return (
                    <button
                      key={sev}
                      onClick={() => setFilterSeverity(isActive ? null : sev)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        isActive
                          ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 ring-gray-400`
                          : `${colors.bg} ${colors.text} hover:ring-1 hover:ring-gray-300`
                      }`}
                    >
                      {sev}
                    </button>
                  );
                })}
                {filterSeverity && (
                  <button
                    onClick={() => setFilterSeverity(null)}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showExcluded}
                onChange={(e) => setShowExcluded(e.target.checked)}
                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-gray-600">Afficher les éléments exclus</span>
            </label>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune action à afficher</h3>
              <p className="text-gray-500">
                {filterSeverity
                  ? `Aucune action avec la sévérité ${filterSeverity}`
                  : 'Toutes les actions ont été exclues'}
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const colors = getSeverityColor(item.severity);
              const isExpanded = expandedItems.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl overflow-hidden transition-all ${
                    item.included
                      ? `border-gray-200 ${colors.border}`
                      : 'border-gray-200 opacity-60'
                  }`}
                >
                  {/* Header */}
                  <div className="p-4 flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Inclusion toggle */}
                      <button
                        onClick={() => toggleItemInclusion(item.id, !item.included)}
                        className={`mt-1 p-1 rounded transition-colors ${
                          item.included
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={item.included ? 'Exclure' : 'Inclure'}
                      >
                        {item.included ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="text-xs font-mono text-gray-500">{item.code_action}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {item.severity}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          {item.cvss_score && (
                            <span className="text-xs text-gray-500">
                              CVSS: {item.cvss_score.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <h3 className="font-medium text-gray-900">{item.title}</h3>

                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          {item.port && (
                            <span>Port: {item.port}/{item.protocol}</span>
                          )}
                          {item.service_name && (
                            <span>Service: {item.service_name}</span>
                          )}
                          {item.cve_ids.length > 0 && (
                            <span className="text-red-600">
                              {item.cve_ids.join(', ')}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.recommended_due_days}j
                          </span>
                          {item.suggested_role && (
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {item.suggested_role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.status === 'VALIDATED' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Validé
                        </span>
                      )}
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Recommandation</h4>
                          <p className="text-sm text-gray-600">{item.recommendation || 'Aucune recommandation spécifique'}</p>
                        </div>
                      </div>

                      {item.service_version && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Version détectée</h4>
                          <p className="text-sm font-mono text-gray-600">{item.service_version}</p>
                        </div>
                      )}

                      {/* Justifications IA */}
                      {item.ai_justifications && (
                        <details className="mt-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                          <summary className="px-4 py-3 cursor-pointer font-medium text-purple-700 hover:bg-purple-100 rounded-lg transition-colors flex items-center">
                            <span className="mr-2">📊</span>
                            Justifications de l&apos;IA
                          </summary>
                          <div className="px-4 py-3 space-y-3 border-t border-purple-200">
                            {item.ai_justifications.why_action && (
                              <div>
                                <p className="text-xs font-semibold text-purple-600 mb-1">Pourquoi cette action ?</p>
                                <p className="text-sm text-gray-700">{item.ai_justifications.why_action}</p>
                              </div>
                            )}
                            {item.ai_justifications.why_severity && (
                              <div>
                                <p className="text-xs font-semibold text-purple-600 mb-1">Pourquoi cette sévérité ?</p>
                                <p className="text-sm text-gray-700">{item.ai_justifications.why_severity}</p>
                              </div>
                            )}
                            {item.ai_justifications.why_priority && (
                              <div>
                                <p className="text-xs font-semibold text-purple-600 mb-1">Pourquoi cette priorité ?</p>
                                <p className="text-sm text-gray-700">{item.ai_justifications.why_priority}</p>
                              </div>
                            )}
                            {item.ai_justifications.why_role && (
                              <div>
                                <p className="text-xs font-semibold text-purple-600 mb-1">Pourquoi ce rôle ?</p>
                                <p className="text-sm text-gray-700">{item.ai_justifications.why_role}</p>
                              </div>
                            )}
                            {item.ai_justifications.why_due_days && (
                              <div>
                                <p className="text-xs font-semibold text-purple-600 mb-1">Pourquoi ce délai ?</p>
                                <p className="text-sm text-gray-700">{item.ai_justifications.why_due_days}</p>
                              </div>
                            )}
                          </div>
                        </details>
                      )}

                      <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-100">
                        {item.status !== 'VALIDATED' && item.included && (
                          <button
                            onClick={() => validateItem(item.id)}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Valider
                          </button>
                        )}
                        {item.cve_ids.length > 0 && (
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${item.cve_ids[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Voir CVE
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Published Info */}
        {actionPlan.status === 'PUBLISHED' && actionPlan.published_at && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-700">
                  Plan d'action publié
                </p>
                <p className="text-sm text-green-600">
                  Publié le {formatDate(actionPlan.published_at)} - Les actions sont maintenant visibles dans le module Actions
                </p>
              </div>
              <Link
                href="/client/actions"
                className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm"
              >
                Voir les Actions
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Publish Modal */}
      <ConfirmModal
        isOpen={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={handlePublish}
        title="Publier le plan d'action"
        message={`Vous êtes sur le point de publier ${includedCount} action(s) vers le module Actions. Cette action est irréversible. Continuer ?`}
        type="confirm"
        confirmText="Oui, publier"
        cancelText="Annuler"
        confirmButtonColor="purple"
      />

      {/* Confirm Unpublish Modal */}
      <ConfirmModal
        isOpen={confirmUnpublish}
        onClose={() => setConfirmUnpublish(false)}
        onConfirm={handleUnpublish}
        title="Dépublier le plan d'action"
        message="Vous êtes sur le point de supprimer toutes les actions publiées depuis ce plan du module Actions. Le plan repassera en brouillon. Continuer ?"
        type="confirm"
        confirmText="Oui, dépublier"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Result Modal */}
      {resultModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setResultModal(null)}
          title={resultModal.type === 'success' ? 'Succès' : 'Erreur'}
          message={resultModal.message}
          type={resultModal.type}
        />
      )}
    </div>
  );
}
