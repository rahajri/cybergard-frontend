'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radar,
  FileText,
  ChevronRight,
  ChevronDown,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Globe,
  Send,
  RefreshCw,
  Search,
  Clock,
  AlertCircle,
  Shield,
  ExternalLink,
  Info,
  Eye,
  Edit3
} from 'lucide-react';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { ScanActionPreviewModal, ProposedAction } from '@/components/ui/ScanActionPreviewModal';

// Types
interface ScanForActionPlan {
  id: string;
  code_scan: string;
  target_value: string;
  target_type: string;
  status: string;
  exposure_score: number | null;
  nb_vulnerabilities: number;
  nb_critical: number;
  nb_high: number;
  nb_medium: number;
  nb_low: number;
  finished_at: string | null;
  has_action_plan: boolean;
  action_plan_status: string | null;
  // Entité liée (null = scan interne)
  entity_id: string | null;
  entity_name: string | null;
}

interface GenerateActionPlanFilters {
  severity_filter: string[];
  include_remediated: boolean;
  entity_id: string | null;
}

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
  service_name: string | null;
  cve_ids: string[];
  cvss_score: number | null;
  status: string;
  included: boolean;
  entity_id: string | null;
  entity_name: string | null;
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

interface Vulnerability {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  port: number | null;
  service_name: string | null;
  protocol: string | null;
  cve_ids: string[];
  cvss_score: number | null;
  recommendation: string | null;
  is_remediated: boolean;
  remediated_at: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ActionPlanGeneratorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<ScanForActionPlan[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanForActionPlan | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlanDetail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultModal, setResultModal] = useState<{ type: ModalType; message: string } | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loadingVulns, setLoadingVulns] = useState(false);
  const [expandedVulns, setExpandedVulns] = useState<Set<string>>(new Set());
  const [unpublishing, setUnpublishing] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  // Modal preview/edit action
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    mode: 'view' | 'edit';
    vulnerability: Vulnerability | null;
  }>({ isOpen: false, mode: 'view', vulnerability: null });

  // Actions personnalisées par vulnérabilité (modifications utilisateur avant génération)
  const [customizedActions, setCustomizedActions] = useState<Map<string, ProposedAction>>(new Map());

  // Filtres pour la génération
  const [filters, setFilters] = useState<GenerateActionPlanFilters>({
    severity_filter: ['CRITICAL', 'HIGH', 'MEDIUM'],
    include_remediated: false,
    entity_id: null
  });

  useEffect(() => {
    loadScans();
  }, []);

  // Charger les vulnérabilités et vérifier si un plan existe quand un scan est sélectionné
  useEffect(() => {
    if (selectedScan) {
      loadVulnerabilities(selectedScan.id);
      loadExistingActionPlan(selectedScan.id);
    } else {
      setVulnerabilities([]);
      setActionPlan(null);
    }
  }, [selectedScan]);

  // Charger le plan d'action existant (DRAFT ou PUBLISHED)
  const loadExistingActionPlan = async (scanId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/action-plan`, {
        credentials: 'include'
      });

      if (response.ok) {
        const plan = await response.json();
        // Charger le plan s'il existe (DRAFT ou PUBLISHED)
        if (plan && plan.id) {
          setActionPlan(plan);
        } else {
          setActionPlan(null);
        }
      } else {
        // Pas de plan existant
        setActionPlan(null);
      }
    } catch (error) {
      console.error('Error loading existing action plan:', error);
      setActionPlan(null);
    }
  };

  const loadVulnerabilities = async (scanId: string) => {
    setLoadingVulns(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/vulnerabilities`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des vulnérabilités');
      }

      const data = await response.json();
      setVulnerabilities(data.items || []);
    } catch (error) {
      console.error('Error loading vulnerabilities:', error);
      setVulnerabilities([]);
    } finally {
      setLoadingVulns(false);
    }
  };

  const loadScans = async () => {
    setLoading(true);
    try {
      // Récupérer les scans terminés avec succès
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans?status=SUCCESS&limit=50`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des scans');
      }

      const data = await response.json();

      // Transformer les données de l'API vers le format attendu
      const transformedScans: ScanForActionPlan[] = (data.items || []).map((scan: {
        id: string;
        status: string;
        summary: {
          exposure_score?: number;
          nb_vuln_total?: number;
          nb_vuln_critical?: number;
          nb_vuln_high?: number;
          nb_vuln_medium?: number;
          nb_vuln_low?: number;
        } | null;
        finished_at: string | null;
        target?: {
          value?: string;
          type?: string;
        };
        entity_id?: string | null;
        entity_name?: string | null;
      }) => ({
        id: scan.id,
        code_scan: `SCAN_${scan.id.slice(0, 8).toUpperCase()}`,
        target_value: scan.target?.value || 'N/A',
        target_type: scan.target?.type || 'DOMAIN',
        status: scan.status,
        exposure_score: scan.summary?.exposure_score || 0,
        nb_vulnerabilities: scan.summary?.nb_vuln_total || 0,
        nb_critical: scan.summary?.nb_vuln_critical || 0,
        nb_high: scan.summary?.nb_vuln_high || 0,
        nb_medium: scan.summary?.nb_vuln_medium || 0,
        nb_low: scan.summary?.nb_vuln_low || 0,
        finished_at: scan.finished_at,
        has_action_plan: false, // TODO: Ajouter ce champ dans l'API
        action_plan_status: null,
        entity_id: scan.entity_id || null,
        entity_name: scan.entity_name || null
      }));

      setScans(transformedScans);
    } catch (error) {
      console.error('Error loading scans:', error);
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredScans = useMemo(() => {
    return scans.filter(scan => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return scan.target_value.toLowerCase().includes(search) ||
               scan.code_scan.toLowerCase().includes(search);
      }
      return true;
    });
  }, [scans, searchTerm]);

  // Filtrer les vulnérabilités selon les critères sélectionnés
  const filteredVulnerabilities = useMemo(() => {
    return vulnerabilities.filter(vuln => {
      // Filtre par sévérité
      if (!filters.severity_filter.includes(vuln.severity)) {
        return false;
      }
      // Filtre des remédiées
      if (!filters.include_remediated && vuln.is_remediated) {
        return false;
      }
      return true;
    });
  }, [vulnerabilities, filters]);

  const handleGeneratePlan = async () => {
    if (!selectedScan) return;

    setGenerating(true);
    try {
      // Convertir les customizedActions Map en array pour envoi au backend
      const customizations = Array.from(customizedActions.values()).map(action => ({
        vulnerability_id: action.vulnerability_id,
        title: action.title,
        description: action.description,
        objective: action.objective,
        deliverables: action.deliverables,
        severity: action.severity,
        priority: action.priority,
        recommended_due_days: action.recommended_due_days,
        suggested_role: action.suggested_role,
        entity_id: action.entity_id,
        entity_name: action.entity_name,
        assigned_user_id: action.assigned_user_id,
        assigned_user_name: action.assigned_user_name
      }));

      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${selectedScan.id}/action-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...filters,
          customizations: customizations.length > 0 ? customizations : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération');
      }

      const plan = await response.json();
      setActionPlan(plan);
      setResultModal({
        type: 'success',
        message: `Plan d'action généré avec ${plan.total_items} items`
      });
    } catch (error) {
      console.error('Error generating plan:', error);
      setResultModal({
        type: 'error',
        message: 'Erreur lors de la génération du plan d\'action. Vérifiez que le scan contient des vulnérabilités.'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishPlan = async () => {
    if (!selectedScan || !actionPlan) return;

    setPublishing(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${selectedScan.id}/publish-actions`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la publication');
      }

      const result = await response.json();
      setResultModal({
        type: 'success',
        message: `${result.published_count} action(s) publiée(s) avec succès`
      });

      // Mettre à jour le plan pour afficher le statut PUBLISHED et le bouton Dépublier
      if (actionPlan) {
        setActionPlan({
          ...actionPlan,
          status: 'PUBLISHED'
        });
      }
      // Refresh la liste des scans
      loadScans();
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

  const handleUnpublishPlan = async () => {
    if (!selectedScan) return;

    setUnpublishing(true);
    setShowUnpublishConfirm(false);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${selectedScan.id}/unpublish-actions`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur lors de la dépublication');
      }

      const result = await response.json();
      setResultModal({
        type: 'success',
        message: result.message
      });

      // Reset l'état pour permettre une nouvelle génération
      setActionPlan(null);
      setCustomizedActions(new Map());
      loadScans();
    } catch (error) {
      console.error('Error unpublishing:', error);
      setResultModal({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erreur lors de la dépublication des actions'
      });
    } finally {
      setUnpublishing(false);
    }
  };

  // Ouvrir le modal de prévisualisation
  const handleViewAction = (vuln: Vulnerability) => {
    setPreviewModal({
      isOpen: true,
      mode: 'view',
      vulnerability: vuln
    });
  };

  // Ouvrir le modal d'édition
  const handleEditAction = (vuln: Vulnerability) => {
    setPreviewModal({
      isOpen: true,
      mode: 'edit',
      vulnerability: vuln
    });
  };

  // Fermer le modal
  const handleClosePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      mode: 'view',
      vulnerability: null
    });
  };

  // Sauvegarder les modifications d'une action
  const handleSaveAction = (action: ProposedAction) => {
    const newMap = new Map(customizedActions);
    newMap.set(action.vulnerability_id, action);
    setCustomizedActions(newMap);
    handleClosePreviewModal();
  };

  // Vérifier si une vulnérabilité a des modifications personnalisées
  const hasCustomization = (vulnId: string) => customizedActions.has(vulnId);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[severity] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      P1: 'bg-red-600 text-white',
      P2: 'bg-orange-500 text-white',
      P3: 'bg-gray-500 text-white'
    };
    return colors[priority] || 'bg-gray-400 text-white';
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
          <p className="text-gray-600">Chargement des scans...</p>
        </div>
      </div>
    );
  }

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
                <span className="text-gray-900">Générer Plan d'Action</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-cyan-600" />
                Générer un Plan d'Action
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Transformez les vulnérabilités détectées en actions correctives
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste des scans */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Scans disponibles</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {filteredScans.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Radar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucun scan terminé</p>
                  </div>
                ) : (
                  filteredScans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => setSelectedScan(scan)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedScan?.id === scan.id ? 'bg-cyan-50 border-l-4 border-cyan-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{scan.target_value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{scan.code_scan}</p>
                        </div>
                        {scan.has_action_plan && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            scan.action_plan_status === 'PUBLISHED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {scan.action_plan_status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          (scan.exposure_score || 0) >= 70 ? 'bg-red-100 text-red-700' :
                          (scan.exposure_score || 0) >= 40 ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          Score: {scan.exposure_score || 0}
                        </span>
                        <span className="text-xs text-gray-500">{scan.nb_vulnerabilities} vulns</span>
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        {scan.nb_critical > 0 && (
                          <span className="text-xs text-red-600">{scan.nb_critical} CRIT</span>
                        )}
                        {scan.nb_high > 0 && (
                          <span className="text-xs text-orange-600">{scan.nb_high} HIGH</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Configuration et Résultat */}
          <div className="lg:col-span-2">
            {!selectedScan ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sélectionnez un scan
                </h3>
                <p className="text-gray-500">
                  Choisissez un scan terminé dans la liste pour générer un plan d'action
                </p>
              </div>
            ) : !actionPlan ? (
              /* Configuration de génération */
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Configuration du Plan d'Action
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Scan: <span className="font-medium">{selectedScan.code_scan}</span> - {selectedScan.target_value}
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Résumé du scan */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{selectedScan.nb_critical}</p>
                      <p className="text-xs text-red-700">Critical</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">{selectedScan.nb_high}</p>
                      <p className="text-xs text-orange-700">High</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{selectedScan.nb_medium}</p>
                      <p className="text-xs text-yellow-700">Medium</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedScan.nb_low}</p>
                      <p className="text-xs text-blue-700">Low</p>
                    </div>
                  </div>

                  {/* Filtres de sévérité */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Filter className="w-4 h-4 inline mr-1" />
                      Sévérités à inclure
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                        <label key={sev} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.severity_filter.includes(sev)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(f => ({
                                  ...f,
                                  severity_filter: [...f.severity_filter, sev]
                                }));
                              } else {
                                setFilters(f => ({
                                  ...f,
                                  severity_filter: f.severity_filter.filter(s => s !== sev)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className={`text-sm px-2 py-0.5 rounded ${getSeverityColor(sev)}`}>
                            {sev}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Option inclure remédiées */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.include_remediated}
                        onChange={(e) => setFilters(f => ({ ...f, include_remediated: e.target.checked }))}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-700">
                        Inclure les vulnérabilités déjà marquées comme remédiées
                      </span>
                    </label>
                  </div>

                  {/* Liste des vulnérabilités */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        <Shield className="w-4 h-4 inline mr-1" />
                        Vulnérabilités à inclure ({filteredVulnerabilities.length})
                      </label>
                    </div>

                    {loadingVulns ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-5 h-5 text-cyan-600 animate-spin mr-2" />
                        <span className="text-gray-500">Chargement des vulnérabilités...</span>
                      </div>
                    ) : filteredVulnerabilities.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-500 text-sm">
                          {vulnerabilities.length === 0
                            ? "Aucune vulnérabilité détectée dans ce scan"
                            : "Aucune vulnérabilité ne correspond aux filtres sélectionnés"}
                        </p>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg max-h-[500px] overflow-y-auto divide-y divide-gray-200">
                        {filteredVulnerabilities.map((vuln) => {
                          const isExpanded = expandedVulns.has(vuln.id);
                          return (
                            <div key={vuln.id} className={`${vuln.is_remediated ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                              {/* En-tête cliquable */}
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedVulns);
                                  if (isExpanded) {
                                    newExpanded.delete(vuln.id);
                                  } else {
                                    newExpanded.add(vuln.id);
                                  }
                                  setExpandedVulns(newExpanded);
                                }}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getSeverityColor(vuln.severity)}`}>
                                    {vuln.severity}
                                  </span>
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-gray-900">{vuln.title}</p>
                                    <div className="flex items-center space-x-3 mt-0.5 text-xs text-gray-500">
                                      {vuln.port && (
                                        <span>Port: {vuln.port}/{vuln.protocol || 'tcp'} {vuln.service_name && `(${vuln.service_name})`}</span>
                                      )}
                                      {vuln.cvss_score && (
                                        <span className={`font-medium ${
                                          vuln.cvss_score >= 9 ? 'text-red-600' :
                                          vuln.cvss_score >= 7 ? 'text-orange-600' :
                                          vuln.cvss_score >= 4 ? 'text-yellow-600' : 'text-blue-600'
                                        }`}>
                                          CVSS: {vuln.cvss_score.toFixed(1)}
                                        </span>
                                      )}
                                      {vuln.is_remediated && (
                                        <span className="inline-flex items-center text-green-600">
                                          <CheckCircle className="w-3 h-3 mr-1" /> Remédiée
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {vuln.cve_ids && vuln.cve_ids.length > 0 && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      {vuln.cve_ids.length} CVE
                                    </span>
                                  )}
                                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </button>

                              {/* Détails dépliables */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                                  <div className="grid gap-4">
                                    {/* Description */}
                                    {vuln.description && (
                                      <div>
                                        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center">
                                          <Info className="w-3 h-3 mr-1" /> Description
                                        </h4>
                                        <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                                          {vuln.description}
                                        </p>
                                      </div>
                                    )}

                                    {/* Recommandation */}
                                    {vuln.recommendation && (
                                      <div>
                                        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center">
                                          <CheckCircle className="w-3 h-3 mr-1" /> Recommandation
                                        </h4>
                                        <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                                          {vuln.recommendation}
                                        </p>
                                      </div>
                                    )}

                                    {/* CVE */}
                                    {vuln.cve_ids && vuln.cve_ids.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center">
                                          <Shield className="w-3 h-3 mr-1" /> CVE
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                          {vuln.cve_ids.map((cve) => (
                                            <a
                                              key={cve}
                                              href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center text-sm bg-white px-3 py-1.5 rounded border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                            >
                                              {cve}
                                              <ExternalLink className="w-3 h-3 ml-1.5" />
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Boutons d'action Voir/Éditer */}
                                    <div className="pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs font-semibold text-gray-600 uppercase">Action Proposée</span>
                                          {hasCustomization(vuln.id) && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                              Personnalisée
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleViewAction(vuln);
                                            }}
                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors"
                                            title="Voir l'action proposée"
                                          >
                                            <Eye className="w-4 h-4 mr-1.5" />
                                            Voir
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditAction(vuln);
                                            }}
                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                            title="Modifier l'action proposée"
                                          >
                                            <Edit3 className="w-4 h-4 mr-1.5" />
                                            Éditer
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedScan(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleGeneratePlan}
                      disabled={generating || filters.severity_filter.length === 0}
                      className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Générer le Plan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Résultat du plan généré */
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Plan d'Action Généré
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {actionPlan.code_scan} - {actionPlan.total_items} actions proposées
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      actionPlan.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {actionPlan.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Stats du plan */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-red-600">{actionPlan.critical_count}</p>
                      <p className="text-xs text-gray-600">Critical</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-600">{actionPlan.high_count}</p>
                      <p className="text-xs text-gray-600">High</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-yellow-600">{actionPlan.medium_count}</p>
                      <p className="text-xs text-gray-600">Medium</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-600">{actionPlan.low_count}</p>
                      <p className="text-xs text-gray-600">Low</p>
                    </div>
                  </div>

                  {/* Info - différent selon le statut */}
                  {actionPlan.status === 'PUBLISHED' ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-green-700 font-medium">
                            Plan d'action publié
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            Les {actionPlan.total_items} action(s) sont maintenant visibles dans le module Actions.
                            Vous pouvez les consulter et les assigner aux responsables.
                          </p>
                          <p className="text-sm text-green-600 mt-2">
                            <strong>Pour régénérer un nouveau plan</strong>, cliquez sur "Dépublier" pour supprimer les actions existantes.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-700 font-medium">
                            Plan d'action prêt à être publié
                          </p>
                          <p className="text-sm text-blue-600 mt-1">
                            En publiant ce plan, {actionPlan.total_items} action(s) seront créées dans le module Actions
                            et pourront être suivies et assignées aux responsables.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    {actionPlan.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => {
                          setActionPlan(null);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Modifier les filtres
                      </button>
                    )}
                    <Link
                      href={`/client/scanner/scans/${selectedScan.id}/action-plan`}
                      className="px-4 py-2 border border-cyan-600 text-cyan-600 rounded-lg hover:bg-cyan-50 flex items-center"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Voir le détail
                    </Link>

                    {actionPlan.status === 'PUBLISHED' ? (
                      <button
                        onClick={() => setShowUnpublishConfirm(true)}
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
                    ) : (
                      <button
                        onClick={handlePublishPlan}
                        disabled={publishing}
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
                            Publier vers Actions
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de résultat */}
      {resultModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setResultModal(null)}
          title={resultModal.type === 'success' ? 'Succès' : 'Erreur'}
          message={resultModal.message}
          type={resultModal.type}
        />
      )}

      {/* Modal de confirmation de dépublication */}
      <ConfirmModal
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={handleUnpublishPlan}
        title="Dépublier le plan d'action"
        message={`Cette action supprimera les ${actionPlan?.total_items || 0} action(s) publiées dans le module Actions. Vous pourrez ensuite générer un nouveau plan d'action.\n\nCette action est irréversible. Continuer ?`}
        type="confirm"
        confirmText="Oui, dépublier"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Modal de prévisualisation/édition de l'action proposée */}
      {previewModal.isOpen && previewModal.vulnerability && selectedScan && (
        <ScanActionPreviewModal
          isOpen={previewModal.isOpen}
          onClose={handleClosePreviewModal}
          onSave={previewModal.mode === 'edit' ? handleSaveAction : undefined}
          vulnerability={previewModal.vulnerability}
          mode={previewModal.mode}
          isInternalScan={!selectedScan.entity_id}
          entityId={selectedScan.entity_id}
          entityName={selectedScan.entity_name}
          existingAction={customizedActions.get(previewModal.vulnerability.id) || null}
        />
      )}
    </div>
  );
}
