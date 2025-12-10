'use client';

import React, { useState, useEffect, JSX } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radar,
  Plus,
  RefreshCw,
  Globe,
  Server,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  FileText,
  ChevronRight,
  Building2,
  Network
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';

// Types
interface DashboardStats {
  total_targets: number;
  targets_scanned: number;
  targets_never_scanned: number;
  total_scans: number;
  scans_last_30_days: number;
  average_exposure_score: number;
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
  medium_vulnerabilities: number;
  low_vulnerabilities: number;
}

interface TopVulnerableTarget {
  target_id: string;
  target_value: string;
  target_type: string;
  exposure_score: number;
  critical_count: number;
  high_count: number;
  last_scan_at: string | null;
}

interface RecentScan {
  id: string;
  external_target_id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  started_at: string | null;
  finished_at: string | null;
  summary: {
    exposure_score?: number;
    nb_vuln_critical?: number;
    nb_vuln_high?: number;
    nb_vuln_medium?: number;
  } | null;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  top_vulnerable_targets: TopVulnerableTarget[];
  recent_scans: RecentScan[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ScannerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setRefreshing(true);
    setError(null);
    setErrorCode(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/dashboard`, {
        credentials: 'include'
      });

      if (!response.ok) {
        setErrorCode(response.status);
        if (response.status === 403) {
          throw new Error('Permission SCANNER_READ requise');
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching dashboard:', err);
      setError(error.message || 'Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    if (score >= 20) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-orange-500';
    if (score >= 20) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getScanStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      PENDING: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center"><Clock className="w-3 h-3 mr-1" />En attente</span>,
      RUNNING: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center"><Activity className="w-3 h-3 mr-1 animate-pulse" />En cours</span>,
      SUCCESS: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Terminé</span>,
      ERROR: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1" />Erreur</span>
    };
    return badges[status] || badges.PENDING;
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
          <p className="text-gray-600">Chargement du dashboard Scanner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col client" data-section="scanner">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Radar className="w-8 h-8 mr-3 text-cyan-600" />
                  Scanner Externe
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Analyse de la surface d'attaque externe
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        <div className="flex-1">
          <ErrorDisplay
            type={errorCode === 403 ? 'forbidden' : getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={fetchDashboard}
            showBack={true}
            showHome={true}
            permissionCode={errorCode === 403 ? 'SCANNER_READ' : extractPermissionCodeFromMessage(error)}
            actionName="Scanner Externe"
          />
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    total_targets: 0,
    targets_scanned: 0,
    targets_never_scanned: 0,
    total_scans: 0,
    scans_last_30_days: 0,
    average_exposure_score: 0,
    critical_vulnerabilities: 0,
    high_vulnerabilities: 0,
    medium_vulnerabilities: 0,
    low_vulnerabilities: 0
  };

  return (
    <div className="min-h-screen flex flex-col client" data-section="scanner">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Radar className="w-8 h-8 mr-3 text-cyan-600" />
                Scanner Externe
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Analyse de la surface d'attaque externe (ASM)
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDashboard}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <Link
                href="/client/scanner/targets"
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Cible
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Score d'exposition moyen */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Score d'Exposition</span>
              <div className={`p-2 rounded-lg ${getScoreColor(stats.average_exposure_score)}`}>
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-3xl font-bold ${stats.average_exposure_score >= 50 ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.round(stats.average_exposure_score)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Score moyen /100</p>
              </div>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getScoreBgColor(stats.average_exposure_score)} transition-all`}
                  style={{ width: `${stats.average_exposure_score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cibles */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Cibles</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Globe className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats.total_targets}</p>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <span className="text-green-600">{stats.targets_scanned} scannées</span>
                <span className="mx-1">•</span>
                <span className="text-orange-600">{stats.targets_never_scanned} en attente</span>
              </div>
            </div>
          </div>

          {/* Vulnérabilités Critiques */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Vulnérabilités Critiques</span>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{stats.critical_vulnerabilities}</p>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <span className="text-orange-600">{stats.high_vulnerabilities} HIGH</span>
                <span className="mx-1">•</span>
                <span className="text-yellow-600">{stats.medium_vulnerabilities} MEDIUM</span>
              </div>
            </div>
          </div>

          {/* Scans récents */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Scans (30j)</span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats.scans_last_30_days}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.total_scans} scans au total</p>
            </div>
          </div>
        </div>

        {/* Grid 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cibles les plus vulnérables */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-red-500" />
                  Cibles les plus exposées
                </h2>
                <Link
                  href="/client/scanner/targets"
                  className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
                >
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {dashboardData?.top_vulnerable_targets && dashboardData.top_vulnerable_targets.length > 0 ? (
                dashboardData.top_vulnerable_targets.map((target) => (
                  <Link
                    key={target.target_id}
                    href={`/client/scanner/targets/${target.target_id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getScoreColor(target.exposure_score)}`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{target.target_value}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <span className="uppercase">{target.target_type}</span>
                          {target.last_scan_at && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{formatDate(target.last_scan_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${target.exposure_score >= 50 ? 'text-red-600' : 'text-green-600'}`}>
                        {target.exposure_score}
                      </p>
                      <div className="flex items-center text-xs space-x-2 mt-0.5">
                        {target.critical_count > 0 && (
                          <span className="text-red-600">{target.critical_count} CRIT</span>
                        )}
                        {target.high_count > 0 && (
                          <span className="text-orange-600">{target.high_count} HIGH</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucune cible scannée</p>
                  <Link
                    href="/client/scanner/targets"
                    className="text-cyan-600 hover:text-cyan-700 text-sm mt-2 inline-block"
                  >
                    Ajouter une cible
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Scans récents */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-purple-500" />
                  Scans récents
                </h2>
                <Link
                  href="/client/scanner/targets"
                  className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center"
                >
                  Historique
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {dashboardData?.recent_scans && dashboardData.recent_scans.length > 0 ? (
                dashboardData.recent_scans.map((scan) => (
                  <Link
                    key={scan.id}
                    href={`/client/scanner/scans/${scan.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Radar className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Scan #{scan.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">{formatDate(scan.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {scan.summary && scan.status === 'SUCCESS' && (
                        <div className="text-right mr-2">
                          <p className={`text-sm font-semibold ${(scan.summary.exposure_score || 0) >= 50 ? 'text-red-600' : 'text-green-600'}`}>
                            Score: {scan.summary.exposure_score || 0}
                          </p>
                        </div>
                      )}
                      {getScanStatusBadge(scan.status)}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Radar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucun scan effectué</p>
                  <p className="text-sm mt-1">Lancez un scan sur une cible pour commencer</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gérer les cibles */}
          <Link
            href="/client/scanner/targets"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-cyan-300 transition-all group"
          >
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-lg bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100 transition-colors">
                <Globe className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-cyan-500 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Gérer les cibles</h3>
            <p className="text-sm text-gray-500">
              Ajoutez et gérez vos domaines, IPs et sous-domaines à scanner.
            </p>
          </Link>

          {/* Vue Écosystème */}
          <Link
            href="/client/scanner/ecosystem"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-cyan-300 transition-all group"
          >
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                <Network className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-purple-500 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Vue Écosystème</h3>
            <p className="text-sm text-gray-500">
              Visualisez les vulnérabilités agrégées par organisme avec notes A-E.
            </p>
          </Link>

          {/* Générer Plan d'Action */}
          <Link
            href="/client/scanner/action-plan"
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-cyan-300 transition-all group"
          >
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-green-500 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Plan d'Action</h3>
            <p className="text-sm text-gray-500">
              Générez des plans d'action à partir des vulnérabilités détectées.
            </p>
          </Link>
        </div>

        {/* CTA Banner */}
        <div className="mt-8 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Prêt à analyser votre surface d'attaque ?</h3>
              <p className="text-cyan-100">
                Ajoutez vos domaines, IPs et sous-domaines pour découvrir les vulnérabilités exposées.
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/client/scanner/targets"
                className="px-4 py-2 bg-white text-cyan-600 rounded-lg hover:bg-cyan-50 transition-colors font-medium flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une cible
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
