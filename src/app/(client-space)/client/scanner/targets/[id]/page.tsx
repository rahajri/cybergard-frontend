'use client';

import React, { useState, useEffect, JSX } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Radar,
  ArrowLeft,
  RefreshCw,
  Globe,
  Server,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Activity,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Settings,
  History
} from 'lucide-react';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';

// Types
interface ExternalTarget {
  id: string;
  tenant_id: string;
  type: string;
  value: string;
  label: string | null;
  description: string | null;
  scan_frequency: string;
  is_active: boolean;
  last_scan_at: string | null;
  last_scan_status: string;
  last_exposure_score: number | null;
  created_at: string;
  updated_at: string | null;
}

interface ScanHistory {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  started_at: string | null;
  finished_at: string | null;
  summary: {
    exposure_score?: number;
    nb_vuln_critical?: number;
    nb_vuln_high?: number;
    nb_vuln_medium?: number;
    nb_vuln_low?: number;
    nb_services_exposed?: number;
  } | null;
  error_message: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function TargetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const targetId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ExternalTarget | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scanningTarget, setScanningTarget] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modalResult, setModalResult] = useState<{ type: ModalType; message: string } | null>(null);

  // Chargement initial
  useEffect(() => {
    fetchTargetData();
  }, [targetId]);

  // Auto-refresh si un scan est en cours
  useEffect(() => {
    const hasRunningScans = scanHistory.some(
      scan => scan.status === 'PENDING' || scan.status === 'RUNNING'
    );

    if (!hasRunningScans) return;

    // Polling toutes les 5 secondes si un scan est en cours
    const interval = setInterval(() => {
      fetchTargetData();
    }, 5000);

    return () => clearInterval(interval);
  }, [scanHistory]);

  const fetchTargetData = async () => {
    setRefreshing(true);
    try {
      // Fetch target details
      const targetResponse = await fetch(`${API_BASE}/api/v1/external-scanner/targets/${targetId}`, {
        credentials: 'include'
      });

      if (!targetResponse.ok) {
        if (targetResponse.status === 404) {
          throw new Error('Cible non trouvée');
        }
        throw new Error(`Erreur ${targetResponse.status}`);
      }

      const targetData = await targetResponse.json();
      setTarget(targetData);

      // Fetch scan history
      const scansResponse = await fetch(`${API_BASE}/api/v1/external-scanner/scans?target_id=${targetId}&limit=10`, {
        credentials: 'include'
      });

      if (scansResponse.ok) {
        const scansData = await scansResponse.json();
        setScanHistory(scansData.items || []);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLaunchScan = async () => {
    if (!target) return;

    setScanningTarget(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/targets/${targetId}/scan`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du lancement du scan');
      }

      const data = await response.json();
      setModalResult({
        type: 'success',
        message: `Scan lancé avec succès ! Redirection vers le détail...`
      });

      // Redirect to scan detail after a short delay
      setTimeout(() => {
        router.push(`/client/scanner/scans/${data.scan_id}`);
      }, 1500);
    } catch (err: unknown) {
      const error = err as Error;
      setModalResult({ type: 'error', message: error.message });
      setScanningTarget(false);
    }
  };

  const handleDeleteTarget = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/targets/${targetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setShowDeleteConfirm(false);
      setModalResult({ type: 'success', message: 'Cible supprimée avec succès' });

      setTimeout(() => {
        router.push('/client/scanner/targets');
      }, 1500);
    } catch (err: unknown) {
      const error = err as Error;
      setModalResult({ type: 'error', message: error.message });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DOMAIN':
      case 'SUBDOMAIN':
        return <Globe className="w-6 h-6" />;
      case 'IP':
      case 'IP_RANGE':
        return <Server className="w-6 h-6" />;
      default:
        return <Globe className="w-6 h-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DOMAIN: 'Domaine',
      SUBDOMAIN: 'Sous-domaine',
      IP: 'Adresse IP',
      IP_RANGE: 'Plage IP',
      EMAIL_DOMAIN: 'Domaine Email'
    };
    return labels[type] || type;
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      MANUAL: 'Manuel',
      DAILY: 'Quotidien',
      WEEKLY: 'Hebdomadaire',
      MONTHLY: 'Mensuel'
    };
    return labels[freq] || freq;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-500';
    if (score >= 20) return 'text-yellow-500';
    return 'text-green-600';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-gray-100';
    if (score >= 70) return 'bg-red-50';
    if (score >= 40) return 'bg-orange-50';
    if (score >= 20) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const getScanStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      PENDING: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center"><Clock className="w-3 h-3 mr-1" />En attente</span>,
      RUNNING: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center"><Activity className="w-3 h-3 mr-1 animate-pulse" />En cours</span>,
      SUCCESS: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Succès</span>,
      ERROR: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1" />Erreur</span>
    };
    return badges[status] || badges.PENDING;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
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
          <p className="text-gray-600">Chargement de la cible...</p>
        </div>
      </div>
    );
  }

  if (error || !target) {
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
            type={getErrorTypeFromMessage(error || 'Cible non trouvée')}
            customMessage={error || 'Cible non trouvée'}
            onRetry={fetchTargetData}
            showBack={true}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error || '')}
            actionName="Détail de la Cible"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col client" data-section="target-detail">
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
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${getScoreBg(target.last_exposure_score)}`}>
                {getTypeIcon(target.type)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{target.value}</h1>
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs mr-2">
                    {getTypeLabel(target.type)}
                  </span>
                  {target.label && <span className="mr-2">• {target.label}</span>}
                  <span>• Créé le {formatDate(target.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchTargetData}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </button>
              <button
                onClick={handleLaunchScan}
                disabled={scanningTarget || !target.is_active}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanningTarget ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Lancement...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Lancer un Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche - Info & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-gray-500" />
                  Informations
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                  <p className="text-gray-900 mt-1">{getTypeLabel(target.type)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Valeur</label>
                  <p className="text-gray-900 mt-1 font-mono">{target.value}</p>
                </div>
                {target.label && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Libellé</label>
                    <p className="text-gray-900 mt-1">{target.label}</p>
                  </div>
                )}
                {target.description && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                    <p className="text-gray-600 mt-1 text-sm">{target.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Fréquence de scan</label>
                  <p className="text-gray-900 mt-1">{getFrequencyLabel(target.scan_frequency)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Statut</label>
                  <p className="mt-1">
                    {target.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Actif</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Inactif</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Score Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-gray-500" />
                  Score d'Exposition
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBg(target.last_exposure_score)}`}>
                  <span className={`text-4xl font-bold ${getScoreColor(target.last_exposure_score)}`}>
                    {target.last_exposure_score !== null ? target.last_exposure_score : '-'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {target.last_scan_at ? (
                    <>Dernier scan : {formatDate(target.last_scan_at)}</>
                  ) : (
                    'Aucun scan effectué'
                  )}
                </p>
                {target.last_exposure_score !== null && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${
                          target.last_exposure_score >= 70 ? 'bg-red-500' :
                          target.last_exposure_score >= 40 ? 'bg-orange-500' :
                          target.last_exposure_score >= 20 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${target.last_exposure_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {target.last_exposure_score < 20 ? 'Faible exposition' :
                       target.last_exposure_score < 40 ? 'Exposition modérée' :
                       target.last_exposure_score < 70 ? 'Exposition élevée' : 'Exposition critique'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonne droite - Historique des scans */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <History className="w-5 h-5 mr-2 text-gray-500" />
                    Historique des Scans
                  </h2>
                  <span className="text-sm text-gray-500">{scanHistory.length} scan(s)</span>
                </div>
              </div>

              {scanHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <Radar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun scan effectué</h3>
                  <p className="text-gray-600 mb-6">Lancez votre premier scan pour analyser cette cible.</p>
                  <button
                    onClick={handleLaunchScan}
                    disabled={scanningTarget || !target.is_active}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors inline-flex items-center disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Lancer un Scan
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {scanHistory.map((scan) => (
                    <Link
                      key={scan.id}
                      href={`/client/scanner/scans/${scan.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Radar className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Scan #{scan.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{formatDate(scan.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {scan.status === 'SUCCESS' && scan.summary && (
                          <div className="text-right mr-2">
                            <p className={`text-lg font-bold ${getScoreColor(scan.summary.exposure_score || null)}`}>
                              {scan.summary.exposure_score || 0}
                            </p>
                            <div className="flex items-center text-xs space-x-2">
                              {(scan.summary.nb_vuln_critical || 0) > 0 && (
                                <span className="text-red-600">{scan.summary.nb_vuln_critical} CRIT</span>
                              )}
                              {(scan.summary.nb_vuln_high || 0) > 0 && (
                                <span className="text-orange-600">{scan.summary.nb_vuln_high} HIGH</span>
                              )}
                            </div>
                          </div>
                        )}
                        {getScanStatusBadge(scan.status)}
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTarget}
        title="Supprimer la cible"
        message={`Êtes-vous sûr de vouloir supprimer la cible "${target.value}" ? Cette action supprimera également tout l'historique des scans.`}
        type="confirm"
        confirmText="Supprimer"
        confirmButtonColor="red"
      />

      {/* Result Modal */}
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
