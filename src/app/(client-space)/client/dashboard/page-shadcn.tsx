'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  FolderPlus,
  LayoutDashboard,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ClientDashboardStats {
  ecosystem: {
    totalEntities: number;
    activeMembers: number;
    pendingApprovals: number;
    inactiveEntities: number;
  };
  evaluations: {
    ongoing: number;
    completed: number;
    scheduled: number;
    overdue: number;
  };
  actions: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  complianceScore: number;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClientDashboardStats>({
    ecosystem: { totalEntities: 0, activeMembers: 0, pendingApprovals: 0, inactiveEntities: 0 },
    evaluations: { ongoing: 0, completed: 0, scheduled: 0, overdue: 0 },
    actions: { total: 0, completed: 0, inProgress: 0, overdue: 0 },
    complianceScore: 0
  });

  const fetchClientStats = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats({
        ecosystem: { totalEntities: 47, activeMembers: 156, pendingApprovals: 8, inactiveEntities: 3 },
        evaluations: { ongoing: 5, completed: 23, scheduled: 7, overdue: 2 },
        actions: { total: 89, completed: 67, inProgress: 15, overdue: 7 },
        complianceScore: 78
      });
    } catch (error) {
      console.error('Erreur chargement stats client:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientStats();
  }, []);

  // Composant StatCard avec Shadcn Card
  const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color = 'blue',
    trend = null
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: 'blue' | 'green' | 'orange' | 'red';
    trend?: { value: number; isPositive: boolean } | null;
  }) => {
    const iconColorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600'
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
              {trend && (
                <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
                  {trend.value}% ce mois
                </div>
              )}
            </div>
            <div className={`p-3 rounded-lg ${iconColorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Dashboard Écosystème</h1>
              <p className="text-muted-foreground">
                Vue d'ensemble de votre organisation et conformité cybersécurité
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/client/administration/new-pole')}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
            >
              <Layers className="w-4 h-4" />
              Nouveau pôle
            </Button>

            <Button
              onClick={() => router.push('/client/administration/new-category')}
              variant="outline"
            >
              <FolderPlus className="w-4 h-4" />
              Nouvelle catégorie
            </Button>

            <Button
              onClick={() => router.push('/client/administration/new-organism')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Building2 className="w-4 h-4" />
              Nouvel organisme
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards - Migré vers Shadcn Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Building2}
          title="Écosystème"
          value={stats.ecosystem.totalEntities}
          subtitle={`${stats.ecosystem.activeMembers} membres actifs`}
          trend={{ value: 8, isPositive: true }}
          color="blue"
        />

        <StatCard
          icon={Target}
          title="Évaluations"
          value={stats.evaluations.ongoing}
          subtitle={`${stats.evaluations.completed} terminées • ${stats.evaluations.scheduled} planifiées`}
          color="green"
        />

        <StatCard
          icon={CheckCircle}
          title="Actions"
          value={`${stats.actions.completed}/${stats.actions.total}`}
          subtitle={`${stats.actions.inProgress} en cours`}
          trend={{ value: 12, isPositive: true }}
          color="orange"
        />

        <StatCard
          icon={AlertTriangle}
          title="En Attente"
          value={stats.ecosystem.pendingApprovals + stats.actions.overdue}
          subtitle={`${stats.ecosystem.pendingApprovals} approbations • ${stats.actions.overdue} actions`}
          color="red"
        />
      </div>

      {/* Vue Écosystème Interactive - Migré vers Shadcn Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Vue Écosystème
            </CardTitle>
            <CardDescription>Organisation de vos pôles et entités</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div>
                <p className="font-medium">Pôle IT</p>
                <p className="text-sm text-muted-foreground">12 services • 89 membres</p>
              </div>
              <Badge className="bg-green-600">Actif</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
              <div>
                <p className="font-medium">Pôle RH</p>
                <p className="text-sm text-muted-foreground">8 services • 35 membres</p>
              </div>
              <Badge className="bg-green-600">Actif</Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div>
                <p className="font-medium">Clients Externes</p>
                <p className="text-sm text-muted-foreground">23 organisations • 32 membres</p>
              </div>
              <Badge className="bg-yellow-600">8 en attente</Badge>
            </div>

            <Separator className="my-4" />

            <Button
              onClick={() => router.push('/client/administration')}
              className="w-full"
              variant="default"
            >
              Voir l'écosystème complet
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activité Récente
            </CardTitle>
            <CardDescription>Dernières actions dans votre organisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Service Marketing validé</p>
                <p className="text-xs text-muted-foreground">il y a 2 heures</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">ACME Corp en attente de validation</p>
                <p className="text-xs text-muted-foreground">hier</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Évaluation ISO 27001 terminée</p>
                <p className="text-xs text-muted-foreground">il y a 3 jours</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">15 actions correctives closes</p>
                <p className="text-xs text-muted-foreground">il y a 1 semaine</p>
              </div>
            </div>

            <Separator className="my-4" />

            <Button
              onClick={() => router.push('/client/actions')}
              variant="outline"
              className="w-full"
            >
              Voir toutes les activités
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Actions Rapides - Migré vers Shadcn Card & Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            Actions Rapides
          </CardTitle>
          <CardDescription>Créez rapidement de nouveaux éléments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Button
              onClick={() => router.push('/client/administration/new-pole')}
              variant="outline"
              className="h-auto p-6 flex-col border-dashed hover:border-green-500 hover:bg-green-50"
            >
              <Layers className="w-8 h-8 mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Nouveau Pôle</span>
            </Button>

            <Button
              onClick={() => router.push('/client/administration/new-organism')}
              variant="outline"
              className="h-auto p-6 flex-col border-dashed hover:border-blue-500 hover:bg-blue-50"
            >
              <Building2 className="w-8 h-8 mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Ajouter Organisme</span>
            </Button>

            <Button
              onClick={() => router.push('/client/evaluation')}
              variant="outline"
              className="h-auto p-6 flex-col border-dashed hover:border-green-500 hover:bg-green-50"
            >
              <Target className="w-8 h-8 mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Nouvelle Évaluation</span>
            </Button>

            <Button
              onClick={() => router.push('/client/administration/members')}
              variant="outline"
              className="h-auto p-6 flex-col border-dashed hover:border-purple-500 hover:bg-purple-50"
            >
              <Users className="w-8 h-8 mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Gérer Membres</span>
            </Button>

            <Button
              onClick={() => router.push('/client/actions')}
              variant="outline"
              className="h-auto p-6 flex-col border-dashed hover:border-orange-500 hover:bg-orange-50"
            >
              <CheckCircle className="w-8 h-8 mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">Suivi Actions</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
