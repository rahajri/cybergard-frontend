'use client';

import React, { useState, useEffect, JSX } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Radar,
  ArrowLeft,
  RefreshCw,
  Globe,
  Globe2,
  Building2,
  Server,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  FileText,
  FileBarChart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Info,
  Download,
  Cpu,
  Monitor,
  HardDrive,
  Network,
  Code,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Key,
  Calendar,
  Hash,
  Layers,
  Terminal
} from 'lucide-react';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import GenerateReportModal from '@/components/modals/GenerateReportModal';
import ReportCard from '@/components/reports/ReportCard';
import { scanReportsApi, GeneratedReport } from '@/lib/api/reports';

// Types
interface InfrastructureInfo {
  os_name: string | null;
  os_family: string | null;
  os_vendor: string | null;
  os_version: string | null;
  os_accuracy: number;
  os_type: string | null;
  os_cpe: string | null;
  ip_address: string | null;
  hostname: string | null;
  web_server: string | null;
  technologies: string[];
}

interface TLSProtocols {
  ssl2: boolean;
  ssl3: boolean;
  tls10: boolean;
  tls11: boolean;
  tls12: boolean;
  tls13: boolean;
}

interface TLSCertificate {
  subject: string | null;
  issuer: string | null;
  serial_number: string | null;
  not_before: string | null;
  not_after: string | null;
  is_expired: boolean;
  days_until_expiry: number | null;
  is_self_signed: boolean;
  signature_algorithm: string | null;
  public_key_algorithm: string | null;
  public_key_size: number | null;
  san_domains: string[];
}

interface TLSCiphers {
  strong: string[];
  weak: string[];
}

interface TLSDetails {
  protocols: TLSProtocols | null;
  certificate: TLSCertificate | null;
  ciphers: TLSCiphers | null;
  grade: string | null;
  error: string | null;
}

interface ServiceInfo {
  port: number;
  protocol: string;
  service_name: string;
  service_version: string | null;
  service_product: string | null;
  service_banner: string | null;
  cpe: string | null;
  is_risky?: boolean;
}

interface ScanData {
  services: ServiceInfo[];
  tls_details: TLSDetails | null;
  infrastructure: InfrastructureInfo | null;
  raw_command: string | null;
}

interface ScanSummary {
  nb_services_exposed: number;
  nb_vuln_critical: number;
  nb_vuln_high: number;
  nb_vuln_medium: number;
  nb_vuln_low: number;
  nb_vuln_info: number;
  nb_vuln_total: number;
  exposure_score: number;
  risk_level: string | null;
  tls_grade: string | null;
  ports_scanned: number;
  scan_duration_seconds: number;
  infrastructure?: InfrastructureInfo;
}

interface Vulnerability {
  id: string;
  external_scan_id: string;
  port: number | null;
  protocol: string | null;
  service_name: string | null;
  service_version: string | null;
  vulnerability_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cve_ids: string[] | null;
  cvss_score: number | null;
  title: string;
  description: string | null;
  recommendation: string | null;
  references: string[] | null;
  is_remediated: boolean;
  created_at: string;
}

interface ExternalTarget {
  id: string;
  type: string;
  value: string;
  label: string | null;
}


interface ScanDetail {
  scan: {
    id: string;
    external_target_id: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
    started_at: string | null;
    finished_at: string | null;
    error_message: string | null;
    summary: ScanSummary | null;
    report_generated: boolean;
    created_at: string;
  };
  target: ExternalTarget;
  services: ServiceInfo[];
  vulnerabilities: Vulnerability[];
  scan_data: ScanData | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanDetail, setScanDetail] = useState<ScanDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVulns, setExpandedVulns] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [modalResult, setModalResult] = useState<{ type: ModalType; message: string } | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState('Initialisation...');

  // État pour le modal de génération de rapport
  const [showReportModal, setShowReportModal] = useState(false);

  // État pour les rapports générés
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // État pour les onglets
  const [activeTab, setActiveTab] = useState<'results' | 'reports'>('results');

  // Chargement initial
  useEffect(() => {
    fetchScanDetail();
    fetchGeneratedReports();
  }, [scanId]);

  // Auto-refresh polling pour les scans en cours
  useEffect(() => {
    // Ne pas démarrer le polling si on n'a pas encore de données ou si le scan est terminé
    if (!scanDetail) return;
    if (scanDetail.scan.status !== 'PENDING' && scanDetail.scan.status !== 'RUNNING') return;

    // Polling toutes les 3 secondes pendant le scan
    const interval = setInterval(() => {
      fetchScanDetail();
    }, 3000);

    return () => clearInterval(interval);
  }, [scanDetail?.scan.status]);

  // Animation de progression simulée pendant le scan
  useEffect(() => {
    if (!scanDetail) return;
    if (scanDetail.scan.status !== 'PENDING' && scanDetail.scan.status !== 'RUNNING') {
      setScanProgress(100);
      return;
    }

    // Phases du scan avec progression estimée
    const phases = [
      { progress: 5, phase: 'Initialisation du scan...' },
      { progress: 15, phase: 'Résolution DNS...' },
      { progress: 25, phase: 'Scan des ports (nmap)...' },
      { progress: 50, phase: 'Détection des services...' },
      { progress: 65, phase: 'Audit TLS/SSL...' },
      { progress: 80, phase: 'Recherche de vulnérabilités (CVE)...' },
      { progress: 90, phase: 'Calcul du score d\'exposition...' },
      { progress: 95, phase: 'Finalisation...' }
    ];

    // Progression progressive
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) return prev; // Plafonner à 95% jusqu'à la fin réelle
        const newProgress = prev + 1;

        // Mettre à jour la phase selon la progression
        const currentPhase = phases.filter(p => p.progress <= newProgress).pop();
        if (currentPhase) {
          setScanPhase(currentPhase.phase);
        }

        return newProgress;
      });
    }, 800); // Avance de 1% toutes les 800ms

    return () => clearInterval(progressInterval);
  }, [scanDetail?.scan.status]);

  const fetchScanDetail = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/detail`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Scan non trouvé');
        }
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      setScanDetail(data);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Ouvrir le modal de génération de rapport
  const handleOpenReportModal = () => {
    setShowReportModal(true);
  };

  // Callback appelé après succès de la génération de rapport
  const handleReportGenerationSuccess = () => {
    setModalResult({
      type: 'success',
      message: 'Génération du rapport lancée avec succès !'
    });
    fetchScanDetail();
    // Rafraîchir la liste des rapports après génération
    setTimeout(() => fetchGeneratedReports(), 2000);
  };

  // Charger les rapports générés pour ce scan (individuels uniquement)
  // Note: Les rapports écosystème sont dans la page Écosystème > onglet Rapports
  const fetchGeneratedReports = async () => {
    try {
      setLoadingReports(true);
      const response = await scanReportsApi.list({
        scan_id: scanId,
        limit: 50
      });
      setGeneratedReports(response.items || []);
    } catch (err) {
      console.error('Erreur chargement rapports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Générer le rapport IA (ancienne méthode)
  const handleGenerateAIReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/scans/${scanId}/report`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la génération du rapport');
      }

      setModalResult({
        type: 'success',
        message: 'Rapport IA généré avec succès !'
      });
      fetchScanDetail();
    } catch (err: unknown) {
      const error = err as Error;
      setModalResult({ type: 'error', message: error.message });
    } finally {
      setGeneratingReport(false);
    }
  };

  const toggleVulnExpand = (vulnId: string) => {
    setExpandedVulns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vulnId)) {
        newSet.delete(vulnId);
      } else {
        newSet.add(vulnId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-800 border-blue-200',
      INFO: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[severity] || colors.INFO;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    if (severity === 'MEDIUM') {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <Info className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      PENDING: (
        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          En attente
        </span>
      ),
      RUNNING: (
        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full flex items-center">
          <Activity className="w-4 h-4 mr-2 animate-pulse" />
          En cours...
        </span>
      ),
      SUCCESS: (
        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full flex items-center">
          <CheckCircle className="w-4 h-4 mr-2" />
          Terminé
        </span>
      ),
      ERROR: (
        <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          Erreur
        </span>
      )
    };
    return badges[status] || badges.PENDING;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-500';
    if (score >= 20) return 'text-yellow-500';
    return 'text-green-600';
  };

  const getTlsGradeColor = (grade: string | null) => {
    if (!grade) return 'bg-gray-100 text-gray-600';
    if (grade === 'A+' || grade === 'A') return 'bg-green-100 text-green-700';
    if (grade === 'B') return 'bg-yellow-100 text-yellow-700';
    if (grade === 'C') return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const filteredVulnerabilities = scanDetail?.vulnerabilities.filter(v =>
    !severityFilter || v.severity === severityFilter
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center client">
        <div className="text-center">
          <Radar className="w-12 h-12 text-cyan-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement du scan...</p>
        </div>
      </div>
    );
  }

  if (error || !scanDetail) {
    return (
      <div className="min-h-screen flex flex-col client">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <Link href="/client/scanner/targets" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour aux cibles
            </Link>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error || 'Scan non trouvé')}
            customMessage={error || 'Scan non trouvé'}
            onRetry={fetchScanDetail}
            showBack={true}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error || '')}
            actionName="Détail du Scan"
          />
        </div>
      </div>
    );
  }

  const { scan, target, services, vulnerabilities, scan_data } = scanDetail;
  const summary = scan.summary;

  return (
    <div className="min-h-screen flex flex-col client" data-section="scan-detail">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/client/scanner/targets"
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Radar className="w-7 h-7 mr-3 text-cyan-600" />
                  Scan #{scan.id.slice(0, 8)}
                </h1>
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  <Globe className="w-4 h-4 mr-1" />
                  <span className="font-medium">{target.value}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(scan.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(scan.status)}
              <button
                onClick={fetchScanDetail}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              {scan.status === 'SUCCESS' && (
                <>
                  {/* Bouton Générer Rapport PDF (nouveau système avec templates) */}
                  <button
                    onClick={handleOpenReportModal}
                    disabled={generatingReport}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center disabled:opacity-50"
                  >
                    {generatingReport ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Générer Rapport PDF
                      </>
                    )}
                  </button>
                  {/* Bouton Rapport IA (ancienne méthode) si pas encore généré */}
                  {!scan.report_generated && (
                    <button
                      onClick={handleGenerateAIReport}
                      disabled={generatingReport}
                      className="px-4 py-2 border border-cyan-600 text-cyan-600 rounded-lg hover:bg-cyan-50 transition-colors flex items-center disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Rapport IA
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {/* Status en cours avec progression */}
        {(scan.status === 'PENDING' || scan.status === 'RUNNING') && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="relative">
                  <Radar className="w-10 h-10 text-cyan-600 animate-spin" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-ping" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-blue-800">Scan en cours...</h3>
                  <p className="text-cyan-600 font-medium">{scanPhase}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-cyan-600">{scanProgress}%</span>
                <p className="text-xs text-gray-500">Progression estimée</p>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-4 bg-blue-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full transition-all duration-500 ease-out relative"
                style={{ width: `${scanProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Étapes visuelles */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              <div className={`flex items-center ${scanProgress >= 25 ? 'text-cyan-600' : 'text-gray-400'}`}>
                <CheckCircle className={`w-4 h-4 mr-1 ${scanProgress >= 25 ? 'text-green-500' : ''}`} />
                Ports
              </div>
              <div className={`flex items-center ${scanProgress >= 50 ? 'text-cyan-600' : 'text-gray-400'}`}>
                <CheckCircle className={`w-4 h-4 mr-1 ${scanProgress >= 50 ? 'text-green-500' : ''}`} />
                Services
              </div>
              <div className={`flex items-center ${scanProgress >= 65 ? 'text-cyan-600' : 'text-gray-400'}`}>
                <CheckCircle className={`w-4 h-4 mr-1 ${scanProgress >= 65 ? 'text-green-500' : ''}`} />
                TLS/SSL
              </div>
              <div className={`flex items-center ${scanProgress >= 80 ? 'text-cyan-600' : 'text-gray-400'}`}>
                <CheckCircle className={`w-4 h-4 mr-1 ${scanProgress >= 80 ? 'text-green-500' : ''}`} />
                CVE
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {scan.status === 'ERROR' && scan.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Erreur lors du scan</h3>
                <p className="text-red-600 mt-1">{scan.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards - Seulement si SUCCESS */}
        {scan.status === 'SUCCESS' && summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {/* Score d'exposition */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Score d'Exposition</span>
                  <Shield className={`w-5 h-5 ${getScoreColor(summary.exposure_score)}`} />
                </div>
                <p className={`text-4xl font-bold ${getScoreColor(summary.exposure_score)}`}>
                  {summary.exposure_score}
                </p>
                <p className="text-xs text-gray-500 mt-1">/100 - {summary.risk_level || 'N/A'}</p>
              </div>

              {/* Services exposés */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Services Exposés</span>
                  <Server className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">{summary.nb_services_exposed}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.ports_scanned} ports scannés</p>
              </div>

              {/* Grade TLS */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Grade TLS</span>
                  <Lock className="w-5 h-5 text-purple-600" />
                </div>
                <div className={`inline-flex px-3 py-1 rounded-lg text-2xl font-bold ${getTlsGradeColor(summary.tls_grade)}`}>
                  {summary.tls_grade || 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-2">Certificat SSL/TLS</p>
              </div>

              {/* Vulnérabilités */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Vulnérabilités</span>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">{summary.nb_vuln_total}</p>
                <div className="flex items-center space-x-2 mt-1 text-xs">
                  <span className="text-red-600">{summary.nb_vuln_critical} CRIT</span>
                  <span className="text-orange-500">{summary.nb_vuln_high} HIGH</span>
                  <span className="text-yellow-500">{summary.nb_vuln_medium} MED</span>
                </div>
              </div>

              {/* Durée */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Durée</span>
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">
                  {formatDuration(summary.scan_duration_seconds)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(scan.started_at)} → {formatDate(scan.finished_at)}
                </p>
              </div>
            </div>

            {/* Onglets Navigation */}
            <div className="mb-6 border-b border-gray-200">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'results'
                      ? 'border-cyan-600 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Résultats du Scan</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('reports');
                    fetchGeneratedReports();
                  }}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'reports'
                      ? 'border-cyan-600 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Rapports</span>
                    {generatedReports.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded-full">
                        {generatedReports.length}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'reports' ? (
              /* ===== ONGLET RAPPORTS ===== */
              <div className="space-y-6">
                {/* Header avec bouton de génération */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Rapports générés</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Consultez et téléchargez les rapports de sécurité de ce scan
                    </p>
                  </div>
                  <button
                    onClick={handleOpenReportModal}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <FileBarChart className="w-4 h-4" />
                    Générer un rapport
                  </button>
                </div>

                {loadingReports ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Chargement des rapports...</p>
                  </div>
                ) : generatedReports.length === 0 ? (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-50 rounded-full mb-4">
                      <FileBarChart size={32} className="text-cyan-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Aucun rapport généré
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Commencez par générer votre premier rapport de sécurité en cliquant sur le bouton ci-dessous.
                    </p>
                    <button
                      onClick={handleOpenReportModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-200"
                    >
                      <FileBarChart size={18} />
                      Générer un rapport
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Stats rapides - KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-800">Total</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{generatedReports.length}</p>
                          </div>
                          <FileBarChart className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-800">Finaux</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">
                              {generatedReports.filter(r => r.status === 'final').length}
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-cyan-800">Écosystème</p>
                            <p className="text-2xl font-bold text-cyan-900 mt-1">
                              {generatedReports.filter(r => r.report_scope === 'scan_ecosystem').length}
                            </p>
                          </div>
                          <Globe2 className="w-8 h-8 text-cyan-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-800">Individuels</p>
                            <p className="text-2xl font-bold text-orange-900 mt-1">
                              {generatedReports.filter(r => r.report_scope === 'scan_individual').length}
                            </p>
                          </div>
                          <Building2 className="w-8 h-8 text-orange-600" />
                        </div>
                      </div>
                    </div>

                    {/* Liste des rapports avec ReportCard */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {generatedReports.map((report) => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          onDelete={() => fetchGeneratedReports()}
                          onRegenerate={() => fetchGeneratedReports()}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* ===== ONGLET RÉSULTATS ===== */
              <>
            {/* Section Infrastructure */}
            {summary.infrastructure && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <HardDrive className="w-5 h-5 mr-2 text-purple-600" />
                    Infrastructure Détectée
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Système d'exploitation */}
                    {summary.infrastructure.os_name && (
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                        <div className="flex items-center mb-3">
                          <Monitor className="w-5 h-5 text-purple-600 mr-2" />
                          <span className="text-sm font-semibold text-purple-800">Système d'Exploitation</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{summary.infrastructure.os_name}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {summary.infrastructure.os_family && (
                            <div className="flex items-center">
                              <span className="text-gray-500 w-20">Famille:</span>
                              <span className="font-medium">{summary.infrastructure.os_family}</span>
                            </div>
                          )}
                          {summary.infrastructure.os_vendor && (
                            <div className="flex items-center">
                              <span className="text-gray-500 w-20">Éditeur:</span>
                              <span className="font-medium">{summary.infrastructure.os_vendor}</span>
                            </div>
                          )}
                          {summary.infrastructure.os_version && (
                            <div className="flex items-center">
                              <span className="text-gray-500 w-20">Version:</span>
                              <span className="font-medium">{summary.infrastructure.os_version}</span>
                            </div>
                          )}
                          {summary.infrastructure.os_type && (
                            <div className="flex items-center">
                              <span className="text-gray-500 w-20">Type:</span>
                              <span className="font-medium capitalize">{summary.infrastructure.os_type}</span>
                            </div>
                          )}
                        </div>
                        {summary.infrastructure.os_accuracy > 0 && (
                          <div className="mt-3 flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${summary.infrastructure.os_accuracy}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{summary.infrastructure.os_accuracy}% confiance</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Informations réseau */}
                    {(summary.infrastructure.ip_address || summary.infrastructure.hostname) && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center mb-3">
                          <Network className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="text-sm font-semibold text-blue-800">Informations Réseau</span>
                        </div>
                        <div className="space-y-3">
                          {summary.infrastructure.ip_address && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Adresse IP</p>
                              <p className="text-lg font-mono font-bold text-gray-900">{summary.infrastructure.ip_address}</p>
                            </div>
                          )}
                          {summary.infrastructure.hostname && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Hostname</p>
                              <p className="text-md font-medium text-gray-700">{summary.infrastructure.hostname}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Serveur Web */}
                    {summary.infrastructure.web_server && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center mb-3">
                          <Server className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-sm font-semibold text-green-800">Serveur Web</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{summary.infrastructure.web_server}</p>
                      </div>
                    )}

                    {/* Technologies détectées */}
                    {summary.infrastructure.technologies && summary.infrastructure.technologies.length > 0 && (
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-100 md:col-span-2 lg:col-span-1">
                        <div className="flex items-center mb-3">
                          <Code className="w-5 h-5 text-orange-600 mr-2" />
                          <span className="text-sm font-semibold text-orange-800">Technologies</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {summary.infrastructure.technologies.map((tech, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-white border border-orange-200 text-orange-700 rounded text-sm font-medium"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CPE si disponible */}
                    {summary.infrastructure.os_cpe && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center mb-2">
                          <Cpu className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">CPE (Common Platform Enumeration)</span>
                        </div>
                        <code className="text-sm text-gray-700 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                          {summary.infrastructure.os_cpe}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Message si aucune info infra */}
                  {!summary.infrastructure.os_name && !summary.infrastructure.ip_address && !summary.infrastructure.web_server && (
                    <div className="text-center py-6 text-gray-500">
                      <HardDrive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Aucune information d'infrastructure détectée</p>
                      <p className="text-sm text-gray-400 mt-1">La détection d'OS nécessite des privilèges administrateur sur le scanner</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section Services Détectés */}
            {(services.length > 0 || (scan_data?.services && scan_data.services.length > 0)) && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Server className="w-5 h-5 mr-2 text-blue-600" />
                    Services Détectés ({scan_data?.services?.length || services.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-3 font-medium">Port</th>
                          <th className="pb-3 font-medium">Protocol</th>
                          <th className="pb-3 font-medium">Service</th>
                          <th className="pb-3 font-medium">Version</th>
                          <th className="pb-3 font-medium">CPE</th>
                          <th className="pb-3 font-medium">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(scan_data?.services || services).map((svc, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-3 font-mono font-semibold text-gray-900">{svc.port}</td>
                            <td className="py-3 text-gray-600">{svc.protocol}</td>
                            <td className="py-3">
                              <span className="font-medium text-gray-900">{svc.service_name}</span>
                              {svc.service_product && (
                                <span className="text-gray-500 ml-2">({svc.service_product})</span>
                              )}
                            </td>
                            <td className="py-3 text-gray-600">{svc.service_version || '-'}</td>
                            <td className="py-3">
                              {svc.cpe ? (
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{svc.cpe}</code>
                              ) : '-'}
                            </td>
                            <td className="py-3">
                              {svc.is_risky ? (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center w-fit">
                                  <ShieldAlert className="w-3 h-3 mr-1" />
                                  Risque
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center w-fit">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Section Détails TLS/SSL */}
            {scan_data?.tls_details && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Lock className="w-5 h-5 mr-2 text-green-600" />
                    Audit TLS/SSL
                    {scan_data.tls_details.grade && (
                      <span className={`ml-3 px-3 py-1 rounded-lg text-sm font-bold ${getTlsGradeColor(scan_data.tls_details.grade)}`}>
                        Grade {scan_data.tls_details.grade}
                      </span>
                    )}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Protocoles supportés */}
                    {scan_data.tls_details.protocols && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center mb-4">
                          <Layers className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-sm font-semibold text-green-800">Protocoles Supportés</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { key: 'ssl2', label: 'SSL 2.0', danger: true },
                            { key: 'ssl3', label: 'SSL 3.0', danger: true },
                            { key: 'tls10', label: 'TLS 1.0', warning: true },
                            { key: 'tls11', label: 'TLS 1.1', warning: true },
                            { key: 'tls12', label: 'TLS 1.2', ok: true },
                            { key: 'tls13', label: 'TLS 1.3', ok: true }
                          ].map((proto) => {
                            const supported = (scan_data.tls_details?.protocols as any)?.[proto.key];
                            return (
                              <div key={proto.key} className={`flex items-center justify-between p-2 rounded ${
                                supported
                                  ? proto.danger ? 'bg-red-100' : proto.warning ? 'bg-yellow-100' : 'bg-green-100'
                                  : 'bg-gray-100'
                              }`}>
                                <span className="text-sm font-medium">{proto.label}</span>
                                {supported ? (
                                  proto.danger ? (
                                    <ShieldX className="w-4 h-4 text-red-600" />
                                  ) : proto.warning ? (
                                    <ShieldAlert className="w-4 h-4 text-yellow-600" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4 text-green-600" />
                                  )
                                ) : (
                                  <span className="text-xs text-gray-400">Non</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Certificat */}
                    {scan_data.tls_details.certificate && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center mb-4">
                          <Key className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="text-sm font-semibold text-blue-800">Certificat SSL</span>
                          {scan_data.tls_details.certificate.is_expired ? (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Expiré</span>
                          ) : scan_data.tls_details.certificate.is_self_signed ? (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">Auto-signé</span>
                          ) : (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Valide</span>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          {scan_data.tls_details.certificate.subject && (
                            <div>
                              <span className="text-gray-500">Subject:</span>
                              <p className="font-mono text-xs mt-1 text-gray-700 break-all">{scan_data.tls_details.certificate.subject}</p>
                            </div>
                          )}
                          {scan_data.tls_details.certificate.issuer && (
                            <div>
                              <span className="text-gray-500">Émetteur:</span>
                              <p className="font-mono text-xs mt-1 text-gray-700 break-all">{scan_data.tls_details.certificate.issuer}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {scan_data.tls_details.certificate.not_before && (
                              <div className="flex items-center text-xs">
                                <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                                <span className="text-gray-500">Du:</span>
                                <span className="ml-1 font-medium">{new Date(scan_data.tls_details.certificate.not_before).toLocaleDateString('fr-FR')}</span>
                              </div>
                            )}
                            {scan_data.tls_details.certificate.not_after && (
                              <div className="flex items-center text-xs">
                                <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                                <span className="text-gray-500">Au:</span>
                                <span className="ml-1 font-medium">{new Date(scan_data.tls_details.certificate.not_after).toLocaleDateString('fr-FR')}</span>
                              </div>
                            )}
                          </div>
                          {scan_data.tls_details.certificate.days_until_expiry !== null && (
                            <div className={`mt-2 p-2 rounded text-xs ${
                              scan_data.tls_details.certificate.days_until_expiry < 0 ? 'bg-red-100 text-red-700' :
                              scan_data.tls_details.certificate.days_until_expiry < 30 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {scan_data.tls_details.certificate.days_until_expiry < 0
                                ? `Expiré depuis ${Math.abs(scan_data.tls_details.certificate.days_until_expiry)} jours`
                                : `Expire dans ${scan_data.tls_details.certificate.days_until_expiry} jours`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cipher Suites */}
                    {scan_data.tls_details.ciphers && (scan_data.tls_details.ciphers.strong?.length > 0 || scan_data.tls_details.ciphers.weak?.length > 0) && (
                      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200 lg:col-span-2">
                        <div className="flex items-center mb-4">
                          <Hash className="w-5 h-5 text-gray-600 mr-2" />
                          <span className="text-sm font-semibold text-gray-800">Cipher Suites</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Strong Ciphers */}
                          {scan_data.tls_details.ciphers.strong && scan_data.tls_details.ciphers.strong.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-green-700 mb-2 flex items-center">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Ciphers Sécurisés ({scan_data.tls_details.ciphers.strong.length})
                              </h4>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {scan_data.tls_details.ciphers.strong.slice(0, 10).map((cipher, idx) => (
                                  <code key={idx} className="block text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                    {cipher}
                                  </code>
                                ))}
                                {scan_data.tls_details.ciphers.strong.length > 10 && (
                                  <p className="text-xs text-gray-500">...et {scan_data.tls_details.ciphers.strong.length - 10} autres</p>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Weak Ciphers */}
                          {scan_data.tls_details.ciphers.weak && scan_data.tls_details.ciphers.weak.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center">
                                <ShieldX className="w-3 h-3 mr-1" />
                                Ciphers Faibles ({scan_data.tls_details.ciphers.weak.length})
                              </h4>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {scan_data.tls_details.ciphers.weak.map((cipher, idx) => (
                                  <code key={idx} className="block text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                                    {cipher}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Erreur TLS */}
                  {scan_data.tls_details.error && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {scan_data.tls_details.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Commande nmap exécutée */}
            {scan_data?.raw_command && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center">
                    <Terminal className="w-4 h-4 mr-2 text-gray-500" />
                    Commande de scan exécutée
                  </h3>
                </div>
                <div className="p-4 bg-gray-900 rounded-b-xl">
                  <code className="text-sm text-green-400 font-mono break-all">
                    $ {scan_data.raw_command}
                  </code>
                </div>
              </div>
            )}

            {/* Liste des vulnérabilités */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                    Vulnérabilités Détectées ({vulnerabilities.length})
                  </h2>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    <option value="">Toutes les sévérités</option>
                    <option value="CRITICAL">Critique</option>
                    <option value="HIGH">Haute</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="LOW">Basse</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
              </div>

              {filteredVulnerabilities.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Aucune vulnérabilité détectée
                  </h3>
                  <p className="text-gray-600">
                    {severityFilter ? 'Aucune vulnérabilité pour ce niveau de sévérité' : 'La cible ne présente pas de vulnérabilité connue.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredVulnerabilities.map((vuln) => (
                    <div key={vuln.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleVulnExpand(vuln.id)}
                      >
                        <div className="flex items-start space-x-4">
                          <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center ${getSeverityColor(vuln.severity)}`}>
                            {getSeverityIcon(vuln.severity)}
                            <span className="ml-1">{vuln.severity}</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{vuln.title}</h4>
                            <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
                              {vuln.port && (
                                <span>Port: {vuln.port}/{vuln.protocol}</span>
                              )}
                              {vuln.service_name && (
                                <span>Service: {vuln.service_name} {vuln.service_version}</span>
                              )}
                              {vuln.cvss_score && (
                                <span className="font-medium">CVSS: {vuln.cvss_score}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {vuln.cve_ids && vuln.cve_ids.length > 0 && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                              {vuln.cve_ids.length} CVE
                            </span>
                          )}
                          {expandedVulns.has(vuln.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Détails expandables */}
                      {expandedVulns.has(vuln.id) && (
                        <div className="mt-4 pl-16 space-y-4">
                          {vuln.description && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Description</h5>
                              <p className="text-sm text-gray-600">{vuln.description}</p>
                            </div>
                          )}

                          {vuln.recommendation && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Recommandation</h5>
                              <p className="text-sm text-gray-600">{vuln.recommendation}</p>
                            </div>
                          )}

                          {vuln.cve_ids && vuln.cve_ids.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">CVE</h5>
                              <div className="flex flex-wrap gap-2">
                                {vuln.cve_ids.map((cve) => (
                                  <a
                                    key={cve}
                                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center"
                                  >
                                    {cve}
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {vuln.references && vuln.references.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Références</h5>
                              <div className="space-y-1">
                                {vuln.references.slice(0, 3).map((ref, idx) => (
                                  <a
                                    key={idx}
                                    href={ref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    {ref.length > 60 ? ref.slice(0, 60) + '...' : ref}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modal Génération de Rapport Scanner */}
      <GenerateReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        mode="scanner"
        scanId={scanId}
        scanInfo={scanDetail ? {
          id: scanDetail.scan.id,
          targetValue: scanDetail.target.value,
          targetLabel: scanDetail.target.label || undefined,
          exposureScore: scanDetail.scan.summary?.exposure_score
        } : undefined}
        onSuccess={handleReportGenerationSuccess}
        initialScope="scan_individual"
      />

      {/* Modal Result */}
      {modalResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setModalResult(null)}
          title={modalResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={modalResult.message}
          type={modalResult.type}
        />
      )}
    </div>
  );
}
