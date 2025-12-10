'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Radar,
  RefreshCw,
  Globe,
  Building2,
  AlertTriangle,
  Filter,
  Download,
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Shield,
  TrendingUp,
  BarChart3,
  Grid3X3,
  Layers,
  Info,
  FileBarChart,
  Loader2,
  Scan
} from 'lucide-react';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import ReportCard from '@/components/reports/ReportCard';
import GenerateReportModal from '@/components/modals/GenerateReportModal';
import { scanReportsApi, GeneratedReport } from '@/lib/api/reports';
// Types
interface EntityScanData {
  entity_id: string;
  entity_name: string;
  entity_type: 'internal' | 'external';
  targets_count: number;
  scans_count: number;
  average_cvss: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  last_scan_at: string | null;
}

interface EcosystemStats {
  total_entities: number;
  total_targets: number;
  total_vulnerabilities: number;
  average_grade: string;
  median_cvss: number;
  median_cve_count: number;
  entities_by_grade: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
}

interface EcosystemResponse {
  entities: EntityScanData[];
  stats: EcosystemStats;
}

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  B: { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-300' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  D: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  E: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
};

// Couleurs pour le scatter plot basées sur la position relative aux médianes (CDC)
const getScatterColor = (
  cvss: number,
  cveCount: number,
  medianCvss: number,
  medianCve: number
): 'green' | 'yellow' | 'red' => {
  const cvssRatio = medianCvss > 0 ? cvss / medianCvss : 0;
  const cveRatio = medianCve > 0 ? cveCount / medianCve : 0;

  // Vert : CVSS < 0.75 × médiane ET CVE < 0.75 × médiane
  if (cvssRatio < 0.75 && cveRatio < 0.75) {
    return 'green';
  }
  // Rouge : CVSS > 1.25 × médiane ET CVE > 1.25 × médiane
  if (cvssRatio > 1.25 && cveRatio > 1.25) {
    return 'red';
  }
  // Jaune : Entre les deux
  return 'yellow';
};

const scatterColors = {
  green: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
  yellow: { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-gray-900' },
  red: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' }
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function EcosystemPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [entities, setEntities] = useState<EntityScanData[]>([]);
  const [stats, setStats] = useState<EcosystemStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'scatter' | 'grid'>('scatter');

  // Onglets et Rapports
  const [activeTab, setActiveTab] = useState<'ecosystem' | 'reports'>('ecosystem');
  const [ecosystemReports, setEcosystemReports] = useState<GeneratedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reportInitialScope, setReportInitialScope] = useState<'scan_ecosystem' | 'scan_individual'>('scan_ecosystem');

  // Charger les données depuis l'API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      try {
        const typeParam = filter !== 'all' ? `?entity_type=${filter}` : '';
        const response = await fetch(`${API_BASE}/api/v1/external-scanner/ecosystem${typeParam}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          setErrorCode(response.status);
          if (response.status === 403) {
            throw new Error('Permission SCANNER_READ requise');
          }
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data: EcosystemResponse = await response.json();
        setEntities(data.entities);
        setStats(data.stats);
      } catch (err) {
        console.error('Erreur chargement écosystème:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filter]);

  // Charger les rapports écosystème quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchEcosystemReports();
    }
  }, [activeTab]);

  // Fonction pour charger les rapports écosystème
  const fetchEcosystemReports = async () => {
    try {
      setLoadingReports(true);
      // Pas de scan_id = endpoint écosystème
      const response = await scanReportsApi.list({
        limit: 50
      });
      setEcosystemReports(response.items || []);
    } catch (err) {
      console.error('Erreur chargement rapports écosystème:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Callback après génération de rapport
  const handleReportGenerated = () => {
    setShowReportModal(false);
    // Rafraîchir la liste des rapports après un délai
    setTimeout(() => fetchEcosystemReports(), 2000);
  };

  // Filtrage local par grade
  const filteredEntities = useMemo(() => {
    if (gradeFilter === 'all') return entities;
    return entities.filter(e => e.grade === gradeFilter);
  }, [entities, gradeFilter]);

  // Stats filtrées localement
  const displayStats = useMemo(() => {
    if (!stats) return null;
    if (gradeFilter === 'all') return stats;

    // Recalculer les stats pour le filtre local
    const grades = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let totalVulns = 0;
    let totalGradeScore = 0;

    filteredEntities.forEach(e => {
      grades[e.grade]++;
      totalVulns += e.total_vulnerabilities;
      totalGradeScore += { A: 1, B: 2, C: 3, D: 4, E: 5 }[e.grade];
    });

    const avgScore = filteredEntities.length > 0 ? totalGradeScore / filteredEntities.length : 0;
    const avgGrade = avgScore < 1.5 ? 'A' : avgScore < 2.5 ? 'B' : avgScore < 3.5 ? 'C' : avgScore < 4.5 ? 'D' : 'E';

    return {
      ...stats,
      total_entities: filteredEntities.length,
      total_targets: filteredEntities.reduce((acc, e) => acc + e.targets_count, 0),
      total_vulnerabilities: totalVulns,
      average_grade: avgGrade,
      entities_by_grade: grades
    };
  }, [stats, filteredEntities, gradeFilter]);

  // Position dans le scatter plot (CVSS x Nb CVE)
  const getScatterPosition = (entity: EntityScanData) => {
    // X: CVSS (0-10) -> 0-100%
    const x = (entity.average_cvss / 10) * 100;
    // Y: Nb vulnérabilités (inversé pour que peu = haut)
    const maxVulns = Math.max(...entities.map(e => e.total_vulnerabilities), 50);
    const y = 100 - ((entity.total_vulnerabilities / maxVulns) * 100);
    return { x, y };
  };

  // Position des lignes médianes pour le rectangle
  const getMedianPositions = () => {
    if (!stats) return { x: 50, y: 50 };
    // X: Médiane CVSS (0-10) -> 0-100%
    const x = (stats.median_cvss / 10) * 100;
    // Y: Médiane CVE (inversé)
    const maxVulns = Math.max(...entities.map(e => e.total_vulnerabilities), 50);
    const y = 100 - ((stats.median_cve_count / maxVulns) * 100);
    return { x, y };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center client">
        <div className="text-center">
          <Radar className="w-12 h-12 text-cyan-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'écosystème...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center client">
        <ErrorDisplay
          type={errorCode === 403 ? 'forbidden' : getErrorTypeFromMessage(error)}
          customMessage={error}
          onRetry={() => window.location.reload()}
          showBack={true}
          showHome={true}
          permissionCode={errorCode === 403 ? 'SCANNER_READ' : extractPermissionCodeFromMessage(error)}
          actionName="Vue Écosystème Scanner"
        />
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="min-h-screen flex flex-col client" data-section="scanner">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Link href="/client/scanner" className="hover:text-cyan-600">Scanner</Link>
              <ChevronRight className="w-4 h-4 mx-1" />
              <span className="text-gray-900">Écosystème</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Layers className="w-8 h-8 mr-3 text-cyan-600" />
              Vue Écosystème
            </h1>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune donnée disponible</h2>
            <p className="text-gray-600 mb-6">
              Pour afficher la vue écosystème, vous devez d'abord créer des cibles associées à des organismes et lancer des scans.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/client/scanner/targets"
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Gérer les cibles
              </Link>
              <Link
                href="/client/ecosystem"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Voir les organismes
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const medianPos = getMedianPositions();

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
                <span className="text-gray-900">Écosystème</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Layers className="w-8 h-8 mr-3 text-cyan-600" />
                Vue Écosystème
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Cartographie de la surface d'attaque par organisme
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Toggle vue */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('scatter')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'scatter' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  Nuage de points
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4 inline mr-1" />
                  Grille
                </button>
              </div>

              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>

              {/* Menu Générer un rapport avec dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowReportMenu(!showReportMenu)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-cyan-200"
                >
                  <FileBarChart className="w-4 h-4" />
                  Générer un rapport
                  <ChevronDown className={`w-4 h-4 transition-transform ${showReportMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showReportMenu && (
                  <>
                    {/* Overlay pour fermer le menu */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowReportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <FileBarChart className="w-5 h-5 text-cyan-600" />
                          <span className="font-semibold text-gray-900">Générer un rapport</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Choisissez le type de rapport à générer</p>
                      </div>

                      <div className="p-2">
                        {/* Option Rapport Écosystème */}
                        <button
                          onClick={() => {
                            setShowReportMenu(false);
                            setReportInitialScope('scan_ecosystem');
                            setShowReportModal(true);
                          }}
                          className="w-full p-3 rounded-lg hover:bg-cyan-50 transition-colors text-left group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                              <Layers className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Rapport Écosystème</p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Vue globale de la sécurité de tous les organismes
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded">Comparatif</span>
                                <span className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded">Vulnérabilités</span>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Option Rapport Individuel Scan - Désactivé depuis cette vue */}
                        <div
                          className="w-full p-3 rounded-lg bg-gray-50 text-left mt-1 cursor-not-allowed opacity-60"
                          title="Pour générer un rapport individuel, accédez au détail d'un scan"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Scan className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-400">Rapport Scan Individuel</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Disponible depuis le détail d'un scan
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-400 rounded">CVE détaillées</span>
                                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-400 rounded">Recommandations</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 bg-gray-50 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                          {stats?.total_entities || 0} organisme{(stats?.total_entities || 0) > 1 ? 's' : ''} dans l'écosystème
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Link
                href="/client/scanner/action-plan"
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center shadow-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Générer Plan d'Action
              </Link>
            </div>
          </div>

          {/* Onglets */}
          <div className="border-t border-gray-200 mt-4">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('ecosystem')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'ecosystem'
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Layers className="w-4 h-4 inline mr-2" />
                Vue Écosystème
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                  activeTab === 'reports'
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileBarChart className="w-4 h-4 inline mr-2" />
                Rapports
                {ecosystemReports.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-cyan-100 text-cyan-700 rounded-full">
                    {ecosystemReports.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">

        {/* ============================================ */}
        {/* ONGLET RAPPORTS */}
        {/* ============================================ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Header Rapports */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Rapports Écosystème</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Consultez et téléchargez les rapports d'analyse de votre écosystème
                </p>
              </div>
              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center shadow-lg shadow-cyan-200"
              >
                <FileBarChart className="w-4 h-4 mr-2" />
                Générer un rapport
              </button>
            </div>

            {/* Stats Rapports */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{ecosystemReports.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">Finaux</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {ecosystemReports.filter(r => r.status === 'final').length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">Brouillons</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {ecosystemReports.filter(r => r.status === 'draft').length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">En cours</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {ecosystemReports.filter(r => ['pending', 'generating'].includes(r.status)).length}
                </p>
              </div>
            </div>

            {/* Liste des Rapports */}
            {loadingReports ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                <span className="ml-3 text-gray-600">Chargement des rapports...</span>
              </div>
            ) : ecosystemReports.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rapport écosystème</h3>
                <p className="text-gray-500 mb-6">
                  Générez votre premier rapport pour avoir une vue d'ensemble de la sécurité de votre écosystème.
                </p>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Générer un rapport
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ecosystemReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onRefresh={fetchEcosystemReports}
                    mode="scanner"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* ONGLET VUE ÉCOSYSTÈME */}
        {/* ============================================ */}
        {activeTab === 'ecosystem' && (
          <>
            {/* Filtres et Stats */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                {/* Filtre Type */}
                <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'internal' | 'external')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="all">Tous les types</option>
                <option value="internal">Internes</option>
                <option value="external">Externes</option>
              </select>
            </div>

            {/* Filtre Grade */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">Toutes les notes</option>
              <option value="A">Note A</option>
              <option value="B">Note B</option>
              <option value="C">Note C</option>
              <option value="D">Note D</option>
              <option value="E">Note E</option>
            </select>
          </div>

          {/* Stats rapides */}
          {displayStats && (
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{displayStats.total_entities}</p>
                <p className="text-xs text-gray-500">Organismes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{displayStats.total_targets}</p>
                <p className="text-xs text-gray-500">Cibles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{displayStats.total_vulnerabilities}</p>
                <p className="text-xs text-gray-500">Vulnérabilités</p>
              </div>
              <div className={`text-center px-4 py-2 rounded-lg ${gradeColors[displayStats.average_grade]?.bg || 'bg-gray-100'}`}>
                <p className={`text-2xl font-bold ${gradeColors[displayStats.average_grade]?.text || 'text-gray-700'}`}>
                  {displayStats.average_grade}
                </p>
                <p className="text-xs text-gray-500">Note moyenne</p>
              </div>
            </div>
          )}
        </div>

        {/* Vue Scatter Plot (Nuage de points) */}
        {viewMode === 'scatter' && stats && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-cyan-600" />
                Analyse de la sécurité de l'écosystème
              </h2>
              <div className="flex items-center text-sm text-gray-500">
                <Info className="w-4 h-4 mr-1" />
                Médiane CVSS: {stats.median_cvss.toFixed(1)} | Médiane CVE: {stats.median_cve_count.toFixed(0)}
              </div>
            </div>

            {/* Scatter Plot Container */}
            <div className="relative h-[500px] border border-gray-200 rounded-lg bg-gradient-to-br from-green-50/50 via-white to-red-50/50">
              {/* Axes labels */}
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 -rotate-90 text-sm text-gray-500 font-medium whitespace-nowrap">
                Nombre de CVEs ↑
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 text-sm text-gray-500 font-medium">
                Score CVSS moyen →
              </div>

              {/* Grid area */}
              <div className="absolute inset-4">
                {/* Lignes de grille */}
                {[25, 50, 75].map(pct => (
                  <React.Fragment key={pct}>
                    <div
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${pct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 border-l border-gray-100"
                      style={{ left: `${pct}%` }}
                    />
                  </React.Fragment>
                ))}

                {/* Rectangle médian en pointillés - zone 0.75x à 1.25x de la médiane */}
                {(() => {
                  const maxVulns = Math.max(...entities.map(e => e.total_vulnerabilities), 50);
                  // Calcul des limites du rectangle médian
                  // X: Position CVSS (0-10 → 0-100%)
                  const leftLimit = (stats.median_cvss * 0.75 / 10) * 100;
                  const rightLimit = Math.min((stats.median_cvss * 1.25 / 10) * 100, 100);
                  // Y: Position CVE (inversé car Y=0 est en haut)
                  const topLimit = 100 - Math.min((stats.median_cve_count * 1.25 / maxVulns) * 100, 100);
                  const bottomLimit = 100 - (stats.median_cve_count * 0.75 / maxVulns) * 100;

                  return (
                    <div
                      className="absolute border-2 border-dashed border-blue-400 bg-blue-50/20 pointer-events-none"
                      style={{
                        left: `${Math.max(0, leftLimit)}%`,
                        width: `${Math.min(rightLimit - leftLimit, 100 - leftLimit)}%`,
                        top: `${Math.max(0, topLimit)}%`,
                        height: `${Math.min(bottomLimit - topLimit, 100 - topLimit)}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded whitespace-nowrap">
                        Zone médiane
                      </div>
                    </div>
                  );
                })()}

                {/* Lignes médianes */}
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-400"
                  style={{ left: `${medianPos.x}%` }}
                />
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400"
                  style={{ top: `${medianPos.y}%` }}
                />

                {/* Zone labels */}
                <div className="absolute top-2 left-2 text-xs text-green-600 font-medium bg-green-100/80 px-2 py-1 rounded">
                  Sécurité avancée
                </div>
                <div className="absolute bottom-2 right-2 text-xs text-red-600 font-medium bg-red-100/80 px-2 py-1 rounded">
                  Sécurité basique
                </div>

                {/* Entities as dots */}
                {filteredEntities.map((entity) => {
                  const pos = getScatterPosition(entity);
                  const scatterColorKey = getScatterColor(
                    entity.average_cvss,
                    entity.total_vulnerabilities,
                    stats.median_cvss,
                    stats.median_cve_count
                  );
                  const colors = scatterColors[scatterColorKey];

                  return (
                    <Link
                      key={entity.entity_id}
                      href={`/client/ecosystem/entities/${entity.entity_id}`}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center transition-all hover:scale-150 hover:z-20 cursor-pointer shadow-md`}
                      >
                        <span className={`text-xs font-bold ${colors.text}`}>{entity.grade}</span>
                      </div>

                      {/* Tooltip au survol */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-4 py-3 whitespace-nowrap shadow-xl">
                          <p className="font-bold text-sm mb-1">{entity.entity_name}</p>
                          <div className="space-y-1 text-gray-300">
                            <p>Nombre de CVEs : <span className="text-white font-medium">{entity.total_vulnerabilities}</span></p>
                            <p>Score CVSS moyen : <span className="text-white font-medium">{entity.average_cvss.toFixed(1)}</span></p>
                            <p>Note : <span className={`font-bold ${
                              entity.grade === 'A' || entity.grade === 'B' ? 'text-green-400' :
                              entity.grade === 'C' ? 'text-yellow-400' : 'text-red-400'
                            }`}>{entity.grade}</span></p>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Axis values */}
              <div className="absolute bottom-1 left-4 text-xs text-gray-400">0</div>
              <div className="absolute bottom-1 left-1/4 text-xs text-gray-400">2.5</div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-400">5.0</div>
              <div className="absolute bottom-1 left-3/4 text-xs text-gray-400">7.5</div>
              <div className="absolute bottom-1 right-4 text-xs text-gray-400">10</div>
            </div>

            {/* Légende */}
            <div className="flex items-center justify-center space-x-8 mt-6">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-600"></div>
                <span className="text-sm text-gray-600">Sécurité avancée (&lt; 0.75× médiane)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>
                <span className="text-sm text-gray-600">Sécurité intermédiaire</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-600"></div>
                <span className="text-sm text-gray-600">Sécurité basique (&gt; 1.25× médiane)</span>
              </div>
            </div>
          </div>
        )}

        {/* Vue Grille des Organismes */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {filteredEntities.map((entity) => {
              const colors = gradeColors[entity.grade];
              return (
                <Link
                  key={entity.entity_id}
                  href={`/client/ecosystem/entities/${entity.entity_id}`}
                  className={`bg-white border-2 ${colors.border} rounded-xl p-5 hover:shadow-lg transition-all group`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        {entity.entity_type === 'internal' ? (
                          <Building2 className={`w-5 h-5 ${colors.text}`} />
                        ) : (
                          <Globe className={`w-5 h-5 ${colors.text}`} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">
                          {entity.entity_name}
                        </h3>
                        <p className="text-xs text-gray-500 capitalize">
                          {entity.entity_type === 'internal' ? 'Interne' : 'Externe'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center border-2 ${colors.border}`}>
                      <span className={`text-xl font-bold ${colors.text}`}>{entity.grade}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-900">{entity.average_cvss.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">CVSS moy.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-900">{entity.total_vulnerabilities}</p>
                      <p className="text-xs text-gray-500">Vulnérabilités</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex space-x-2">
                      {entity.critical_count > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">{entity.critical_count} CRIT</span>
                      )}
                      {entity.high_count > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">{entity.high_count} HIGH</span>
                      )}
                    </div>
                    <span className="text-gray-400">{formatDate(entity.last_scan_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Distribution par Note */}
        {displayStats && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-cyan-600" />
              Distribution par Note de Sécurité
            </h2>

            <div className="grid grid-cols-5 gap-4">
              {(['A', 'B', 'C', 'D', 'E'] as const).map((grade) => {
                const colors = gradeColors[grade];
                const count = displayStats.entities_by_grade[grade];
                const pct = displayStats.total_entities > 0 ? (count / displayStats.total_entities) * 100 : 0;

                return (
                  <div key={grade} className={`${colors.bg} ${colors.border} border-2 rounded-xl p-4 text-center`}>
                    <div className={`w-12 h-12 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center mx-auto mb-2`}>
                      <span className={`text-xl font-bold ${colors.text}`}>{grade}</span>
                    </div>
                    <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                    <p className="text-sm text-gray-600">organismes</p>
                    <div className="w-full bg-white rounded-full h-2 mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          grade === 'A' ? 'bg-green-500' :
                          grade === 'B' ? 'bg-lime-500' :
                          grade === 'C' ? 'bg-yellow-500' :
                          grade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{pct.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>

            {/* Légende des notes */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-gray-600">
              <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-2"></span>A (0-1.9) : Système sécurisé</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-lime-500 rounded mr-2"></span>B (2-3.9) : Plutôt sécurisé</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded mr-2"></span>C (4-5.9) : Sécurité satisfaisante</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-orange-500 rounded mr-2"></span>D (6-7.9) : Peu sécurisé</div>
              <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded mr-2"></span>E (8-10) : Non sécurisé</div>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Modal de génération de rapport */}
      <GenerateReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        mode="scanner"
        defaultScope={reportInitialScope}
        onReportGenerated={handleReportGenerated}
      />
    </div>
  );
}
