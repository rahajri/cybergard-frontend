"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { authenticatedFetch } from "@/lib/api";

// ==================== INTERFACES ====================

interface Framework {
  id: string;
  name: string;
  code: string;
  description?: string;
  total_requirements?: number;
}

interface RequirementDetail {
  id: string;
  official_code: string;
  title: string;
  requirement_text: string;
  domain?: string;
  subdomain?: string;
  risk_level?: string;
  compliance_obligation?: string;
}

interface GeneratedControlPoint {
  id: string;
  code: string;
  name: string;
  description: string;
  domain: string;
  subdomain?: string;
  subcategory?: string;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  effort_estimation: number;
  ai_confidence: number;
  rationale?: string;
  mapped_requirements: string[];
  mapped_requirements_details?: RequirementDetail[];
  status: "pending" | "approved" | "rejected";
}

type Step = "selection" | "generation" | "validation";

interface DomainGroup {
  domain: string;
  points: GeneratedControlPoint[];
  count: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
}

// ==================== COMPOSANT PRINCIPAL ====================

const ControlPointGenerationPage: React.FC = () => {
  const router = {
    push: (path: string) => (window.location.href = path),
  };

  // États
  const [currentStep, setCurrentStep] = useState<Step>("selection");
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generatedControlPoints, setGeneratedControlPoints] = useState<GeneratedControlPoint[]>([]);
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());
  const [orphanRequirements, setOrphanRequirements] = useState<RequirementDetail[]>([]);

  // ==================== FONCTIONS UTILITAIRES ====================

  const toggleExpandDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      return newSet;
    });
  };

  const toggleExpandPoint = (pointId: string) => {
    setExpandedPoints((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  };

  const groupControlPointsByDomain = (points: GeneratedControlPoint[]): DomainGroup[] => {
    const grouped = new Map<string, GeneratedControlPoint[]>();

    points.forEach((point) => {
      const domain = point.domain || "Non catégorisé";
      if (!grouped.has(domain)) {
        grouped.set(domain, []);
      }
      grouped.get(domain)!.push(point);
    });

    return Array.from(grouped.entries())
      .map(([domain, domainPoints]) => ({
        domain,
        points: domainPoints,
        count: domainPoints.length,
        approvedCount: domainPoints.filter((p) => p.status === "approved").length,
        rejectedCount: domainPoints.filter((p) => p.status === "rejected").length,
        pendingCount: domainPoints.filter((p) => p.status === "pending").length,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-300";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-green-100 text-green-800 border-green-300";
    }
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case "CRITICAL":
      case "HIGH":
        return "bg-red-100 text-red-700";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  // ==================== API CALLS ====================

  const fetchFrameworks = async (): Promise<void> => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API}/api/v1/frameworks/`);
      const data = await response.json();

      const list: Framework[] = Array.isArray(data)
        ? data
        : data.frameworks ?? data.items ?? data.data ?? [];

      setFrameworks(list ?? []);
      setSelectedFramework(null);
    } catch (error) {
      console.error("Erreur chargement référentiels:", error);
      toast.error("Erreur de chargement", {
        description: "Impossible de charger les référentiels"
      });
      setFrameworks([]);
    }
  };

  const startGeneration = async () => {
    if (!selectedFramework) return;

    try {
      setIsGenerating(true);
      setCurrentStep("generation");
      setGenerationProgress(5);
      setGenerationStatus("Initialisation...");

      setGeneratedControlPoints([]);
      setOrphanRequirements([]);

      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem('token');

      // Utiliser SSE pour la progression en temps réel
      // Note: EventSource ne supporte pas les headers custom, donc on passe le token en query param
      const sseUrl = `${API}/api/v1/control-points/generate-from-framework/${selectedFramework.id}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      console.log("🔗 SSE URL:", sseUrl.replace(token || '', '***TOKEN***'));

      const eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📡 SSE Event:", data);

          if (data.error) {
            throw new Error(data.error);
          }

          switch (data.status) {
            case "initializing":
              setGenerationProgress(10);
              setGenerationStatus("Chargement des exigences...");
              break;

            case "loaded":
              setGenerationProgress(15);
              setGenerationStatus(`${data.total_requirements} exigences chargées`);
              break;

            case "started":
              setGenerationProgress(20);
              setGenerationStatus(`Préparation de ${data.total_batches} lots...`);
              break;

            case "processing":
              const progressBase = 20;
              const progressRange = 60; // 20% à 80% (réservé 80-95% pour deuxième passe)
              const currentProgress = progressBase + Math.floor((data.batch_index - 1) / data.total_batches * progressRange);
              setGenerationProgress(currentProgress);
              setGenerationStatus(`Traitement du lot ${data.batch_index}/${data.total_batches}...`);
              break;

            case "batch_complete":
              const batchProgress = 20 + Math.floor((data.batch_index / data.total_batches) * 60);
              setGenerationProgress(batchProgress);
              setGenerationStatus(`Lot ${data.batch_index}/${data.total_batches} terminé • ${data.total_cps} PCs générés`);
              break;

            case "second_pass_started":
              setGenerationProgress(82);
              setGenerationStatus(`🔄 Deuxième passe IA : ${data.missing_count} exigences non couvertes...`);
              toast.info("Deuxième passe IA en cours", {
                description: `Génération de PCs supplémentaires pour ${data.missing_count} exigences`,
                duration: 3000
              });
              break;

            case "second_pass_complete":
              setGenerationProgress(92);
              setGenerationStatus(`✅ Deuxième passe terminée • ${data.total_cps} PCs au total`);
              break;

            case "second_pass_error":
              setGenerationProgress(92);
              setGenerationStatus(`⚠️ Deuxième passe échouée • Certaines exigences non couvertes`);
              toast.warning("Deuxième passe incomplète", {
                description: data.message || "Certaines exigences restent non couvertes",
                duration: 4000
              });
              break;

            case "completed":
              eventSource.close();

              const pcs = data?.generation_results?.control_points ?? [];
              setGeneratedControlPoints(pcs);

              const preview = data?.preview_uncovered ?? { count: 0, items: [] };
              setOrphanRequirements(preview.items || []);

              setGenerationProgress(100);
              setGenerationStatus(`${pcs.length} points de contrôle générés`);
              setCurrentStep("validation");

              // Ouvrir automatiquement tous les domaines
              const domains = new Set<string>(pcs.map((p: GeneratedControlPoint) => p.domain || "Non catégorisé"));
              setExpandedDomains(domains);

              toast.success("Génération terminée ! 🎉", {
                description: `${pcs.length} points de contrôle créés${preview.count > 0 ? ` • ${preview.count} exigences non couvertes` : ''}`
              });

              console.log("✅ Génération terminée");
              console.log("- PCs générés:", pcs.length);
              console.log("- Exigences non couvertes:", preview.count);
              setIsGenerating(false);
              break;
          }
        } catch (parseError) {
          console.error("❌ Erreur parsing SSE:", parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ Erreur SSE:", error);
        eventSource.close();

        // Fallback vers l'ancienne méthode POST si SSE échoue
        console.log("⚠️ Fallback vers méthode POST classique...");
        fallbackToPostGeneration();
      };

    } catch (e: unknown) {
      const error = e as Error;
      console.error("❌ Erreur:", e);
      toast.error("Erreur de génération", {
        description: error.message || "La génération IA a échoué"
      });
      setCurrentStep("selection");
      setIsGenerating(false);
    }
  };

  // Fallback si SSE ne fonctionne pas
  const fallbackToPostGeneration = async () => {
    if (!selectedFramework) return;

    try {
      setGenerationProgress(30);
      setGenerationStatus("Génération des points de contrôle (mode classique)...");

      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const resp = await authenticatedFetch(
        `${API}/api/v1/control-points/generate-from-framework/${selectedFramework.id}`,
        { method: "POST" }
      ).then((r) => r.json());

      setGenerationProgress(80);
      setGenerationStatus("Traitement des résultats...");

      const pcs = resp?.generation_results?.control_points ?? [];
      setGeneratedControlPoints(pcs);

      const preview = resp?.preview_uncovered ?? { count: 0, items: [] };
      setOrphanRequirements(preview.items || []);

      setGenerationProgress(100);
      setGenerationStatus(`${pcs.length} points de contrôle générés`);
      setCurrentStep("validation");

      const domains = new Set<string>(pcs.map((p: GeneratedControlPoint) => p.domain || "Non catégorisé"));
      setExpandedDomains(domains);

      toast.success("Génération terminée ! 🎉", {
        description: `${pcs.length} points de contrôle créés${preview.count > 0 ? ` • ${preview.count} exigences non couvertes` : ''}`
      });
    } catch (e: unknown) {
      const error = e as Error;
      console.error("❌ Erreur fallback:", e);
      toast.error("Erreur de génération", {
        description: error.message || "La génération IA a échoué"
      });
      setCurrentStep("selection");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidatePoint = (
    pointId: string,
    action: "approve" | "reject" | "modify"
  ) => {
    setGeneratedControlPoints((prev) =>
      prev.map((p) =>
        p.id === pointId
          ? {
              ...p,
              status: action === "approve" ? "approved" : action === "reject" ? "rejected" : p.status,
            }
          : p
      )
    );

    if (action === "modify") {
      setEditingPoint(pointId);
    }

    if (action === "approve") {
      toast.success("Point de contrôle approuvé", {
        description: "Prêt pour la sauvegarde"
      });
    } else if (action === "reject") {
      toast.error("Point de contrôle rejeté", {
        description: "Il sera ignoré lors de la sauvegarde"
      });
    }
  };

  // ==================== FONCTIONS D'APPROBATION EN MASSE ====================

  const handleApproveAll = () => {
    const pendingCount = generatedControlPoints.filter(p => p.status === "pending").length;
    if (pendingCount === 0) {
      toast.info("Tous les points de contrôle sont déjà traités");
      return;
    }

    setGeneratedControlPoints((prev) =>
      prev.map((p) => ({
        ...p,
        status: p.status === "pending" ? "approved" : p.status,
      }))
    );

    toast.success(`${pendingCount} points de contrôle approuvés`, {
      description: "Tous les PC en attente ont été approuvés"
    });
  };

  const handleApproveHighConfidence = (threshold: number = 0.7) => {
    const highConfidencePending = generatedControlPoints.filter(
      p => p.status === "pending" && p.ai_confidence >= threshold
    );

    if (highConfidencePending.length === 0) {
      toast.info(`Aucun PC en attente avec confiance ≥ ${Math.round(threshold * 100)}%`);
      return;
    }

    setGeneratedControlPoints((prev) =>
      prev.map((p) => ({
        ...p,
        status: p.status === "pending" && p.ai_confidence >= threshold ? "approved" : p.status,
      }))
    );

    toast.success(`${highConfidencePending.length} points de contrôle approuvés`, {
      description: `PC avec confiance IA ≥ ${Math.round(threshold * 100)}% approuvés`
    });
  };

  const handleApproveDomain = (domain: string) => {
    const domainPending = generatedControlPoints.filter(
      p => p.domain === domain && p.status === "pending"
    );

    if (domainPending.length === 0) {
      toast.info(`Tous les PC du domaine "${domain}" sont déjà traités`);
      return;
    }

    setGeneratedControlPoints((prev) =>
      prev.map((p) => ({
        ...p,
        status: p.domain === domain && p.status === "pending" ? "approved" : p.status,
      }))
    );

    toast.success(`${domainPending.length} points de contrôle approuvés`, {
      description: `Tous les PC du domaine "${domain}" ont été approuvés`
    });
  };

  const handleResetAllPending = () => {
    const treatedCount = generatedControlPoints.filter(
      p => p.status === "approved" || p.status === "rejected"
    ).length;

    if (treatedCount === 0) {
      toast.info("Tous les PC sont déjà en attente");
      return;
    }

    setGeneratedControlPoints((prev) =>
      prev.map((p) => ({
        ...p,
        status: "pending",
      }))
    );

    toast.info(`${treatedCount} points de contrôle remis en attente`);
  };

  const handleEditPoint = (pointId: string) => {
    setEditingPoint(pointId);
  };

  const handleSaveEdit = (pointId: string, updated: Partial<GeneratedControlPoint>) => {
    setGeneratedControlPoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, ...updated } : p))
    );
    setEditingPoint(null);
    toast.success("Modifications enregistrées");
  };

  const handleFinalSave = async () => {
    const approvedPoints = generatedControlPoints.filter((p) => p.status === "approved");

    if (approvedPoints.length === 0) {
      toast.error("Aucun point de contrôle approuvé", {
        description: "Veuillez approuver au moins un point de contrôle avant de sauvegarder",
      });
      return;
    }

    setIsSaving(true);

    // Toast de chargement
    const loadingToast = toast.loading("Sauvegarde en cours...", {
      description: `Traitement de ${approvedPoints.length} point(s) de contrôle`,
    });

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await authenticatedFetch(`${API}/api/v1/control-points/save-validated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework_id: selectedFramework?.id,
          control_points: approvedPoints.map((point) => ({
            code: point.code,
            name: point.name,
            description: point.description,
            domain: point.domain,
            subdomain: point.subdomain || "",
            criticality: point.criticality,
            effort_estimation: point.effort_estimation,
            ai_confidence: point.ai_confidence,
            rationale: point.rationale,
            mapped_requirements: point.mapped_requirements || [],
            created_by: "ai_generation",
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la sauvegarde");
      }

      const result = await response.json();
      
      // Fermer le toast de chargement
      toast.dismiss(loadingToast);
      
      // Toast de succès détaillé
      toast.success("Sauvegarde réussie ! 🎉", {
        description: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{result.created}</span> PC créés
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{result.reused}</span> PC réutilisés
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{result.mappings_created}</span> mappings créés
            </div>
            {result.embeddings_generated > 0 && (
              <div className="flex items-center gap-2 text-purple-600">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">{result.embeddings_generated}</span> embeddings générés
              </div>
            )}
            {result.embeddings_failed > 0 && (
              <div className="text-orange-600 text-xs mt-1">
                ⚠️ {result.embeddings_failed} embedding(s) en erreur
              </div>
            )}
          </div>
        ),
        duration: 5000,
      });

      console.log("✅ Résultat complet:", result);

      // Attendre un peu avant de rediriger pour que l'utilisateur voie le toast
      setTimeout(() => {
        router.push("/admin/points-controle");
      }, 2000);

    } catch (error: unknown) {
      const err = error as Error;
      // Fermer le toast de chargement
      toast.dismiss(loadingToast);

      // Toast d'erreur détaillé
      toast.error("Erreur de sauvegarde", {
        description: err.message || "Impossible de sauvegarder les points de contrôle",
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
    fetchFrameworks();
  }, []);

  // ==================== RENDU ====================

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">

      {/* 🔥 HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex-shrink-0">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Génération IA - Points de Contrôle
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Laissez l'IA créer automatiquement vos points de contrôle depuis un référentiel
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin/points-controle")}
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
                <div className="font-bold text-gray-900 text-sm sm:text-base truncate">Sélection Référentiel</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Choisir la source</div>
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
                  currentStep === "generation"
                    ? "bg-indigo-600 text-white shadow-lg scale-110 animate-pulse"
                    : currentStep === "validation"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {currentStep === "validation" ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
                ) : currentStep === "generation" ? (
                  <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  "2"
                )}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="font-bold text-gray-900 text-sm sm:text-base truncate">Génération IA</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Création automatique</div>
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
                <div className="text-xs sm:text-sm text-gray-500 truncate">Revue et approbation</div>
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
                  Sélectionnez un référentiel
                </h2>
              </div>

              {frameworks.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Database className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4 text-sm sm:text-base">Aucun référentiel disponible</p>
                  <button
                    onClick={fetchFrameworks}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg text-sm sm:text-base"
                  >
                    Recharger
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {frameworks.map((fw) => (
                    <button
                      key={fw.id}
                      onClick={() => setSelectedFramework(fw)}
                      className={`p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 transition-all text-left group hover:shadow-xl ${
                        selectedFramework?.id === fw.id
                          ? "border-indigo-600 bg-indigo-50 shadow-lg sm:scale-105"
                          : "border-gray-200 hover:border-indigo-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all flex-shrink-0 ${
                            selectedFramework?.id === fw.id
                              ? "bg-indigo-600"
                              : "bg-gray-100 group-hover:bg-indigo-100"
                          }`}
                        >
                          <FileText
                            className={`w-5 h-5 sm:w-6 sm:h-6 ${
                              selectedFramework?.id === fw.id
                                ? "text-white"
                                : "text-gray-600 group-hover:text-indigo-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                            <span className="font-mono text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-100 px-1.5 sm:px-2 py-0.5 rounded">
                              {fw.code}
                            </span>
                            {fw.total_requirements && (
                              <span className="text-[10px] sm:text-xs text-gray-500">
                                {fw.total_requirements} exigences
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 text-sm sm:text-base">
                            {fw.name}
                          </h3>
                          {fw.description && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 hidden sm:block">
                              {fw.description}
                            </p>
                          )}
                        </div>
                        {selectedFramework?.id === fw.id && (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedFramework && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Prêt à générer ?</h3>
                    <p className="text-indigo-100 text-sm sm:text-base">
                      L'IA va analyser <strong className="break-all">{selectedFramework.name}</strong> et créer
                      automatiquement des points de contrôle pertinents
                    </p>
                  </div>
                  <button
                    onClick={startGeneration}
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-lg sm:rounded-xl hover:bg-indigo-50 transition font-bold text-base sm:text-lg shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0"
                  >
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="whitespace-nowrap">Générer avec l'IA</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ÉTAPE 2: GÉNÉRATION ==================== */}
        {currentStep === "generation" && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 border border-gray-200">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex p-3 sm:p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4 sm:mb-6 animate-pulse">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white animate-spin" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
                Génération en cours...
              </h2>
              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">{generationStatus}</p>

              <div className="relative h-3 sm:h-4 bg-gray-200 rounded-full overflow-hidden mb-3 sm:mb-4">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 rounded-full"
                  style={{ width: `${generationProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse" />
                </div>
              </div>

              <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                {generationProgress}%
              </div>

              <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm text-gray-600">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${generationProgress >= 10 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-center">Init.</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${generationProgress >= 30 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-center">Génération</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${generationProgress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-center">Final.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE 3: VALIDATION ==================== */}
        {currentStep === "validation" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
              {/* 1. Carte Bleue */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {generatedControlPoints.length}
                  </div>
                </div>
                <div className="text-blue-100 font-medium text-[10px] sm:text-xs md:text-sm truncate">Points de Contrôle</div>
              </div>

              {/* 2. Carte Verte */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {generatedControlPoints.filter((p) => p.status === "approved").length}
                  </div>
                </div>
                <div className="text-green-100 font-medium text-[10px] sm:text-xs md:text-sm">Approuvés</div>
              </div>

              {/* 3. Carte Rouge */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {generatedControlPoints.filter((p) => p.status === "rejected").length}
                  </div>
                </div>
                <div className="text-red-100 font-medium text-[10px] sm:text-xs md:text-sm">Rejetés</div>
              </div>

              {/* 4. Carte Orange */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {generatedControlPoints.filter((p) => p.status === "pending").length}
                  </div>
                </div>
                <div className="text-orange-100 font-medium text-[10px] sm:text-xs md:text-sm">En attente</div>
              </div>

              {/* 5. Carte Violette */}
              <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 text-white">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {orphanRequirements.length}
                  </div>
                </div>
                <div className="text-purple-100 font-medium text-[10px] sm:text-xs md:text-sm">Non couvertes</div>
              </div>
            </div>

            {/* Actions rapides d'approbation en masse */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                  Actions rapides
                </h3>
                <span className="text-xs sm:text-sm text-gray-500">
                  {generatedControlPoints.filter(p => p.status === "pending").length} PC en attente
                </span>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={handleApproveAll}
                  disabled={generatedControlPoints.filter(p => p.status === "pending").length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Tout ({generatedControlPoints.filter(p => p.status === "pending").length})</span>
                </button>

                <button
                  onClick={() => handleApproveHighConfidence(0.8)}
                  disabled={generatedControlPoints.filter(p => p.status === "pending" && p.ai_confidence >= 0.8).length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">≥80% ({generatedControlPoints.filter(p => p.status === "pending" && p.ai_confidence >= 0.8).length})</span>
                </button>

                <button
                  onClick={() => handleApproveHighConfidence(0.7)}
                  disabled={generatedControlPoints.filter(p => p.status === "pending" && p.ai_confidence >= 0.7).length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">≥70% ({generatedControlPoints.filter(p => p.status === "pending" && p.ai_confidence >= 0.7).length})</span>
                </button>

                <button
                  onClick={handleResetAllPending}
                  disabled={generatedControlPoints.filter(p => p.status !== "pending").length === 0}
                  className="px-2 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold hover:from-gray-500 hover:to-gray-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Reset</span>
                </button>
              </div>

              {generatedControlPoints.filter(p => p.status === "pending").length > 0 && (
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Approuvez les PC en masse ou individuellement avant de sauvegarder.
                  Seuls les PC approuvés seront enregistrés en base de données.
                </p>
              )}
            </div>

            {/* Domaines */}
            {groupControlPointsByDomain(generatedControlPoints).map((group) => {
              const isExpanded = expandedDomains.has(group.domain);

              return (
                <div
                  key={group.domain}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all hover:shadow-xl"
                >
                  {/* En-tête Domaine */}
                  <button
                    onClick={() => toggleExpandDomain(group.domain)}
                    className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 transition-transform flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-gray-400 group-hover:text-indigo-600 transition-all flex-shrink-0" />
                      )}
                      <div className="text-left min-w-0">
                        <h3 className="text-sm sm:text-base md:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">
                          📂 {group.domain}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {group.count} point{group.count > 1 ? "s" : ""} de contrôle
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                      {group.pendingCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveDomain(group.domain);
                          }}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-green-500 text-white text-[10px] sm:text-xs md:text-sm font-semibold hover:bg-green-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1 sm:gap-1.5"
                        >
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Approuver</span> ({group.pendingCount})
                        </button>
                      )}
                      {group.approvedCount > 0 && (
                        <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full bg-green-100 text-green-700 text-[10px] sm:text-xs md:text-sm font-bold flex items-center gap-1 sm:gap-2">
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          {group.approvedCount}
                        </span>
                      )}
                      {group.rejectedCount > 0 && (
                        <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full bg-red-100 text-red-700 text-[10px] sm:text-xs md:text-sm font-bold flex items-center gap-1 sm:gap-2 hidden sm:flex">
                          <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          {group.rejectedCount}
                        </span>
                      )}
                      {group.pendingCount > 0 && (
                        <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full bg-orange-100 text-orange-700 text-[10px] sm:text-xs md:text-sm font-bold flex items-center gap-1 sm:gap-2 hidden sm:flex">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          {group.pendingCount}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Liste des PC */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {group.points.map((p, idx) => {
                        const isPointExpanded = expandedPoints.has(p.id);
                        const isEditing = editingPoint === p.id;

                        return (
                          <div
                            key={p.id}
                            className={`p-3 sm:p-4 md:p-6 transition-all ${
                              p.status === "approved"
                                ? "bg-green-50/50"
                                : p.status === "rejected"
                                ? "bg-red-50/50"
                                : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
                              {/* Numéro */}
                              <div className="flex-shrink-0 hidden sm:block">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm sm:text-lg shadow-lg">
                                  {idx + 1}
                                </div>
                              </div>

                              {/* Contenu */}
                              <div className="flex-1 min-w-0">
                                {/* En-tête PC */}
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
                                      {/* Numéro mobile */}
                                      <span className="sm:hidden w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                        {idx + 1}
                                      </span>
                                      <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-white border-2 border-indigo-300 rounded-lg text-[10px] sm:text-xs md:text-sm font-mono font-bold text-indigo-700 shadow-sm">
                                        {p.code}
                                      </span>

                                      {/* Criticité - Modifiable en mode édition */}
                                      {!isEditing ? (
                                        <span
                                          className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border ${getCriticalityColor(
                                            p.criticality
                                          )}`}
                                        >
                                          {p.criticality}
                                        </span>
                                      ) : (
                                        <select
                                          defaultValue={p.criticality}
                                          onChange={(e) =>
                                            handleSaveEdit(p.id, {
                                              criticality: e.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                                            })
                                          }
                                          className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border focus:ring-2 focus:ring-indigo-500 ${getCriticalityColor(
                                            p.criticality
                                          )}`}
                                        >
                                          <option value="LOW">LOW</option>
                                          <option value="MEDIUM">MEDIUM</option>
                                          <option value="HIGH">HIGH</option>
                                          <option value="CRITICAL">CRITICAL</option>
                                        </select>
                                      )}

                                      {/* Effort - Modifiable en mode édition */}
                                      {!isEditing ? (
                                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700 hidden sm:inline-flex">
                                          {p.effort_estimation}h
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg bg-blue-100">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            defaultValue={p.effort_estimation}
                                            onChange={(e) =>
                                              handleSaveEdit(p.id, {
                                                effort_estimation: parseFloat(e.target.value) || 0,
                                              })
                                            }
                                            className="w-12 sm:w-16 px-1 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-blue-700 bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          />
                                          <span className="text-[10px] sm:text-xs font-semibold text-blue-700">h</span>
                                        </div>
                                      )}

                                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-purple-100 text-purple-700">
                                        IA: {Math.round(p.ai_confidence * 100)}%
                                      </span>
                                    </div>

                                    {!isEditing ? (
                                      <>
                                        <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1 sm:mb-2">
                                          {p.name}
                                        </h4>
                                        <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed line-clamp-3 sm:line-clamp-none">
                                          {p.description}
                                        </p>
                                      </>
                                    ) : (
                                      <div className="space-y-2 sm:space-y-3">
                                        <input
                                          type="text"
                                          defaultValue={p.name}
                                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-indigo-300 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base"
                                          onBlur={(e) =>
                                            handleSaveEdit(p.id, { name: e.target.value })
                                          }
                                        />
                                        <textarea
                                          defaultValue={p.description}
                                          rows={3}
                                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-indigo-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm sm:text-base"
                                          onBlur={(e) =>
                                            handleSaveEdit(p.id, {
                                              description: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  {!isEditing && (
                                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                                      <button
                                        onClick={() => handleValidatePoint(p.id, "approve")}
                                        disabled={p.status === "approved"}
                                        className={`flex-1 lg:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                                          p.status === "approved"
                                            ? "bg-green-600 text-white cursor-not-allowed"
                                            : "bg-green-100 text-green-700 hover:bg-green-600 hover:text-white hover:shadow-lg"
                                        }`}
                                      >
                                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Approuver</span>
                                      </button>
                                      <button
                                        onClick={() => handleValidatePoint(p.id, "reject")}
                                        disabled={p.status === "rejected"}
                                        className={`flex-1 lg:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                                          p.status === "rejected"
                                            ? "bg-red-600 text-white cursor-not-allowed"
                                            : "bg-red-100 text-red-700 hover:bg-red-600 hover:text-white hover:shadow-lg"
                                        }`}
                                      >
                                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Rejeter</span>
                                      </button>
                                      <button
                                        onClick={() => handleEditPoint(p.id)}
                                        className="flex-1 lg:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-2 hover:shadow-lg text-xs sm:text-sm"
                                      >
                                        <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Éditer</span>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Rationale IA */}
                                {p.rationale && (
                                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-purple-50 border-l-4 border-purple-400 rounded-r-lg">
                                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                                      <span className="text-xs sm:text-sm font-semibold text-purple-900">
                                        Justification IA
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-purple-800 leading-relaxed line-clamp-3 sm:line-clamp-none">
                                      {p.rationale}
                                    </p>
                                  </div>
                                )}

                                {/* Exigences mappées */}
                                {p.mapped_requirements_details &&
                                  p.mapped_requirements_details.length > 0 && (
                                    <div className="mt-4 sm:mt-6">
                                      <button
                                        onClick={() => toggleExpandPoint(p.id)}
                                        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-all group"
                                      >
                                        {isPointExpanded ? (
                                          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                                        )}
                                        <span>
                                          {isPointExpanded ? "Masquer" : "Afficher"} les{" "}
                                          {p.mapped_requirements_details.length} exigence(s)
                                          <span className="hidden sm:inline"> mappée(s)</span>
                                        </span>
                                      </button>

                                      {isPointExpanded && (
                                        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                                          {p.mapped_requirements_details.map((req, reqIdx) => (
                                            <div
                                              key={req.id}
                                              className="p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
                                            >
                                              <div className="flex items-start gap-2 sm:gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold flex items-center justify-center">
                                                  {reqIdx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                                    <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded border border-indigo-200">
                                                      {req.official_code}
                                                    </span>
                                                    {req.risk_level && (
                                                      <span
                                                        className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded ${getRiskLevelColor(
                                                          req.risk_level
                                                        )}`}
                                                      >
                                                        {req.risk_level}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <h5 className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5 sm:mb-1">
                                                    {req.title}
                                                  </h5>
                                                  <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                                                    {req.requirement_text}
                                                  </p>
                                                  {(req.domain || req.subdomain) && (
                                                    <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                                                      {req.domain && (
                                                        <span className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[120px] sm:max-w-none">
                                                          <span className="font-semibold">
                                                            📂
                                                          </span>
                                                          {req.domain}
                                                        </span>
                                                      )}
                                                      {req.subdomain && (
                                                        <span className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[120px] sm:max-w-none hidden sm:flex">
                                                          <span className="font-semibold">
                                                            →
                                                          </span>
                                                          {req.subdomain}
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Exigences orphelines */}
            {orphanRequirements.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0 mt-0.5 sm:mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-orange-900 mb-1 sm:mb-2">
                      Exigences non couvertes ({orphanRequirements.length})
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base text-orange-800">
                      Ces exigences n'ont pas été automatiquement mappées. Vous devez créer
                      manuellement des points de contrôle ou relancer la génération.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 max-h-72 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2">
                  {orphanRequirements.map((req, idx) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-lg sm:rounded-xl border-2 border-orange-200 p-3 sm:p-4 md:p-5 hover:border-orange-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                        <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-orange-100 text-orange-700 text-xs sm:text-sm font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <span className="text-[10px] sm:text-xs font-mono font-bold text-orange-600 bg-orange-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded border border-orange-300">
                              {req.official_code}
                            </span>
                            {req.risk_level && (
                              <span
                                className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getRiskLevelColor(
                                  req.risk_level
                                )}`}
                              >
                                {req.risk_level}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-0.5 sm:mb-1.5">
                            {req.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-700 leading-relaxed line-clamp-2 sm:line-clamp-none">
                            {req.requirement_text}
                          </p>
                          {(req.domain || req.subdomain) && (
                            <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600">
                              {req.domain && (
                                <span className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[100px] sm:max-w-none">
                                  <span className="font-semibold">📂</span> {req.domain}
                                </span>
                              )}
                              {req.subdomain && (
                                <span className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[100px] sm:max-w-none hidden sm:flex">
                                  <span className="font-semibold">→</span> {req.subdomain}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-orange-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs sm:text-sm text-orange-700 italic flex items-center gap-1.5 sm:gap-2">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Vous pouvez créer manuellement des PC pour ces exigences</span>
                    <span className="sm:hidden">Créez manuellement des PC</span>
                  </p>
                  <button
                    onClick={() => setCurrentStep("selection")}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-orange-600 text-white hover:bg-orange-700 font-bold transition-all shadow-lg hover:scale-105 text-sm sm:text-base"
                  >
                    Relancer la génération
                  </button>
                </div>
              </div>
            )}

            {/* Actions finales */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">
                    <strong className="text-indigo-600">
                      {generatedControlPoints.filter((p) => p.status === "approved").length}
                    </strong>{" "}
                    point(s) de contrôle seront sauvegardés
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Les points rejetés et en attente seront ignorés
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
                      isSaving || generatedControlPoints.filter((p) => p.status === "approved").length === 0
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

export default ControlPointGenerationPage;