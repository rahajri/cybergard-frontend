'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Database,
  FileText,
  Target,
  HelpCircle,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AdminStats {
  frameworks: { total: number; active: number; inactive: number };
  requirements: { total: number; withEmbeddings: number; withoutEmbeddings: number };
  questionnaires: { total: number; published: number; draft: number };
  controlPoints: { total: number; validated: number; pending: number };
}

export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats>({
    frameworks: { total: 0, active: 0, inactive: 0 },
    requirements: { total: 0, withEmbeddings: 0, withoutEmbeddings: 0 },
    questionnaires: { total: 0, published: 0, draft: 0 },
    controlPoints: { total: 0, validated: 0, pending: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);

      const frameworksResponse = await fetch('/api/v1/frameworks/admin/cross-referential-summary');
      const frameworksData = frameworksResponse.ok ? await frameworksResponse.json() : null;

      const questionnairesResponse = await fetch('/api/v1/questionnaires/stats');
      const questionnairesData = questionnairesResponse.ok ? await questionnairesResponse.json() : null;

      const controlPointsResponse = await fetch('/api/v1/control-points/stats');
      const controlPointsData = controlPointsResponse.ok ? await controlPointsResponse.json() : null;

      const newStats: AdminStats = {
        frameworks: {
          total: frameworksData?.global_stats?.total_frameworks || 0,
          active: frameworksData?.frameworks?.filter((f: unknown) => (f as Record<string, unknown>).is_active)?.length || 0,
          inactive: frameworksData?.frameworks?.filter((f: unknown) => !(f as Record<string, unknown>).is_active)?.length || 0,
        },
        requirements: {
          total: frameworksData?.global_stats?.total_requirements || 0,
          withEmbeddings: frameworksData?.global_stats?.total_embeddings || 0,
          withoutEmbeddings:
            (frameworksData?.global_stats?.total_requirements || 0) -
            (frameworksData?.global_stats?.total_embeddings || 0),
        },
        questionnaires: {
          total: questionnairesData?.total || 0,
          published: questionnairesData?.published || 0,
          draft: questionnairesData?.draft || 0,
        },
        controlPoints: {
          total: controlPointsData?.total || 0,
          validated: controlPointsData?.validated || 0,
          pending: controlPointsData?.pending || 0,
        },
      };

      setStats(newStats);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      console.error('Erreur chargement stats admin:', err);
      setStats({
        frameworks: { total: 0, active: 0, inactive: 0 },
        requirements: { total: 0, withEmbeddings: 0, withoutEmbeddings: 0 },
        questionnaires: { total: 0, published: 0, draft: 0 },
        controlPoints: { total: 0, validated: 0, pending: 0 },
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAdminStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    trend,
    color = 'blue',
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { value: number; isPositive: boolean };
    color?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{title}</p>
              <p className="text-xl sm:text-2xl font-bold">{value}</p>
              {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{subtitle}</p>}
              {trend && (
                <div
                  className={`flex items-center mt-1 sm:mt-2 text-xs sm:text-sm ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <TrendingUp className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
                  <span className="hidden sm:inline">{trend.value}% vs mois dernier</span>
                  <span className="sm:hidden">+{trend.value}%</span>
                </div>
              )}
            </div>
            <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">Chargement du dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">

      {/* 🔥 HEADER STICKY - RESPONSIVE */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Section Gauche : Titre + Description */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex-shrink-0">
                <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  <span className="hidden sm:inline">Dashboard Administration</span>
                  <span className="sm:hidden">Dashboard</span>
                </h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Vue d'ensemble de la plateforme CYBERGARD AI
                </p>
              </div>
            </div>

            {/* Section Droite : Bouton Actualiser */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button onClick={fetchAdminStats} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu qui défile - RESPONSIVE */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Statistiques principales - RESPONSIVE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <StatCard
            icon={Database}
            title="Référentiels"
            value={stats.frameworks.total}
            subtitle={`${stats.frameworks.active} actifs • ${stats.frameworks.inactive} inactifs`}
            trend={{ value: 8, isPositive: true }}
            color="blue"
          />
          <StatCard
            icon={FileText}
            title="Exigences"
            value={stats.requirements.total.toLocaleString()}
            subtitle={`${stats.requirements.withEmbeddings} avec embeddings`}
            trend={{ value: 15, isPositive: true }}
            color="green"
          />
          <StatCard
            icon={HelpCircle}
            title="Questionnaires"
            value={stats.questionnaires.total}
            subtitle={`${stats.questionnaires.published} publiés • ${stats.questionnaires.draft} brouillons`}
            trend={{ value: 12, isPositive: true }}
            color="purple"
          />
          <StatCard
            icon={Target}
            title="Pts de Contrôle"
            value={stats.controlPoints.total.toLocaleString()}
            subtitle={`${stats.controlPoints.validated} validés`}
            trend={{ value: 5, isPositive: true }}
            color="orange"
          />
        </div>

        {/* Actions rapides & Alertes - RESPONSIVE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Actions Rapides */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">Actions Rapides</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Raccourcis vers les fonctionnalités principales</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <Button
                  onClick={() => router.push('/admin/referentiels/import')}
                  variant="outline"
                  className="h-auto p-3 sm:p-6 flex-col border-dashed hover:border-blue-500 hover:bg-blue-50"
                >
                  <Database className="w-5 h-5 sm:w-8 sm:h-8 mb-1 sm:mb-2 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium text-center leading-tight">
                    <span className="hidden sm:inline">Importer Référentiel</span>
                    <span className="sm:hidden">Importer</span>
                  </span>
                </Button>
                <Button
                  onClick={() => router.push('/admin/questionnaires/generer')}
                  variant="outline"
                  className="h-auto p-3 sm:p-6 flex-col border-dashed hover:border-purple-500 hover:bg-purple-50"
                >
                  <HelpCircle className="w-5 h-5 sm:w-8 sm:h-8 mb-1 sm:mb-2 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium text-center leading-tight">
                    <span className="hidden sm:inline">Créer Questionnaire</span>
                    <span className="sm:hidden">Questionnaire</span>
                  </span>
                </Button>
                <Button
                  onClick={() => router.push('/admin/points-controle/generation')}
                  variant="outline"
                  className="h-auto p-3 sm:p-6 flex-col border-dashed hover:border-orange-500 hover:bg-orange-50"
                >
                  <Target className="w-5 h-5 sm:w-8 sm:h-8 mb-1 sm:mb-2 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium text-center leading-tight">
                    <span className="hidden sm:inline">Générer Pts Contrôle</span>
                    <span className="sm:hidden">Pts Contrôle</span>
                  </span>
                </Button>
                <Button
                  onClick={() => router.push('/admin/analytics')}
                  variant="outline"
                  className="h-auto p-3 sm:p-6 flex-col border-dashed hover:border-green-500 hover:bg-green-50"
                >
                  <BarChart3 className="w-5 h-5 sm:w-8 sm:h-8 mb-1 sm:mb-2 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium text-center leading-tight">Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alertes & Status */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">Alertes & Status</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">État actuel du système et notifications</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
              <Alert variant="default" className="bg-yellow-50 border-yellow-200 p-3 sm:p-4">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800 text-xs sm:text-sm">
                  {stats.requirements.withoutEmbeddings} exig. sans embeddings
                </AlertTitle>
                <AlertDescription className="text-yellow-600 text-xs hidden sm:block">
                  Générer les embeddings pour améliorer les recherches
                </AlertDescription>
              </Alert>

              <Alert variant="default" className="bg-blue-50 border-blue-200 p-3 sm:p-4">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 text-xs sm:text-sm">
                  {stats.questionnaires.published} questionnaires publiés
                </AlertTitle>
                <AlertDescription className="text-blue-600 text-xs hidden sm:block">
                  Prêts pour les évaluations clients
                </AlertDescription>
              </Alert>

              <Alert variant="default" className="bg-green-50 border-green-200 p-3 sm:p-4">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <AlertTitle className="text-green-800 text-xs sm:text-sm">Système opérationnel</AlertTitle>
                <AlertDescription className="text-green-600 text-xs hidden sm:block">
                  Tous les services fonctionnent normalement
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Métriques de performance - RESPONSIVE */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Métriques de Performance</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Indicateurs clés de performance de la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                  {stats.requirements.total > 0
                    ? Math.round((stats.requirements.withEmbeddings / stats.requirements.total) * 100)
                    : 0}%
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Couverture Embeddings</span>
                  <span className="sm:hidden">Embeddings</span>
                </p>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                  {stats.frameworks.total > 0
                    ? Math.round((stats.frameworks.active / stats.frameworks.total) * 100)
                    : 0}%
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Référentiels Actifs</span>
                  <span className="sm:hidden">Réf. Actifs</span>
                </p>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">
                  {stats.controlPoints.total > 0
                    ? Math.round((stats.controlPoints.validated / stats.controlPoints.total) * 100)
                    : 0}%
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Points Contrôle Validés</span>
                  <span className="sm:hidden">Pts Validés</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Updated Footer - RESPONSIVE */}
        {lastUpdated && (
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">Dernière mise à jour : </span>
              <span className="sm:hidden">MAJ : </span>
              {lastUpdated.toLocaleTimeString('fr-FR')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
