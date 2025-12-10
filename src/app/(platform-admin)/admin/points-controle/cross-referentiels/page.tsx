'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Network,
  ArrowLeft,
  RefreshCw,
  BookOpen,
  FileText,
  Database,
  TrendingUp,
  Target,
  Info,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Overview = {
  total_pcs: number;
  total_requirements: number;
  total_frameworks: number;
  total_mappings: number;
  cross_ref_pcs: number;
  cross_ref_percentage: number;
  deduplication_rate: number;
};

type MatrixCell = {
  percentage: number;
  shared_pcs: number;
  total_pcs: number;
};

type MatrixRow = {
  framework_code: string;
  framework_name: string;
  coverages: { [key: string]: MatrixCell | null };
};

type SharedPC = {
  id: string;
  code: string;
  name: string;
  description: string;
  criticality_level: string;
  estimated_effort_hours: number;
  nb_frameworks: number;
  frameworks: string;
  nb_requirements: number;
  requirements: Array<{
    framework_code: string;
    framework_name: string;
    requirement_code: string;
    requirement_title: string;
  }>;
};

type Statistics = {
  by_framework_count: { [key: string]: number };
  top_reused_pcs: Array<{
    code: string;
    name: string;
    nb_frameworks: number;
    nb_requirements: number;
    frameworks: string;
  }>;
  economy: {
    total_requirements: number;
    total_pcs: number;
    pcs_saved: number;
    saving_percentage: number;
  };
};

type Framework = {
  id: string;
  code: string;
  name: string;
};

export default function CrossReferentielsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview>({
    total_pcs: 0,
    total_requirements: 0,
    total_frameworks: 0,
    total_mappings: 0,
    cross_ref_pcs: 0,
    cross_ref_percentage: 0,
    deduplication_rate: 0
  });
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [sharedPCs, setSharedPCs] = useState<SharedPC[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    by_framework_count: {},
    top_reused_pcs: [],
    economy: {
      total_requirements: 0,
      total_pcs: 0,
      pcs_saved: 0,
      saving_percentage: 0
    }
  });
  const [frameworksList, setFrameworksList] = useState<Framework[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedSourceFw, setSelectedSourceFw] = useState<string>('all');
  const [selectedTargetFw, setSelectedTargetFw] = useState<string>('all');
  const [expandedSection, setExpandedSection] = useState<string>('overview');
  const [expandedPCs, setExpandedPCs] = useState<Set<string>>(new Set());

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleExport = async () => {
    try {
      const response = await fetch(`${API}/api/v1/cross-referentials/export`);
      if (!response.ok) throw new Error('Erreur lors de l\'export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cross_referentiels_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export Excel');
    }
  };

  const handleLaunchMapping = () => {
    // Rediriger vers la page de validation de mapping
    router.push('/admin/points-controle/mapping-validation');
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch overview
      const overviewRes = await fetch(`${API}/api/v1/cross-referentials/overview`);
      const overviewData = await overviewRes.json();
      setOverview(overviewData);

      // Fetch coverage matrix
      const matrixRes = await fetch(`${API}/api/v1/cross-referentials/coverage-matrix`);
      const matrixData = await matrixRes.json();
      setMatrix(matrixData.matrix || []);
      setFrameworks(matrixData.frameworks || []);

      // Fetch statistics
      const statsRes = await fetch(`${API}/api/v1/cross-referentials/statistics`);
      const statsData = await statsRes.json();
      setStatistics(statsData);

      // Fetch frameworks for filters
      const fwRes = await fetch(`${API}/api/v1/cross-referentials/frameworks`);
      const fwData = await fwRes.json();
      setFrameworksList(fwData.frameworks || []);

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedPCs = async () => {
    try {
      let url = `${API}/api/v1/cross-referentials/shared-control-points?`;
      if (selectedSourceFw && selectedSourceFw !== 'all') url += `source_framework_id=${selectedSourceFw}&`;
      if (selectedTargetFw && selectedTargetFw !== 'all') url += `target_framework_id=${selectedTargetFw}&`;

      const res = await fetch(url);
      const data = await res.json();
      setSharedPCs(data.shared_control_points || []);
    } catch (error) {
      console.error('Erreur:', error);
      setSharedPCs([]);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (expandedSection === 'shared-pcs') {
      fetchSharedPCs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSourceFw, selectedTargetFw, expandedSection]);

  const togglePCExpansion = (pcId: string) => {
    setExpandedPCs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pcId)) {
        newSet.delete(pcId);
      } else {
        newSet.add(pcId);
      }
      return newSet;
    });
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getCoverageIcon = (percentage: number) => {
    if (percentage >= 15) return '✅';
    if (percentage >= 5) return '⚠️';
    return '❌';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-muted-foreground">Chargement des cross-référentiels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Button
                onClick={() => router.push('/admin/points-controle')}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 -ml-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex-shrink-0">
                <Network className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Cross-Référentiels
                </h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Points de contrôle partagés entre référentiels
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button onClick={fetchAllData} variant="outline" size="sm" className="flex-shrink-0">
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
              <Button
                onClick={handleLaunchMapping}
                variant="outline"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
              >
                <Sparkles className="w-4 h-4 sm:mr-2" />
                <span className="hidden md:inline">Lancer le mapping IA</span>
                <span className="hidden sm:inline md:hidden">Mapping</span>
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Info Card */}
        <Card className="mb-4 sm:mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                <Info className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">
                  Analyse Cross-Référentielle - Points de Contrôle Partagés
                </h3>
                <p className="text-xs sm:text-sm text-blue-800 line-clamp-3 sm:line-clamp-none">
                  Cette page analyse les points de contrôle (PCs) partagés entre plusieurs référentiels.
                  Un PC cross-référentiel répond à plusieurs exigences de différents frameworks,
                  permettant ainsi de mutualiser les efforts d'audit et d'optimiser la conformité.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 1. VUE D'ENSEMBLE */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 p-4 sm:p-6"
            onClick={() => setExpandedSection(expandedSection === 'overview' ? '' : 'overview')}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Vue d'Ensemble</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1 truncate">Statistiques globales des cross-référentiels</CardDescription>
              </div>
              {expandedSection === 'overview' ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              )}
            </div>
          </CardHeader>
          {expandedSection === 'overview' && (
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                <Card>
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 truncate">Total PCs</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{overview.total_pcs}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 truncate">PCs Cross-Réf.</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{overview.cross_ref_pcs}</p>
                      <p className="text-[10px] sm:text-xs text-green-600 mt-0.5 sm:mt-1">
                        {overview.cross_ref_percentage.toFixed(1)}% du total
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 truncate">Taux Dédup.</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">
                        {overview.deduplication_rate.toFixed(1)}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">Économie de PCs</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 truncate">Référentiels</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">{overview.total_frameworks}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {overview.total_requirements} <span className="hidden sm:inline">exigences</span><span className="sm:hidden">exig.</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 2. MATRICE DE COUVERTURE */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 p-4 sm:p-6"
            onClick={() => setExpandedSection(expandedSection === 'matrix' ? '' : 'matrix')}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Network className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                  <span className="truncate">Matrice de Correspondance</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1 truncate">PCs partagés entre chaque paire de frameworks</CardDescription>
              </div>
              {expandedSection === 'matrix' ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              )}
            </div>
          </CardHeader>
          {expandedSection === 'matrix' && (
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {matrix.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-muted-foreground">
                  <Database className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base">Aucune donnée de matrice disponible</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[600px] px-4 sm:px-0">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr>
                          <th className="border p-2 sm:p-3 bg-slate-100 text-left font-semibold sticky left-0 z-10">Framework</th>
                          {frameworks.map(fw => (
                            <th key={fw} className="border p-2 sm:p-3 bg-slate-100 text-center font-semibold">
                              {fw}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrix.map((row) => (
                          <tr key={row.framework_code}>
                            <td className="border p-2 sm:p-3 bg-slate-50 font-semibold sticky left-0 z-10">{row.framework_code}</td>
                            {frameworks.map(fw => {
                              const coverage = row.coverages[fw];
                              if (coverage === null) {
                                return (
                                  <td key={fw} className="border p-2 sm:p-3 bg-gray-200 text-center text-gray-500">
                                    —
                                  </td>
                                );
                              }
                              const pct = coverage.percentage;
                              return (
                                <td
                                  key={fw}
                                  className="border p-2 sm:p-3 text-center cursor-pointer hover:bg-slate-100"
                                  style={{
                                    backgroundColor: pct >= 15 ? '#dcfce7' :
                                                     pct >= 10 ? '#dbeafe' :
                                                     pct >= 5 ? '#fed7aa' :
                                                     '#fecaca',
                                    fontWeight: 600
                                  }}
                                  title={`${coverage.shared_pcs} PCs partagés sur ${coverage.total_pcs}`}
                                >
                                  <span className="hidden sm:inline">{getCoverageIcon(pct)} </span>{pct}%
                                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                                    {coverage.shared_pcs} <span className="hidden sm:inline">PCs</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* 3. PCS PARTAGÉS DÉTAILLÉS */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 p-4 sm:p-6"
            onClick={() => setExpandedSection(expandedSection === 'shared-pcs' ? '' : 'shared-pcs')}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <span className="truncate">Points de Contrôle Partagés</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1 truncate">Détails des PCs cross-référentiels avec exigences liées</CardDescription>
              </div>
              {expandedSection === 'shared-pcs' ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              )}
            </div>
          </CardHeader>
          {expandedSection === 'shared-pcs' && (
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {/* Filtres */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Référentiel Source</label>
                  <Select value={selectedSourceFw} onValueChange={setSelectedSourceFw}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {frameworksList.map(fw => (
                        <SelectItem key={fw.id} value={fw.id}>{fw.code} - {fw.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-0">
                  <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Référentiel Cible</label>
                  <Select value={selectedTargetFw} onValueChange={setSelectedTargetFw}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {frameworksList.map(fw => (
                        <SelectItem key={fw.id} value={fw.id}>{fw.code} - {fw.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Liste des PCs partagés */}
              {sharedPCs.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base">Aucun PC partagé trouvé avec ces filtres</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {sharedPCs.map((pc) => (
                    <Card key={pc.id} className="border-l-4 border-l-blue-500">
                      <CardHeader
                        className="cursor-pointer hover:bg-slate-50 p-3 sm:p-4 md:p-6"
                        onClick={() => togglePCExpansion(pc.id)}
                      >
                        <div className="flex items-start sm:items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-1.5 sm:mb-2">
                              <span className="font-mono text-xs sm:text-sm font-bold text-blue-600">
                                {pc.code}
                              </span>
                              <Badge className={`${getCriticalityColor(pc.criticality_level)} border text-[10px] sm:text-xs`}>
                                {pc.criticality_level || 'N/A'}
                              </Badge>
                              <Badge className="bg-purple-600 text-[10px] sm:text-xs">
                                <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                {pc.nb_frameworks} <span className="hidden sm:inline">frameworks</span><span className="sm:hidden">fw</span>
                              </Badge>
                              <Badge className="bg-green-600 text-[10px] sm:text-xs">
                                <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                {pc.nb_requirements} <span className="hidden sm:inline">exigences</span><span className="sm:hidden">exig.</span>
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 sm:line-clamp-1">{pc.name}</h4>
                            {pc.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
                                {pc.description}
                              </p>
                            )}
                          </div>
                          {expandedPCs.has(pc.id) ? (
                            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </CardHeader>

                      {expandedPCs.has(pc.id) && (
                        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                          <h5 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                            Exigences couvertes ({pc.nb_requirements})
                          </h5>
                          <div className="space-y-2">
                            {pc.requirements.map((req, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 rounded-lg border"
                              >
                                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs self-start">
                                  {req.framework_code}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-xs sm:text-sm text-blue-600">
                                    {req.requirement_code}
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1 line-clamp-2">
                                    {req.requirement_title}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Économie */}
                          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                              <span className="font-semibold text-sm sm:text-base">
                                Économie : {pc.nb_requirements - 1} PC(s) évité(s)
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-green-600 mt-1 ml-6 sm:ml-7">
                              Grâce à la mutualisation, un seul PC répond à {pc.nb_requirements} exigences.
                            </p>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* 4. STATISTIQUES */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 p-4 sm:p-6"
            onClick={() => setExpandedSection(expandedSection === 'stats' ? '' : 'stats')}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                  <span className="truncate">Statistiques et Analyses</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1 truncate">Données détaillées sur la réutilisation des PCs</CardDescription>
              </div>
              {expandedSection === 'stats' ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
              )}
            </div>
          </CardHeader>
          {expandedSection === 'stats' && (
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {/* Économie globale */}
              <div className="mb-6 sm:mb-8">
                <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Économie Réalisée</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <p className="text-xs sm:text-sm text-blue-600 mb-1 sm:mb-2">Total Exigences</p>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-700">
                        {statistics.economy.total_requirements}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <p className="text-xs sm:text-sm text-green-600 mb-1 sm:mb-2">Total PCs Créés</p>
                      <p className="text-2xl sm:text-3xl font-bold text-green-700">
                        {statistics.economy.total_pcs}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <p className="text-xs sm:text-sm text-purple-600 mb-1 sm:mb-2">PCs Évités</p>
                      <p className="text-2xl sm:text-3xl font-bold text-purple-700">
                        {statistics.economy.pcs_saved}
                      </p>
                      <p className="text-[10px] sm:text-xs text-purple-600 mt-0.5 sm:mt-1">
                        ({statistics.economy.saving_percentage}% d'économie)
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Top PCs réutilisés */}
              <div className="mb-6 sm:mb-8">
                <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Top 10 PCs les Plus Réutilisés</h3>

                {/* Version mobile : cards */}
                <div className="sm:hidden space-y-3">
                  {statistics.top_reused_pcs.map((pc, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-semibold text-blue-600">{pc.code}</span>
                        <div className="flex gap-1">
                          <Badge className="bg-purple-600 text-[10px]">{pc.nb_frameworks} fw</Badge>
                          <Badge className="bg-green-600 text-[10px]">{pc.nb_requirements} exig.</Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{pc.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{pc.frameworks}</p>
                    </Card>
                  ))}
                </div>

                {/* Version desktop : table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm">Code PC</TableHead>
                        <TableHead className="text-xs md:text-sm">Nom</TableHead>
                        <TableHead className="text-xs md:text-sm">Frameworks</TableHead>
                        <TableHead className="text-xs md:text-sm">Exigences</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.top_reused_pcs.map((pc, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs md:text-sm font-semibold text-blue-600">
                            {pc.code}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm max-w-[200px] truncate">{pc.name}</TableCell>
                          <TableCell>
                            <Badge className="bg-purple-600 text-[10px] md:text-xs">
                              {pc.nb_frameworks} <span className="hidden md:inline">frameworks</span><span className="md:hidden">fw</span>
                            </Badge>
                            <div className="text-[10px] md:text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                              {pc.frameworks}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600 text-[10px] md:text-xs">
                              {pc.nb_requirements} <span className="hidden md:inline">exigences</span><span className="md:hidden">exig.</span>
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Distribution */}
              <div>
                <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Distribution des PCs par Nombre de Frameworks</h3>
                <div className="space-y-2 sm:space-y-3">
                  {Object.entries(statistics.by_framework_count)
                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                    .map(([nb_fw, count]) => (
                      <div key={nb_fw} className="flex items-center gap-2 sm:gap-4">
                        <div className="w-20 sm:w-32 text-xs sm:text-sm font-medium flex-shrink-0">
                          {nb_fw} <span className="hidden sm:inline">framework</span><span className="sm:hidden">fw</span>{parseInt(nb_fw) > 1 ? 's' : ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 sm:h-4">
                              <div
                                className="bg-blue-600 h-3 sm:h-4 rounded-full flex items-center justify-end pr-1 sm:pr-2"
                                style={{
                                  width: `${Math.max((count / overview.total_pcs * 100), 5)}%`
                                }}
                              >
                                {count > 0 && (
                                  <span className="text-[9px] sm:text-xs text-white font-semibold">
                                    {count}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-sm text-muted-foreground w-12 sm:w-20 text-right flex-shrink-0">
                              {((count / overview.total_pcs * 100) || 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
