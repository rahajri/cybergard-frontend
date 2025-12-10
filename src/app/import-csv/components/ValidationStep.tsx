// frontend/components/ControlPointGeneration/ValidationStep.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface CoverageStats {
  total_requirements: number;
  covered_requirements: number;
  orphan_requirements: number;
  coverage_percentage: number;
  total_control_points: number;
}

export function ValidationStep({ frameworkId }: { frameworkId: string }) {
  const [coverage, setCoverage] = useState<CoverageStats | null>(null);
  const [isGeneratingOrphans, setIsGeneratingOrphans] = useState(false);

  useEffect(() => {
    fetchCoverage();
  }, [frameworkId]);

  const fetchCoverage = async () => {
    const res = await fetch(`/api/v1/control-points/framework/${frameworkId}/coverage`);
    const data = await res.json();
    setCoverage(data.statistics);
  };

  const generateOrphans = async () => {
    setIsGeneratingOrphans(true);
    try {
      const res = await fetch(
        `/api/v1/control-points/generate-orphan-requirements/${frameworkId}`,
        { method: 'POST' }
      );
      const result = await res.json();
      
      toast.success(`${result.generated_control_points} PC générés pour les exigences orphelines`);
      
      // Recharger la couverture
      await fetchCoverage();
      
    } catch (error) {
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGeneratingOrphans(false);
    }
  };

  if (!coverage) return <div>Chargement statistiques...</div>;

  return (
    <div>
      {/* KPI de couverture */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{coverage.total_requirements}</div>
            <p className="text-sm text-muted-foreground">Exigences totales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {coverage.covered_requirements}
            </div>
            <p className="text-sm text-muted-foreground">Exigences couvertes</p>
          </CardContent>
        </Card>
        
        <Card className={coverage.orphan_requirements > 0 ? "border-orange-500" : ""}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {coverage.orphan_requirements}
            </div>
            <p className="text-sm text-muted-foreground">Sans PC</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{coverage.coverage_percentage}%</div>
            <p className="text-sm text-muted-foreground">Couverture</p>
          </CardContent>
        </Card>
      </div>

      {/* Bouton pour générer les PC manquants */}
      {coverage.orphan_requirements > 0 && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Exigences non couvertes</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {coverage.orphan_requirements} exigence(s) n'ont pas de point de contrôle associé.
            </span>
            <Button
              onClick={generateOrphans}
              disabled={isGeneratingOrphans}
              variant="outline"
              size="sm"
            >
              {isGeneratingOrphans ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer PC manquants
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Reste de l'interface de validation */}
      {/* ... */}
    </div>
  );
}