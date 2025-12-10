"use client";

import { useState, useEffect, useCallback } from "react";
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
  Eye,
  Paperclip,
  Link as LinkIcon,
} from "lucide-react";
import { mapFromApiQuestion } from "./mapQuestions";

// ==================== INTERFACES ====================

interface Framework {
  id: string;
  name: string;
  code: string;
  description?: string;
  total_requirements?: number;
  requirements_count?: number;
  sections_count?: number;
}

interface RequirementDetail {
  id: string;
  official_code: string;
  title: string;
  requirement_text: string;
  chapter_path?: string;
}

interface UploadCondition {
  required_for_values: string[];
  attachment_types: string[];
  min_files: number;
  max_files?: number | null;
  accepts_links: boolean;
  help_text?: string;
  is_mandatory: boolean;
}

interface GeneratedQuestion {
  id: string;
  question_text: string;
  response_type: 'yes_no' | 'single_choice' | 'multi_choice' | 'text' | 'number' | 'date' | 'file' | 'boolean' | 'open' | 'rating';
  is_required: boolean;
  is_mandatory?: boolean;
  upload_conditions?: UploadCondition | null;
  help_text?: string;
  estimated_time_minutes?: number;
  criticality_level: 'low' | 'medium' | 'high' | 'critical';
  rationale?: string;
  options?: string[];
  validation_rules?: Record<string, unknown>;
  related_requirements?: string[];
  requirement_id?: string;
  requirement_details?: RequirementDetail;
  ai_confidence?: number;
  question_code?: string;
  chapter?: string;
  evidence_types?: string[];
  tags?: string[];
  status?: "pending" | "approved" | "rejected";
}

type Step = "selection" | "generation" | "validation";

interface QuestionGroup {
  domain: string;
  questions: GeneratedQuestion[];
  count: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
}

// ==================== COMPOSANT PRINCIPAL ====================

const QuestionnaireGenerationPage: React.FC = () => {
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
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [questionnaireName, setQuestionnaireName] = useState("");

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

  const toggleExpandQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const groupQuestionsByDomain = (questions: GeneratedQuestion[]): QuestionGroup[] => {
    const grouped = new Map<string, GeneratedQuestion[]>();

    questions.forEach((question) => {
      const domain = question.chapter || question.requirement_details?.chapter_path || "Non catégorisé";
      if (!grouped.has(domain)) {
        grouped.set(domain, []);
      }
      grouped.get(domain)!.push(question);
    });

    return Array.from(grouped.entries())
      .map(([domain, domainQuestions]) => ({
        domain,
        questions: domainQuestions,
        count: domainQuestions.length,
        approvedCount: domainQuestions.filter((q) => q.status === "approved").length,
        rejectedCount: domainQuestions.filter((q) => q.status === "rejected").length,
        pendingCount: domainQuestions.filter((q) => q.status === "pending").length,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-green-100 text-green-800 border-green-300";
    }
  };

  // ==================== API CALLS ====================

  const fetchFrameworks = async (): Promise<void> => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API}/api/v1/questionnaires/frameworks-eligible?limit=50`);
      const data = await response.json();

      const transformedFrameworks = (data.frameworks || []).map((fw: Record<string, unknown>) => ({
        id: fw.id as string,
        name: fw.name as string,
        code: fw.code as string,
        total_requirements: (fw.total_requirements as number) || 0,
        requirements_count: (fw.total_requirements as number) || 0,
        sections_count: (fw.total_control_points as number) || 0,
        description: `${fw.requirements_with_embeddings}/${fw.total_requirements} exigences avec embeddings (${fw.requirements_embeddings_coverage}%) • Score: ${fw.readiness_score}%`
      }));

      setFrameworks(transformedFrameworks ?? []);
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

      setGeneratedQuestions([]);

      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem('token');

      // Utiliser SSE pour la progression en temps réel
      // Note: EventSource ne supporte pas les headers custom, donc on passe le token en query param
      const sseUrl = `${API}/api/v1/questionnaires/generate/stream/${selectedFramework.id}?language=fr${token ? `&token=${encodeURIComponent(token)}` : ''}`;
      console.log("🔗 SSE URL:", sseUrl.replace(token || '', '***TOKEN***'));
      console.log("🔑 Token présent:", !!token, "Longueur:", token?.length || 0);

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
              setGenerationStatus("Chargement du framework...");
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
              setGenerationStatus(`Lot ${data.batch_index}/${data.total_batches} terminé • ${data.total_questions} questions générées`);
              break;

            case "second_pass_started":
              setGenerationProgress(82);
              setGenerationStatus(`🔄 Deuxième passe IA : ${data.missing_count} exigences non couvertes...`);
              toast.info("Deuxième passe IA en cours", {
                description: `Génération de questions supplémentaires pour ${data.missing_count} exigences`,
                duration: 3000
              });
              break;

            case "second_pass_complete":
              setGenerationProgress(92);
              setGenerationStatus(`✅ Deuxième passe terminée • ${data.total_questions} questions au total`);
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

              const questions = (data.questions || []).map((q: unknown) => ({
                ...mapFromApiQuestion(q as Record<string, unknown>),
                status: "pending" as const
              }));
              setGeneratedQuestions(questions);

              setGenerationProgress(100);
              setGenerationStatus(`${questions.length} questions générées`);
              setCurrentStep("validation");

              // Ouvrir automatiquement tous les domaines
              const domains = new Set<string>(questions.map((q: GeneratedQuestion) => q.chapter || q.requirement_details?.chapter_path || "Non catégorisé"));
              setExpandedDomains(domains);

              toast.success("Génération terminée ! 🎉", {
                description: `${questions.length} questions créées avec succès`
              });

              console.log("✅ Génération terminée");
              console.log("- Questions générées:", questions.length);
              setIsGenerating(false);
              break;
          }
        } catch (parseError) {
          console.error("❌ Erreur parsing SSE:", parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ Erreur SSE:", error);
        console.error("❌ EventSource readyState:", eventSource.readyState);
        console.error("❌ Token était présent:", !!token);
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
      setGenerationStatus("Génération des questions (mode classique)...");

      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem('token');

      const requestBody = {
        mode: "framework",
        framework_id: selectedFramework.id,
        language: 'fr',
        ai_params: {
          model: 'gpt-4',
          temperature: 0.3
        }
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API}/api/v1/questionnaires/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Erreur de génération');
      }

      const data = await response.json();

      setGenerationProgress(80);
      setGenerationStatus("Traitement des résultats...");

      const questions = (data.questions || data || []).map((q: unknown) => ({
        ...mapFromApiQuestion(q as Record<string, unknown>),
        status: "pending" as const
      }));
      setGeneratedQuestions(questions);

      setGenerationProgress(100);
      setGenerationStatus(`${questions.length} questions générées`);
      setCurrentStep("validation");

      const domains = new Set<string>(questions.map((q: GeneratedQuestion) => q.chapter || q.requirement_details?.chapter_path || "Non catégorisé"));
      setExpandedDomains(domains);

      toast.success("Génération terminée ! 🎉", {
        description: `${questions.length} questions créées avec succès`
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

  const handleValidateQuestion = (
    questionId: string,
    action: "approve" | "reject" | "modify"
  ) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              status: action === "approve" ? "approved" : action === "reject" ? "rejected" : q.status,
            }
          : q
      )
    );

    if (action === "modify") {
      setEditingQuestion(questionId);
    }

    if (action === "approve") {
      toast.success("Question approuvée", {
        description: "Prête pour la sauvegarde"
      });
    } else if (action === "reject") {
      toast.error("Question rejetée", {
        description: "Elle sera ignorée lors de la sauvegarde"
      });
    }
  };

  const handleEditQuestion = (questionId: string) => {
    setEditingQuestion(questionId);
  };

  const handleSaveEdit = (questionId: string, updated: Partial<GeneratedQuestion>) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...updated } : q))
    );
    setEditingQuestion(null);
    toast.success("Modifications enregistrées");
  };

  // ==================== FONCTIONS D'APPROBATION EN MASSE ====================

  const handleApproveAll = () => {
    const pendingCount = generatedQuestions.filter(q => q.status === "pending").length;
    if (pendingCount === 0) {
      toast.info("Toutes les questions sont déjà traitées");
      return;
    }

    setGeneratedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        status: q.status === "pending" ? "approved" : q.status,
      }))
    );

    toast.success(`${pendingCount} questions approuvées`, {
      description: "Toutes les questions en attente ont été approuvées"
    });
  };

  const handleApproveHighConfidence = (threshold: number = 0.7) => {
    const highConfidencePending = generatedQuestions.filter(
      q => q.status === "pending" && (q.ai_confidence ?? 0) >= threshold
    );

    if (highConfidencePending.length === 0) {
      toast.info(`Aucune question en attente avec confiance ≥ ${Math.round(threshold * 100)}%`);
      return;
    }

    setGeneratedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        status: q.status === "pending" && (q.ai_confidence ?? 0) >= threshold ? "approved" : q.status,
      }))
    );

    toast.success(`${highConfidencePending.length} questions approuvées`, {
      description: `Questions avec confiance IA ≥ ${Math.round(threshold * 100)}% approuvées`
    });
  };

  const handleApproveChapter = (chapter: string) => {
    const chapterPending = generatedQuestions.filter(
      q => q.chapter === chapter && q.status === "pending"
    );

    if (chapterPending.length === 0) {
      toast.info(`Toutes les questions du chapitre "${chapter}" sont déjà traitées`);
      return;
    }

    setGeneratedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        status: q.chapter === chapter && q.status === "pending" ? "approved" : q.status,
      }))
    );

    toast.success(`${chapterPending.length} questions approuvées`, {
      description: `Toutes les questions du chapitre "${chapter}" ont été approuvées`
    });
  };

  const handleResetAllPending = () => {
    const treatedCount = generatedQuestions.filter(
      q => q.status === "approved" || q.status === "rejected"
    ).length;

    if (treatedCount === 0) {
      toast.info("Toutes les questions sont déjà en attente");
      return;
    }

    setGeneratedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        status: "pending",
      }))
    );

    toast.info(`${treatedCount} questions remises en attente`);
  };

  const handleFinalSave = async () => {
    const approvedQuestions = generatedQuestions.filter((q) => q.status === "approved");

    if (approvedQuestions.length === 0) {
      toast.error("Aucune question approuvée", {
        description: "Veuillez approuver au moins une question avant de sauvegarder",
      });
      return;
    }

    if (!questionnaireName.trim()) {
      toast.error("Nom manquant", {
        description: "Veuillez donner un nom au questionnaire",
      });
      return;
    }

    setIsSaving(true);

    const loadingToast = toast.loading("Sauvegarde en cours...", {
      description: `Traitement de ${approvedQuestions.length} question(s)`,
    });

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const normalizeResponseType = (rt: unknown): string => {
        const v = String(rt || "text").trim();
        return v === "multiple_choice" ? "multi_choice" : v;
      };

      const normalizedQuestions = approvedQuestions.map((q) => {
        const response_type = normalizeResponseType(q.response_type);
        const validation_rules = q.validation_rules || {};

        if (response_type === "rating" && !(validation_rules as Record<string, unknown>).rating_scale) {
          (validation_rules as Record<string, unknown>).rating_scale = {
            min: 1,
            max: 5,
            labels: ["Non démarré", "Initial", "Répétable", "Défini", "Géré"]
          };
        }

        return {
          question_text: q.question_text,
          response_type,
          is_required: q.is_required,
          is_mandatory: q.is_mandatory || false,
          upload_conditions: q.upload_conditions || null,
          help_text: q.help_text || "",
          estimated_time_minutes: q.estimated_time_minutes || 5,
          difficulty: q.criticality_level || "medium",
          ai_confidence: q.ai_confidence || 0.8,
          options: q.options || [],
          validation_rules,
          evidence_types: q.evidence_types || [],
          tags: q.tags || [],
          question_code: q.question_code || null,
          chapter: q.chapter || null,
          control_point_id: null,
          framework_id: selectedFramework?.id || null
        };
      });

      const requestBody = {
        name: questionnaireName.trim(),
        status: "draft",
        source_type: "framework",
        framework_id: selectedFramework?.id,
        questions: normalizedQuestions
      };

      const response = await fetch(`${API}/api/v1/questionnaires/create-from-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la sauvegarde");
      }

      const result = await response.json();

      toast.dismiss(loadingToast);

      toast.success("Questionnaire sauvegardé ! 🎉", {
        description: (
          <div className="space-y-1">
            <div className="font-semibold">{questionnaireName}</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{approvedQuestions.length}</span> questions créées
            </div>
            {result.questionnaire_id && (
              <div className="text-xs text-gray-500 font-mono">
                ID: {result.questionnaire_id.substring(0, 8)}...
              </div>
            )}
          </div>
        ),
        duration: 5000,
      });

      console.log("✅ Résultat complet:", result);

      setTimeout(() => {
        router.push("/admin/questionnaires");
      }, 2000);

    } catch (error: unknown) {
      const err = error as Error;
      toast.dismiss(loadingToast);

      toast.error("Erreur de sauvegarde", {
        description: err.message || "Impossible de sauvegarder le questionnaire",
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-rose-50">

      {/* 🔥 HEADER STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex-shrink-0">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Génération IA - Questionnaires
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Laissez l'IA créer automatiquement vos questions d'audit depuis un référentiel
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin/questionnaires")}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-pink-600 hover:bg-gray-50 rounded-lg transition group self-start sm:self-auto"
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
                    ? "bg-pink-600 text-white shadow-lg scale-110"
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
                  currentStep !== "selection" ? "bg-pink-600 w-full" : "bg-gray-200 w-0"
                }`}
              />
            </div>

            {/* Étape 2 */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <div
                className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all flex-shrink-0 ${
                  currentStep === "generation"
                    ? "bg-pink-600 text-white shadow-lg scale-110 animate-pulse"
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
                  currentStep === "validation" ? "bg-pink-600 w-full" : "bg-gray-200 w-0"
                }`}
              />
            </div>

            {/* Étape 3 */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <div
                className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all flex-shrink-0 ${
                  currentStep === "validation"
                    ? "bg-pink-600 text-white shadow-lg scale-110"
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
      </div>

      {/* Contenu qui défile */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {/* ==================== ÉTAPE 1: SÉLECTION ==================== */}
        {currentStep === "selection" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  Sélectionnez un référentiel
                </h2>
              </div>

              {frameworks.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Database className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">Aucun référentiel disponible</p>
                  <button
                    onClick={fetchFrameworks}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-pink-600 text-white rounded-lg sm:rounded-xl hover:bg-pink-700 transition font-medium shadow-lg text-sm sm:text-base"
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
                          ? "border-pink-600 bg-pink-50 shadow-lg scale-105"
                          : "border-gray-200 hover:border-pink-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all flex-shrink-0 ${
                            selectedFramework?.id === fw.id
                              ? "bg-pink-600"
                              : "bg-gray-100 group-hover:bg-pink-100"
                          }`}
                        >
                          <FileText
                            className={`w-5 h-5 sm:w-6 sm:h-6 ${
                              selectedFramework?.id === fw.id
                                ? "text-white"
                                : "text-gray-600 group-hover:text-pink-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-xs sm:text-sm font-semibold text-pink-600 bg-pink-100 px-2 py-0.5 rounded">
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
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                              {fw.description}
                            </p>
                          )}
                        </div>
                        {selectedFramework?.id === fw.id && (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedFramework && (
              <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2">Prêt à générer ?</h3>
                    <p className="text-xs sm:text-sm md:text-base text-pink-100">
                      L'IA va analyser <strong>{selectedFramework.name}</strong> et créer
                      automatiquement des questions d'audit pertinentes
                    </p>
                  </div>
                  <button
                    onClick={startGeneration}
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-pink-600 rounded-lg sm:rounded-xl hover:bg-pink-50 transition font-bold text-sm sm:text-base md:text-lg shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0"
                  >
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Générer avec l'IA</span>
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
              <div className="inline-flex p-3 sm:p-4 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full mb-4 sm:mb-6 animate-pulse">
                <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-white animate-spin" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                Génération en cours...
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-8 px-4">{generationStatus}</p>

              <div className="relative h-3 sm:h-4 bg-gray-200 rounded-full overflow-hidden mb-3 sm:mb-4">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-600 to-rose-600 transition-all duration-500 rounded-full"
                  style={{ width: `${generationProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse" />
                </div>
              </div>

              <div className="text-xl sm:text-2xl font-bold text-pink-600">
                {generationProgress}%
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${generationProgress >= 10 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Initialisation
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${generationProgress >= 30 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  Génération IA
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${generationProgress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Finalisation
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ÉTAPE 3: VALIDATION ==================== */}
        {currentStep === "validation" && (
          <div className="space-y-6">
            {/* Nom du questionnaire */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Save className="w-6 h-6 text-pink-600" />
                <h3 className="text-xl font-bold text-gray-900">Nom du questionnaire</h3>
              </div>
              <input
                type="text"
                placeholder="Ex: Audit ISO 27001 - Mars 2025..."
                value={questionnaireName}
                onChange={(e) => setQuestionnaireName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-lg"
              />
            </div>

            {/* Stats Header */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-2xl sm:text-3xl font-bold">
                    {generatedQuestions.length}
                  </div>
                </div>
                <div className="text-pink-100 font-medium text-sm sm:text-base truncate">Questions</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-2xl sm:text-3xl font-bold">
                    {generatedQuestions.filter((q) => q.status === "approved").length}
                  </div>
                </div>
                <div className="text-green-100 font-medium text-sm sm:text-base truncate">Approuvées</div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-6 h-6 sm:w-8 sm:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-2xl sm:text-3xl font-bold">
                    {generatedQuestions.filter((q) => q.status === "rejected").length}
                  </div>
                </div>
                <div className="text-red-100 font-medium text-sm sm:text-base truncate">Rejetées</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 opacity-80 flex-shrink-0" />
                  <div className="text-2xl sm:text-3xl font-bold">
                    {generatedQuestions.filter((q) => q.status === "pending").length}
                  </div>
                </div>
                <div className="text-orange-100 font-medium text-sm sm:text-base truncate">En attente</div>
              </div>
            </div>

            {/* Boutons d'approbation en masse */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 flex-shrink-0" />
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Actions en masse</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={handleApproveAll}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Tout approuver</span>
                </button>
                <button
                  onClick={() => handleApproveHighConfidence(0.7)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate hidden sm:inline">Haute confiance (≥70%)</span>
                  <span className="truncate sm:hidden">≥70%</span>
                </button>
                <button
                  onClick={() => handleApproveHighConfidence(0.8)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate hidden sm:inline">Très haute (≥80%)</span>
                  <span className="truncate sm:hidden">≥80%</span>
                </button>
                <button
                  onClick={handleResetAllPending}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Réinitialiser</span>
                </button>
              </div>
            </div>

            {/* Domaines */}
            {groupQuestionsByDomain(generatedQuestions).map((group) => {
              const isExpanded = expandedDomains.has(group.domain);

              return (
                <div
                  key={group.domain}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all hover:shadow-xl"
                >
                  {/* En-tête Domaine */}
                  <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleExpandDomain(group.domain)}
                        className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-7 h-7 text-pink-600 transition-transform" />
                        ) : (
                          <ChevronRight className="w-7 h-7 text-gray-400 hover:text-pink-600 transition-all" />
                        )}
                        <div className="text-left">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            📂 {group.domain}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {group.count} question{group.count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-3">
                        {/* Bouton d'approbation du chapitre */}
                        {group.pendingCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveChapter(group.domain);
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approuver le chapitre ({group.pendingCount})
                          </button>
                        )}

                        {/* Stats */}
                        {group.approvedCount > 0 && (
                          <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            {group.approvedCount}
                          </span>
                        )}
                        {group.rejectedCount > 0 && (
                          <span className="px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm font-bold flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            {group.rejectedCount}
                          </span>
                        )}
                        {group.pendingCount > 0 && (
                          <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {group.pendingCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Liste des Questions */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {group.questions.map((q, idx) => {
                        const isQuestionExpanded = expandedQuestions.has(q.id);
                        const isEditing = editingQuestion === q.id;

                        return (
                          <div
                            key={q.id}
                            className={`p-6 transition-all ${
                              q.status === "approved"
                                ? "bg-green-50/50"
                                : q.status === "rejected"
                                ? "bg-red-50/50"
                                : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start gap-6">
                              {/* Numéro */}
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                                  Q{idx + 1}
                                </div>
                              </div>

                              {/* Contenu */}
                              <div className="flex-1 min-w-0">
                                {/* En-tête Question */}
                                <div className="flex items-start justify-between gap-4 mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                      <span
                                        className={`px-3 py-1 rounded-lg text-xs font-bold border ${getCriticalityColor(
                                          q.criticality_level
                                        )}`}
                                      >
                                        {q.criticality_level.toUpperCase()}
                                      </span>

                                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                        {q.response_type}
                                      </span>

                                      {q.estimated_time_minutes && (
                                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {q.estimated_time_minutes} min
                                        </span>
                                      )}

                                      {q.is_required && (
                                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">
                                          Obligatoire
                                        </span>
                                      )}

                                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-pink-100 text-pink-700">
                                        IA: {Math.round((q.ai_confidence || 0.8) * 100)}%
                                      </span>
                                    </div>

                                    {!isEditing ? (
                                      <>
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                                          {q.question_text}
                                        </h4>
                                        {q.help_text && (
                                          <p className="text-gray-600 text-sm leading-relaxed bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                            <AlertCircle className="w-4 h-4 inline mr-2 text-blue-600" />
                                            {q.help_text}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <div className="space-y-3">
                                        <textarea
                                          defaultValue={q.question_text}
                                          rows={3}
                                          className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                          onBlur={(e) =>
                                            handleSaveEdit(q.id, { question_text: e.target.value })
                                          }
                                        />
                                        <textarea
                                          defaultValue={q.help_text || ""}
                                          rows={2}
                                          placeholder="Aide contextuelle..."
                                          className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                                          onBlur={(e) =>
                                            handleSaveEdit(q.id, {
                                              help_text: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  {!isEditing && (
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => handleValidateQuestion(q.id, "approve")}
                                        disabled={q.status === "approved"}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                          q.status === "approved"
                                            ? "bg-green-600 text-white cursor-not-allowed"
                                            : "bg-green-100 text-green-700 hover:bg-green-600 hover:text-white hover:shadow-lg"
                                        }`}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Approuver
                                      </button>
                                      <button
                                        onClick={() => handleValidateQuestion(q.id, "reject")}
                                        disabled={q.status === "rejected"}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                          q.status === "rejected"
                                            ? "bg-red-600 text-white cursor-not-allowed"
                                            : "bg-red-100 text-red-700 hover:bg-red-600 hover:text-white hover:shadow-lg"
                                        }`}
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Rejeter
                                      </button>
                                      <button
                                        onClick={() => handleEditQuestion(q.id)}
                                        className="px-4 py-2 rounded-lg font-medium bg-pink-100 text-pink-700 hover:bg-pink-600 hover:text-white transition-all flex items-center gap-2 hover:shadow-lg"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                        Éditer
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Options */}
                                {q.options && q.options.length > 0 && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs font-semibold text-gray-600 mb-2 block">Options de réponse:</span>
                                    <ul className="space-y-1">
                                      {q.options.map((option, i) => (
                                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                          {option}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Upload Conditions */}
                                {q.upload_conditions && (
                                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Paperclip className="w-4 h-4 text-orange-600" />
                                      <span className="text-xs font-semibold text-orange-900">Conditions d'upload</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-orange-800">
                                      <div><strong>Requis pour:</strong> {q.upload_conditions.required_for_values?.join(', ')}</div>
                                      <div><strong>Types acceptés:</strong> {q.upload_conditions.attachment_types?.join(', ')}</div>
                                      <div><strong>Fichiers:</strong> {q.upload_conditions.min_files} min
                                        {q.upload_conditions.max_files && ` - ${q.upload_conditions.max_files} max`}
                                      </div>
                                      {q.upload_conditions.accepts_links && (
                                        <div className="flex items-center gap-1">
                                          <LinkIcon className="w-3 h-3" />
                                          <span>Liens URL acceptés</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Rationale IA */}
                                {q.rationale && (
                                  <div className="mt-4 p-4 bg-pink-50 border-l-4 border-pink-400 rounded-r-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Sparkles className="w-4 h-4 text-pink-600" />
                                      <span className="text-sm font-semibold text-pink-900">
                                        Justification IA
                                      </span>
                                    </div>
                                    <p className="text-sm text-pink-800 leading-relaxed">
                                      {q.rationale}
                                    </p>
                                  </div>
                                )}

                                {/* Exigence liée */}
                                {q.requirement_details && (
                                  <div className="mt-6">
                                    <button
                                      onClick={() => toggleExpandQuestion(q.id)}
                                      className="flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-800 transition-all group"
                                    >
                                      {isQuestionExpanded ? (
                                        <ChevronDown className="w-5 h-5 transition-transform" />
                                      ) : (
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                      )}
                                      <span>
                                        {isQuestionExpanded ? "Masquer" : "Afficher"} l'exigence liée
                                      </span>
                                    </button>

                                    {isQuestionExpanded && (
                                      <div className="mt-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-md transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xs font-mono font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded border border-pink-200">
                                            {q.requirement_details.official_code}
                                          </span>
                                        </div>
                                        <h5 className="text-sm font-bold text-gray-900 mb-1">
                                          {q.requirement_details.title}
                                        </h5>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                          {q.requirement_details.requirement_text}
                                        </p>
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

            {/* Actions finales */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">
                    <strong className="text-pink-600">
                      {generatedQuestions.filter((q) => q.status === "approved").length}
                    </strong>{" "}
                    question(s) seront sauvegardées
                  </p>
                  <p className="text-sm text-gray-500">
                    Les questions rejetées et en attente seront ignorées
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentStep("selection")}
                    className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-all"
                  >
                    Recommencer
                  </button>
                  <button
                    onClick={handleFinalSave}
                    disabled={
                      isSaving ||
                      generatedQuestions.filter((q) => q.status === "approved").length === 0 ||
                      !questionnaireName.trim()
                    }
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:from-pink-700 hover:to-rose-700 font-bold transition-all shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sauvegarde en cours...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Sauvegarder et terminer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default QuestionnaireGenerationPage;
