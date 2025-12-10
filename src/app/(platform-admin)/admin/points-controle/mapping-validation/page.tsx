"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'sonner';
import {
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Edit3,
  Save,
  Loader2,
  ArrowLeft,
  Database,
  Zap,
  TrendingUp,
  Shield,
  Network,
  Link as LinkIcon,
  Check,
  X,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/api";

// ==================== INTERFACES ====================

interface Referential {
  id: string;
  name: string;
  code: string;
  description?: string;
  total_control_points?: number;
  total_requirements?: number;
  has_embeddings?: boolean;
}

interface Requirement {
  id: string;
  requirement_code: string;
  title: string;
  description: string;
  domain_name?: string;
  referential_code: string;
  referential_name: string;
}

interface ControlPoint {
  id: string;
  control_id: string;
  title: string;
  description: string;
  category?: string;
  referential_code: string;
  referential_name: string;
}

interface ProposedMapping {
  id: string; // temporary ID for React keys
  control_point_id: string;
  control_point: ControlPoint;
  matched_requirements: Requirement[];
  ai_justification: string;
  ai_confidence: number;
  status: "pending" | "approved" | "rejected" | "modified";
}

type Step = "selection" | "analysis" | "validation";

// ==================== COMPOSANT PRINCIPAL ====================

const MappingValidationPage: React.FC = () => {
  const router = useRouter();

  // États
  const [currentStep, setCurrentStep] = useState<Step>("selection");
  const [referentials, setReferentials] = useState<Referential[]>([]);
  const [selectedReferential, setSelectedReferential] = useState<Referential | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [proposedMappings, setProposedMappings] = useState<ProposedMapping[]>([]);
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [expandedMappings, setExpandedMappings] = useState<Set<string>>(new Set());

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ==================== FONCTIONS UTILITAIRES ====================

  const toggleExpandMapping = (mappingId: string) => {
    setExpandedMappings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mappingId)) {
        newSet.delete(mappingId);
      } else {
        newSet.add(mappingId);
      }
      return newSet;
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-300";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-orange-100 text-orange-800 border-orange-300";
  };

  // ==================== API CALLS ====================

  const fetchReferentials = async (): Promise<void> => {
    try {
      // Utiliser l'endpoint qui filtre les référentiels avec embeddings
      const response = await fetch(`${API}/api/v1/control-points/frameworks-with-pc-embeddings`);
      const data = await response.json();

      const list: Referential[] = Array.isArray(data)
        ? data
        : data.frameworks ?? data.items ?? data.data ?? [];

      setReferentials(list ?? []);
      setSelectedReferential(null);
    } catch (error) {
      console.error("Erreur chargement référentiels:", error);
      toast.error("Erreur de chargement", {
        description: "Impossible de charger les référentiels avec embeddings"
      });
      setReferentials([]);
    }
  };

  const startAnalysis = async () => {
    if (!selectedReferential) return;

    try {
      setIsAnalyzing(true);
      setCurrentStep("analysis");
      setAnalysisProgress(5);
      setAnalysisStatus("Initialisation...");

      setProposedMappings([]);

      const response = await authenticatedFetch(
        `${API}/api/v1/control-points/mapping/analyze-referential`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referential_id: selectedReferential.id,
            limit: null // Pas de limite
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de l'analyse");
      }

      setAnalysisProgress(30);
      setAnalysisStatus("Traitement des résultats...");

      const result = await response.json();

      setAnalysisProgress(80);
      setAnalysisStatus("Préparation des propositions...");

      // Transformer les résultats en ProposedMapping
      const mappings: ProposedMapping[] = (result.proposed_mappings || []).map((m: any) => ({
        id: `mapping-${m.control_point_id}`,
        control_point_id: m.control_point_id,
        control_point: m.control_point,
        matched_requirements: m.matched_requirements || [],
        ai_justification: m.justification || "",
        ai_confidence: m.confidence || 0,
        status: "pending"
      }));

      setProposedMappings(mappings);

      setAnalysisProgress(100);
      setAnalysisStatus(`${mappings.length} propositions générées`);
      setCurrentStep("validation");

      // Ouvrir automatiquement tous les mappings
      const mappingIds = new Set<string>(mappings.map(m => m.id));
      setExpandedMappings(mappingIds);

      toast.success("Analyse terminée ! 🎉", {
        description: `${mappings.length} propositions de mapping créées`
      });

      console.log("✅ Analyse terminée");
      console.log("- Propositions:", mappings.length);
      setIsAnalyzing(false);

    } catch (e: unknown) {
      const error = e as Error;
      console.error("❌ Erreur:", e);
      toast.error("Erreur d'analyse", {
        description: error.message || "L'analyse IA a échoué"
      });
      setCurrentStep("selection");
      setIsAnalyzing(false);
    }
  };

  const handleValidateMapping = (
    mappingId: string,
    action: "approve" | "reject" | "modify"
  ) => {
    setProposedMappings((prev) =>
      prev.map((m) =>
        m.id === mappingId
          ? {
              ...m,
              status: action === "approve" ? "approved" : action === "reject" ? "rejected" : m.status,
            }
          : m
      )
    );

    if (action === "modify") {
      setEditingMapping(mappingId);
    }

    if (action === "approve") {
      toast.success("Mapping approuvé", {
        description: "Prêt pour la sauvegarde"
      });
    } else if (action === "reject") {
      toast.error("Mapping rejeté", {
        description: "Il sera ignoré lors de la sauvegarde"
      });
    }
  };

  const handleApproveAll = () => {
    const pendingCount = proposedMappings.filter(m => m.status === "pending").length;
    if (pendingCount === 0) {
      toast.info("Tous les mappings sont déjà traités");
      return;
    }

    setProposedMappings((prev) =>
      prev.map((m) => ({
        ...m,
        status: m.status === "pending" ? "approved" : m.status,
      }))
    );

    toast.success(`${pendingCount} mappings approuvés`, {
      description: "Tous les mappings en attente ont été approuvés"
    });
  };

  const handleApproveHighConfidence = (threshold: number = 0.7) => {
    const highConfidencePending = proposedMappings.filter(
      m => m.status === "pending" && m.ai_confidence >= threshold
    );

    if (highConfidencePending.length === 0) {
      toast.info(`Aucun mapping en attente avec confiance ≥ ${Math.round(threshold * 100)}%`);
      return;
    }

    setProposedMappings((prev) =>
      prev.map((m) => ({
        ...m,
        status: m.status === "pending" && m.ai_confidence >= threshold ? "approved" : m.status,
      }))
    );

    toast.success(`${highConfidencePending.length} mappings approuvés`, {
      description: `Mappings avec confiance IA ≥ ${Math.round(threshold * 100)}% approuvés`
    });
  };

  const handleResetAllPending = () => {
    const treatedCount = proposedMappings.filter(
      m => m.status === "approved" || m.status === "rejected"
    ).length;

    if (treatedCount === 0) {
      toast.info("Tous les mappings sont déjà en attente");
      return;
    }

    setProposedMappings((prev) =>
      prev.map((m) => ({
        ...m,
        status: "pending",
      }))
    );

    toast.info(`${treatedCount} mappings remis en attente`);
  };

  const handleRemoveRequirement = (mappingId: string, requirementId: string) => {
    setProposedMappings((prev) =>
      prev.map((m) =>
        m.id === mappingId
          ? {
              ...m,
              matched_requirements: m.matched_requirements.filter(r => r.id !== requirementId),
              status: "modified"
            }
          : m
      )
    );
    toast.info("Exigence retirée");
  };

  const handleFinalSave = async () => {
    const approvedMappings = proposedMappings.filter((m) => m.status === "approved" || m.status === "modified");

    if (approvedMappings.length === 0) {
      toast.error("Aucun mapping approuvé", {
        description: "Veuillez approuver au moins un mapping avant de sauvegarder",
      });
      return;
    }

    setIsSaving(true);

    const loadingToast = toast.loading("Sauvegarde en cours...", {
      description: `Traitement de ${approvedMappings.length} mapping(s)`,
    });

    try {
      const response = await authenticatedFetch(`${API}/api/v1/control-points/mapping/save-validated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referential_id: selectedReferential?.id,
          mappings: approvedMappings.map((mapping) => ({
            control_point_id: mapping.control_point_id,
            requirement_ids: mapping.matched_requirements.map(r => r.id),
            mapping_method: "ai_assisted"
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la sauvegarde");
      }

      const result = await response.json();

      toast.dismiss(loadingToast);

      toast.success("Sauvegarde réussie ! 🎉", {
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{result.mappings_created}</span> nouveaux liens créés
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{result.control_points_mapped}</span> PCs mappés
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{result.requirements_linked}</span> exigences liées
            </div>
          </div>
        ),
        duration: 5000,
      });

      console.log("✅ Résultat complet:", result);

      setTimeout(() => {
        router.push("/admin/points-controle/cross-referentiels");
      }, 2000);

    } catch (error: unknown) {
      const err = error as Error;
      toast.dismiss(loadingToast);

      toast.error("Erreur de sauvegarde", {
        description: err.message || "Impossible de sauvegarder les mappings",
        action: {
          label: "Réessayer",
          onClick: () => handleFinalSave(),
        },
      });

      console.error("❌ Erreur sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchReferentials();
  }, []);

  // ==================== RENDU ====================

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">

      {/* HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex-shrink-0">
                <Network className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Mapping Cross-Référentiel
                </h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Mappez les PCs d'un nouveau référentiel vers les exigences existantes
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin/points-controle/cross-referentiels")}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition group self-start sm:self-auto"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium text-sm sm:text-base">Retour</span>
            </button>
          </div>

          {/* STEPPER */}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            {/* Étape 1 */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <div
                className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all flex-shrink-0 ${
                  currentStep === "selection"
                    ? "bg-indigo-600 text-white shadow-lg scale-110"
                    : "bg-green-500 text-white"
                }`}
              >
                {currentStep !== "selection" ? <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" /> : "1"}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="font-bold text-gray-900 text-sm sm:text-base truncate">Sélection</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Référentiel source</div>
              </div>
            </div>

            <div className="flex-1 max-w-[20px] sm:max-w-[60px] h-1 bg-gray-200 mx-1 sm:mx-4">
              <div
                className={`h-full transition-all duration-500 ${
                  currentStep !== "selection" ? "bg-indigo-600 w-full" : "bg-gray-200 w-0"
                }`}
              />
            </div>

            {/* Étape 2 */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <div
                className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all flex-shrink-0 ${
                  currentStep === "analysis"
                    ? "bg-indigo-600 text-white shadow-lg scale-110 animate-pulse"
                    : currentStep === "validation"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {currentStep === "validation" ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
                ) : currentStep === "analysis" ? (
                  <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  "2"
                )}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="font-bold text-gray-900 text-sm sm:text-base truncate">Analyse IA</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Détection & propositions</div>
              </div>
            </div>

            <div className="flex-1 max-w-[20px] sm:max-w-[60px] h-1 bg-gray-200 mx-1 sm:mx-4">
              <div
                className={`h-full transition-all duration-500 ${
                  currentStep === "validation" ? "bg-indigo-600 w-full" : "bg-gray-200 w-0"
                }`}
              />
            </div>

            {/* Étape 3 */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <div
                className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all flex-shrink-0 ${
                  currentStep === "validation"
                    ? "bg-indigo-600 text-white shadow-lg scale-110"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                3
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="font-bold text-gray-900 text-sm sm:text-base truncate">Validation</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Revue et sauvegarde</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </header>

      {/* Contenu qui défile */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* ==================== ÉTAPE 1: SÉLECTION ==================== */}
        {currentStep === "selection" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  Sélectionnez le référentiel source
                </h2>
              </div>

              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-blue-900">
                    <p className="font-semibold mb-1">Comment fonctionne le mapping ?</p>
                    <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 text-blue-800">
                      <li>L'IA analyse les <strong>PCs non mappés</strong></li>
                      <li className="hidden sm:list-item">Elle propose des liens vers des <strong>exigences</strong> d'autres référentiels</li>
                      <li>Vous <strong>validez ou rejetez</strong> chaque proposition</li>
                      <li className="hidden sm:list-item">Les liens approuvés sont <strong>sauvegardés</strong></li>
                    </ol>
                  </div>
                </div>
              </div>

              {referentials.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Database className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4 text-sm sm:text-base">Aucun référentiel avec embeddings disponible</p>
                  <button
                    onClick={fetchReferentials}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg text-sm sm:text-base"
                  >
                    Recharger
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {referentials.map((ref) => (
                    <button
                      key={ref.id}
                      onClick={() => setSelectedReferential(ref)}
                      className={`p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 transition-all text-left group hover:shadow-xl ${
                        selectedReferential?.id === ref.id
                          ? "border-indigo-600 bg-indigo-50 shadow-lg sm:scale-105"
                          : "border-gray-200 hover:border-indigo-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all flex-shrink-0 ${
                            selectedReferential?.id === ref.id
                              ? "bg-indigo-600"
                              : "bg-gray-100 group-hover:bg-indigo-100"
                          }`}
                        >
                          <FileText
                            className={`w-5 h-5 sm:w-6 sm:h-6 ${
                              selectedReferential?.id === ref.id
                                ? "text-white"
                                : "text-gray-600 group-hover:text-indigo-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                            <span className="font-mono text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-100 px-1.5 sm:px-2 py-0.5 rounded">
                              {ref.code}
                            </span>
                            {ref.total_control_points && (
                              <span className="text-[10px] sm:text-xs text-gray-500">
                                {ref.total_control_points} PCs
                              </span>
                            )}
                            {ref.has_embeddings && (
                              <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded font-semibold hidden sm:inline">
                                ✓ Embed.
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 text-sm sm:text-base">
                            {ref.name}
                          </h3>
                          {ref.description && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 hidden sm:block">
                              {ref.description}
                            </p>
                          )}
                        </div>
                        {selectedReferential?.id === ref.id && (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedReferential && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Prêt à analyser ?</h3>
                    <p className="text-indigo-100 text-sm sm:text-base">
                      L'IA va analyser les PCs de <strong className="break-all">{selectedReferential.name}</strong>
                    </p>
                  </div>
                  <button
                    onClick={startAnalysis}
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-lg sm:rounded-xl hover:bg-indigo-50 transition font-bold text-base sm:text-lg shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0"
                  >
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="whitespace-nowrap">Analyser avec l'IA</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ÉTAPE 2: ANALYSE ==================== */}
        {currentStep === "analysis" && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 border border-gray-200">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex p-3 sm:p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4 sm:mb-6 animate-pulse">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white animate-spin" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
                Analyse en cours...
              </h2>
              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">{analysisStatus}</p>

              <div className="relative h-3 sm:h-4 bg-gray-200 rounded-full overflow-hidden mb-3 sm:mb-4">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 rounded-full"
                  style={{ width: `${analysisProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse" />
                </div>
              </div>

              <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                {analysisProgress}%
              </div>

              <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm text-gray-600">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${analysisProgress >= 10 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-center">Chargement</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${analysisProgress >= 30 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-center">Analyse IA</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${analysisProgress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-center">Propositions</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE 3: VALIDATION ==================== */}
        {currentStep === "validation" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <LinkIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {proposedMappings.length}
                  </div>
                </div>
                <div className="text-blue-100 font-medium text-[10px] sm:text-xs md:text-sm truncate">Propositions IA</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {proposedMappings.filter((m) => m.status === "approved" || m.status === "modified").length}
                  </div>
                </div>
                <div className="text-green-100 font-medium text-[10px] sm:text-xs md:text-sm">Approuvés</div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {proposedMappings.filter((m) => m.status === "rejected").length}
                  </div>
                </div>
                <div className="text-red-100 font-medium text-[10px] sm:text-xs md:text-sm">Rejetés</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {proposedMappings.filter((m) => m.status === "pending").length}
                  </div>
                </div>
                <div className="text-orange-100 font-medium text-[10px] sm:text-xs md:text-sm">En attente</div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                  Actions rapides
                </h3>
                <span className="text-xs sm:text-sm text-gray-500">
                  {proposedMappings.filter(m => m.status === "pending").length} mappings en attente
                </span>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={handleApproveAll}
                  disabled={proposedMappings.filter(m => m.status === "pending").length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Tout ({proposedMappings.filter(m => m.status === "pending").length})</span>
                </button>

                <button
                  onClick={() => handleApproveHighConfidence(0.8)}
                  disabled={proposedMappings.filter(m => m.status === "pending" && m.ai_confidence >= 0.8).length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">≥80% ({proposedMappings.filter(m => m.status === "pending" && m.ai_confidence >= 0.8).length})</span>
                </button>

                <button
                  onClick={() => handleApproveHighConfidence(0.7)}
                  disabled={proposedMappings.filter(m => m.status === "pending" && m.ai_confidence >= 0.7).length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">≥70% ({proposedMappings.filter(m => m.status === "pending" && m.ai_confidence >= 0.7).length})</span>
                </button>

                <button
                  onClick={handleResetAllPending}
                  disabled={proposedMappings.filter(m => m.status !== "pending").length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Reset</span>
                </button>
              </div>
            </div>

            {/* Liste des mappings proposés */}
            <div className="space-y-3 sm:space-y-4">
              {proposedMappings.map((mapping, idx) => {
                const isExpanded = expandedMappings.has(mapping.id);

                return (
                  <div
                    key={mapping.id}
                    className={`bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 transition-all ${
                      mapping.status === "approved" || mapping.status === "modified"
                        ? "border-green-300 bg-green-50/30"
                        : mapping.status === "rejected"
                        ? "border-red-300 bg-red-50/30"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {/* En-tête Mapping */}
                    <button
                      onClick={() => toggleExpandMapping(mapping.id)}
                      className="w-full px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 group hover:bg-gray-50 transition-all rounded-t-xl sm:rounded-t-2xl"
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 md:gap-6 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-lg flex-shrink-0">
                          {idx + 1}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-1 sm:mb-2">
                            <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-white border-2 border-indigo-300 rounded-lg text-[10px] sm:text-xs md:text-sm font-mono font-bold text-indigo-700 shadow-sm">
                              {mapping.control_point.control_id}
                            </span>
                            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border ${getConfidenceColor(mapping.ai_confidence)}`}>
                              IA: {Math.round(mapping.ai_confidence * 100)}%
                            </span>
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700 hidden sm:inline-flex">
                              {mapping.matched_requirements.length} exig.
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">
                            {mapping.control_point.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 hidden sm:block">
                            {mapping.control_point.description}
                          </p>
                        </div>

                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 flex-shrink-0 hidden lg:block" />
                        ) : (
                          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 hidden lg:block" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {mapping.status === "pending" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleValidateMapping(mapping.id, "approve");
                              }}
                              className="flex-1 lg:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium bg-green-100 text-green-700 hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-2 hover:shadow-lg text-xs sm:text-sm"
                            >
                              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Approuver</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleValidateMapping(mapping.id, "reject");
                              }}
                              className="flex-1 lg:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-2 hover:shadow-lg text-xs sm:text-sm"
                            >
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Rejeter</span>
                            </button>
                          </>
                        )}
                        {mapping.status === "approved" && (
                          <span className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg bg-green-600 text-white font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Approuvé</span>
                          </span>
                        )}
                        {mapping.status === "modified" && (
                          <span className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Modifié</span>
                          </span>
                        )}
                        {mapping.status === "rejected" && (
                          <span className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg bg-red-600 text-white font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Rejeté</span>
                          </span>
                        )}
                        {/* Chevron mobile */}
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-indigo-600 flex-shrink-0 lg:hidden" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 lg:hidden" />
                        )}
                      </div>
                    </button>

                    {/* Détails */}
                    {isExpanded && (
                      <div className="px-3 sm:px-4 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-3 sm:pt-4 border-t border-gray-200">
                        {/* Justification IA */}
                        {mapping.ai_justification && (
                          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 border-l-4 border-purple-400 rounded-r-lg">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-semibold text-purple-900">
                                Justification IA
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-purple-800 leading-relaxed line-clamp-3 sm:line-clamp-none">
                              {mapping.ai_justification}
                            </p>
                          </div>
                        )}

                        {/* Exigences mappées */}
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                            <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            Exigences proposées ({mapping.matched_requirements.length})
                          </h4>
                          <div className="space-y-2 sm:space-y-3">
                            {mapping.matched_requirements.map((req) => (
                              <div
                                key={req.id}
                                className="p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
                              >
                                <div className="flex items-start justify-between gap-2 sm:gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                      <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded border border-indigo-200">
                                        {req.requirement_code}
                                      </span>
                                      <span className="text-[10px] sm:text-xs text-gray-500 truncate hidden sm:inline">
                                        {req.referential_code}
                                      </span>
                                    </div>
                                    <h5 className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5 sm:mb-1 line-clamp-2">
                                      {req.title}
                                    </h5>
                                    <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed line-clamp-2 hidden sm:block">
                                      {req.description}
                                    </p>
                                    {req.domain_name && (
                                      <div className="mt-1.5 sm:mt-2 hidden sm:block">
                                        <span className="text-[10px] sm:text-xs bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate">
                                          📂 {req.domain_name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {(mapping.status === "pending" || mapping.status === "modified") && (
                                    <button
                                      onClick={() => handleRemoveRequirement(mapping.id, req.id)}
                                      className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-red-100 text-red-600 transition-all"
                                      title="Retirer cette exigence"
                                    >
                                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {mapping.matched_requirements.length === 0 && (
                              <div className="text-center py-6 sm:py-8 text-gray-500">
                                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs sm:text-sm">Aucune exigence proposée</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions finales */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">
                    <strong className="text-indigo-600">
                      {proposedMappings.filter((m) => m.status === "approved" || m.status === "modified").length}
                    </strong>{" "}
                    mapping(s) seront sauvegardés
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Les mappings rejetés et en attente seront ignorés
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 flex-shrink-0">
                  <button
                    onClick={() => setCurrentStep("selection")}
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-all text-sm sm:text-base order-2 sm:order-1"
                  >
                    Recommencer
                  </button>
                  <button
                    onClick={handleFinalSave}
                    disabled={
                      isSaving || proposedMappings.filter((m) => m.status === "approved" || m.status === "modified").length === 0
                    }
                    className="px-6 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-bold transition-all shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base order-1 sm:order-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span className="hidden sm:inline">Sauvegarde en cours...</span>
                        <span className="sm:hidden">Sauvegarde...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Sauvegarder et terminer</span>
                        <span className="sm:hidden">Sauvegarder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default MappingValidationPage;
