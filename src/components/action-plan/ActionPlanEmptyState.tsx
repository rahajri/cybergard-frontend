'use client';

import { FileText, Sparkles, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActionPlanEmptyStateProps {
  campaignId: string;
  totalQuestions: number;
  campaignStatus?: string;
  canGenerate?: boolean;
}

export function ActionPlanEmptyState({
  campaignId,
  totalQuestions,
  campaignStatus,
  canGenerate = false
}: ActionPlanEmptyStateProps) {
  const router = useRouter();

  const handleGenerate = () => {
    // Rediriger vers la page dédiée de génération
    router.push(`/client/campagnes/${campaignId}/action-plan/generation`);
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-purple-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-full">
          <FileText className="h-16 w-16 text-purple-600" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">Plan d'action</h3>

      {/* Description */}
      <p className="text-gray-600 text-center max-w-md mb-2">
        Aucun plan d'action n'a encore été généré pour cette campagne.
      </p>
      <p className="text-sm text-gray-500 text-center max-w-md mb-6">
        L'IA va analyser les <span className="font-semibold text-purple-600">{totalQuestions} réponses</span> collectées
        et proposer des actions correctives structurées.
      </p>

      {/* Warning si campagne non figée */}
      {!canGenerate && campaignStatus && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg max-w-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Campagne non figée
              </p>
              <p className="text-xs text-amber-700">
                La campagne doit être figée (statut "frozen") avant de générer un plan d'action.
                <br />
                <span className="font-medium">Statut actuel : {campaignStatus}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`inline-flex items-center px-6 py-3 font-medium rounded-lg shadow-lg transition-all duration-200 group ${
          canGenerate
            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-xl hover:from-purple-700 hover:to-purple-800'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
        }`}
      >
        <Sparkles className={`mr-2 h-5 w-5 ${canGenerate ? 'group-hover:animate-pulse' : ''}`} />
        Générer un plan d'action avec l'IA
      </button>

      {/* Info */}
      {canGenerate && (
        <div className="mt-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
          <p className="text-xs text-blue-700 text-center flex items-center justify-center gap-2">
            <span className="text-base">ℹ️</span>
            La génération prend généralement 1 à 2 minutes
          </p>
        </div>
      )}

      {/* Features list */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <div className="flex flex-col items-center text-center p-4 bg-white border border-gray-200 rounded-lg">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
            <span className="text-lg">🔍</span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Analyse intelligente</h4>
          <p className="text-xs text-gray-500">
            Détection automatique des non-conformités et risques
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-4 bg-white border border-gray-200 rounded-lg">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2">
            <span className="text-lg">⚡</span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Actions prioritisées</h4>
          <p className="text-xs text-gray-500">
            Classement par criticité (P1, P2, P3)
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-4 bg-white border border-gray-200 rounded-lg">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <span className="text-lg">👥</span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Assignation auto</h4>
          <p className="text-xs text-gray-500">
            Attribution intelligente aux responsables
          </p>
        </div>
      </div>
    </div>
  );
}
