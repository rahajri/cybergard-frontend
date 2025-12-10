'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, User, ChevronDown, ChevronRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ControlPoint {
  id: string;
  control_id: string;
  title: string;
  referential_name: string;
  referential_code: string;
  label: string;
}

interface ActionPlanItem {
  id: string;
  order_index: number;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  priority: 'P1' | 'P2' | 'P3';
  status: string;
  recommended_due_days: number;
  suggested_role: string;
  assigned_user_id: string | null;
  assignment_method: string;
  source_question_ids: string[];
  control_points: ControlPoint[];
  ai_justifications: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface PublishedActionPlanProps {
  campaignId: string;
}

export function PublishedActionPlan({ campaignId }: PublishedActionPlanProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActionPlanItems();
  }, [campaignId]);

  const loadActionPlanItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/action-plan/items`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Erreur lors du chargement des actions');
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemExpand = (itemId: string) => {
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

  const getSeverityBadge = (severity: string) => {
    const configs = {
      critical: { label: 'Critique', className: 'bg-red-100 text-red-700 border-red-200' },
      major: { label: 'Majeure', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      minor: { label: 'Mineure', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      info: { label: 'Info', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    };

    const config = configs[severity as keyof typeof configs] || configs.info;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      P1: { label: 'P1', className: 'bg-red-100 text-red-700' },
      P2: { label: 'P2', className: 'bg-orange-100 text-orange-700' },
      P3: { label: 'P3', className: 'bg-green-100 text-green-700' },
    };

    const config = configs[priority as keyof typeof configs] || configs.P2;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Chargement des actions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Aucune action dans le plan d'action</p>
      </div>
    );
  }

  // Grouper les actions par sévérité
  const groupedBySeverity = items.reduce((acc, item) => {
    const severity = item.severity || 'info';
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(item);
    return acc;
  }, {} as Record<string, ActionPlanItem[]>);

  const severityOrder = ['critical', 'major', 'minor', 'info'];
  const orderedGroups = severityOrder.filter(sev => groupedBySeverity[sev]?.length > 0);

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan d'action publié</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{items.length}</div>
            <div className="text-sm text-gray-500">Actions totales</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {groupedBySeverity['critical']?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Critiques</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {groupedBySeverity['major']?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Majeures</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {groupedBySeverity['minor']?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Mineures</div>
          </div>
        </div>
      </div>

      {/* Liste des actions groupées par sévérité */}
      <div className="space-y-4">
        {orderedGroups.map(severity => (
          <div key={severity} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSeverityBadge(severity)}
                  <span className="font-medium text-gray-900">
                    {groupedBySeverity[severity].length} action{groupedBySeverity[severity].length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {groupedBySeverity[severity].map((item, index) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div key={item.id} className="hover:bg-gray-50 transition-colors">
                    {/* En-tête de l'action */}
                    <button
                      onClick={() => toggleItemExpand(item.id)}
                      className="w-full px-6 py-4 flex items-start justify-between text-left"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold flex-shrink-0">
                            {item.order_index + 1}
                          </span>
                          <h3 className="text-base font-semibold text-gray-900 flex-1">
                            {item.title}
                          </h3>
                        </div>

                        {!isExpanded && (
                          <div className="ml-16 flex items-center space-x-4 text-sm text-gray-500">
                            {getPriorityBadge(item.priority)}
                            {item.suggested_role && (
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{item.suggested_role}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{item.recommended_due_days} jours</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Détails de l'action (expanded) */}
                    {isExpanded && (
                      <div className="px-6 pb-6 ml-16 space-y-4 border-t border-gray-100 pt-4">
                        {/* Description */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                          <div className="text-sm text-gray-600 whitespace-pre-wrap">
                            {item.description}
                          </div>
                        </div>

                        {/* Métadonnées */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Priorité :</span>
                            <div className="mt-1">{getPriorityBadge(item.priority)}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Délai recommandé :</span>
                            <div className="mt-1 flex items-center space-x-1 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{item.recommended_due_days} jours</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Rôle suggéré :</span>
                            <div className="mt-1 flex items-center space-x-1 text-gray-600">
                              <User className="w-4 h-4" />
                              <span>{item.suggested_role || 'Non spécifié'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Questions sources */}
                        {item.source_question_ids && item.source_question_ids.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Questions sources ({item.source_question_ids.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {item.source_question_ids.slice(0, 5).map((qid, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  Question #{idx + 1}
                                </span>
                              ))}
                              {item.source_question_ids.length > 5 && (
                                <span className="text-xs text-gray-500">
                                  +{item.source_question_ids.length - 5} autres
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Contrôles référentiels */}
                        {item.control_points && item.control_points.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Contrôles référentiels ({item.control_points.length})
                            </h4>
                            <div className="space-y-2">
                              {item.control_points.map((control) => (
                                <div
                                  key={control.id}
                                  className="flex items-start space-x-2 p-2 rounded bg-purple-50 border border-purple-200"
                                >
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-600 text-white">
                                    {control.referential_code}
                                  </span>
                                  <div className="flex-1 text-xs">
                                    <div className="font-medium text-purple-900">{control.control_id}</div>
                                    <div className="text-purple-700 mt-0.5">{control.title}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
