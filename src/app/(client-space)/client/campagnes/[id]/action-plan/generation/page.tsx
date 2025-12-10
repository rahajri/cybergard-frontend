'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Target,
  FileSearch,
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

// ==================== INTERFACES ====================

interface Campaign {
  id: string;
  title: string;
}

interface GenerationProgress {
  current_phase: number;
  phase1_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase2_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase3_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase4_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase5_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  questions_analyzed: number;
  total_questions: number;
  non_conformities_found: number;
  actions_generated: number;
  actions_assigned: number;
  estimated_time_remaining: number | null;
  error_message: string | null;
}

type Step = 'init' | 'generating' | 'completed';

// ==================== COMPOSANT PRINCIPAL ====================

export default function ActionPlanGenerationPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  // États
  const [currentStep, setCurrentStep] = useState<Step>('init');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  // ==================== FONCTIONS UTILITAIRES ====================

  const fetchCampaignInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(`${API}/api/v1/campaigns/${campaignId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaign({
          id: data.campaign.id,
          title: data.campaign.title,
        });
      }
    } catch (error) {
      console.error('Erreur chargement campagne:', error);
    }
  };

  const getPhaseIcon = (phaseNumber: number) => {
    switch (phaseNumber) {
      case 1:
        return FileSearch;
      case 2:
        return AlertTriangle;
      case 3:
        return Target;
      case 4:
        return Users;
      case 5:
        return CheckCircle;
      default:
        return CheckCircle;
    }
  };

  const getPhaseTitle = (phaseNumber: number) => {
    switch (phaseNumber) {
      case 1:
        return 'Analyse des réponses';
      case 2:
        return 'Consolidation des écarts';
      case 3:
        return 'Génération des actions';
      case 4:
        return 'Assignation des responsables';
      case 5:
        return 'Préparation de la validation';
      default:
        return 'Phase inconnue';
    }
  };

  const getPhaseDescription = (phaseNumber: number) => {
    switch (phaseNumber) {
      case 1:
        return 'Collecte et analyse des réponses du questionnaire';
      case 2:
        return 'Regroupement des non-conformités similaires';
      case 3:
        return 'Création des actions correctives avec IA';
      case 4:
        return 'Attribution des actions aux responsables';
      case 5:
        return 'Préparation de l\'interface de validation';
      default:
        return '';
    }
  };

  const getOverallProgress = () => {
    if (!progress) return 0;

    const phaseWeights = [20, 15, 30, 20, 15]; // Total = 100%
    const phaseProgress = [
      progress.phase1_status === 'completed' ? 100 : progress.phase1_status === 'in_progress' ? 50 : 0,
      progress.phase2_status === 'completed' ? 100 : progress.phase2_status === 'in_progress' ? 50 : 0,
      progress.phase3_status === 'completed' ? 100 : progress.phase3_status === 'in_progress' ? 50 : 0,
      progress.phase4_status === 'completed' ? 100 : progress.phase4_status === 'in_progress' ? 50 : 0,
      progress.phase5_status === 'completed' ? 100 : progress.phase5_status === 'in_progress' ? 50 : 0,
    ];

    return Math.round(
      phaseProgress.reduce((acc, progress, idx) => acc + (progress * phaseWeights[idx]) / 100, 0)
    );
  };

  // ==================== GÉNÉRATION ====================

  const startGeneration = async () => {
    // Vérifier si une génération est déjà en cours
    if (isGenerating) {
      console.warn('⚠️ Une génération est déjà en cours, ignorer cette tentative');
      return;
    }

    try {
      setIsGenerating(true);
      setCurrentStep('generating');
      setGenerationProgress(5);
      setGenerationStatus('Initialisation de la génération...');

      const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');

      // Utiliser SSE pour la progression en temps réel
      const sseUrl = `${API}/api/v1/campaigns/${campaignId}/action-plan/generate/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      console.log('🔌 Connexion SSE démarrée:', sseUrl);
      const eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 SSE Event:', data);

          if (data.error) {
            throw new Error(data.error);
          }

          switch (data.status) {
            case 'started':
              setGenerationProgress(5);
              setGenerationStatus('Démarrage de la génération...');
              if (data.progress) {
                setProgress(data.progress);
              }
              break;

            case 'phase1_started':
              setGenerationProgress(10);
              setGenerationStatus('Phase 1 : Analyse des réponses...');
              if (data.progress) {
                setProgress(data.progress);
              }
              break;

            case 'phase1_progress':
              const phase1Progress = 10 + Math.floor((data.progress.questions_analyzed / data.progress.total_questions) * 15);
              setGenerationProgress(phase1Progress);
              setGenerationStatus(`Analyse : ${data.progress.questions_analyzed}/${data.progress.total_questions} questions`);
              setProgress(data.progress);
              break;

            case 'phase1_completed':
              setGenerationProgress(25);
              setGenerationStatus(`✅ Phase 1 terminée : ${data.progress.questions_analyzed} questions analysées`);
              setProgress(data.progress);
              break;

            case 'phase2_started':
              setGenerationProgress(30);
              setGenerationStatus('Phase 2 : Consolidation IA des non-conformités...');
              if (data.progress) {
                setProgress(data.progress);
              }
              break;

            case 'heartbeat':
              // Pulse animation pour montrer que ça progresse
              setGenerationStatus((prev) => prev + '.');
              break;

            case 'phase2_progress':
              const phase2Progress = 30 + Math.floor((data.progress.non_conformities_found / data.progress.total_questions) * 20);
              setGenerationProgress(phase2Progress);
              setGenerationStatus(`Détection : ${data.progress.non_conformities_found} non-conformités trouvées`);
              setProgress(data.progress);
              break;

            case 'phase2_completed':
              setGenerationProgress(50);
              setGenerationStatus(`✅ Phase 2 terminée : ${data.progress.non_conformities_found} NC détectées`);
              setProgress(data.progress);
              toast.info('Non-conformités détectées', {
                description: `${data.progress.non_conformities_found} écarts identifiés`,
                duration: 3000,
              });
              break;

            case 'phase3_started':
              setGenerationProgress(55);
              setGenerationStatus('Phase 3 : Génération des actions avec IA...');
              if (data.progress) {
                setProgress(data.progress);
              }
              break;

            case 'phase3_progress':
              const phase3Progress = 55 + Math.floor((data.progress.actions_generated / data.progress.non_conformities_found) * 25);
              setGenerationProgress(phase3Progress);
              setGenerationStatus(`Génération IA : ${data.progress.actions_generated} actions créées`);
              setProgress(data.progress);
              break;

            case 'phase3_completed':
              setGenerationProgress(80);
              setGenerationStatus(`✅ Phase 3 terminée : ${data.progress.actions_generated} actions générées`);
              setProgress(data.progress);
              toast.success('Actions générées', {
                description: `${data.progress.actions_generated} actions créées par l'IA`,
                duration: 3000,
              });
              break;

            case 'phase4_started':
              setGenerationProgress(85);
              setGenerationStatus('Phase 4 : Assignation automatique...');
              if (data.progress) {
                setProgress(data.progress);
              }
              break;

            case 'phase4_progress':
              const phase4Progress = 85 + Math.floor((data.progress.actions_assigned / data.progress.actions_generated) * 10);
              setGenerationProgress(phase4Progress);
              setGenerationStatus(`Assignation : ${data.progress.actions_assigned}/${data.progress.actions_generated} actions`);
              setProgress(data.progress);
              break;

            case 'phase4_completed':
              setGenerationProgress(85);
              setGenerationStatus(`✅ Phase 4 terminée : ${data.progress.actions_assigned} actions assignées`);
              setProgress(data.progress);
              break;

            case 'phase5_started':
              setGenerationProgress(90);
              setGenerationStatus('Phase 5 : Préparation de la validation...');
              if (data.progress) {
                setProgress(data.progress);
              }
              break;

            case 'phase5_completed':
              setGenerationProgress(95);
              setGenerationStatus('✅ Phase 5 terminée : Prêt pour validation');
              setProgress(data.progress);
              break;

            case 'completed':
              console.log('✅ SSE completed event reçu - Fermeture de la connexion');
              eventSource.close();
              setGenerationProgress(100);
              setGenerationStatus('✅ Génération terminée avec succès !');
              setCurrentStep('completed');
              setIsGenerating(false);

              // 🔍 DEBUG: Vérifier nombre d'actions reçues
              console.log('🔍 DEBUG Frontend: Event data complet:', data);
              const numActions = data.action_plan?.actions?.length || 0;
              console.log('🔍 DEBUG Frontend: Nombre d\'actions reçues:', numActions);
              console.log('🔍 DEBUG Frontend: Actions:', data.action_plan?.actions);

              // Log chaque action individuellement
              data.action_plan?.actions?.forEach((action: any, idx: number) => {
                console.log(`🔍 DEBUG Frontend: Action ${idx + 1}:`, action.title || action.local_id);
              });

              toast.success('Plan d\'action généré ! 🎉', {
                description: `${numActions} actions créées`,
                duration: 5000,
              });

              // Stocker le plan dans sessionStorage pour la page de validation
              if (data.action_plan) {
                const jsonStr = JSON.stringify(data.action_plan);
                console.log('🔍 DEBUG Frontend: Taille JSON stocké:', jsonStr.length, 'bytes');
                sessionStorage.setItem(`action_plan_${campaignId}`, jsonStr);

                // Vérifier immédiatement le stockage
                const stored = sessionStorage.getItem(`action_plan_${campaignId}`);
                const parsedStored = stored ? JSON.parse(stored) : null;
                console.log('🔍 DEBUG Frontend: Actions après stockage:', parsedStored?.actions?.length);
              }

              // Rediriger vers la page de validation après 2 secondes
              setTimeout(() => {
                router.push(`/client/campagnes/${campaignId}/action-plan/validation`);
              }, 2000);
              break;

            case 'error':
              eventSource.close();
              throw new Error(data.message || 'Erreur lors de la génération');
          }
        } catch (parseError) {
          console.error('❌ Erreur parsing SSE:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ Erreur SSE:', error);
        console.log('🔌 Fermeture de la connexion SSE suite à erreur');
        eventSource.close();

        toast.error('Erreur de connexion', {
          description: 'La connexion au serveur a été perdue',
        });

        setCurrentStep('init');
        setIsGenerating(false);
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Erreur:', error);
      toast.error('Erreur de génération', {
        description: err.message || 'La génération IA a échoué',
      });
      setCurrentStep('init');
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchCampaignInfo();
    }
  }, [campaignId]);

  // ==================== RENDU ====================

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50">
      {/* 🔥 HEADER STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Génération IA - Plan d'Action
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {campaign?.title || 'Chargement...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/client/campagnes/${campaignId}?tab=actions`)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-lg transition group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Retour</span>
            </button>
          </div>

          {/* STEPPER */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              {/* Étape 1 : Initialisation */}
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep === 'init'
                      ? 'bg-purple-600 text-white shadow-lg scale-110'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {currentStep !== 'init' ? <CheckCircle2 className="w-6 h-6" /> : '1'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Initialisation</div>
                  <div className="text-sm text-gray-500">Préparation</div>
                </div>
              </div>

              <div className="flex-1 h-1 bg-gray-200 mx-4">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentStep !== 'init' ? 'bg-purple-600 w-full' : 'bg-gray-200 w-0'
                  }`}
                />
              </div>

              {/* Étape 2 : Génération */}
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep === 'generating'
                      ? 'bg-purple-600 text-white shadow-lg scale-110 animate-pulse'
                      : currentStep === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {currentStep === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : currentStep === 'generating' ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    '2'
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Génération IA</div>
                  <div className="text-sm text-gray-500">5 phases automatiques</div>
                </div>
              </div>

              <div className="flex-1 h-1 bg-gray-200 mx-4">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentStep === 'completed' ? 'bg-purple-600 w-full' : 'bg-gray-200 w-0'
                  }`}
                />
              </div>

              {/* Étape 3 : Terminé */}
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep === 'completed'
                      ? 'bg-purple-600 text-white shadow-lg scale-110'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  3
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Finalisation</div>
                  <div className="text-sm text-gray-500">Plan prêt</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu qui défile */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {/* ==================== ÉTAPE: INITIALISATION ==================== */}
        {currentStep === 'init' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-200">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mb-6">
                <Sparkles className="w-16 h-16 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Prêt à générer le plan d'action
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                L'IA va analyser toutes les réponses du questionnaire et générer automatiquement des actions correctives prioritisées.
              </p>

              <button
                onClick={startGeneration}
                disabled={isGenerating}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Sparkles className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                Lancer la génération IA
              </button>

              {/* Infos sur le processus */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <FileSearch className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Analyse intelligente</h3>
                  <p className="text-sm text-gray-600">
                    Détection automatique des non-conformités et risques
                  </p>
                </div>

                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Actions prioritisées</h3>
                  <p className="text-sm text-gray-600">
                    Classement par criticité (P1, P2, P3)
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Assignation auto</h3>
                  <p className="text-sm text-gray-600">
                    Attribution intelligente aux responsables
                  </p>
                </div>
              </div>

              <div className="mt-8 px-6 py-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 flex items-center justify-center gap-2">
                  <span className="text-lg">⏱️</span>
                  La génération prend généralement 1 à 2 minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE: GÉNÉRATION ==================== */}
        {currentStep === 'generating' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-200">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mb-6 animate-pulse">
                  <Loader2 className="w-16 h-16 text-white animate-spin" />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Génération en cours...
                </h2>
                <p className="text-gray-600 mb-8 text-lg">{generationStatus}</p>

                {/* Barre de progression globale */}
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 rounded-full"
                    style={{ width: `${getOverallProgress()}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse" />
                  </div>
                </div>

                <div className="text-2xl font-bold text-purple-600 mb-8">
                  {getOverallProgress()}%
                </div>
              </div>

              {/* Détails des 5 phases */}
              {progress && (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((phaseNum) => {
                    const PhaseIcon = getPhaseIcon(phaseNum);
                    const phaseStatus = progress[`phase${phaseNum}_status` as keyof GenerationProgress] as string;

                    return (
                      <div
                        key={phaseNum}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          phaseStatus === 'completed'
                            ? 'bg-green-50 border-green-200'
                            : phaseStatus === 'in_progress'
                            ? 'bg-purple-50 border-purple-200 animate-pulse'
                            : phaseStatus === 'failed'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            phaseStatus === 'completed'
                              ? 'bg-green-500 text-white'
                              : phaseStatus === 'in_progress'
                              ? 'bg-purple-600 text-white'
                              : phaseStatus === 'failed'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {phaseStatus === 'completed' ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : phaseStatus === 'in_progress' ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <PhaseIcon className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            Phase {phaseNum} : {getPhaseTitle(phaseNum)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {getPhaseDescription(phaseNum)}
                          </div>
                        </div>
                        {phaseStatus === 'completed' && (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stats en temps réel */}
              {progress && (
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {progress.questions_analyzed}
                    </div>
                    <div className="text-xs text-blue-700">Questions analysées</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {progress.non_conformities_found}
                    </div>
                    <div className="text-xs text-orange-700">Non-conformités</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {progress.actions_generated}
                    </div>
                    <div className="text-xs text-purple-700">Actions générées</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {progress.actions_assigned}
                    </div>
                    <div className="text-xs text-green-700">Actions assignées</div>
                  </div>
                </div>
              )}

              {/* Temps estimé */}
              {progress?.estimated_time_remaining && (
                <div className="mt-6 text-center text-sm text-gray-500">
                  ⏱️ Temps restant estimé : {Math.ceil(progress.estimated_time_remaining / 60)} minute(s)
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE: TERMINÉ ==================== */}
        {currentStep === 'completed' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-200">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Plan d'action généré avec succès !
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                {progress?.actions_generated || 0} actions correctives ont été créées et assignées
              </p>

              <div className="text-sm text-gray-500">
                Redirection automatique vers l'onglet Actions...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
