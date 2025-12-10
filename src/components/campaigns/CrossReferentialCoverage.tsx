"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp } from 'lucide-react';

interface FrameworkCoverage {
  framework_code: string;
  framework_name: string;
  requirements_covered: number;
  total_requirements: number;
  coverage_percentage: number;
}

interface CrossReferentialData {
  campaign_id: string;
  campaign_title: string;
  base_framework_code: string | null;
  base_framework_name: string | null;
  total_requirements_in_campaign: number;
  total_control_points: number;
  frameworks_coverage: FrameworkCoverage[];
}

interface CrossReferentialCoverageProps {
  campaignId: string;
}

export function CrossReferentialCoverage({ campaignId }: CrossReferentialCoverageProps) {
  const [data, setData] = useState<CrossReferentialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoverage() {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(
          `/api/v1/campaigns/${campaignId}/cross-referential-coverage`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Erreur lors du chargement de la couverture');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching cross-referential coverage:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }

    if (campaignId) {
      fetchCoverage();
    }
  }, [campaignId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || 'Impossible de charger les données'}</AlertDescription>
      </Alert>
    );
  }

  // Si aucune couverture cross-référentielle
  if (data.frameworks_coverage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Couverture Cross-Référentielle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Aucune couverture cross-référentielle détectée pour cette campagne.
              {data.total_control_points === 0 && " Aucun Control Point n'est lié aux questions de cette campagne."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Helper pour déterminer la couleur du badge selon le pourcentage
  const getBadgeVariant = (percentage: number): "default" | "secondary" | "outline" => {
    if (percentage >= 15) return "default";
    if (percentage >= 10) return "secondary";
    return "outline";
  };

  // Helper pour déterminer la couleur de la barre de progression
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 15) return "bg-green-500";
    if (percentage >= 10) return "bg-blue-500";
    if (percentage >= 5) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* En-tête et statistiques globales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Couverture Cross-Référentielle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Framework de base</p>
              <p className="text-lg font-semibold">
                {data.base_framework_name || 'N/A'}
              </p>
              {data.base_framework_code && (
                <Badge variant="secondary" className="mt-1">{data.base_framework_code}</Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Requirements dans le questionnaire</p>
              <p className="text-lg font-semibold">
                {data.total_requirements_in_campaign}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Sous-ensemble du framework complet
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Control Points liés</p>
              <p className="text-lg font-semibold">
                {data.total_control_points}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Points de contrôle partagés
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Couverture par framework */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Couverture indirecte des autres référentiels ({data.frameworks_coverage.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.frameworks_coverage.map((fw) => (
            <Card key={fw.framework_code} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="font-medium">{fw.framework_name}</span>
                  <Badge
                    variant={getBadgeVariant(fw.coverage_percentage)}
                    className="ml-2"
                  >
                    {fw.coverage_percentage}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Barre de progression */}
                <div className="relative">
                  <Progress
                    value={fw.coverage_percentage}
                    className="h-3"
                  />
                  <div
                    className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(fw.coverage_percentage)}`}
                    style={{ width: `${Math.min(fw.coverage_percentage, 100)}%` }}
                  />
                </div>

                {/* Statistiques */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <span className="font-semibold text-gray-900">
                      {fw.requirements_covered}
                    </span>
                    {' / '}
                    {fw.total_requirements}
                  </span>
                  <span className="text-gray-500">
                    requirements couverts
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Note explicative */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>💡 Comment est calculée la couverture ?</strong>
          <br />
          Cette campagne est basée sur {data.total_requirements_in_campaign} requirements
          de {data.base_framework_name}. Grâce aux {data.total_control_points} Control Points
          partagés, vous couvrez indirectement des requirements d'autres référentiels sans effort supplémentaire.
        </AlertDescription>
      </Alert>
    </div>
  );
}
