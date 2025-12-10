"use client";
import CreateControlPointModal from './CreateControlPointModal';
import EditControlPointModal from './EditControlPointModal';
import DeleteConfirmModal from '@/app/components/shared/DeleteConfirmModal';
import SuccessToast from '@/components/shared/SuccessToast';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Target,
  TrendingUp,
  Database,
  Shield,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import "@/app/styles/points-controle.css";

// ==================== INTERFACES ====================

interface Framework {
  id: string;
  code: string;
  name: string;
  version: string;
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
  status: "approved" | "pending" | "rejected";
  created_by?: string;
  mapped_requirements_details?: RequirementDetail[];
}

interface DomainGroup {
  domain: string;
  points: ControlPoint[];
  count: number;
}

interface CoverageStats {
  total_requirements: number;
  covered_requirements: number;
  orphan_requirements: number;
  coverage_percentage: number;
  total_control_points: number;
}

// ==================== COMPOSANT PRINCIPAL ====================

export default function ControlPointDetailPage() {
  const router = useRouter();
  const params = useParams();
  const frameworkId = params.id as string;

  // États
  const [framework, setFramework] = useState<Framework | null>(null);
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([]);
  const [orphanRequirements, setOrphanRequirements] = useState<RequirementDetail[]>([]);
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isGeneratingOrphans, setIsGeneratingOrphans] = useState(false);
  const [generatingRequirementId, setGeneratingRequirementId] = useState<string | null>(null);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCP, setEditingCP] = useState<ControlPoint | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cpToDelete, setCpToDelete] = useState<{
    id: string;
    code: string;
    name: string;
    mappedCount: number;
  } | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ==================== CHARGEMENT DONNÉES ====================

  useEffect(() => {
    fetchData();
  }, [frameworkId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fwRes = await fetch(`${API}/api/v1/frameworks/${frameworkId}`);
      if (!fwRes.ok) throw new Error("Référentiel introuvable");
      const fwData = await fwRes.json();
      setFramework(fwData);

      const cpRes = await fetch(`${API}/api/v1/control-points/?framework_id=${frameworkId}&limit=1000`);
      if (cpRes.ok) {
        const cpData = await cpRes.json();
        let pcs = cpData.control_points || [];

        pcs = pcs.map((pc: ControlPoint) => {
          if (!pc.domain && pc.mapped_requirements_details && pc.mapped_requirements_details.length > 0) {
            pc.domain = pc.mapped_requirements_details[0].domain || "Non catégorisé";
          }
          return pc;
        });

        setControlPoints(pcs);

        const domains = new Set<string>(pcs.map((p: ControlPoint) => p.domain || "Non catégorisé"));
        setExpandedDomains(domains);
      }

      const coverageRes = await fetch(`${API}/api/v1/control-points/framework/${frameworkId}/coverage`);
      if (coverageRes.ok) {
        const coverageData = await coverageRes.json();
        setStats(coverageData.statistics);
        setOrphanRequirements(coverageData.orphan_requirements || []);
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // ==================== ACTIONS ====================

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

  const handleEditCP = (cp: ControlPoint) => {
    console.log("🖊️ Édition du PC:", cp.code);
    setEditingCP(cp);
    setShowEditModal(true);
  };

  const handleGenerateForOrphan = async (requirement: RequirementDetail) => {
    setGeneratingRequirementId(requirement.id);
    try {
      const res = await fetch(`${API}/api/v1/control-points/generate-or-link-for-requirement/${requirement.id}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Erreur génération");

      const data = await res.json();

      if (data.action === "created") {
        toast.success(`Point de contrôle ${data.control_point.code} créé avec succès`);
      } else if (data.action === "linked") {
        toast.success(`Exigence liée au PC existant ${data.control_point.code}`);
      }

      await fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setGeneratingRequirementId(null);
    }
  };

  const handleGenerateAllOrphans = async () => {
    if (!confirm(`Générer des PCs pour les ${orphanRequirements.length} exigences orphelines ?`)) return;

    setIsGeneratingOrphans(true);
    try {
      const res = await fetch(`${API}/api/v1/control-points/generate-orphan-requirements/${frameworkId}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Erreur génération");

      const data = await res.json();
      toast.success(`${data.generated_control_points} PC générés pour les orphelines`);

      await fetchData();
    } catch (error) {
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGeneratingOrphans(false);
    }
  };

  const handleDeleteCP = (cp: ControlPoint) => {
    setCpToDelete({
      id: cp.id,
      code: cp.code,
      name: cp.name,
      mappedCount: cp.mapped_requirements_details?.length || 0
    });
    setDeleteModalOpen(true);
  };

  const confirmDeleteCP = async () => {
    if (!cpToDelete) return;

    try {
      const res = await fetch(`${API}/api/v1/control-points/${cpToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erreur suppression");

      const result = await res.json();

      toast.custom(() => (
        <SuccessToast
          title="Point de contrôle supprimé"
          message={`Le PC ${result.control_point_code} a été supprimé avec succès`}
          details={[
            { label: "Code", value: result.control_point_code },
            { label: "Liaisons supprimées", value: result.deleted_mappings },
            { label: "Embeddings supprimés", value: result.deleted_embeddings }
          ]}
        />
      ), { duration: 5000 });

      await fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteModalOpen(false);
      setCpToDelete(null);
    }
  };

  // ==================== UTILITAIRES ====================

  const groupControlPointsByDomain = (points: ControlPoint[]): DomainGroup[] => {
    const grouped = new Map<string, ControlPoint[]>();

    points.forEach((point) => {
      let domain = point.domain || "Non catégorisé";

      if (domain === "Non catégorisé" && point.mapped_requirements_details && point.mapped_requirements_details.length > 0) {
        const firstReqDomain = point.mapped_requirements_details[0].domain;
        if (firstReqDomain) {
          domain = firstReqDomain;
        }
      }

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
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getCriticalityColor = (criticality?: string) => {
    switch (criticality?.toLowerCase()) {
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

  const getRiskLevelColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
      case "HIGH":
        return "bg-red-100 text-red-700";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  const filteredControlPoints = controlPoints.filter(
    (cp) =>
      cp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cp.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==================== RENDU ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des points de contrôle...</p>
        </div>
      </div>
    );
  }

  const domainGroups = groupControlPointsByDomain(filteredControlPoints);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header Sticky */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <button
            onClick={() => router.push("/admin/points-controle")}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition mb-3 sm:mb-4 group text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour aux référentiels</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs sm:text-sm font-mono font-bold">
                    {framework?.code}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500">v{framework?.version}</span>
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{framework?.name}</h1>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:scale-105 flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Ajouter un PC</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenu scrollable */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{stats.total_requirements}</div>
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 truncate">Exigences totales</div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600">{stats.total_control_points}</div>
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 truncate">Points de contrôle</div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{stats.covered_requirements}</div>
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 truncate">Couvertes</div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{stats.orphan_requirements}</div>
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 truncate">Orphelines</div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">
                  {stats.coverage_percentage.toFixed(1)}%
                </div>
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 truncate">Couverture</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un point de contrôle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm sm:text-base"
            />
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {domainGroups.map((group) => {
            const isExpanded = expandedDomains.has(group.domain);

            return (
              <div
                key={group.domain}
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all hover:shadow-xl"
              >
                <button
                  onClick={() => toggleExpandDomain(group.domain)}
                  className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 transition-transform flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-gray-400 group-hover:text-indigo-600 transition-all flex-shrink-0" />
                    )}
                    <div className="text-left min-w-0">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">📂 {group.domain}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {group.count} point{group.count > 1 ? "s" : ""} de contrôle
                      </p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {group.points.map((cp, idx) => {
                      const isPointExpanded = expandedPoints.has(cp.id);

                      return (
                        <div key={cp.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-all">
                          <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
                            <div className="flex-shrink-0 hidden sm:block">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg text-sm sm:text-base">
                                {idx + 1}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                                    <span className="sm:hidden w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                      {idx + 1}
                                    </span>
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white border-2 border-indigo-300 rounded-lg text-xs sm:text-sm font-mono font-bold text-indigo-700">
                                      {cp.code}
                                    </span>
                                    {cp.criticality_level && (
                                      <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border ${getCriticalityColor(cp.criticality_level)}`}>
                                        {cp.criticality_level.toUpperCase()}
                                      </span>
                                    )}
                                    {cp.estimated_effort_hours && (
                                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700 hidden md:inline-block">
                                        {cp.estimated_effort_hours}h
                                      </span>
                                    )}
                                    {cp.ai_confidence && (
                                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-purple-100 text-purple-700 hidden lg:inline-block">
                                        IA: {Math.round(cp.ai_confidence * 100)}%
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1 sm:mb-2">{cp.name}</h4>
                                  <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed line-clamp-3 sm:line-clamp-none">{cp.description}</p>
                                </div>

                                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleEditCP(cp)}
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-2 hover:shadow-lg text-xs sm:text-sm"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Éditer</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCP(cp)}
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-1 sm:gap-2 hover:shadow-lg text-xs sm:text-sm"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Supprimer</span>
                                  </button>
                                </div>
                              </div>

                              {cp.mapped_requirements_details && cp.mapped_requirements_details.length > 0 && (
                                <div className="mt-4">
                                  <button
                                    onClick={() => toggleExpandPoint(cp.id)}
                                    className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-all group"
                                  >
                                    {isPointExpanded ? (
                                      <ChevronDown className="w-5 h-5 transition-transform" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    )}
                                    <span>
                                      {isPointExpanded ? "Masquer" : "Afficher"} les{" "}
                                      {cp.mapped_requirements_details.length} exigence(s) mappée(s)
                                    </span>
                                  </button>

                                  {isPointExpanded && (
                                    <div className="mt-4 space-y-3">
                                      {cp.mapped_requirements_details.map((req, reqIdx) => (
                                        <div
                                          key={req.id}
                                          className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
                                        >
                                          <div className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">
                                              {reqIdx + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                                                  {req.official_code}
                                                </span>
                                                {req.risk_level && (
                                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getRiskLevelColor(req.risk_level)}`}>
                                                    {req.risk_level}
                                                  </span>
                                                )}
                                              </div>
                                              <h5 className="text-sm font-bold text-gray-900 mb-1">{req.title}</h5>
                                              <p className="text-xs text-gray-600 leading-relaxed">{req.requirement_text}</p>
                                              {(req.domain || req.subdomain) && (
                                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                                  {req.domain && (
                                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                                      <span className="font-semibold">📂</span>
                                                      {req.domain}
                                                    </span>
                                                  )}
                                                  {req.subdomain && (
                                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                                      <span className="font-semibold">→</span>
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
        </div>

        {orphanRequirements.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-orange-900 mb-2">
                  Exigences non couvertes ({orphanRequirements.length})
                </h3>
                <p className="text-orange-800 mb-4">
                  Ces exigences n'ont pas encore de point de contrôle associé.
                </p>

                <button
                  onClick={handleGenerateAllOrphans}
                  disabled={isGeneratingOrphans}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
                >
                  {isGeneratingOrphans ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Générer tous les PCs manquants
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {orphanRequirements.map((req, idx) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border-2 border-orange-200 p-5 hover:border-orange-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded border border-orange-300">
                          {req.official_code}
                        </span>
                        {req.risk_level && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${getRiskLevelColor(req.risk_level)}`}>
                            {req.risk_level}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mb-1.5">{req.title}</h4>
                      <p className="text-xs text-gray-700 leading-relaxed mb-3">{req.requirement_text}</p>

                      <button
                        onClick={() => handleGenerateForOrphan(req)}
                        disabled={generatingRequirementId !== null}
                        className={`px-4 py-2.5 rounded-lg transition-all font-semibold text-sm shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                          generatingRequirementId === req.id
                            ? "bg-purple-600 text-white animate-pulse"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"
                        }`}
                      >
                        {generatingRequirementId === req.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Génération...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Générer un PC
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateControlPointModal
          frameworkId={frameworkId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchData();
            setShowCreateModal(false);
          }}
        />
      )}

      {showEditModal && editingCP && (
        <EditControlPointModal
          controlPoint={editingCP}
          frameworkId={frameworkId}
          onClose={() => {
            setShowEditModal(false);
            setEditingCP(null);
          }}
          onSuccess={() => {
            fetchData();
            setShowEditModal(false);
            setEditingCP(null);
          }}
        />
      )}

      {deleteModalOpen && cpToDelete && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setCpToDelete(null);
          }}
          onConfirm={confirmDeleteCP}
          title="Confirmation de suppression"
          subtitle="Action irréversible"
          warningMessage="Vous êtes sur le point de supprimer définitivement le point de contrôle"
          itemCode={cpToDelete.code}
          itemName={cpToDelete.name}
          elements={[
            { count: 1, label: "Point de contrôle", color: "blue" },
            { 
              count: cpToDelete.mappedCount, 
              label: `Liaison${cpToDelete.mappedCount > 1 ? 's' : ''} avec exigence${cpToDelete.mappedCount > 1 ? 's' : ''}`, 
              color: "green" 
            },
            { count: '∞', label: "Embeddings et mappings associés", color: "yellow" }
          ]}
        />
      )}
    </div>
  );
}