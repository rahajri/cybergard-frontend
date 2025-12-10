'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit,
  Users,
  Target,
  Calendar,
  User as UserIcon,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Save,
  FileText,
  Send,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { ActionDetailsModal } from '@/components/ui/ActionDetailsModal';
import { ActionEditModal, ActionFormData } from '@/components/ui/ActionEditModal';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { QuestionSelectorModal } from '@/components/action-plan/QuestionSelectorModal';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ControlPoint {
  id: string;
  control_id: string;
  title: string;
  referential_name?: string;
  referential_code?: string;
}

interface SourceQuestion {
  id: string;
  question_text: string;
  question_code?: string;
  domain_name?: string;
}

interface ActionPlanItem {
  id: string;
  order_index: number;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  priority: 'P1' | 'P2' | 'P3';
  status: string;
  recommended_due_days: number;
  suggested_role: string;
  assigned_user_id: string | null;
  assigned_user_name?: string | null; // Nom de l'utilisateur assigné
  assignment_method: string;
  source_question_ids: string[];
  source_question?: SourceQuestion; // Question source avec détails
  control_points: ControlPoint[];
  ai_justifications: Record<string, any>;
  created_at: string;
  updated_at: string;
  entity_id?: string; // ID de l'entité
  entity_name?: string; // Nom de l'entité
  created_action_id?: string | null; // ID de l'action publiée (si publiée)
}

interface ActionsByEntity {
  [entityName: string]: ActionPlanItem[];
}

interface CampaignEntity {
  id: string;
  name: string;
}

interface AuditeResp {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface QuestionControlPoint {
  id: string;
  control_id: string;
  title: string;
  referential_name?: string;
  referential_code?: string;
}

interface CampaignQuestion {
  id: string;
  question_text: string;
  question_code: string;
  chapter: string;
  requirement_title: string;
  domain_name: string;
  control_points: QuestionControlPoint[];
}

interface NewActionFormData {
  title: string;
  description: string;
  objective: string;
  deliverables: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  priority: 'P1' | 'P2' | 'P3';
  status: string;
  recommended_due_days: number;
  suggested_role: string;
  entity_id: string;
  assigned_user_id: string;
  source_question_id: string;
}

interface PublishedActionPlanGroupedProps {
  campaignId: string;
  onActionPlanDeleted?: () => void;
  onUnpublish?: () => void; // Callback après dépublication réussie
  campaignStatus?: string; // 'draft' | 'ongoing' | 'late' | 'frozen' | 'completed' | 'cancelled'
}

export function PublishedActionPlanGrouped({ campaignId, onActionPlanDeleted, onUnpublish, campaignStatus }: PublishedActionPlanGroupedProps) {
  // La campagne est en lecture seule si elle est terminée
  const isReadOnly = campaignStatus === 'completed';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ActionPlanItem[]>([]);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // États pour les modals
  const [viewingAction, setViewingAction] = useState<ActionPlanItem | null>(null);
  const [editingAction, setEditingAction] = useState<ActionPlanItem | null>(null);

  // États pour la suppression du plan complet
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ type: ModalType; message: string } | null>(null);

  // États pour la suppression d'une action individuelle
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<ActionPlanItem | null>(null);
  const [deleteItemResult, setDeleteItemResult] = useState<{ type: ModalType; message: string } | null>(null);

  // États pour la création d'une nouvelle action
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ type: ModalType; message: string } | null>(null);

  // États pour la publication vers le module Actions
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ type: ModalType; message: string } | null>(null);

  // États pour la dépublication (annuler publication et remettre campagne en cours)
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [unpublishResult, setUnpublishResult] = useState<{ type: ModalType; message: string } | null>(null);

  const [campaignEntities, setCampaignEntities] = useState<CampaignEntity[]>([]);
  const [auditeRespList, setAuditeRespList] = useState<AuditeResp[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingAuditeResp, setLoadingAuditeResp] = useState(false);
  const [newActionForm, setNewActionForm] = useState<NewActionFormData>({
    title: '',
    description: '',
    objective: '',
    deliverables: '',
    severity: 'minor',
    priority: 'P2',
    status: 'pending',
    recommended_due_days: 30,
    suggested_role: '',
    entity_id: '',
    assigned_user_id: '',
    source_question_id: '',
  });

  // États pour la sélection de question source
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<CampaignQuestion | null>(null);

  // Handlers mémorisés pour éviter les re-renders infinis de Quill (modal création)
  const handleNewDescriptionChange = useCallback((value: string) => {
    setNewActionForm(prev => ({ ...prev, description: value }));
  }, []);

  const handleNewObjectiveChange = useCallback((value: string) => {
    setNewActionForm(prev => ({ ...prev, objective: value }));
  }, []);

  const handleNewDeliverablesChange = useCallback((value: string) => {
    setNewActionForm(prev => ({ ...prev, deliverables: value }));
  }, []);

  useEffect(() => {
    loadActionPlanItems();
  }, [campaignId]);

  // Charger les entités de la campagne quand le modal de création s'ouvre
  useEffect(() => {
    if (showCreateModal) {
      loadCampaignEntities();
    }
  }, [showCreateModal]);

  // Charger les audite_resp quand une entité est sélectionnée
  useEffect(() => {
    if (newActionForm.entity_id) {
      loadAuditeRespByEntity(newActionForm.entity_id);
    } else {
      setAuditeRespList([]);
    }
  }, [newActionForm.entity_id]);

  const loadCampaignEntities = async () => {
    try {
      setLoadingEntities(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/entities`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // L'endpoint retourne directement un tableau [{id, name}, ...]
        setCampaignEntities(data || []);
        console.log('📋 Entités campagne chargées:', data);
      } else {
        console.error('Erreur lors du chargement des entités, status:', response.status);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const loadAuditeRespByEntity = async (entityId: string) => {
    try {
      setLoadingAuditeResp(true);
      const token = localStorage.getItem('token');

      // Construire l'URL avec campaign_id (même pattern que ActionEditModal)
      const url = new URL(
        `${API_BASE}/api/v1/ecosystem/entities/${entityId}/members`
      );
      url.searchParams.append('campaign_id', campaignId);

      console.log('🌐 Fetching members from:', url.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Membres chargés:', data);

        // Gérer deux formats de réponse possibles (Array ou Object)
        let members = [];
        if (Array.isArray(data)) {
          members = data;
        } else if (data.members) {
          members = data.members;
        }

        setAuditeRespList(members);
      } else {
        console.error('Erreur lors du chargement des membres, status:', response.status);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingAuditeResp(false);
    }
  };

  const loadActionPlanItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/action-plan/items`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Actions chargées:', data.items);
        console.log('📦 Premier item:', data.items?.[0]);
        console.log('📦 entity_id du premier item:', data.items?.[0]?.entity_id);
        setItems(data.items || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Erreur lors du chargement des actions');
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleEntityExpand = (entityName: string) => {
    setExpandedEntities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entityName)) {
        newSet.delete(entityName);
      } else {
        newSet.add(entityName);
      }
      return newSet;
    });
  };

  const fetchEntityIdForAction = async (action: ActionPlanItem): Promise<string | null> => {
    // Si entity_id existe déjà, le retourner
    if (action.entity_id) {
      return action.entity_id;
    }

    // Sinon, essayer de le récupérer via source_question_ids
    if (!action.source_question_ids || action.source_question_ids.length === 0) {
      return null;
    }

    try {
      const token = localStorage.getItem('token');
      const questionId = action.source_question_ids[0];

      // Appeler une route backend pour récupérer l'entity_id depuis la question
      const response = await fetch(
        `${API_BASE}/api/v1/questions/${questionId}/entity`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.entity_id;
      }
    } catch (err) {
      console.error('Erreur récupération entity_id:', err);
    }

    return null;
  };

  const handleEditAction = async (action: ActionPlanItem) => {
    console.log('🔍 Éditer action clicked:', action);
    console.log('🔍 entity_id:', action.entity_id);

    // Si pas d'entity_id, essayer de le récupérer
    let entityId: string | undefined = action.entity_id;
    if (!entityId) {
      console.log('⚠️ entity_id manquant, tentative de récupération...');
      const fetchedId = await fetchEntityIdForAction(action);
      entityId = fetchedId || undefined;
      console.log('📥 entity_id récupéré:', entityId);

      if (entityId) {
        // Mettre à jour l'action avec l'entity_id
        action.entity_id = entityId;
      }
    }

    setEditingAction(action);
  };

  const handleSaveAction = async (updatedAction: ActionFormData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/action-plan/items/${updatedAction.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedAction),
        }
      );

      if (response.ok) {
        // Recharger les items après sauvegarde
        await loadActionPlanItems();
        setEditingAction(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      throw err;
    }
  };

  const handleDeleteActionPlan = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/action-plan`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Appeler le callback pour rediriger vers la page de génération (immédiatement)
        if (onActionPlanDeleted) {
          // Redirection immédiate sans afficher le modal de succès
          onActionPlanDeleted();
        } else {
          // Fallback : Afficher modal de succès et recharger
          setDeleteResult({
            type: 'success',
            message: `Plan d'action supprimé avec succès (${data.items_deleted} items supprimés)`
          });
          await loadActionPlanItems();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setDeleteResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la suppression'
        });
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setDeleteResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la suppression'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Publier le plan d'action vers le module Actions
  const handlePublishToActions = async () => {
    setShowPublishConfirm(false);
    setIsPublishing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/action-plan/publish-to-actions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPublishResult({
          type: 'success',
          message: `${data.published_count || items.length} action(s) publiée(s) avec succès vers le module Actions !`
        });
        // Recharger les items pour voir le nouveau statut
        await loadActionPlanItems();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setPublishResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la publication'
        });
      }
    } catch (err) {
      console.error('Erreur lors de la publication:', err);
      setPublishResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la publication'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Dépublier le plan d'action (supprimer les actions publiées et remettre campagne en frozen)
  const handleUnpublish = async () => {
    setShowUnpublishConfirm(false);
    setIsUnpublishing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/action-plan/unpublish`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnpublishResult({
          type: 'success',
          message: `${data.deleted_actions_count} action(s) supprimée(s). La campagne est remise au statut "Figée" pour permettre une nouvelle publication.`
        });
        // Appeler le callback pour rafraîchir la page parente
        if (onUnpublish) {
          onUnpublish();
        } else {
          // Fallback: recharger la page
          window.location.reload();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUnpublishResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la dépublication'
        });
      }
    } catch (err) {
      console.error('Erreur lors de la dépublication:', err);
      setUnpublishResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la dépublication'
      });
    } finally {
      setIsUnpublishing(false);
    }
  };

  // Supprimer une action individuelle
  const handleDeleteItemClick = (action: ActionPlanItem) => {
    setActionToDelete(action);
    setShowDeleteItemConfirm(true);
  };

  const handleDeleteItem = async () => {
    if (!actionToDelete) return;

    setShowDeleteItemConfirm(false);
    setDeletingItemId(actionToDelete.id);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/action-plan/items/${actionToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setDeleteItemResult({
          type: 'success',
          message: `Action "${actionToDelete.title.substring(0, 50)}..." supprimée avec succès`
        });
        await loadActionPlanItems();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setDeleteItemResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la suppression'
        });
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setDeleteItemResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la suppression'
      });
    } finally {
      setDeletingItemId(null);
      setActionToDelete(null);
    }
  };

  // Créer une nouvelle action
  const handleOpenCreateModal = () => {
    // Réinitialiser le formulaire
    setNewActionForm({
      title: '',
      description: '',
      objective: '',
      deliverables: '',
      severity: 'minor',
      priority: 'P2',
      status: 'pending',
      recommended_due_days: 30,
      suggested_role: '',
      entity_id: '',
      assigned_user_id: '',
      source_question_id: '',
    });
    setSelectedQuestion(null);
    setShowCreateModal(true);
  };

  // Handler pour la sélection d'une question source
  const handleQuestionSelect = (question: CampaignQuestion) => {
    setSelectedQuestion(question);
    setNewActionForm(prev => ({
      ...prev,
      source_question_id: question.id,
    }));
  };

  const handleCreateAction = async () => {
    if (!newActionForm.title || !newActionForm.entity_id) {
      setCreateResult({
        type: 'error',
        message: 'Le titre et l\'organisme sont obligatoires'
      });
      return;
    }

    setIsCreating(true);

    try {
      const token = localStorage.getItem('token');

      // Préparer les données avec source_question_ids et control_point_ids
      const dataToSend = {
        ...newActionForm,
        source_question_ids: selectedQuestion ? [selectedQuestion.id] : [],
        control_point_ids: selectedQuestion
          ? selectedQuestion.control_points.map(cp => cp.id)
          : [],
      };

      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/action-plan/items`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        }
      );

      if (response.ok) {
        setShowCreateModal(false);
        setCreateResult({
          type: 'success',
          message: 'Action créée avec succès'
        });
        await loadActionPlanItems();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setCreateResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la création'
        });
      }
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      setCreateResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la création'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const configs = {
      critical: { label: 'Critique', className: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
      major: { label: 'Majeure', className: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
      minor: { label: 'Mineure', className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle },
      info: { label: 'Info', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: AlertCircle },
    };

    const config = configs[severity as keyof typeof configs] || configs.info;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      P1: { label: 'P1', className: 'bg-red-100 text-red-700 border-red-200' },
      P2: { label: 'P2', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      P3: { label: 'P3', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    };

    const config = configs[priority as keyof typeof configs] || configs.P2;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Grouper les actions par entité
  const actionsByEntity: ActionsByEntity = items.reduce((acc, item) => {
    const entityName = item.entity_name || 'Non assigné';
    if (!acc[entityName]) {
      acc[entityName] = [];
    }
    acc[entityName].push(item);
    return acc;
  }, {} as ActionsByEntity);

  // Calculer les statistiques
  const stats = {
    total: items.length,
    critical: items.filter((i) => i.severity === 'critical').length,
    major: items.filter((i) => i.severity === 'major').length,
    minor: items.filter((i) => i.severity === 'minor').length,
    info: items.filter((i) => i.severity === 'info').length,
    published: items.filter((i) => i.created_action_id != null).length,
    unpublished: items.filter((i) => i.created_action_id == null).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement du plan d'action...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={loadActionPlanItems}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 text-lg font-medium">Aucun plan d'action publié</p>
        <p className="text-gray-500 text-sm mt-2">
          Générez un plan d'action pour voir les actions correctives
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec boutons d'action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Plan d'action publié</h2>
          <p className="text-sm text-gray-600 mt-1">{stats.total} action(s) • {Object.keys(actionsByEntity).length} entité(s)</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bouton Créer une action */}
          <button
            onClick={handleOpenCreateModal}
            disabled={isReadOnly}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isReadOnly
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-50'
                : 'text-white bg-purple-600 hover:bg-purple-700'
            }`}
            title={isReadOnly ? 'Campagne terminée - Création désactivée' : 'Créer une nouvelle action'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer une action
          </button>
          {/* Bouton Publier vers le module Actions */}
          <button
            onClick={() => setShowPublishConfirm(true)}
            disabled={isReadOnly || isPublishing || items.length === 0 || stats.unpublished === 0}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isReadOnly
                ? 'text-gray-400 bg-gray-100 border border-gray-200'
                : stats.unpublished === 0 && stats.published > 0
                  ? 'text-green-700 bg-green-50 border border-green-200'
                  : 'text-white bg-green-600 hover:bg-green-700'
            }`}
            title={
              isReadOnly
                ? 'Campagne terminée - Publication désactivée'
                : stats.unpublished === 0 && stats.published > 0
                  ? 'Toutes les actions sont déjà publiées'
                  : `Publier ${stats.unpublished} action(s) vers le module Actions`
            }
          >
            {stats.unpublished === 0 && stats.published > 0 ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Publié ({stats.published})
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isPublishing ? 'Publication...' : `Publier (${stats.unpublished})`}
              </>
            )}
          </button>
          {/* Bouton Dépublier (visible uniquement si campagne terminée) */}
          {isReadOnly && (
            <button
              onClick={() => setShowUnpublishConfirm(true)}
              disabled={isUnpublishing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200"
              title="Annuler la publication et remettre la campagne en mode édition"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isUnpublishing ? 'Dépublication...' : 'Dépublier'}
            </button>
          )}
          {/* Bouton Supprimer le plan */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isReadOnly || isDeleting}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isReadOnly
                ? 'text-gray-400 bg-gray-100 border-gray-200'
                : 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
            }`}
            title={isReadOnly ? 'Campagne terminée - Suppression désactivée' : 'Supprimer le plan d\'action'}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Suppression...' : 'Supprimer le plan'}
          </button>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Actions totales</span>
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Critiques</span>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-700 mt-2">{stats.critical}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Majeures</span>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-700 mt-2">{stats.major}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Mineures</span>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-700 mt-2">{stats.minor}</p>
        </div>
      </div>

      {/* Liste des actions groupées par entité */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Plan d'action publié ({items.length} action{items.length > 1 ? 's' : ''})
        </h2>

        <div className="space-y-3">
          {Object.entries(actionsByEntity).map(([entityName, actions]) => (
            <div
              key={entityName}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            >
              {/* En-tête de l'entité avec chevron */}
              <button
                onClick={() => toggleEntityExpand(entityName)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 transition-colors border-b border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  {expandedEntities.has(entityName) ? (
                    <ChevronDown className="w-5 h-5 text-purple-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-600" />
                  )}
                  <Users className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <div className="text-base font-semibold text-gray-900">{entityName}</div>
                    <div className="text-sm text-gray-600">
                      {actions.length} action{actions.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {expandedEntities.has(entityName)
                    ? 'Cliquer pour fermer'
                    : 'Cliquer pour voir les actions'}
                </div>
              </button>

              {/* Liste des actions (visible si expanded) */}
              {expandedEntities.has(entityName) && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Sévérité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Priorité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Délai
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Rôle suggéré
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Assigné à
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {actions.map((action, idx) => (
                        <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {action.title}
                                {action.created_action_id && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Publié
                                  </span>
                                )}
                              </div>
                              {action.control_points && action.control_points.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {action.control_points.slice(0, 3).map((cp) => (
                                    <span
                                      key={cp.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                      title={cp.title}
                                    >
                                      {cp.referential_code} {cp.control_id}
                                    </span>
                                  ))}
                                  {action.control_points.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      +{action.control_points.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getSeverityBadge(action.severity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPriorityBadge(action.priority)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="w-4 h-4 mr-1.5 text-gray-500" />
                              {action.recommended_due_days} jours
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <UserIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                              {action.suggested_role}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Users className="w-4 h-4 mr-1.5 text-green-500" />
                              {action.assigned_user_name || <span className="text-gray-400 italic">Non assigné</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Bouton Voir */}
                              <button
                                onClick={() => setViewingAction(action)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                                title="Voir les détails"
                              >
                                <Eye className="w-4 h-4 mr-1.5" />
                                Voir
                              </button>

                              {/* Bouton Éditer */}
                              <button
                                onClick={() => handleEditAction(action)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors"
                                title="Modifier l'action"
                              >
                                <Edit className="w-4 h-4 mr-1.5" />
                                Éditer
                              </button>

                              {/* Bouton Supprimer */}
                              <button
                                onClick={() => handleDeleteItemClick(action)}
                                disabled={deletingItemId === action.id}
                                className="inline-flex items-center p-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Supprimer l'action"
                              >
                                {deletingItemId === action.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Voir les détails */}
      <ActionDetailsModal
        isOpen={!!viewingAction}
        onClose={() => setViewingAction(null)}
        action={viewingAction!}
      />

      {/* Modal Éditer */}
      {editingAction && (
        <>
          {console.log('🔍 Modal Éditer - editingAction:', editingAction)}
          {console.log('🔍 Modal Éditer - entity_id présent?', !!editingAction.entity_id)}
          {editingAction.entity_id ? (
            <ActionEditModal
              isOpen={true}
              onClose={() => setEditingAction(null)}
              onSave={handleSaveAction}
              action={editingAction}
              entityId={editingAction.entity_id}
              campaignId={campaignId}
            />
          ) : (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-red-600 mb-3">⚠️ Erreur</h3>
                <p className="text-gray-700 mb-4">
                  Impossible d'éditer cette action : l'ID de l'entité est manquant.
                </p>
                <button
                  onClick={() => setEditingAction(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de confirmation de suppression du plan complet */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteActionPlan}
        title="Supprimer le plan d'action"
        message={`Vous êtes sur le point de supprimer le plan d'action complet avec ${stats.total} action(s). Cette opération est irréversible !`}
        type="confirm"
        confirmText="Oui, supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Modal de résultat de suppression du plan */}
      {deleteResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteResult(null)}
          title={deleteResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={deleteResult.message}
          type={deleteResult.type}
        />
      )}

      {/* Modal de confirmation de suppression d'une action individuelle */}
      <ConfirmModal
        isOpen={showDeleteItemConfirm}
        onClose={() => {
          setShowDeleteItemConfirm(false);
          setActionToDelete(null);
        }}
        onConfirm={handleDeleteItem}
        title="Supprimer l'action"
        message={`Voulez-vous vraiment supprimer l'action "${actionToDelete?.title.substring(0, 50)}..." ? Cette opération est irréversible.`}
        type="confirm"
        confirmText="Oui, supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Modal de résultat de suppression d'action individuelle */}
      {deleteItemResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteItemResult(null)}
          title={deleteItemResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={deleteItemResult.message}
          type={deleteItemResult.type}
        />
      )}

      {/* Modal de confirmation de publication vers Actions */}
      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublishToActions}
        title="Publier vers le module Actions"
        message={`Vous êtes sur le point de publier ${stats.unpublished} action(s) vers le module Actions${stats.published > 0 ? ` (${stats.published} action(s) déjà publiée(s) seront ignorées)` : ''}. Les personnes assignées pourront alors suivre et compléter ces actions. Continuer ?`}
        type="confirm"
        confirmText="Oui, publier"
        cancelText="Annuler"
        confirmButtonColor="green"
      />

      {/* Modal de résultat de publication */}
      {publishResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => {
            setPublishResult(null);
            // Rafraîchir la page après publication réussie pour voir le nouveau statut de la campagne
            if (publishResult.type === 'success') {
              window.location.reload();
            }
          }}
          title={publishResult.type === 'success' ? 'Publication réussie' : 'Erreur'}
          message={publishResult.message}
          type={publishResult.type}
        />
      )}

      {/* Modal de confirmation de dépublication */}
      <ConfirmModal
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={handleUnpublish}
        title="⚠️ Dépublier le plan d'action"
        message={`⚠️ ATTENTION ⚠️\n\n${stats.published} ACTION(S) SERONT SUPPRIMÉE(S) DÉFINITIVEMENT\n\nCette opération va supprimer toutes les actions publiées de cette campagne dans le module Actions.\n\nAprès la dépublication :\n• Les ${stats.published} action(s) publiée(s) seront supprimées\n• La campagne passera au statut "Figée"\n• Vous pourrez modifier le plan d'action et republier\n\nÊtes-vous sûr de vouloir continuer ?`}
        type="confirm"
        confirmText={`Oui, supprimer ${stats.published} action(s)`}
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* Modal de résultat de dépublication */}
      {unpublishResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setUnpublishResult(null)}
          title={unpublishResult.type === 'success' ? 'Dépublication réussie' : 'Erreur'}
          message={unpublishResult.message}
          type={unpublishResult.type}
        />
      )}

      {/* Modal de création d'une nouvelle action - Aligné avec ActionEditModal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Style identique à ActionEditModal */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between border-b border-purple-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Créer une nouvelle action</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Fermer"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content - Structure identique à ActionEditModal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Titre */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                  Titre de l'action <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={newActionForm.title}
                  onChange={(e) => setNewActionForm({ ...newActionForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ex: Mettre en place une politique de mots de passe"
                />
              </div>

              {/* Description avec RichTextEditor */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                  Description
                </label>
                <RichTextEditor
                  value={newActionForm.description}
                  onChange={handleNewDescriptionChange}
                  placeholder="Description générale de l'action..."
                />
              </div>

              {/* Objectif avec RichTextEditor */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-600" />
                  Objectif
                </label>
                <RichTextEditor
                  value={newActionForm.objective}
                  onChange={handleNewObjectiveChange}
                  placeholder="Objectif spécifique de cette action..."
                />
              </div>

              {/* Livrables attendus avec RichTextEditor */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <label className="block text-sm font-semibold text-green-900 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-green-600" />
                  Livrables attendus
                </label>
                <RichTextEditor
                  value={newActionForm.deliverables}
                  onChange={handleNewDeliverablesChange}
                  placeholder="Liste des livrables attendus..."
                />
                <p className="text-xs text-gray-600 mt-2">
                  💡 Utilisez la barre d'outils pour mettre en forme votre texte (gras, listes, couleurs, etc.)
                </p>
              </div>

              {/* Sévérité et Priorité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sévérité */}
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <label className="block text-sm font-semibold text-orange-900 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                    Sévérité
                  </label>
                  <div className="space-y-2">
                    {(['critical', 'major', 'minor', 'info'] as const).map((severity) => {
                      const configs = {
                        critical: { label: 'Critique', className: 'bg-red-100 text-red-700 border-red-300' },
                        major: { label: 'Majeure', className: 'bg-orange-100 text-orange-700 border-orange-300' },
                        minor: { label: 'Mineure', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
                        info: { label: 'Info', className: 'bg-blue-100 text-blue-700 border-blue-300' },
                      };
                      const config = configs[severity];
                      return (
                        <label key={severity} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="create_severity"
                            value={severity}
                            checked={newActionForm.severity === severity}
                            onChange={(e) => setNewActionForm({ ...newActionForm, severity: e.target.value as any })}
                            className="mr-3 text-purple-600 focus:ring-purple-500"
                          />
                          <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${config.className}`}>
                            {config.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Priorité */}
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <label className="block text-sm font-semibold text-orange-900 mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-orange-600" />
                    Priorité
                  </label>
                  <div className="space-y-2">
                    {(['P1', 'P2', 'P3'] as const).map((priority) => {
                      const configs = {
                        P1: { label: 'P1 - Haute', className: 'bg-red-100 text-red-700 border-red-300' },
                        P2: { label: 'P2 - Moyenne', className: 'bg-orange-100 text-orange-700 border-orange-300' },
                        P3: { label: 'P3 - Basse', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
                      };
                      const config = configs[priority];
                      return (
                        <label key={priority} className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="create_priority"
                            value={priority}
                            checked={newActionForm.priority === priority}
                            onChange={(e) => setNewActionForm({ ...newActionForm, priority: e.target.value as any })}
                            className="mr-3 text-purple-600 focus:ring-purple-500"
                          />
                          <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${config.className}`}>
                            {config.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Statut */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-600" />
                  Statut
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pending', 'in_progress', 'completed', 'blocked'] as const).map((status) => {
                    const configs = {
                      pending: { label: 'En attente', className: 'bg-gray-100 text-gray-700 border-gray-300' },
                      in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-700 border-blue-300' },
                      completed: { label: 'Terminé', className: 'bg-green-100 text-green-700 border-green-300' },
                      blocked: { label: 'Bloqué', className: 'bg-red-100 text-red-700 border-red-300' },
                    };
                    const config = configs[status];
                    return (
                      <label key={status} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="create_status"
                          value={status}
                          checked={newActionForm.status === status}
                          onChange={(e) => setNewActionForm({ ...newActionForm, status: e.target.value })}
                          className="mr-3 text-purple-600 focus:ring-purple-500"
                        />
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${config.className}`}>
                          {config.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Délai, Rôle, Organisme et Assignation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Délai recommandé */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                    Délai recommandé (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newActionForm.recommended_due_days}
                    onChange={(e) => setNewActionForm({ ...newActionForm, recommended_due_days: parseInt(e.target.value) || 30 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Rôle suggéré */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <UserIcon className="w-4 h-4 mr-2 text-purple-600" />
                    Rôle suggéré
                  </label>
                  <input
                    type="text"
                    value={newActionForm.suggested_role}
                    onChange={(e) => setNewActionForm({ ...newActionForm, suggested_role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: RSSI, DSI, DPO"
                  />
                </div>

                {/* Organisme (Entité) */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-purple-600" />
                    Organisme <span className="text-red-500 ml-1">*</span>
                  </label>
                  {loadingEntities ? (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      Chargement des organismes...
                    </div>
                  ) : (
                    <>
                      <select
                        value={newActionForm.entity_id}
                        onChange={(e) => {
                          setNewActionForm({ ...newActionForm, entity_id: e.target.value, assigned_user_id: '' });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Sélectionner un organisme</option>
                        {campaignEntities.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {campaignEntities.length} organisme(s) disponible(s)
                      </p>
                    </>
                  )}
                </div>

                {/* Assignation */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-green-600" />
                    Assigner à
                  </label>
                  {loadingAuditeResp ? (
                    <div className="flex items-center justify-center py-2">
                      <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  ) : (
                    <>
                      <select
                        value={newActionForm.assigned_user_id}
                        onChange={(e) => setNewActionForm({ ...newActionForm, assigned_user_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        disabled={!newActionForm.entity_id}
                      >
                        <option value="">
                          {!newActionForm.entity_id ? 'Sélectionnez d\'abord un organisme' : 'Non assigné'}
                        </option>
                        {auditeRespList.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {newActionForm.entity_id
                          ? auditeRespList.length > 0
                            ? `${auditeRespList.length} responsable(s) disponible(s)`
                            : 'Aucun responsable disponible'
                          : 'Sélectionnez un organisme pour voir les responsables'
                        }
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Section Point de contrôle */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-purple-900 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-purple-600" />
                    Point(s) de contrôle associé(s)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuestionSelector(true)}
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un point de contrôle
                  </button>
                </div>

                {selectedQuestion ? (
                  <div className="space-y-3">
                    {/* Question sélectionnée */}
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {selectedQuestion.question_code && (
                              <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                {selectedQuestion.question_code}
                              </span>
                            )}
                            <span className="text-xs text-purple-600 font-medium">
                              {selectedQuestion.domain_name}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 line-clamp-2">
                            {selectedQuestion.question_text}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuestion(null);
                            setNewActionForm(prev => ({ ...prev, source_question_id: '' }));
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500"
                          title="Retirer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Points de contrôle associés */}
                    {selectedQuestion.control_points.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-purple-700">
                          {selectedQuestion.control_points.length} point(s) de contrôle :
                        </p>
                        {selectedQuestion.control_points.map((cp) => (
                          <div
                            key={cp.id}
                            className="bg-white rounded-lg p-3 border border-purple-200"
                          >
                            <div className="flex items-start space-x-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-purple-600 text-white flex-shrink-0">
                                {cp.referential_code}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-purple-900 text-sm">
                                  {cp.control_id}
                                </div>
                                <div className="text-purple-700 text-xs mt-0.5">
                                  {cp.title}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Aucun point de contrôle sélectionné
                    <p className="text-xs text-gray-400 mt-1">
                      Cliquez sur "Ajouter un point de contrôle" pour associer une question
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Style identique à ActionEditModal */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                disabled={isCreating}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateAction}
                disabled={isCreating || !newActionForm.title || !newActionForm.entity_id}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Créer l'action
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de résultat de création */}
      {createResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setCreateResult(null)}
          title={createResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={createResult.message}
          type={createResult.type}
        />
      )}

      {/* Modal de sélection de question source */}
      <QuestionSelectorModal
        isOpen={showQuestionSelector}
        onClose={() => setShowQuestionSelector(false)}
        onSelect={handleQuestionSelect}
        campaignId={campaignId}
        selectedQuestionId={newActionForm.source_question_id}
      />
    </div>
  );
}
