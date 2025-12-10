'use client';

import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileDown,
  Crosshair,
  Bot,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Info,
  Globe2,
  Layers,
  FileStack
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';

// Types pour les options de génération
interface ReportGenerationOptions {
  reportType: 'consolidated' | 'individual' | 'both';
  includeStrategicScenarios: boolean;
  includeOperationalScenarios: boolean;
  onlyCriticalScenarios: boolean;
  includeActions: boolean;
  includeActionsSummary: boolean;
  includeActionsDetail: boolean;
  format: 'pdf' | 'docx';
  useAI: boolean;
  aiTone: 'executive' | 'technical' | 'detailed';
}

// Types pour les prérequis
interface ReportPrerequisites {
  hasStrategicScenarios: boolean;
  hasOperationalScenarios: boolean;
  hasActions: boolean;
  hasTemplate: boolean;
  strategicCount: number;
  operationalCount: number;
  actionsCount: number;
  templateName?: string;
}

interface EbiosReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectStatus: string;
  onSuccess?: () => void;
}

export default function EbiosReportGenerationModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectStatus,
  onSuccess
}: EbiosReportGenerationModalProps) {
  // États du formulaire
  const [options, setOptions] = useState<ReportGenerationOptions>({
    reportType: 'consolidated',
    includeStrategicScenarios: true,
    includeOperationalScenarios: true,
    onlyCriticalScenarios: false,
    includeActions: true,
    includeActionsSummary: true,
    includeActionsDetail: true,
    format: 'pdf',
    useAI: true,
    aiTone: 'executive'
  });

  // États de chargement et résultat
  const [loading, setLoading] = useState(false);
  const [checkingPrerequisites, setCheckingPrerequisites] = useState(true);
  const [prerequisites, setPrerequisites] = useState<ReportPrerequisites | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; downloadUrl?: string } | null>(null);

  // États pour sections avancées
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    step: string;
    percent: number;
  } | null>(null);

  // Vérifier les prérequis à l'ouverture
  useEffect(() => {
    if (isOpen && projectId) {
      checkPrerequisites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setGenerationProgress(null);
      setShowAdvancedOptions(false);
    }
  }, [isOpen]);

  const checkPrerequisites = async () => {
    setCheckingPrerequisites(true);
    setError(null);

    try {
      const response = await authenticatedFetch(
        `/api/v1/risk/projects/${projectId}/report/prerequisites`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la vérification des prérequis');
      }

      const data = await response.json();
      console.log('📊 Prérequis reçus:', data);
      setPrerequisites(data);
    } catch (err) {
      console.error('❌ Erreur prérequis:', err);
      // Fallback avec valeurs par défaut si l'endpoint n'existe pas encore
      setPrerequisites({
        hasStrategicScenarios: true,
        hasOperationalScenarios: true,
        hasActions: true,
        hasTemplate: true,
        strategicCount: 0,
        operationalCount: 0,
        actionsCount: 0,
        templateName: 'Template EBIOS RM par défaut'
      });
    } finally {
      setCheckingPrerequisites(false);
    }
  };

  const canGenerate = (): boolean => {
    if (!prerequisites) return false;

    // Au moins 1 scénario (stratégique OU opérationnel)
    const hasScenarios = prerequisites.hasStrategicScenarios || prerequisites.hasOperationalScenarios;

    // Au moins 1 action
    const hasActions = prerequisites.hasActions;

    // Template existant
    const hasTemplate = prerequisites.hasTemplate;

    return hasScenarios && hasActions && hasTemplate;
  };

  const getMissingPrerequisites = (): string[] => {
    if (!prerequisites) return ['Vérification en cours...'];

    const missing: string[] = [];

    if (!prerequisites.hasStrategicScenarios && !prerequisites.hasOperationalScenarios) {
      missing.push('Au moins 1 scénario (stratégique ou opérationnel)');
    }

    if (!prerequisites.hasActions) {
      missing.push('Au moins 1 action dans le plan');
    }

    if (!prerequisites.hasTemplate) {
      missing.push('Template de rapport configuré');
    }

    return missing;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGenerationProgress({ step: 'Initialisation...', percent: 0 });

    try {
      // Appel API de génération
      const response = await authenticatedFetch(
        `/api/v1/risk/projects/${projectId}/report/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_type: options.reportType,
            include_strategic_scenarios: options.includeStrategicScenarios,
            include_operational_scenarios: options.includeOperationalScenarios,
            only_critical_scenarios: options.onlyCriticalScenarios,
            include_actions: options.includeActions,
            include_actions_summary: options.includeActionsSummary,
            include_actions_detail: options.includeActionsDetail,
            format: options.format,
            use_ai: options.useAI,
            ai_tone: options.aiTone
          })
        }
      );

      if (!response.ok) {
        // Essayer de parser le JSON, sinon utiliser le texte brut
        let errorMessage = 'Erreur lors de la génération du rapport';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } else {
            const errorText = await response.text();
            console.error('Réponse non-JSON:', errorText.substring(0, 500));
            errorMessage = `Erreur serveur (${response.status}): ${response.statusText}`;
          }
        } catch (parseError) {
          console.error('Erreur parsing réponse:', parseError);
          errorMessage = `Erreur serveur (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // Vérifier le content-type avant de parser en JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Réponse inattendue (non-JSON):', responseText.substring(0, 500));
        throw new Error('Le serveur a retourné une réponse invalide');
      }

      const result = await response.json();
      console.log('📄 Réponse génération:', result);

      setGenerationProgress({ step: 'Terminé !', percent: 100 });

      // Vérifier si la réponse contient bien les données attendues
      if (result.success && result.download_url) {
        setSuccess({
          message: `Rapport "${result.title || 'EBIOS RM'}" généré avec succès !`,
          downloadUrl: result.download_url
        });

        // Téléchargement automatique
        setTimeout(async () => {
          try {
            const downloadResponse = await authenticatedFetch(result.download_url);
            if (downloadResponse.ok) {
              const blob = await downloadResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              // Extraire le nom de fichier depuis l'URL
              const filename = result.download_url.split('/').pop() || 'rapport-ebios.pdf';
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              console.log('✅ Téléchargement automatique réussi');
            }
          } catch (downloadErr) {
            console.error('⚠️ Téléchargement auto échoué, bouton manuel disponible:', downloadErr);
          }
        }, 500);
      } else {
        setSuccess({
          message: result.message || 'Rapport généré avec succès !',
          downloadUrl: result.download_url
        });
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Erreur génération:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
      setGenerationProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (success?.downloadUrl) {
      try {
        const response = await authenticatedFetch(success.downloadUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          // Extraire le nom de fichier depuis l'URL
          const filename = success.downloadUrl.split('/').pop() || 'rapport-ebios.pdf';
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          setError('Erreur lors du téléchargement du rapport');
        }
      } catch (err) {
        console.error('Erreur téléchargement:', err);
        setError('Erreur lors du téléchargement du rapport');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Générer le rapport EBIOS RM</h2>
              <p className="text-sm text-red-100">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Message de succès */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">{success.message}</p>
                  {success.downloadUrl && (
                    <button
                      onClick={handleDownload}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <FileDown className="w-4 h-4" />
                      Télécharger le rapport
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Vérification des prérequis */}
          {checkingPrerequisites ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-3" />
              <span className="text-gray-600">Vérification des prérequis...</span>
            </div>
          ) : (
            <>
              {/* Afficher l'avertissement si prérequis manquants */}
              {!canGenerate() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-medium mb-2">
                        Prérequis manquants pour la génération :
                      </p>
                      <ul className="list-disc list-inside text-amber-700 text-sm space-y-1">
                        {getMissingPrerequisites().map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Type de rapport - Grandes cartes */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="w-4 h-4 text-red-600" />
                  Type de rapport
                </label>

                <div className="grid grid-cols-1 gap-4">
                  {/* Option 1: Rapport Consolidé */}
                  <button
                    onClick={() => setOptions({ ...options, reportType: 'consolidated' })}
                    className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                      options.reportType === 'consolidated'
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        options.reportType === 'consolidated'
                          ? 'bg-red-100'
                          : 'bg-gray-100'
                      }`}>
                        <Globe2 className={`w-8 h-8 ${
                          options.reportType === 'consolidated' ? 'text-red-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-lg font-semibold ${
                            options.reportType === 'consolidated' ? 'text-red-700' : 'text-gray-800'
                          }`}>Rapport Consolidé</h3>
                          {options.reportType === 'consolidated' && (
                            <CheckCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Un document unique regroupant l&apos;ensemble de l&apos;analyse EBIOS RM
                        </p>
                        <ul className="space-y-1">
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Vision globale de tous les scénarios de risques
                          </li>
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Matrice des risques consolidée (AT5)
                          </li>
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Plan d&apos;actions synthétique (AT6)
                          </li>
                        </ul>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Rapports Individuels */}
                  <button
                    onClick={() => setOptions({ ...options, reportType: 'individual' })}
                    className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                      options.reportType === 'individual'
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        options.reportType === 'individual'
                          ? 'bg-red-100'
                          : 'bg-gray-100'
                      }`}>
                        <FileStack className={`w-8 h-8 ${
                          options.reportType === 'individual' ? 'text-red-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-lg font-semibold ${
                            options.reportType === 'individual' ? 'text-red-700' : 'text-gray-800'
                          }`}>Rapports Individuels</h3>
                          {options.reportType === 'individual' && (
                            <CheckCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Un rapport détaillé par scénario de risque identifié
                        </p>
                        <ul className="space-y-1">
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Fiche détaillée par scénario stratégique/opérationnel
                          </li>
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Analyse d&apos;impact et vraisemblance par scénario
                          </li>
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Actions correctives associées à chaque risque
                          </li>
                        </ul>
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Les deux */}
                  <button
                    onClick={() => setOptions({ ...options, reportType: 'both' })}
                    className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                      options.reportType === 'both'
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        options.reportType === 'both'
                          ? 'bg-red-100'
                          : 'bg-gray-100'
                      }`}>
                        <Layers className={`w-8 h-8 ${
                          options.reportType === 'both' ? 'text-red-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-lg font-semibold ${
                            options.reportType === 'both' ? 'text-red-700' : 'text-gray-800'
                          }`}>Les deux types</h3>
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            Complet
                          </span>
                          {options.reportType === 'both' && (
                            <CheckCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Génère le rapport consolidé ET les fiches individuelles
                        </p>
                        <ul className="space-y-1">
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Documentation complète pour toutes les parties prenantes
                          </li>
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Vue d&apos;ensemble + détails opérationnels
                          </li>
                          <li className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Idéal pour certification et audit externe
                          </li>
                        </ul>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: Portée */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Crosshair className="w-4 h-4 text-red-600" />
                  Portée du rapport
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeStrategicScenarios}
                      onChange={(e) => setOptions({ ...options, includeStrategicScenarios: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      Inclure les scénarios stratégiques (AT3)
                      {prerequisites && (
                        <span className="text-gray-500 ml-1">
                          ({prerequisites.strategicCount} scénario{prerequisites.strategicCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeOperationalScenarios}
                      onChange={(e) => setOptions({ ...options, includeOperationalScenarios: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      Inclure les scénarios opérationnels (AT4)
                      {prerequisites && (
                        <span className="text-gray-500 ml-1">
                          ({prerequisites.operationalCount} scénario{prerequisites.operationalCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer ml-6">
                    <input
                      type="checkbox"
                      checked={options.onlyCriticalScenarios}
                      onChange={(e) => setOptions({ ...options, onlyCriticalScenarios: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      disabled={!options.includeStrategicScenarios && !options.includeOperationalScenarios}
                    />
                    <span className={`text-sm ${
                      !options.includeStrategicScenarios && !options.includeOperationalScenarios
                        ? 'text-gray-400'
                        : 'text-gray-700'
                    }`}>
                      Uniquement les scénarios critiques &amp; importants
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 3: Plan d'actions */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <ListChecks className="w-4 h-4 text-red-600" />
                  Plan d&apos;actions
                  {prerequisites && (
                    <span className="text-gray-500 font-normal ml-1">
                      ({prerequisites.actionsCount} action{prerequisites.actionsCount > 1 ? 's' : ''})
                    </span>
                  )}
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeActions}
                      onChange={(e) => setOptions({
                        ...options,
                        includeActions: e.target.checked,
                        includeActionsSummary: e.target.checked ? options.includeActionsSummary : false,
                        includeActionsDetail: e.target.checked ? options.includeActionsDetail : false
                      })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Inclure les actions associées</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer ml-6">
                    <input
                      type="checkbox"
                      checked={options.includeActionsSummary}
                      onChange={(e) => setOptions({ ...options, includeActionsSummary: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      disabled={!options.includeActions}
                    />
                    <span className={`text-sm ${!options.includeActions ? 'text-gray-400' : 'text-gray-700'}`}>
                      Vue synthétique (tableau récapitulatif)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer ml-6">
                    <input
                      type="checkbox"
                      checked={options.includeActionsDetail}
                      onChange={(e) => setOptions({ ...options, includeActionsDetail: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      disabled={!options.includeActions}
                    />
                    <span className={`text-sm ${!options.includeActions ? 'text-gray-400' : 'text-gray-700'}`}>
                      Vue détaillée (fiches actions)
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 4: Format */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileDown className="w-4 h-4 text-red-600" />
                  Format de sortie
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setOptions({ ...options, format: 'pdf' })}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      options.format === 'pdf'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-red-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommandé</span>
                  </button>
                  <button
                    onClick={() => setOptions({ ...options, format: 'docx' })}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      options.format === 'docx'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-red-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    DOCX
                  </button>
                </div>
              </div>

              {/* Section 5: Template utilisé (lecture seule) */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Template utilisé :</span>
                  <span className="font-medium text-gray-800">
                    {prerequisites?.templateName || 'Template EBIOS RM par défaut'}
                  </span>
                </div>
              </div>

              {/* Options avancées (collapsible) */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Bot className="w-4 h-4 text-red-600" />
                    Options IA avancées
                  </span>
                  {showAdvancedOptions ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 space-y-4 border-t border-gray-200">
                    {/* Toggle IA */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.useAI}
                        onChange={(e) => setOptions({ ...options, useAI: e.target.checked })}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">
                        Utiliser l&apos;IA pour générer les synthèses et résumés
                      </span>
                    </label>

                    {/* Ton IA */}
                    {options.useAI && (
                      <div className="ml-7 space-y-2">
                        <p className="text-xs text-gray-500 mb-2">Ton du rapport :</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'executive', label: 'Exécutif', desc: 'Concis, orienté décision' },
                            { value: 'technical', label: 'Technique', desc: 'Détails techniques' },
                            { value: 'detailed', label: 'Détaillé', desc: 'Exhaustif, références' }
                          ].map((tone) => (
                            <button
                              key={tone.value}
                              onClick={() => setOptions({ ...options, aiTone: tone.value as typeof options.aiTone })}
                              className={`p-2 rounded-lg border text-left text-xs ${
                                options.aiTone === tone.value
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200 hover:border-red-300'
                              }`}
                            >
                              <p className={`font-medium ${
                                options.aiTone === tone.value ? 'text-red-700' : 'text-gray-700'
                              }`}>{tone.label}</p>
                              <p className="text-gray-500">{tone.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progression de génération */}
              {generationProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-blue-800 font-medium">{generationProgress.step}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${generationProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-1 text-right">{generationProgress.percent}%</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={loading}
          >
            {success ? 'Fermer' : 'Annuler'}
          </button>

          {!success && (
            <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate() || checkingPrerequisites}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                loading || !canGenerate() || checkingPrerequisites
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Générer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
