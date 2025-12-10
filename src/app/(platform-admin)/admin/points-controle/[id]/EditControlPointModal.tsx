"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Search, Trash2, Plus, AlertTriangle, ChevronLeft, Info, Lightbulb, Shield, Clock, FileText, Tag, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ==================== INTERFACES ====================

interface EditControlPointModalProps {
  controlPoint: ControlPoint;
  frameworkId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ControlPoint {
  id: string;
  code: string;
  name: string;
  description: string;
  domain?: string;
  subdomain?: string;
  category?: string;
  subcategory?: string;
  control_family?: string;
  risk_domains?: string[];
  criticality_level?: string;
  implementation_level?: string;
  estimated_effort_hours?: number;
  implementation_guidance?: string;
  verification_method?: string;
  documentation_required?: string;
  ai_confidence?: number;
  is_active: boolean;
  created_by?: string;
  mapped_requirements_details?: RequirementDetail[];
}

interface RequirementDetail {
  id: string;
  official_code: string;
  title: string;
  requirement_text: string;
  domain?: string;
  subdomain?: string;
  risk_level?: string;
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
  code: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  control_family: string;
  criticality_level: "low" | "medium" | "high" | "critical";
  implementation_level: "level_1" | "level_2" | "level_3";
  estimated_effort_hours: number;
  implementation_guidance: string;
  verification_method: string;
  documentation_required: string;
  risk_domains: string[];
}

// ==================== CONSTANTES ====================

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

// ==================== COMPOSANT TOOLTIP ====================

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block">
    <Info className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
    <div className="invisible group-hover:visible absolute z-50 w-64 p-2 mt-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg -left-24">
      {text}
    </div>
  </div>
);

// ==================== COMPOSANT PRINCIPAL ====================

export default function EditControlPointModal({
  controlPoint,
  frameworkId,
  onClose,
  onSuccess,
}: EditControlPointModalProps) {
  // ============================================
  // ÉTATS
  // ============================================
  const [activeTab, setActiveTab] = useState<"info" | "requirements">("info");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Code original (pour vérifier les doublons)
  const [originalCode, setOriginalCode] = useState(controlPoint.code);

  // Validation du code
  const [codeValidation, setCodeValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'duplicate';
    message: string;
  }>({ status: 'idle', message: '' });

  // Données du PC
  const [pcData, setPcData] = useState<ControlPointData>({
    code: controlPoint.code || "",
    name: controlPoint.name || "",
    description: controlPoint.description || "",
    category: controlPoint.category || "",
    subcategory: controlPoint.subcategory || "",
    control_family: controlPoint.control_family || "",
    criticality_level: (controlPoint.criticality_level || "medium") as ControlPointData["criticality_level"],
    implementation_level: (controlPoint.implementation_level || "level_1") as ControlPointData["implementation_level"],
    estimated_effort_hours: controlPoint.estimated_effort_hours || 4,
    implementation_guidance: controlPoint.implementation_guidance || "",
    verification_method: controlPoint.verification_method || "",
    documentation_required: controlPoint.documentation_required || "",
    risk_domains: Array.isArray(controlPoint.risk_domains)
      ? controlPoint.risk_domains
      : (typeof controlPoint.risk_domains === 'string' && (controlPoint.risk_domains as string).trim())
        ? (controlPoint.risk_domains as string).split(',').map(d => d.trim())
        : [],
  });

  // Exigences liées actuelles
  const [currentRequirements, setCurrentRequirements] = useState<RequirementDetail[]>(
    controlPoint.mapped_requirements_details || []
  );
  const [requirementsToRemove, setRequirementsToRemove] = useState<Set<string>>(new Set());

  // Ajout de nouvelles exigences
  const [showAddRequirements, setShowAddRequirements] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<Requirement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [requirementsToAdd, setRequirementsToAdd] = useState<Requirement[]>([]);

  // Tags pour domaines de risque
  const [riskDomainInput, setRiskDomainInput] = useState("");

  // ============================================
  // VÉRIFICATION UNICITÉ DU CODE (DEBOUNCE)
  // ============================================
  useEffect(() => {
    if (pcData.code && pcData.code !== originalCode) {
      const timer = setTimeout(async () => {
        setCodeValidation({ status: 'checking', message: 'Vérification...' });
        
        try {
          const res = await fetch(`${API}/api/v1/control-points/check-code/${pcData.code}?exclude_id=${controlPoint.id}`);
          const data = await res.json();
          
          if (data.exists) {
            setCodeValidation({
              status: 'duplicate',
              message: '⚠️ Ce code existe déjà'
            });
          } else {
            setCodeValidation({
              status: 'valid',
              message: '✅ Code disponible'
            });
          }
        } catch (error) {
          setCodeValidation({
            status: 'idle',
            message: ''
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setCodeValidation({ status: 'idle', message: '' });
    }
  }, [pcData.code, originalCode, controlPoint.id]);

  // ============================================
  // CHARGEMENT DOMAINES
  // ============================================
  useEffect(() => {
    if (showAddRequirements && domains.length === 0) {
      fetchDomains();
    }
  }, [showAddRequirements]);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/frameworks/${frameworkId}/domains`);
      if (!res.ok) throw new Error("Erreur chargement domaines");

      const data = await res.json();
      setDomains(data || []);
      console.log(`✅ ${data.length} domaine(s) chargés`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Erreur chargement domaines:", error);
      toast.error("Impossible de charger les domaines");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CHARGEMENT EXIGENCES PAR DOMAINE
  // ============================================
  useEffect(() => {
    if (selectedDomain) {
      fetchRequirements(selectedDomain);
    }
  }, [selectedDomain]);

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
      console.log(`✅ ${data.length} exigence(s) chargées`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Erreur chargement exigences:", error);
      toast.error("Impossible de charger les exigences");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTRAGE RECHERCHE EXIGENCES
  // ============================================
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
  // GESTION EXIGENCES
  // ============================================
  const handleMarkForRemoval = (reqId: string) => {
    setRequirementsToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  const handleAddRequirement = (req: Requirement) => {
    // Vérifier si déjà présente
    const alreadyLinked = currentRequirements.some(r => r.id === req.id);
    const alreadyAdded = requirementsToAdd.some(r => r.id === req.id);

    if (alreadyLinked) {
      toast.error("Cette exigence est déjà liée au PC");
      return;
    }

    if (alreadyAdded) {
      toast.error("Cette exigence est déjà dans la liste à ajouter");
      return;
    }

    setRequirementsToAdd((prev) => [...prev, req]);
    toast.success(`Exigence ${req.official_code} ajoutée`);
  };

  const handleRemoveFromAddList = (reqId: string) => {
    setRequirementsToAdd((prev) => prev.filter(r => r.id !== reqId));
  };

  // ============================================
  // GESTION RISK DOMAINS (TAGS)
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

  // ============================================
  // SAUVEGARDE
  // ============================================
  const handleSave = async () => {
    console.log("💾 Sauvegarde du PC...");

    // Validation
    if (!pcData.name.trim()) {
      toast.error("Le nom du PC est obligatoire");
      return;
    }

    if (pcData.description.length < 50) {
      toast.error("La description doit contenir au moins 50 caractères");
      return;
    }

    if (!pcData.control_family) {
      toast.error("La famille de contrôle est obligatoire");
      return;
    }

    if (codeValidation.status === 'duplicate') {
      toast.error("Le code existe déjà. Veuillez en choisir un autre.");
      return;
    }

    // Vérifier qu'il reste au moins une exigence
    const remainingCurrentReqs = currentRequirements.filter(r => !requirementsToRemove.has(r.id));
    const totalRequirements = remainingCurrentReqs.length + requirementsToAdd.length;

    if (totalRequirements === 0) {
      toast.error("Un PC doit avoir au moins une exigence liée");
      return;
    }

    setSaving(true);

    try {
      // Préparer les IDs des exigences finales
      const finalRequirementIds = [
        ...remainingCurrentReqs.map(r => r.id),
        ...requirementsToAdd.map(r => r.id)
      ];

      const payload = {
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
        requirement_ids: finalRequirementIds,
      };

      console.log("📤 Payload:", payload);

      const res = await fetch(`${API}/api/v1/control-points/${controlPoint.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Erreur lors de la mise à jour");
      }

      const result = await res.json();
      console.log("✅ PC mis à jour:", result);

      toast.success(
        <>
          <div className="font-semibold">✅ PC mis à jour avec succès !</div>
          <div className="text-sm mt-1">
            Code : <span className="font-mono">{result.code || pcData.code}</span>
          </div>
        </>,
        { duration: 5000 }
      );

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Erreur sauvegarde:", error);
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                🖊️ Éditer le Point de Contrôle
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Code : <span className="font-mono font-bold">{controlPoint.code}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* TABS */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-3 rounded-t-xl font-semibold transition-all ${
                activeTab === "info"
                  ? "bg-white text-indigo-600 shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              📋 Informations du PC
            </button>
            <button
              onClick={() => setActiveTab("requirements")}
              className={`px-6 py-3 rounded-t-xl font-semibold transition-all ${
                activeTab === "requirements"
                  ? "bg-white text-indigo-600 shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              🔗 Exigences liées ({currentRequirements.length - requirementsToRemove.size + requirementsToAdd.length})
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ========================================== */}
          {/* ONGLET 1 : INFORMATIONS DU PC */}
          {/* ========================================== */}
          {activeTab === "info" && (
            <div className="space-y-6">
              {/* GROUPE 1 : IDENTIFICATION */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-900">Identification</h3>
                </div>

                {/* Code du PC */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Code du Point de Contrôle <span className="text-red-500">*</span>
                    <Tooltip text="Identifiant unique (ex: CP-A8271)" />
                  </label>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={pcData.code}
                      onChange={(e) => setPcData({ ...pcData, code: e.target.value.toUpperCase() })}
                      className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-sm transition-all ${
                        codeValidation.status === 'duplicate' 
                          ? 'border-red-500 bg-red-50' 
                          : codeValidation.status === 'valid'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200'
                      } focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                    />
                    
                    {/* Indicateur de validation */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {codeValidation.status === 'checking' && (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      )}
                      {codeValidation.status === 'valid' && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                      {codeValidation.status === 'duplicate' && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Message de feedback */}
                  {codeValidation.message && (
                    <p className={`text-xs mt-1.5 font-medium ${
                      codeValidation.status === 'duplicate' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {codeValidation.message}
                    </p>
                  )}
                </div>

                {/* Nom du PC */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Nom du Point de Contrôle <span className="text-red-500">*</span>
                    <Tooltip text="Nom court et explicite du contrôle" />
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
                    <Tooltip text="Expliquez clairement ce qui doit être contrôlé (min. 50 caractères)" />
                  </label>
                  <textarea
                    value={pcData.description}
                    onChange={(e) => setPcData({ ...pcData, description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                  />
                  <p className={`text-xs mt-1.5 font-medium ${pcData.description.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                    {pcData.description.length} / 50 caractères minimum
                    {pcData.description.length >= 50 && " ✓"}
                  </p>
                </div>
              </div>

              {/* GROUPE 2 : CLASSIFICATION */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Classification</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Catégorie */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Catégorie
                      <Tooltip text="Domaine ISO 27001" />
                    </label>
                    <input
                      type="text"
                      value={pcData.category}
                      onChange={(e) => setPcData({ ...pcData, category: e.target.value })}
                      placeholder="Ex: A.8"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Sous-catégorie */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      Sous-catégorie
                      <Tooltip text="Sous-domaine ISO 27001" />
                    </label>
                    <input
                      type="text"
                      value={pcData.subcategory}
                      onChange={(e) => setPcData({ ...pcData, subcategory: e.target.value })}
                      placeholder="Ex: A.8.27"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Famille de contrôle */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Famille de contrôle <span className="text-red-500">*</span>
                    <Tooltip text="Type de mesure de sécurité" />
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

              {/* GROUPE 3 : RISQUE ET EFFORT */}
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
                      <Tooltip text="Maturité requise" />
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* GROUPE 4 : RÉFÉRENCES */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-900">Références et Recommandations</h3>
                </div>

                {/* Guide d'implémentation */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    Guide d'implémentation
                    <Tooltip text="Instructions pratiques pour mettre en place ce contrôle" />
                  </label>
                  <textarea
                    value={pcData.implementation_guidance}
                    onChange={(e) => setPcData({ ...pcData, implementation_guidance: e.target.value })}
                    placeholder="Ex: 1. Créer une procédure documentée&#10;2. Former l'équipe IT&#10;3. Planifier les revues trimestrielles"
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
                    placeholder="Ex: Procédure de révision, Comptes-rendus, Historique"
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
            </div>
          )}

          {/* ========================================== */}
          {/* ONGLET 2 : EXIGENCES LIÉES */}
          {/* ========================================== */}
          {activeTab === "requirements" && (
            <div className="space-y-6">
              {/* Exigences actuelles */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      Exigences actuellement liées ({currentRequirements.length - requirementsToRemove.size})
                    </h3>
                  </div>
                  {requirementsToRemove.size > 0 && (
                    <span className="text-sm text-red-600 font-semibold">
                      {requirementsToRemove.size} à supprimer
                    </span>
                  )}
                </div>

                {currentRequirements.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Aucune exigence liée</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {currentRequirements.map((req) => {
                      const isMarkedForRemoval = requirementsToRemove.has(req.id);

                      return (
                        <div
                          key={req.id}
                          className={`p-4 border-2 rounded-xl transition-all ${
                            isMarkedForRemoval
                              ? "border-red-300 bg-red-50 opacity-60"
                              : "border-gray-200 hover:border-indigo-300 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                                  {req.official_code}
                                </span>
                                {req.risk_level && (
                                  <span className={`text-xs px-2.5 py-1 rounded ${getRiskColor(req.risk_level)}`}>
                                    {req.risk_level}
                                  </span>
                                )}
                                {isMarkedForRemoval && (
                                  <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded font-semibold">
                                    ❌ À supprimer
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-gray-900 mb-1">{req.title}</h4>
                              <p className="text-xs text-gray-600 line-clamp-2">{req.requirement_text}</p>
                            </div>

                            <button
                              onClick={() => handleMarkForRemoval(req.id)}
                              className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                isMarkedForRemoval
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-600 hover:text-white"
                              }`}
                            >
                              {isMarkedForRemoval ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Annuler
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  Retirer
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Exigences à ajouter */}
              {requirementsToAdd.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-200">
                    <Plus className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-green-900">
                      Nouvelles exigences à ajouter ({requirementsToAdd.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {requirementsToAdd.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-white border-2 border-green-300 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded border border-green-300">
                                {req.official_code}
                              </span>
                              {req.risk_level && (
                                <span className={`text-xs px-2.5 py-1 rounded ${getRiskColor(req.risk_level)}`}>
                                  {req.risk_level}
                                </span>
                              )}
                              <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded font-semibold">
                                ✅ Nouvelle
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 mb-1">{req.title}</h4>
                            <p className="text-xs text-gray-600 line-clamp-2">{req.requirement_text}</p>
                          </div>

                          <button
                            onClick={() => handleRemoveFromAddList(req.id)}
                            className="px-3 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Retirer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajouter de nouvelles exigences */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-blue-900">Ajouter des exigences</h3>
                  </div>
                  <button
                    onClick={() => setShowAddRequirements(!showAddRequirements)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
                  >
                    {showAddRequirements ? "Masquer" : "Afficher"}
                  </button>
                </div>

                {showAddRequirements && (
                  <div className="space-y-4 mt-4">
                    {/* Sélection domaine */}
                    {!selectedDomain && (
                      <div>
                        <p className="text-sm text-blue-800 mb-3 font-semibold">
                          1️⃣ Sélectionnez un domaine
                        </p>
                        {loading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {domains.map((domain) => (
                              <button
                                key={domain.id}
                                onClick={() => setSelectedDomain(domain.id)}
                                className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    {domain.code}
                                  </span>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {domain.requirement_count} exigence{domain.requirement_count > 1 ? "s" : ""}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900">{domain.title}</h4>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sélection exigences */}
                    {selectedDomain && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-blue-800 font-semibold">
                            2️⃣ Sélectionnez les exigences à ajouter
                          </p>
                          <button
                            onClick={() => {
                              setSelectedDomain(null);
                              setRequirements([]);
                              setFilteredRequirements([]);
                              setSearchQuery("");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Changer de domaine
                          </button>
                        </div>

                        {/* Recherche */}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Rechercher une exigence..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>

                        {loading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          </div>
                        ) : filteredRequirements.length === 0 ? (
                          <div className="text-center py-8">
                            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">Aucune exigence trouvée</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filteredRequirements.map((req) => {
                              const alreadyLinked = currentRequirements.some(r => r.id === req.id);
                              const alreadyAdded = requirementsToAdd.some(r => r.id === req.id);
                              const disabled = alreadyLinked || alreadyAdded;

                              return (
                                <button
                                  key={req.id}
                                  onClick={() => !disabled && handleAddRequirement(req)}
                                  disabled={disabled}
                                  className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                                    disabled
                                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                                      : "border-gray-200 hover:border-blue-500 hover:shadow-md"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                      {req.official_code}
                                    </span>
                                    {req.risk_level && (
                                      <span className={`text-xs px-2 py-0.5 rounded ${getRiskColor(req.risk_level)}`}>
                                        {req.risk_level}
                                      </span>
                                    )}
                                    {alreadyLinked && (
                                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                                        Déjà liée
                                      </span>
                                    )}
                                    {alreadyAdded && (
                                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                        Ajoutée
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-gray-900 mb-0.5">{req.title}</h4>
                                  <p className="text-xs text-gray-600 line-clamp-1">{req.requirement_text}</p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Avertissement si aucune exigence */}
              {currentRequirements.length - requirementsToRemove.size + requirementsToAdd.length === 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-red-900 mb-1">
                        ⚠️ Attention : Aucune exigence liée
                      </h4>
                      <p className="text-xs text-red-800">
                        Un point de contrôle doit avoir au moins une exigence associée.
                        La sauvegarde sera bloquée.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>

          <div className="flex items-center gap-3">
            {/* Indicateur de modifications */}
            {(requirementsToRemove.size > 0 || requirementsToAdd.length > 0) && (
              <span className="text-sm text-gray-600">
                {requirementsToRemove.size > 0 && (
                  <span className="text-red-600 font-semibold">
                    -{requirementsToRemove.size}
                  </span>
                )}
                {requirementsToRemove.size > 0 && requirementsToAdd.length > 0 && " / "}
                {requirementsToAdd.length > 0 && (
                  <span className="text-green-600 font-semibold">
                    +{requirementsToAdd.length}
                  </span>
                )}
                {" "}exigence(s)
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={
                saving ||
                !pcData.name.trim() ||
                pcData.description.length < 50 ||
                !pcData.control_family ||
                codeValidation.status === 'duplicate' ||
                (currentRequirements.length - requirementsToRemove.size + requirementsToAdd.length === 0)
              }
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Sauvegarder les modifications
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}