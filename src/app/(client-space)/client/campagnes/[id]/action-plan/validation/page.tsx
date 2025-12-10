"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Action {
  local_id: string;
  title: string;
  description: string;
  objective: string;
  deliverables: string[];
  severity: "critical" | "major" | "minor" | "info";
  priority: "P1" | "P2" | "P3";
  recommended_due_days: number;
  suggested_role: string;
  source_questions: string[];
  referential_controls: string[];
  justification: {
    why_action: string;
    why_severity: string;
    why_priority: string;
    why_role: string;
    why_due_days: string;
  };
  assigned_user_id?: string;
  included: boolean; // Pour la checkbox
}

interface ActionPlanData {
  action_plan_summary: {
    title: string;
    overall_risk_level: string;
    total_actions: number;
    global_justification: string;
  };
  actions: Action[];
  statistics: {
    total: number;
    critical_count: number;
    major_count: number;
    minor_count: number;
    info_count: number;
    overall_risk_level: string;
  };
  metadata: {
    campaign_id: string;
    generated_at: string;
    dominant_language: string;
    status: string;
  };
}

export default function ActionPlanValidationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;
  const queryClient = useQueryClient();

  const [planData, setPlanData] = useState<ActionPlanData | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [showJustification, setShowJustification] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loading, setLoading] = useState(true);

  // États pour les dialogs
  const [showNoActionDialog, setShowNoActionDialog] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [showPublishError, setShowPublishError] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");

  useEffect(() => {
    // Récupérer les données du plan depuis sessionStorage
    // (envoyées par la page de génération)
    const storedData = sessionStorage.getItem(`action_plan_${campaignId}`);

    console.log('🔍 DEBUG Validation: SessionStorage key:', `action_plan_${campaignId}`);
    console.log('🔍 DEBUG Validation: Données brutes:', storedData ? storedData.substring(0, 200) + '...' : 'NULL');

    if (storedData) {
      const data: ActionPlanData = JSON.parse(storedData);
      console.log('🔍 DEBUG Validation: Nombre d\'actions parsées:', data.actions?.length);
      console.log('🔍 DEBUG Validation: Actions:', data.actions);

      // Initialiser toutes les actions comme incluses
      data.actions = data.actions.map(action => ({
        ...action,
        included: true
      }));
      setPlanData(data);
      setLoading(false);
    } else {
      console.log('❌ DEBUG Validation: Aucune donnée trouvée, redirection...');
      // Pas de données, retour à la campagne
      router.push(`/client/campagnes/${campaignId}`);
    }
  }, [campaignId, router]);

  const handleToggleAction = (index: number) => {
    if (!planData) return;

    const updatedActions = [...planData.actions];
    updatedActions[index].included = !updatedActions[index].included;

    setPlanData({
      ...planData,
      actions: updatedActions
    });
  };

  const handleShowJustification = (action: Action) => {
    setSelectedAction(action);
    setShowJustification(true);
  };

  const handlePublishClick = () => {
    if (!planData) return;

    // Vérifier qu'au moins une action est sélectionnée
    const selectedCount = planData.actions.filter(a => a.included).length;
    if (selectedCount === 0) {
      setShowNoActionDialog(true);
      return;
    }

    setShowPublishConfirm(true);
  };

  const handlePublish = async () => {
    if (!planData) return;

    setShowPublishConfirm(false);
    setIsPublishing(true);

    try {
      const token = localStorage.getItem('token');
      const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(
        `${API}/api/v1/campaigns/${campaignId}/action-plan/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(planData)
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Nettoyer sessionStorage
        sessionStorage.removeItem(`action_plan_${campaignId}`);

        setPublishMessage(`Plan d'action publié avec succès ! ${result.total_actions} actions créées.`);
        setShowPublishSuccess(true);
      } else {
        const error = await response.json();
        setPublishMessage(error.detail || "Impossible de publier le plan");
        setShowPublishError(true);
      }
    } catch (error) {
      console.error("Erreur publication:", error);
      setPublishMessage("Une erreur est survenue lors de la publication");
      setShowPublishError(true);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSuccessClose = () => {
    setShowPublishSuccess(false);
    // Invalider le cache du hook useActionPlan pour forcer un refetch
    queryClient.invalidateQueries({ queryKey: ['action-plan', campaignId] });
    // Rediriger vers l'onglet ACTIONS après publication réussie
    router.push(`/client/campagnes/${campaignId}?tab=actions`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!planData) {
    return null;
  }

  const selectedCount = planData.actions.filter(a => a.included).length;

  const getSeverityBadge = (severity: string) => {
    const styles = {
      critical: "bg-red-100 text-red-800",
      major: "bg-orange-100 text-orange-800",
      minor: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800"
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[severity as keyof typeof styles]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      P1: "bg-red-100 text-red-800",
      P2: "bg-orange-100 text-orange-800",
      P3: "bg-green-100 text-green-800"
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[priority as keyof typeof styles]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ✅ Plan d'action généré avec succès !
          </h1>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Risque global</p>
              <p className="text-lg font-semibold text-gray-900">
                {planData.action_plan_summary.overall_risk_level}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Actions proposées</p>
              <p className="text-lg font-semibold text-gray-900">
                {planData.actions.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Actions sélectionnées</p>
              <p className="text-lg font-semibold text-purple-600">
                {selectedCount}/{planData.actions.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Statut</p>
              <p className="text-lg font-semibold text-orange-600">
                En attente de validation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with flex-1 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-6">
          {/* Actions List */}
          <div className="space-y-4">
          {planData.actions.map((action, index) => (
            <div
              key={action.local_id}
              className={`bg-white rounded-lg shadow p-6 ${
                !action.included ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={action.included}
                  onChange={() => handleToggleAction(index)}
                  className="mt-1 h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                />

                {/* Content */}
                <div className="flex-1">
                  {/* Badges */}
                  <div className="flex gap-2 mb-2">
                    {getSeverityBadge(action.severity)}
                    {getPriorityBadge(action.priority)}
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                      {action.recommended_due_days} jours
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {action.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                    {action.description}
                  </p>

                  {/* Objective */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700">Objectif :</p>
                    <p className="text-sm text-gray-600">{action.objective}</p>
                  </div>

                  {/* Deliverables */}
                  {action.deliverables && action.deliverables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Livrables attendus :</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {action.deliverables.map((deliverable, i) => (
                          <li key={i}>{deliverable}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Responsible & Sources */}
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Responsable suggéré :</span>
                      <span className="ml-2 text-gray-600">{action.suggested_role}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Sources :</span>
                      <span className="ml-2 text-gray-600">
                        {action.source_questions.join(", ")}
                      </span>
                    </div>
                    {action.referential_controls && action.referential_controls.length > 0 && (
                      <div>
                        <span className="font-semibold text-gray-700">Contrôles :</span>
                        <span className="ml-2 text-gray-600">
                          {action.referential_controls.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShowJustification(action)}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
                    >
                      📖 Justification IA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Sticky Footer Actions */}
      <div className="sticky bottom-0 z-40 bg-white border-t shadow-lg">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push(`/client/campagnes/${campaignId}`)}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium"
          >
            Annuler
          </button>

          <button
            onClick={handlePublishClick}
            disabled={isPublishing || selectedCount === 0}
            className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? "Publication..." : `Publier (${selectedCount} actions)`}
          </button>
        </div>
      </div>

      {/* Justification Modal */}
      {showJustification && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-t-lg">
              <h2 className="text-xl font-bold mb-2">🤖 Justification de l'IA</h2>
              <p className="text-sm text-purple-100">
                Analyse et raisonnement de l'IA pour cette action corrective
              </p>
              <div className="mt-4">
                <p className="font-semibold">{selectedAction.title}</p>
                <div className="flex gap-2 mt-2">
                  {getSeverityBadge(selectedAction.severity)}
                  {getPriorityBadge(selectedAction.priority)}
                  <span className="px-2 py-1 bg-white bg-opacity-20 text-white rounded text-xs font-semibold">
                    {selectedAction.recommended_due_days} jours
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Why Action */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  1️⃣ Pourquoi cette action est nécessaire ?
                </h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    💡 {selectedAction.justification.why_action}
                  </p>
                </div>
              </div>

              {/* Why Severity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  2️⃣ Pourquoi cette sévérité ? [{selectedAction.severity.toUpperCase()}]
                </h3>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    ⚠️ {selectedAction.justification.why_severity}
                  </p>
                </div>
              </div>

              {/* Why Priority */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  3️⃣ Pourquoi cette priorité ? [{selectedAction.priority}]
                </h3>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    🚨 {selectedAction.justification.why_priority}
                  </p>
                </div>
              </div>

              {/* Why Role */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  4️⃣ Pourquoi ce responsable ? [{selectedAction.suggested_role}]
                </h3>
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    👤 {selectedAction.justification.why_role}
                  </p>
                </div>
              </div>

              {/* Why Due Days */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  5️⃣ Pourquoi ce délai ? [{selectedAction.recommended_due_days} jours]
                </h3>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    ⏱️ {selectedAction.justification.why_due_days}
                  </p>
                </div>
              </div>

              {/* Sources */}
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  📋 Sources de cette recommandation
                </p>
                <p className="text-sm text-gray-600">
                  Questions : {selectedAction.source_questions.join(", ")}
                </p>
                {selectedAction.referential_controls && selectedAction.referential_controls.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Contrôles : {selectedAction.referential_controls.join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-lg">
              <button
                onClick={() => setShowJustification(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog - Aucune action sélectionnée */}
      <Dialog open={showNoActionDialog} onOpenChange={setShowNoActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aucune action sélectionnée</DialogTitle>
            <DialogDescription>
              Vous devez sélectionner au moins une action avant de publier le plan d'action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowNoActionDialog(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Confirmation de publication */}
      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la publication</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de publier {planData?.actions.filter(a => a.included).length} action(s).
              <br /><br />
              <strong>Cette opération est irréversible.</strong>
              <br /><br />
              Continuer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishConfirm(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePublish}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Oui, publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Publication réussie */}
      <Dialog open={showPublishSuccess} onOpenChange={handleSuccessClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Publication réussie</DialogTitle>
            <DialogDescription>
              {publishMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSuccessClose} className="bg-green-600 hover:bg-green-700">
              Voir le plan d'actions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Erreur de publication */}
      <Dialog open={showPublishError} onOpenChange={setShowPublishError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Erreur de publication</DialogTitle>
            <DialogDescription>
              {publishMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowPublishError(false)} variant="outline">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
