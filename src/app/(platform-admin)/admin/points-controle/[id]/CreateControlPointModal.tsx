"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Search, Link2, Plus, AlertTriangle, ChevronLeft, Info, Lightbulb, Shield, Clock, FileText, Tag } from "lucide-react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CreateControlPointModalProps {
  frameworkId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Domain {
  id: string;
  code: string;
  title: string;
  level: number;
  requirement_count: number;
  children: Domain[];
}

interface Requirement {
  id: string;
  official_code: string;
  title: string;
  requirement_text: string;
  domain: string;
  subdomain: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  created_at: string;
}

interface ControlPointData {
  // 🔹 GROUPE IDENTIFICATION
  code: string;
  name: string;
  description: string;
  
  // 🔹 GROUPE CLASSIFICATION
  category: string;
  subcategory: string;
  control_family: string;
  
  // 🔹 GROUPE RISQUE ET EFFORT
  criticality_level: "low" | "medium" | "high" | "critical";
  implementation_level: "level_1" | "level_2" | "level_3";
  estimated_effort_hours: number;
  
  // 🔹 GROUPE RÉFÉRENCES ET RECOMMANDATIONS
  implementation_guidance: string;
  verification_method: string;
  documentation_required: string;
  risk_domains: string[];
}

interface SimilarPC {
  id: string;
  code: string;
  name: string;
  description: string;
  similarity_score: number;
  criticality_level: string;
  mapped_requirements_count: number;
}

// 🎨 DONNÉES STATIQUES
const CONTROL_FAMILIES = [
  "Access Control",
  "Asset Management",
  "Cryptography",
  "Physical Security",
  "Operations Security",
  "Communications Security",
  "System Acquisition",
  "Supplier Relationships",
  "Incident Management",
  "Business Continuity",
  "Compliance",
];

const RISK_DOMAINS_SUGGESTIONS = [
  "Authentification",
  "Autorisation",
  "PAM (Privileged Access Management)",
  "IAM (Identity & Access Management)",
  "Chiffrement",
  "Sauvegarde",
  "Journalisation",
  "Surveillance",
  "Gestion des vulnérabilités",
  "Sécurité réseau",
  "Sécurité physique",
  "Formation utilisateurs",
];

const VERIFICATION_METHODS = [
  "Revue documentaire",
  "Test technique",
  "Entretien",
  "Observation sur site",
  "Analyse de logs",
  "Scan automatisé",
  "Audit tiers",
];

// Composant Tooltip
const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block">
    <Info className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
    <div className="invisible group-hover:visible absolute z-50 w-64 p-2 mt-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg -left-24">
      {text}
    </div>
  </div>
);

export default function CreateControlPointModal({
  frameworkId,
  onClose,
  onSuccess,
}: CreateControlPointModalProps) {
  // ============================================
  // ÉTATS
  // ============================================
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  // Étape 1 : Domaines
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Étape 2 : Exigences
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);

  // ✅ Étape 3 : Données du PC (CHAMPS VIDES)
  const [pcData, setPcData] = useState<ControlPointData>({
    // Identification
    code: "",
    name: "",
    description: "",
    
    // Classification
    category: "",
    subcategory: "",
    control_family: "",
    
    // Risque et effort
    criticality_level: "medium",
    implementation_level: "level_1",
    estimated_effort_hours: 4,
    
    // Références
    implementation_guidance: "",
    verification_method: "",
    documentation_required: "",
    risk_domains: [],
  });

  // Tags pour domaines de risque
  const [riskDomainInput, setRiskDomainInput] = useState("");

  // Étape 4 : PCs similaires
  const [similarPCs, setSimilarPCs] = useState<SimilarPC[]>([]);
  const [selectedPCIds, setSelectedPCIds] = useState<Set<string>>(new Set());
  const [saveAction, setSaveAction] = useState<"link" | "create">("link");

  // ============================================
  // EFFETS
  // ============================================
  useEffect(() => {
    if (step === 1) {
      fetchDomains();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === 2 && selectedDomain) {
      fetchRequirements(selectedDomain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedDomain]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = requirements.filter(
        (req) =>
          req.official_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.requirement_text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRequirements(filtered);
    } else {
      setFilteredRequirements(requirements);
    }
  }, [searchQuery, requirements]);

  // ============================================
  // FONCTIONS ÉTAPE 1 : DOMAINES
  // ============================================
  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/frameworks/${frameworkId}/domains`);
      if (!res.ok) throw new Error("Erreur chargement domaines");

      const data = await res.json();
      setDomains(data || []);
      console.log(`✅ ${data.length} domaine(s) chargé(s)`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Erreur chargement domaines:", error);
      toast.error("Impossible de charger les domaines");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDomain = (domainId: string) => {
    setSelectedDomain(domainId);
    setStep(2);
  };

  // ============================================
  // FONCTIONS ÉTAPE 2 : EXIGENCES
  // ============================================
  const fetchRequirements = async (domainId: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/v1/requirements/?framework_id=${frameworkId}&domain=${domainId}&limit=1000`
      );
      if (!res.ok) throw new Error("Erreur chargement exigences");

      const data = await res.json();
      setRequirements(data || []);
      setFilteredRequirements(data || []);
      console.log(`✅ ${data.length} exigence(s) chargée(s)`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Erreur chargement exigences:", error);
      toast.error("Impossible de charger les exigences");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequirement = (req: Requirement) => {
    console.log("📌 Sélection exigence:", req.official_code);
    
    setSelectedRequirement(req);
    
    // ✅ CHAMPS VIDES (sauf catégorie/criticité suggérés)
    setPcData({
      code: "",
      name: "",
      description: "",
      category: req.domain || "",
      subcategory: req.subdomain || "",
      control_family: "",
      criticality_level: mapRiskLevelToCriticality(req.risk_level),
      implementation_level: "level_1",
      estimated_effort_hours: 4,
      implementation_guidance: "",
      verification_method: "",
      documentation_required: "",
      risk_domains: [],
    });
    
    setStep(3);
    console.log("✅ Passage à l'étape 3 - Saisie PC");
  };

  const mapRiskLevelToCriticality = (
    riskLevel: string
  ): "low" | "medium" | "high" | "critical" => {
    switch (riskLevel?.toUpperCase()) {
      case "CRITICAL":
        return "critical";
      case "HIGH":
        return "high";
      case "MEDIUM":
        return "medium";
      case "LOW":
      default:
        return "low";
    }
  };

  // ============================================
  // FONCTIONS ÉTAPE 3 : SAISIE PC
  // ============================================
  
  const handleAddRiskDomain = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !pcData.risk_domains.includes(cleanTag)) {
      setPcData({
        ...pcData,
        risk_domains: [...pcData.risk_domains, cleanTag],
      });
      setRiskDomainInput("");
    }
  };

  const handleRemoveRiskDomain = (tag: string) => {
    setPcData({
      ...pcData,
      risk_domains: pcData.risk_domains.filter((t) => t !== tag),
    });
  };

  const handleSubmitPCData = async () => {
    console.log("🔘 BOUTON CLIQUÉ !");
    console.log("📊 Données PC:", pcData);
    
    // Validation
    console.log("✅ Validation nom:", pcData.name.trim()); // ✅ AJOUTEZ
    if (!pcData.name.trim()) {
      console.log("❌ BLOQUÉ : Nom vide"); // ✅ AJOUTEZ
      toast.error("Le nom du PC est obligatoire");
      return;
    }
    
    console.log("✅ Validation description:", pcData.description.length); // ✅ AJOUTEZ
    if (!pcData.description.trim() || pcData.description.length < 50) {
      console.log("❌ BLOQUÉ : Description trop courte"); // ✅ AJOUTEZ
      toast.error("La description doit contenir au moins 50 caractères");
      return;
    }
    
    console.log("✅ Validation famille:", pcData.control_family); // ✅ AJOUTEZ
    if (!pcData.control_family) {
      console.log("❌ BLOQUÉ : Famille non sélectionnée"); // ✅ AJOUTEZ
      toast.error("La famille de contrôle est obligatoire");
      return;
    }

    // Validation format code (si renseigné)
    console.log("✅ Validation code:", pcData.code); // ✅ AJOUTEZ
    if (pcData.code.trim() && !/^CP-[A-Z0-9]+$/i.test(pcData.code)) {
      console.log("❌ BLOQUÉ : Format code invalide"); // ✅ AJOUTEZ
      toast.error("Le code doit être au format CP-XXXXX (ex: CP-A8271)");
      return;
    }

    console.log("🚀 VALIDATION OK - Appel searchSimilarPCs()"); // ✅ AJOUTEZ
    await searchSimilarPCs();
  };


const searchSimilarPCs = async () => {
  setSearching(true);
  setSimilarPCs([]);
  setSelectedPCIds(new Set());

  try {
    console.log("🔍 Recherche de PCs similaires");

    const searchText = `${pcData.name} ${pcData.description}`.trim();

    const res = await fetch(`${API}/api/v1/control-points/search-similar`, {  // ✅ Sans slash final
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requirement_id: selectedRequirement?.id || "",
        requirement_text: searchText,
        domain: pcData.category,
        subdomain: pcData.subcategory,
        min_similarity: 0.7,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Erreur inconnue" }));
      const errorMessage = errorData.detail || "Erreur lors de la recherche de similarité";

      console.error("❌ Erreur recherche:", errorMessage);

      // ✅ CORRECTION : Afficher un toast d'avertissement mais CONTINUER vers l'étape 4
      if (res.status === 500) {
        toast.error(
          "⚠️ La recherche de similarité n'a pas pu être effectuée.\n" +
          "Vous pouvez créer le PC manuellement.",
          { duration: 5000 }
        );
      } else {
        toast.error(`❌ Erreur (${res.status}): ${errorMessage}`, { duration: 5000 });
      }

      // ✅ TOUJOURS passer à l'étape 4 avec liste vide
      setSimilarPCs([]);
      setStep(4);
      return;
    }

    // ✅ Réponse OK : traiter les résultats
    const data = await res.json();
    const similar = data.similar_control_points || [];

    console.log(`✅ ${similar.length} PC(s) similaire(s) trouvé(s)`);
    setSimilarPCs(similar);

    // ✅ TOUJOURS passer à l'étape 4
    setStep(4);

  } catch (error) {
    console.error("❌ Erreur réseau:", error);

    // ✅ Erreur réseau : toast + passage étape 4
    toast.error(
      "❌ Impossible de communiquer avec le serveur.\n" +
      "Vous pouvez créer le PC manuellement. Si le problème persiste, contactez un administrateur.",
      { duration: 5000 }
    );

    setSimilarPCs([]);
    setStep(4);

  } finally {
    setSearching(false);
  }
};


  // ============================================
  // FONCTIONS ÉTAPE 4 : SAUVEGARDE
  // ============================================
  
  const togglePCSelection = (pcId: string) => {
    setSelectedPCIds((prev) => {
      const next = new Set(prev);
      if (next.has(pcId)) {
        next.delete(pcId);
      } else {
        next.add(pcId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (saveAction === "link") {
      if (selectedPCIds.size === 0) {
        toast.error("Veuillez sélectionner au moins un PC");
        return;
      }
      await handleLinkToExistingPCs();
    } else {
      await handleCreateNew();
    }
  };

  const handleLinkToExistingPCs = async () => {
    if (!selectedRequirement) {
      toast.error("Aucune exigence sélectionnée");
      return;
    }

    setLinking(true);
    let successCount = 0;

    try {
      for (const pcId of selectedPCIds) {
        try {
          const res = await fetch(
            `${API}/api/v1/control-points/${pcId}/link-requirement`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requirement_id: selectedRequirement.id,
              }),
            }
          );

          if (res.ok) {
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Erreur liaison PC ${pcId}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(
          `✅ Exigence ${selectedRequirement.official_code} liée à ${successCount} PC(s)`
        );
        onSuccess();
        onClose();
      } else {
        toast.error("Aucune liaison n'a pu être créée");
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Erreur globale:", error);
      toast.error(err.message || "Erreur liaison");
    } finally {
      setLinking(false);
    }
  };

  const handleCreateNew = async () => {
    console.log("🚀 handleCreateNew() APPELÉE");
    
    if (!selectedRequirement) {
      console.error("❌ Aucune exigence sélectionnée");
      toast.error("Aucune exigence sélectionnée");
      return;
    }

    setLinking(true);

    try {
      // ✅ AJOUTER allow_multiple_pcs=true DANS L'URL
      const url = `${API}/api/v1/control-points/generate-or-link-for-requirement/${selectedRequirement.id}?allow_multiple_pcs=true`;
      
      console.log("🌐 URL:", url);  // ✅ Vérifier l'URL complète
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual_data: {
            code: pcData.code.trim() || undefined,
            name: pcData.name,
            description: pcData.description,
            category: pcData.category,
            subcategory: pcData.subcategory,
            control_family: pcData.control_family,
            criticality_level: pcData.criticality_level,
            implementation_level: pcData.implementation_level,
            estimated_effort_hours: pcData.estimated_effort_hours,
            implementation_guidance: pcData.implementation_guidance,
            verification_method: pcData.verification_method,
            documentation_required: pcData.documentation_required,
            risk_domains: pcData.risk_domains.join(", "),
          },
        }),
      });

      console.log("📥 Statut réponse:", res.status);

      if (!res.ok) throw new Error("Erreur création");

      const result = await res.json();
      console.log("✅ Réponse création:", result);

      // ✅ Gestion des réponses
      if (result.action === "already_linked") {
        toast.error(
          <>
            <div className="font-semibold">⚠️ Exigence déjà liée</div>
            <div className="text-sm mt-1">
              Cette exigence est déjà couverte par le PC <span className="font-mono">{result.control_point?.code}</span>
            </div>
          </>,
          { duration: 5000 }
        );
        onSuccess();
        onClose();
        return;
      }

      // ✅ PC CRÉÉ AVEC SUCCÈS
      const toastId = toast.success(
        <>
          <div className="font-semibold">✨ PC créé avec succès !</div>
          <div className="text-sm mt-1">
            Code : <span className="font-mono">{result.control_point?.code || "N/A"}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                toast.dismiss(toastId);
                setStep(3);
                setPcData({
                  code: "",
                  name: "",
                  description: "",
                  category: pcData.category,
                  subcategory: pcData.subcategory,
                  control_family: "",
                  criticality_level: pcData.criticality_level,
                  implementation_level: "level_1",
                  estimated_effort_hours: 4,
                  implementation_guidance: "",
                  verification_method: "",
                  documentation_required: "",
                  risk_domains: [],
                });
                toast.success("📝 Vous pouvez créer un autre PC pour cette exigence");
              }}
              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
            >
              ➕ Créer un autre PC
            </button>
            <button
              onClick={() => {
                toast.dismiss(toastId);
                onSuccess();
                onClose();
              }}
              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            >
              ✓ Terminer
            </button>
          </div>
        </>,
        { duration: 10000 }
      );

    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Erreur création:", error);
      toast.error(err.message || "Erreur création du PC");
    } finally {
      setLinking(false);
    }
  };
  // ============================================
  // UTILITAIRES
  // ============================================
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toUpperCase()) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border border-red-300";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border border-orange-300";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "LOW":
      default:
        return "bg-green-100 text-green-800 border border-green-300";
    }
  };

  const getCriticalityBadge = (level: string) => {
    switch (level) {
      case "critical":
        return "🔴 Critique";
      case "high":
        return "🟠 Haute";
      case "medium":
        return "🟡 Moyenne";
      case "low":
      default:
        return "🟢 Basse";
    }
  };

  // ============================================
  // RENDU
  // ============================================
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Plus className="w-7 h-7" />
              Créer un Point de Contrôle
            </h2>
            <button
              onClick={onClose}
              disabled={linking || searching}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= s
                      ? "bg-white text-indigo-600 shadow-lg"
                      : "bg-white/20 text-white/60"
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className="flex-1 h-1 mx-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-white transition-all duration-500 ${
                        step > s ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs text-white/80 mt-2">
            <span>Domaine</span>
            <span>Exigence</span>
            <span>Infos PC</span>
            <span>Sélection</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ========================================== */}
          {/* ÉTAPE 1 : SÉLECTION DOMAINE */}
          {/* ========================================== */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                <p className="text-sm text-indigo-900 font-semibold">
                  📂 Sélectionnez un domaine
                </p>
                <p className="text-xs text-indigo-800 mt-1">
                  Choisissez le domaine contenant l'exigence à couvrir
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                </div>
              ) : domains.length === 0 ? (
                <div className="text-center py-20">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun domaine disponible</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {domains.map((domain) => (
                    <button
                      key={domain.id}
                      onClick={() => handleSelectDomain(domain.id)}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all text-left group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded">
                          {domain.code}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded">
                          {domain.requirement_count} exigence{domain.requirement_count > 1 ? "s" : ""}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {domain.title}
                      </h3>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* ÉTAPE 2 : SÉLECTION EXIGENCE */}
          {/* ========================================== */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                <p className="text-sm text-purple-900 font-semibold">
                  📋 Sélectionnez une exigence orpheline
                </p>
                <p className="text-xs text-purple-800 mt-1">
                  Choisissez l'exigence non couverte pour laquelle créer un PC
                </p>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setSelectedDomain(null);
                  setRequirements([]);
                  setFilteredRequirements([]);
                  setSearchQuery("");
                }}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Changer de domaine
              </button>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une exigence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
                </div>
              ) : filteredRequirements.length === 0 ? (
                <div className="text-center py-20">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune exigence trouvée</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredRequirements.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => handleSelectRequirement(req)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded">
                          {req.official_code}
                        </span>
                        {req.risk_level && (
                          <span className={`text-xs px-2.5 py-1 rounded ${getRiskColor(req.risk_level)}`}>
                            {req.risk_level}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-purple-600">
                        {req.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {req.requirement_text}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* ✅ ÉTAPE 3 : SAISIE COMPLÈTE DU PC */}
          {/* ========================================== */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Exigence sélectionnée */}
              {selectedRequirement && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-indigo-700 font-semibold mb-1">
                        📋 Exigence à couvrir :
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-300">
                          {selectedRequirement.official_code}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getRiskColor(selectedRequirement.risk_level)}`}>
                          {selectedRequirement.risk_level}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-indigo-900">
                        {selectedRequirement.title}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🔹 GROUPE 1 : IDENTIFICATION */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-900">Identification</h3>
                </div>

                {/* ✅ Code du PC */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Code du Point de Contrôle
                    <Tooltip text="Identifiant unique (ex: CP-A8271). Laissez vide pour générer automatiquement depuis le backend." />
                  </label>
                  <input
                    type="text"
                    value={pcData.code}
                    onChange={(e) => setPcData({ ...pcData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: CP-A8271 (ou laisser vide pour auto-génération)"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    💡 Si vide, un code sera généré automatiquement par le backend
                  </p>
                </div>

                {/* Nom du PC */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Nom du Point de Contrôle <span className="text-red-500">*</span>
                    <Tooltip text="Nom court et explicite du contrôle (ex: 'Revue trimestrielle des accès privilégiés')" />
                  </label>
                  <input
                    type="text"
                    value={pcData.name}
                    onChange={(e) => setPcData({ ...pcData, name: e.target.value })}
                    placeholder="Ex: Revue périodique des accès à privilèges"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Description détaillée <span className="text-red-500">*</span>
                    <Tooltip text="Expliquez clairement ce qui doit être contrôlé, comment et pourquoi (min. 50 caractères)" />
                  </label>
                  <textarea
                    value={pcData.description}
                    onChange={(e) => setPcData({ ...pcData, description: e.target.value })}
                    placeholder="Ex: Mise en place d'une procédure de révision trimestrielle des comptes à privilèges élevés, incluant la vérification des droits actifs, la suppression des accès obsolètes et la validation par le responsable de la sécurité."
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                  />
                  <p className={`text-xs mt-1.5 font-medium ${pcData.description.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                    {pcData.description.length} / 50 caractères minimum
                    {pcData.description.length >= 50 && " ✓"}
                  </p>
                </div>
              </div>

              {/* 🔹 GROUPE 2 : CLASSIFICATION */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Classification</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Catégorie */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Catégorie <span className="text-red-500">*</span>
                      <Tooltip text="Domaine ISO 27001 (pré-rempli depuis l'exigence)" />
                    </label>
                    <input
                      type="text"
                      value={pcData.category}
                      onChange={(e) => setPcData({ ...pcData, category: e.target.value })}
                      placeholder="Ex: A.8"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    />
                  </div>

                  {/* Sous-catégorie */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Sous-catégorie
                      <Tooltip text="Sous-domaine ISO 27001 (pré-rempli depuis l'exigence)" />
                    </label>
                    <input
                      type="text"
                      value={pcData.subcategory}
                      onChange={(e) => setPcData({ ...pcData, subcategory: e.target.value })}
                      placeholder="Ex: A.8.27"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                </div>

                {/* Famille de contrôle */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Famille de contrôle <span className="text-red-500">*</span>
                    <Tooltip text="Type de mesure de sécurité (Access Control, Cryptography, etc.)" />
                  </label>
                  <select
                    value={pcData.control_family}
                    onChange={(e) => setPcData({ ...pcData, control_family: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">-- Sélectionner une famille --</option>
                    {CONTROL_FAMILIES.map((family) => (
                      <option key={family} value={family}>
                        {family}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 🔹 GROUPE 3 : RISQUE ET EFFORT */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <Shield className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-bold text-gray-900">Risque et Effort</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Criticité */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Criticité <span className="text-red-500">*</span>
                      <Tooltip text="Niveau de risque si le contrôle n'est pas appliqué" />
                    </label>
                    <select
                      value={pcData.criticality_level}
                      onChange={(e) =>
                        setPcData({
                          ...pcData,
                          criticality_level: e.target.value as ControlPointData["criticality_level"],
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="low">🟢 Basse</option>
                      <option value="medium">🟡 Moyenne</option>
                      <option value="high">🟠 Haute</option>
                      <option value="critical">🔴 Critique</option>
                    </select>
                  </div>

                  {/* Niveau d'implémentation */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Niveau d'implémentation
                      <Tooltip text="Maturité requise : Level 1 (basique), Level 2 (intermédiaire), Level 3 (avancé)" />
                    </label>
                    <select
                      value={pcData.implementation_level}
                      onChange={(e) =>
                        setPcData({
                          ...pcData,
                          implementation_level: e.target.value as ControlPointData["implementation_level"],
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="level_1">Niveau 1 - Basique</option>
                      <option value="level_2">Niveau 2 - Intermédiaire</option>
                      <option value="level_3">Niveau 3 - Avancé</option>
                    </select>
                  </div>

                  {/* Effort estimé */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Clock className="w-4 h-4" />
                      Effort (heures)
                      <Tooltip text="Temps estimé pour implémenter ce contrôle" />
                    </label>
                    <input
                      type="number"
                      value={pcData.estimated_effort_hours}
                      onChange={(e) =>
                        setPcData({
                          ...pcData,
                          estimated_effort_hours: parseInt(e.target.value) || 4,
                        })
                      }
                      min="1"
                      max="500"
                      placeholder="Ex: 8"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 🔹 GROUPE 4 : RÉFÉRENCES ET RECOMMANDATIONS */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">Références et Recommandations</h3>
                </div>

                {/* Guide d'implémentation */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Guide d'implémentation
                    <Tooltip text="Instructions pratiques pour mettre en place ce contrôle (optionnel)" />
                  </label>
                  <textarea
                    value={pcData.implementation_guidance}
                    onChange={(e) => setPcData({ ...pcData, implementation_guidance: e.target.value })}
                    placeholder="Ex: 1. Créer une procédure documentée&#10;2. Former l'équipe IT&#10;3. Planifier les revues trimestrielles&#10;4. Mettre en place un tableau de suivi"
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Méthode de vérification */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Méthode de vérification
                    <Tooltip text="Comment auditer ce contrôle ?" />
                  </label>
                  <select
                    value={pcData.verification_method}
                    onChange={(e) => setPcData({ ...pcData, verification_method: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Sélectionner une méthode --</option>
                    {VERIFICATION_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Documentation requise */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Documentation requise
                    <Tooltip text="Quels documents ou preuves doivent être fournis ?" />
                  </label>
                  <input
                    type="text"
                    value={pcData.documentation_required}
                    onChange={(e) => setPcData({ ...pcData, documentation_required: e.target.value })}
                    placeholder="Ex: Procédure de révision, Comptes-rendus de revue, Historique des modifications"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Domaines de risque (Tags) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Domaines de risque
                    <Tooltip text="Mots-clés techniques associés (PAM, IAM, Chiffrement, etc.)" />
                  </label>
                  
                  {/* Tags existants */}
                  {pcData.risk_domains.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pcData.risk_domains.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-lg"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveRiskDomain(tag)}
                            className="hover:text-indigo-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input + Suggestions */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={riskDomainInput}
                      onChange={(e) => setRiskDomainInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && riskDomainInput.trim()) {
                          e.preventDefault();
                          handleAddRiskDomain(riskDomainInput);
                        }
                      }}
                      placeholder="Tapez un domaine et appuyez sur Entrée"
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRiskDomain(riskDomainInput)}
                      disabled={!riskDomainInput.trim()}
                      className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + Ajouter
                    </button>
                  </div>

                  {/* Suggestions */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Suggestions :</p>
                    <div className="flex flex-wrap gap-2">
                      {RISK_DOMAINS_SUGGESTIONS.filter(
                        (sug) => !pcData.risk_domains.includes(sug)
                      ).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleAddRiskDomain(suggestion)}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons Navigation */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  ← Retour
                </button>

                <button
                  onClick={handleSubmitPCData}
                  disabled={
                    !pcData.name.trim() ||
                    pcData.description.length < 50 ||
                    !pcData.control_family ||
                    searching
                  }
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Recherche en cours...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Rechercher PCs similaires →
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* ÉTAPE 4 : SÉLECTION MULTIPLE */}
          {/* ========================================== */}
          {step === 4 && (
            <div className="space-y-5">
              {/* ✅ CAS 1 : PC similaires trouvés */}
              {similarPCs.length > 0 ? (
                <>
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                    <p className="text-sm text-orange-900 font-semibold">
                      ⚠️ {similarPCs.length} PC(s) similaire(s) trouvé(s)
                    </p>
                    <p className="text-xs text-orange-800 mt-1">
                      Sélectionnez les PC(s) à lier OU créez un nouveau PC
                    </p>
                  </div>

                  {/* Rappel PC à créer */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs text-purple-700 font-semibold mb-2">
                      ➕ Nouveau PC (si création nécessaire) :
                    </p>
                    <h4 className="text-sm font-bold text-purple-900">{pcData.name}</h4>
                  </div>

                  {/* ✅ AMÉLIORATION : Bouton Tout sélectionner/désélectionner */}
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{selectedPCIds.size}</span> PC(s) accepté(s) •{" "}
                      <span className="font-semibold">{similarPCs.length - selectedPCIds.size}</span> refusé(s)
                    </p>
                    <button
                      onClick={() => {
                        if (selectedPCIds.size === similarPCs.length) {
                          setSelectedPCIds(new Set()); // Tout décocher
                        } else {
                          setSelectedPCIds(new Set(similarPCs.map(pc => pc.id))); // Tout cocher
                        }
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-colors"
                    >
                      {selectedPCIds.size === similarPCs.length ? "✖ Tout désélectionner" : "✓ Tout sélectionner"}
                    </button>
                  </div>

                  {/* Liste avec checkboxes */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {similarPCs.map((pc) => (
                      <label
                        key={pc.id}
                        className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedPCIds.has(pc.id)
                            ? "border-indigo-500 bg-indigo-50 shadow-lg"
                            : "border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPCIds.has(pc.id)}
                            onChange={() => togglePCSelection(pc.id)}
                            className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-indigo-600 bg-white px-2.5 py-1 rounded border border-indigo-300">
                                {pc.code}
                              </span>
                              <span className="text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded">
                                {Math.round(pc.similarity_score * 100)}% similaire
                              </span>
                              <span className="text-xs px-2.5 py-1 bg-gray-100 rounded">
                                {getCriticalityBadge(pc.criticality_level)}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 mb-1">{pc.name}</h4>
                            <p className="text-xs text-gray-600 line-clamp-2">{pc.description}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Choix action */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Action à effectuer :</p>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="saveAction"
                        value="link"
                        checked={saveAction === "link"}
                        onChange={(e) => setSaveAction(e.target.value as "link" | "create")}
                        className="mt-1 w-4 h-4 text-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          🔗 Lier l'exigence aux PC(s) sélectionné(s)
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedPCIds.size > 0 
                            ? `${selectedPCIds.size} accepté(s) • ${similarPCs.length - selectedPCIds.size} refusé(s)`
                            : "Aucun PC sélectionné"
                          }
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="saveAction"
                        value="create"
                        checked={saveAction === "create"}
                        onChange={(e) => setSaveAction(e.target.value as "link" | "create")}
                        className="mt-1 w-4 h-4 text-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">➕ Créer un nouveau PC</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Ignore toutes les suggestions et crée &quot;{pcData.name}&quot;
                        </p>
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                /* ✅ CAS 2 : Aucun PC similaire trouvé */
                <>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-900 font-semibold">
                          ℹ️ Aucun PC similaire trouvé
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                          Vous allez créer un nouveau Point de Contrôle pour couvrir cette exigence
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ✅ Récapitulatif du PC à créer */}
                  <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                      <Plus className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-gray-900">Point de Contrôle à créer</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Code */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Code</p>
                        <p className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded border border-indigo-200">
                          {pcData.code || "🔄 Auto-généré par le backend"}
                        </p>
                      </div>

                      {/* Criticité */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Criticité</p>
                        <p className="text-sm font-semibold px-3 py-2 bg-gray-50 rounded">
                          {getCriticalityBadge(pcData.criticality_level)}
                        </p>
                      </div>

                      {/* Nom */}
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Nom</p>
                        <p className="text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded">
                          {pcData.name}
                        </p>
                      </div>

                      {/* Description */}
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Description</p>
                        <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded leading-relaxed">
                          {pcData.description}
                        </p>
                      </div>

                      {/* Famille de contrôle */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Famille de contrôle</p>
                        <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded">
                          {pcData.control_family}
                        </p>
                      </div>

                      {/* Effort estimé */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Effort estimé</p>
                        <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          {pcData.estimated_effort_hours}h
                        </p>
                      </div>

                      {/* Niveau d'implémentation */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-semibold">Niveau d'implémentation</p>
                        <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded">
                          {pcData.implementation_level === "level_1" && "Niveau 1 - Basique"}
                          {pcData.implementation_level === "level_2" && "Niveau 2 - Intermédiaire"}
                          {pcData.implementation_level === "level_3" && "Niveau 3 - Avancé"}
                        </p>
                      </div>

                      {/* Domaines de risque */}
                      {pcData.risk_domains.length > 0 && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500 mb-2 font-semibold">Domaines de risque</p>
                          <div className="flex flex-wrap gap-2">
                            {pcData.risk_domains.map((domain) => (
                              <span
                                key={domain}
                                className="text-xs font-semibold px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg"
                              >
                                {domain}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ Bouton de création centré */}
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleCreateNew}
                      disabled={linking}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-2xl transition-all transform hover:scale-105"
                    >
                      {linking ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Création en cours...
                        </>
                      ) : (
                        <>
                          <Plus className="w-6 h-6" />
                          Créer le nouveau PC et générer l'embedding
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* ✅ Bouton Retour (toujours visible) */}
              <div className="pt-4 border-t">
                <button
                  onClick={() => setStep(3)}
                  disabled={linking}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Modifier les informations du PC
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={linking || searching}
            className="px-6 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>

          {step === 4 && similarPCs.length > 0 && (
            <button
              onClick={handleSave}
              disabled={
                linking ||
                (saveAction === "link" && selectedPCIds.size === 0)
              }
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {linking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  {saveAction === "link" ? (
                    <>
                      <Link2 className="w-5 h-5" />
                      Lier aux {selectedPCIds.size} PC(s)
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Créer le nouveau PC
                    </>
                  )}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}