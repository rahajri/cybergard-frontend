'use client';

import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  User,
  Calendar,
  Search,
  Filter,
  Building2,
  Target,
  RefreshCw,
  Edit,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Save,
  Users,
  Trash2
} from 'lucide-react';
import { ActionDetailsModal } from '@/components/ui/ActionDetailsModal';
import { ActionEditModal, ActionFormData } from '@/components/ui/ActionEditModal';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { GlobalQuestionSelectorModal } from '@/components/action-plan/GlobalQuestionSelectorModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import { fetchWithAuth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Fonction utilitaire pour extraire le texte brut du HTML
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  // Créer un élément temporaire pour parser le HTML
  if (typeof window !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  // Fallback pour le serveur (SSR)
  return html.replace(/<[^>]*>/g, '');
};

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
  control_points?: ControlPoint[];
}

interface Action {
  id: string;
  code_action?: string;  // Code unique (ACT_001, ACT_002, etc.)
  title: string;
  description: string;
  objective?: string;
  deliverables?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  severity: 'critical' | 'major' | 'minor' | 'info';
  priority: 'P1' | 'P2' | 'P3';
  suggested_role: string;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  recommended_due_days: number;
  due_date?: string;
  entity_id?: string;
  entity_name?: string;
  campaign_id?: string;  // Optionnel pour les actions standalone
  campaign_title?: string;
  pole_id?: string;      // Pôle interne associé
  pole_name?: string;    // Nom du pôle
  source_question_ids?: string[];
  control_point_ids?: string[];
  control_points?: ControlPoint[];
  source_question?: SourceQuestion;
  created_at: string;
  updated_at: string;
  // CVE et informations de vulnérabilité (pour actions issues de scans)
  cve_ids?: string[] | null;
  cvss_score?: number | null;
  cve_source_url?: string | null;
}

interface ActionStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  blocked: number;
  critical: number;
  overdue: number;
}

interface Entity {
  id: string;
  name: string;
}

interface Pole {
  id: string;
  name: string;
}

interface RoleInfo {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface UserByRole {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
  role_code: string;
  role_name: string;
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

// Interfaces pour le mode Externe (comme dans EBIOS)
interface ScopeEntityMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
}

interface ScopeEntity {
  id: string;
  name: string;
  stakeholder_type: string;
  entity_category?: string;  // Catégorie directe (ex: MAROC, Fournisseurs)
  parent_category?: string;  // Catégorie parente si existe (ex: Fournisseurs)
  members: ScopeEntityMember[];
}

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterInterne, setFilterInterne] = useState<string>('all');  // Filtre Interne (standalone)
  const [searchTerm, setSearchTerm] = useState('');

  // Liste des entités pour le filtre
  const [entities, setEntities] = useState<Entity[]>([]);

  // Liste des pôles pour le filtre Interne
  const [poles, setPoles] = useState<Pole[]>([]);

  // États pour les modals Voir/Éditer
  const [viewingAction, setViewingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  // États pour la création d'action
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ type: ModalType; message: string } | null>(null);

  // États pour la suppression d'action
  const [deletingAction, setDeletingAction] = useState<Action | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ type: ModalType; message: string } | null>(null);

  // États pour le formulaire de création
  const [selectedQuestion, setSelectedQuestion] = useState<SourceQuestion | null>(null);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);

  // États pour les rôles
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [usersByRole, setUsersByRole] = useState<UserByRole[]>([]);
  const [loadingUsersByRole, setLoadingUsersByRole] = useState(false);

  // États pour le toggle Interne/Externe dans la création
  const [assignmentType, setAssignmentType] = useState<'internal' | 'external'>('internal');
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('');

  // États pour le mode Externe
  const [loadingScope, setLoadingScope] = useState(false);
  const [scopeEntities, setScopeEntities] = useState<ScopeEntity[]>([]);
  const [externalCategories, setExternalCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredEntities, setFilteredEntities] = useState<ScopeEntity[]>([]);
  const [selectedExternalEntityId, setSelectedExternalEntityId] = useState<string>('');
  const [availableMembers, setAvailableMembers] = useState<ScopeEntityMember[]>([]);

  const [newActionForm, setNewActionForm] = useState<NewActionFormData>({
    title: '',
    description: '',
    objective: '',
    deliverables: '',
    severity: 'minor',
    priority: 'P2',
    status: 'pending',
    recommended_due_days: 30,
    suggested_role: 'RSSI',
    entity_id: '',
    assigned_user_id: '',
    source_question_id: '',
  });

  // Charger les actions depuis le backend
  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${API_BASE}/api/v1/actions`);

      if (response.ok) {
        const data = await response.json();
        const actionsList = data.items || [];

        // Dédupliquer les actions par ID pour éviter les warnings React de clés dupliquées
        // Utiliser un Set pour traquer les IDs déjà vus
        const seenIds = new Set<string>();
        const uniqueActions: Action[] = [];

        actionsList.forEach((action: Action) => {
          if (!seenIds.has(action.id)) {
            seenIds.add(action.id);
            uniqueActions.push(action);
          } else {
            console.warn(`⚠️ Action dupliquée détectée: ${action.id} - ${action.title}`);
          }
        });

        if (actionsList.length !== uniqueActions.length) {
          console.warn(`⚠️ ${actionsList.length - uniqueActions.length} action(s) dupliquée(s) supprimée(s)`);
        }

        setActions(uniqueActions);

        // Extraire les entités uniques pour le filtre
        const uniqueEntities = new Map<string, string>();
        uniqueActions.forEach((action: Action) => {
          if (action.entity_id && action.entity_name) {
            uniqueEntities.set(action.entity_id, action.entity_name);
          }
        });
        setEntities(Array.from(uniqueEntities, ([id, name]) => ({ id, name })));

        // Extraire les pôles uniques pour le filtre Interne
        const uniquePoles = new Map<string, string>();
        uniqueActions.forEach((action: Action) => {
          if (action.pole_id && action.pole_name) {
            uniquePoles.set(action.pole_id, action.pole_name);
          }
        });
        setPoles(Array.from(uniquePoles, ([id, name]) => ({ id, name })));
      } else if (response.status === 404) {
        setActions([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Erreur lors du chargement des actions');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Charger la liste des rôles disponibles
  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await fetchWithAuth(`${API_BASE}/api/v1/actions/roles/list`);

      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Erreur chargement rôles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Charger les utilisateurs pour un rôle donné
  const loadUsersByRole = async (roleCode: string) => {
    if (!roleCode) {
      setUsersByRole([]);
      return;
    }

    try {
      setLoadingUsersByRole(true);
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/actions/roles/${encodeURIComponent(roleCode)}/users`
      );

      if (response.ok) {
        const data = await response.json();
        // L'endpoint retourne { users: [...], total, role_code, role_name }
        setUsersByRole(data.users || []);
      }
    } catch (err) {
      console.error('Erreur chargement utilisateurs par rôle:', err);
    } finally {
      setLoadingUsersByRole(false);
    }
  };

  // Charger les entités du scope pour le mode Externe
  const loadScopeEntities = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingScope(true);
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/actions/scope-entities`
      );

      if (response.ok) {
        const data = await response.json();
        const entities: ScopeEntity[] = data.entities || [];
        setScopeEntities(entities);

        // Extraire les catégories principales (parentes) uniques
        const uniqueCategories = [...new Set(
          entities
            .map(e => e.parent_category || e.entity_category)
            .filter((cat): cat is string => !!cat)
        )].sort();
        setExternalCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Erreur chargement scope entities:', err);
    } finally {
      setLoadingScope(false);
    }
  };

  // Ouvrir le modal de création
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    loadRoles();
    loadScopeEntities();
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
    setUsersByRole([]);
    // Reset états Interne/Externe
    setAssignmentType('internal');
    setSelectedRoleCode('');
    setSelectedCategory('');
    setSelectedExternalEntityId('');
    setFilteredEntities([]);
    setAvailableMembers([]);
  };

  // Fermer le modal de création
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setSelectedQuestion(null);
  };

  // Sélectionner une question
  const handleQuestionSelect = (question: SourceQuestion) => {
    setSelectedQuestion(question);
    setNewActionForm({
      ...newActionForm,
      source_question_id: question.id,
    });
  };

  // Créer une nouvelle action
  const handleCreateAction = async () => {
    if (!newActionForm.title.trim()) {
      setCreateResult({ type: 'error', message: 'Le titre est obligatoire' });
      return;
    }
    // L'organisme est obligatoire uniquement pour le mode externe
    if (assignmentType === 'external' && !selectedExternalEntityId) {
      setCreateResult({ type: 'error', message: 'L\'organisme est obligatoire pour les audits externes' });
      return;
    }

    try {
      setIsCreating(true);

      // Préparer les données selon le mode
      let actionData;
      if (assignmentType === 'internal') {
        // Mode Interne : entity_name = "Interne", pas d'entity_id
        actionData = {
          title: newActionForm.title,
          description: newActionForm.description,
          objective: newActionForm.objective,
          deliverables: newActionForm.deliverables,
          severity: newActionForm.severity,
          priority: newActionForm.priority,
          status: newActionForm.status,
          recommended_due_days: newActionForm.recommended_due_days,
          suggested_role: newActionForm.suggested_role || selectedRoleCode,
          entity_id: null,
          entity_name: 'Interne',
          assigned_user_id: newActionForm.assigned_user_id || null,
          source_question_ids: newActionForm.source_question_id ? [newActionForm.source_question_id] : [],
          control_point_ids: selectedQuestion?.control_points?.map(cp => cp.id) || [],
        };
      } else {
        // Mode Externe : entity_id de l'organisme sélectionné
        actionData = {
          title: newActionForm.title,
          description: newActionForm.description,
          objective: newActionForm.objective,
          deliverables: newActionForm.deliverables,
          severity: newActionForm.severity,
          priority: newActionForm.priority,
          status: newActionForm.status,
          recommended_due_days: newActionForm.recommended_due_days,
          suggested_role: newActionForm.suggested_role,
          entity_id: selectedExternalEntityId,
          entity_name: null,
          assigned_user_id: newActionForm.assigned_user_id || null,
          source_question_ids: newActionForm.source_question_id ? [newActionForm.source_question_id] : [],
          control_point_ids: selectedQuestion?.control_points?.map(cp => cp.id) || [],
        };
      }

      const response = await fetchWithAuth(`${API_BASE}/api/v1/actions`, {
        method: 'POST',
        body: JSON.stringify(actionData),
      });

      if (response.ok) {
        setCreateResult({
          type: 'success',
          message: 'Action créée avec succès',
        });
        handleCloseCreateModal();
        loadActions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setCreateResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la création de l\'action',
        });
      }
    } catch (err) {
      console.error('Erreur création action:', err);
      setCreateResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la création',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handlers pour RichTextEditor
  const handleNewDescriptionChange = (value: string) => {
    setNewActionForm({ ...newActionForm, description: value });
  };

  const handleNewObjectiveChange = (value: string) => {
    setNewActionForm({ ...newActionForm, objective: value });
  };

  const handleNewDeliverablesChange = (value: string) => {
    setNewActionForm({ ...newActionForm, deliverables: value });
  };

  const getStatusConfig = (status: Action['status']) => {
    const configs = {
      pending: {
        label: 'En attente',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-l-gray-400',
        icon: Clock
      },
      in_progress: {
        label: 'En cours',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-l-blue-500',
        icon: RefreshCw
      },
      completed: {
        label: 'Terminé',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-l-green-500',
        icon: CheckCircle
      },
      blocked: {
        label: 'Bloqué',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-l-red-500',
        icon: AlertTriangle
      }
    };
    return configs[status] || configs.pending;
  };

  const getPriorityConfig = (priority: Action['priority']) => {
    const configs = {
      P1: { label: 'P1 - Critique', bgColor: 'bg-red-100', textColor: 'text-red-800' },
      P2: { label: 'P2 - Important', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
      P3: { label: 'P3 - Normal', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' }
    };
    return configs[priority] || configs.P3;
  };

  const getSeverityConfig = (severity: Action['severity']) => {
    const configs = {
      critical: { label: 'Critique', bgColor: 'bg-red-600', textColor: 'text-white' },
      major: { label: 'Majeur', bgColor: 'bg-orange-500', textColor: 'text-white' },
      minor: { label: 'Mineur', bgColor: 'bg-yellow-500', textColor: 'text-white' },
      info: { label: 'Info', bgColor: 'bg-blue-500', textColor: 'text-white' }
    };
    return configs[severity] || configs.info;
  };

  // Handler pour sauvegarder une action éditée
  const handleSaveAction = async (updatedAction: ActionFormData) => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/actions/${updatedAction.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updatedAction),
        }
      );

      if (response.ok) {
        await loadActions();
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

  // Handler pour supprimer une action
  const handleDeleteAction = async () => {
    if (!deletingAction) return;

    try {
      setIsDeleting(true);

      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/actions/${deletingAction.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setDeleteResult({
          type: 'success',
          message: `L'action "${deletingAction.title}" a été supprimée avec succès.`,
        });
        setDeletingAction(null);
        await loadActions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setDeleteResult({
          type: 'error',
          message: errorData.detail || 'Erreur lors de la suppression de l\'action',
        });
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setDeleteResult({
        type: 'error',
        message: 'Une erreur est survenue lors de la suppression',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrer les actions
  const filteredActions = actions.filter(action => {
    const matchesSearch =
      action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stripHtmlTags(action.description).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.entity_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.pole_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || action.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || action.priority === filterPriority;
    const matchesEntity = filterEntity === 'all' || action.entity_id === filterEntity;

    // Filtre Interne : 'all' = toutes, 'internal' = actions internes (sans campaign_id), 'pole_XXX' = par pôle spécifique
    let matchesInterne = true;
    if (filterInterne === 'internal') {
      // Actions internes uniquement (sans campagne)
      matchesInterne = !action.campaign_id;
    } else if (filterInterne.startsWith('pole_')) {
      // Par pôle spécifique
      const poleId = filterInterne.replace('pole_', '');
      matchesInterne = action.pole_id === poleId;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesEntity && matchesInterne;
  });

  // Calculer les statistiques
  const stats: ActionStats = {
    total: actions.length,
    pending: actions.filter(a => a.status === 'pending').length,
    in_progress: actions.filter(a => a.status === 'in_progress').length,
    completed: actions.filter(a => a.status === 'completed').length,
    blocked: actions.filter(a => a.status === 'blocked').length,
    critical: actions.filter(a => a.severity === 'critical').length,
    overdue: 0
  };

  return (
    <div className="min-h-screen flex flex-col client" data-section="actions">

      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">

            {/* Section Gauche : Titre + Description */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ListChecks className="w-8 h-8 mr-3 text-orange-600" />
                Actions
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Suivi et gestion des actions correctives issues des plans d&apos;action
              </p>
            </div>

            {/* Section Droite : Boutons d'Action */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une action
              </button>
              <button
                onClick={loadActions}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                <ListChecks className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">En attente</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="p-2 sm:p-3 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">En cours</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.in_progress}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Terminées</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Critiques</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Filter className="w-5 h-5 text-gray-500 hidden md:block" />

            {/* Recherche */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher une action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Filtre Statut */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-[150px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="blocked">Bloqué</option>
            </select>

            {/* Filtre Priorité */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-[150px]"
            >
              <option value="all">Toutes priorités</option>
              <option value="P1">P1 - Critique</option>
              <option value="P2">P2 - Important</option>
              <option value="P3">P3 - Normal</option>
            </select>

            {/* Filtre Entité */}
            {entities.length > 0 && (
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-[180px]"
              >
                <option value="all">Toutes les entités</option>
                {entities.map(entity => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            )}

            {/* Filtre Interne (actions standalone / pôles) */}
            <select
              value={filterInterne}
              onChange={(e) => setFilterInterne(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-[180px]"
            >
              <option value="all">Toutes sources</option>
              <option value="internal">Actions internes uniquement</option>
              {poles.length > 0 && (
                <optgroup label="Par pôle">
                  {poles.map(pole => (
                    <option key={pole.id} value={`pole_${pole.id}`}>
                      {pole.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Compteur */}
            <div className="text-sm text-gray-600 font-medium whitespace-nowrap">
              {filteredActions.length} action(s)
            </div>
          </div>
        </div>

        {/* Liste des Actions */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold flex items-center text-gray-800">
              <Target className="w-5 h-5 mr-2 text-orange-600" />
              Actions ({filteredActions.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              <span className="ml-3 text-gray-600">Chargement des actions...</span>
            </div>
          ) : error ? (
            <ErrorDisplay
              type={getErrorTypeFromMessage(error)}
              customMessage={error}
              onRetry={loadActions}
              showBack={true}
              showHome={true}
              permissionCode={extractPermissionCodeFromMessage(error)}
              actionName="Gestion des Actions"
            />
          ) : filteredActions.length === 0 ? (
            <div className="text-center py-16">
              <ListChecks className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune action</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' || filterEntity !== 'all' || filterInterne !== 'all'
                  ? 'Aucune action ne correspond à vos critères de recherche.'
                  : 'Les actions apparaîtront ici après publication des plans d\'action ou création manuelle.'
                }
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une action
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredActions.map((action) => {
                const statusConfig = getStatusConfig(action.status);
                const priorityConfig = getPriorityConfig(action.priority);
                const severityConfig = getSeverityConfig(action.severity);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={action.id}
                    className={`p-5 border-l-4 ${statusConfig.borderColor} hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Titre et badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* Code action */}
                          {action.code_action && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-mono font-semibold rounded">
                              {action.code_action}
                            </span>
                          )}
                          <h3 className="text-base font-semibold text-gray-900 truncate max-w-xl">
                            {action.title}
                          </h3>
                          <span className={`px-2.5 py-1 ${statusConfig.bgColor} ${statusConfig.textColor} text-xs rounded-full flex items-center`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </span>
                          <span className={`px-2 py-0.5 ${priorityConfig.bgColor} ${priorityConfig.textColor} text-xs rounded-full`}>
                            {priorityConfig.label}
                          </span>
                          <span className={`px-2 py-0.5 ${severityConfig.bgColor} ${severityConfig.textColor} text-xs rounded-full`}>
                            {severityConfig.label}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{stripHtmlTags(action.description)}</p>

                        {/* Question source */}
                        {action.source_question && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start gap-2">
                              {action.source_question.question_code && (
                                <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {action.source_question.question_code}
                                </span>
                              )}
                              <p className="text-xs text-gray-600 line-clamp-1 flex-1">
                                {action.source_question.question_text}
                              </p>
                              {action.source_question.domain_name && (
                                <span className="text-xs text-orange-500 font-medium flex-shrink-0">
                                  {action.source_question.domain_name}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Points de contrôle */}
                        {action.control_points && action.control_points.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {action.control_points.slice(0, 3).map((cp, index) => (
                              <span
                                key={`${action.id}-cp-${cp.id}-${index}`}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
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

                        {/* Métadonnées */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          {/* Badge Interne pour actions standalone */}
                          {!action.campaign_id && (
                            <div className="flex items-center">
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                Interne
                              </span>
                            </div>
                          )}
                          {action.entity_name && (
                            <div className="flex items-center">
                              <Building2 className="w-3.5 h-3.5 mr-1.5" />
                              {action.entity_name}
                            </div>
                          )}
                          {/* Affichage du pôle associé */}
                          {action.pole_name && (
                            <div className="flex items-center text-purple-600">
                              <Users className="w-3.5 h-3.5 mr-1.5" />
                              Pôle: {action.pole_name}
                            </div>
                          )}
                          {action.assigned_user_name && (
                            <div className="flex items-center">
                              <User className="w-3.5 h-3.5 mr-1.5" />
                              {action.assigned_user_name}
                            </div>
                          )}
                          {!action.assigned_user_name && action.suggested_role && (
                            <div className="flex items-center text-orange-600">
                              <User className="w-3.5 h-3.5 mr-1.5" />
                              {action.suggested_role} (non assigné)
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" />
                            {action.recommended_due_days} jours
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => setViewingAction(action)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Voir
                        </button>
                        <button
                          onClick={() => setEditingAction(action)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Éditer
                        </button>
                        <button
                          onClick={() => setDeletingAction(action)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer statistiques */}
        {!loading && !error && actions.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-between items-center text-sm text-gray-500">
            <div>
              {stats.completed} terminée(s) sur {stats.total} • {stats.in_progress} en cours • {stats.blocked} bloquée(s)
            </div>
          </div>
        )}

      </div>

      {/* Modal Voir les détails */}
      <ActionDetailsModal
        isOpen={!!viewingAction}
        onClose={() => setViewingAction(null)}
        action={viewingAction!}
      />

      {/* Modal Éditer */}
      {editingAction && (
        <ActionEditModal
          isOpen={true}
          onClose={() => setEditingAction(null)}
          onSave={handleSaveAction}
          action={editingAction}
          entityId={editingAction.entity_id || undefined}
          campaignId={editingAction.campaign_id || undefined}
        />
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

      {/* Modal de confirmation de suppression */}
      {deletingAction && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingAction(null)}
          onConfirm={handleDeleteAction}
          title="Supprimer l'action"
          message={`Êtes-vous sûr de vouloir supprimer l'action "${deletingAction.title}" ? Cette action est irréversible.`}
          type="confirm"
          confirmText={isDeleting ? "Suppression..." : "Supprimer"}
          cancelText="Annuler"
          confirmButtonColor="red"
        />
      )}

      {/* Modal de résultat de suppression */}
      {deleteResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteResult(null)}
          title={deleteResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={deleteResult.message}
          type={deleteResult.type}
        />
      )}

      {/* Modal de création d'action */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 flex items-center justify-between border-b border-orange-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Créer une nouvelle action</h3>
              </div>
              <button
                onClick={handleCloseCreateModal}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Fermer"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Titre */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                  Titre de l&apos;action <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={newActionForm.title}
                  onChange={(e) => setNewActionForm({ ...newActionForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: Mettre en place une politique de mots de passe"
                />
              </div>

              {/* Description */}
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

              {/* Objectif */}
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

              {/* Livrables */}
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
                            className="mr-3 text-orange-500 focus:ring-orange-500"
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
                            className="mr-3 text-orange-500 focus:ring-orange-500"
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
                          className="mr-3 text-orange-500 focus:ring-orange-500"
                        />
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${config.className}`}>
                          {config.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Délai recommandé */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                  Délai recommandé (jours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newActionForm.recommended_due_days}
                  onChange={(e) => setNewActionForm({ ...newActionForm, recommended_due_days: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Section Toggle Interne/Externe */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200 shadow-sm">
                <label className="block text-sm font-semibold text-orange-900 mb-4 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-orange-600" />
                  Assignation de l&apos;action
                </label>

                {/* Toggle Interne/Externe */}
                <div className="flex items-center space-x-4 mb-4 p-3 bg-white rounded-lg border border-orange-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="createAssignmentType"
                      value="internal"
                      checked={assignmentType === 'internal'}
                      onChange={() => {
                        setAssignmentType('internal');
                        setNewActionForm({ ...newActionForm, suggested_role: '', assigned_user_id: '', entity_id: '' });
                        setSelectedRoleCode('');
                        setSelectedCategory('');
                        setSelectedExternalEntityId('');
                        setAvailableMembers([]);
                        setUsersByRole([]);
                      }}
                      className="mr-2 text-orange-600 focus:ring-orange-500"
                    />
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      assignmentType === 'internal'
                        ? 'bg-orange-100 text-orange-700 border border-orange-300'
                        : 'text-gray-600'
                    }`}>
                      🏢 Interne
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="createAssignmentType"
                      value="external"
                      checked={assignmentType === 'external'}
                      onChange={() => {
                        setAssignmentType('external');
                        setNewActionForm({ ...newActionForm, suggested_role: '', assigned_user_id: '', entity_id: '' });
                        setSelectedRoleCode('');
                        setUsersByRole([]);
                        // Initialiser filteredEntities avec toutes les entités
                        setFilteredEntities(scopeEntities);
                      }}
                      className="mr-2 text-orange-600 focus:ring-orange-500"
                    />
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      assignmentType === 'external'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'text-gray-600'
                    }`}>
                      🌐 Externe
                    </span>
                  </label>
                </div>

                {/* Mode INTERNE */}
                {assignmentType === 'internal' && (
                  <div className="space-y-4 bg-white rounded-lg p-4 border border-orange-200">
                    {/* Sélection du rôle */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                        <Target className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                        Rôle
                      </label>
                      {loadingRoles ? (
                        <div className="flex items-center py-2">
                          <Loader2 className="w-4 h-4 text-orange-500 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Chargement des rôles...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedRoleCode}
                          onChange={(e) => {
                            const roleCode = e.target.value;
                            setSelectedRoleCode(roleCode);
                            setNewActionForm({ ...newActionForm, suggested_role: roleCode, assigned_user_id: '' });
                            loadUsersByRole(roleCode);
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50"
                        >
                          <option value="">-- Sélectionner un rôle --</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.code}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {roles.length} rôle(s) disponible(s)
                      </p>
                    </div>

                    {/* Sélection de l'utilisateur */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                        <User className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                        Assigner à
                      </label>
                      {!selectedRoleCode ? (
                        <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                          Sélectionnez d&apos;abord un rôle
                        </div>
                      ) : loadingUsersByRole ? (
                        <div className="flex items-center py-2">
                          <Loader2 className="w-4 h-4 text-orange-500 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Chargement des utilisateurs...</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={newActionForm.assigned_user_id}
                            onChange={(e) => setNewActionForm({ ...newActionForm, assigned_user_id: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            disabled={usersByRole.length === 0}
                          >
                            <option value="">-- Non assigné --</option>
                            {usersByRole.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.full_name || `${user.first_name} ${user.last_name}`} - {user.email}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {usersByRole.length > 0
                              ? `${usersByRole.length} utilisateur(s) avec ce rôle`
                              : 'Aucun utilisateur avec ce rôle'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode EXTERNE */}
                {assignmentType === 'external' && (
                  <div className="space-y-4 bg-white rounded-lg p-4 border border-blue-200">
                    {loadingScope ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Chargement des organismes...</span>
                      </div>
                    ) : (
                      <>
                        {/* Sélection de la catégorie */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                            <Target className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            Catégorie d&apos;organisme
                          </label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => {
                              const cat = e.target.value;
                              setSelectedCategory(cat);
                              // Filtrer les entités par catégorie (inclure sous-catégories)
                              if (cat) {
                                const filtered = scopeEntities.filter(entity =>
                                  entity.parent_category === cat || entity.entity_category === cat
                                );
                                setFilteredEntities(filtered);
                              } else {
                                setFilteredEntities(scopeEntities);
                              }
                              setSelectedExternalEntityId('');
                              setAvailableMembers([]);
                              setNewActionForm({ ...newActionForm, assigned_user_id: '' });
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                          >
                            <option value="">-- Toutes les catégories --</option>
                            {externalCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {externalCategories.length} catégorie(s) disponible(s)
                          </p>
                        </div>

                        {/* Sélection de l'organisme */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                            <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            Organisme <span className="text-red-500 ml-1">*</span>
                          </label>
                          <select
                            value={selectedExternalEntityId}
                            onChange={(e) => {
                              const entityId = e.target.value;
                              setSelectedExternalEntityId(entityId);
                              // Charger les membres de l'entité sélectionnée
                              const entity = scopeEntities.find(ent => ent.id === entityId);
                              setAvailableMembers(entity?.members || []);
                              setNewActionForm({ ...newActionForm, assigned_user_id: '' });
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={filteredEntities.length === 0}
                          >
                            <option value="">-- Sélectionner un organisme --</option>
                            {filteredEntities.map((entity) => (
                              <option key={entity.id} value={entity.id}>
                                {entity.name} {entity.entity_category ? `(${entity.entity_category})` : ''}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {filteredEntities.length} organisme(s) {selectedCategory ? 'dans cette catégorie' : 'au total'}
                          </p>
                        </div>

                        {/* Rôle suggéré (texte libre) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                            <User className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            Rôle suggéré
                          </label>
                          <input
                            type="text"
                            value={newActionForm.suggested_role}
                            onChange={(e) => setNewActionForm({ ...newActionForm, suggested_role: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ex: Chef de projet, Responsable SI, DPO..."
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Saisie libre du rôle attendu
                          </p>
                        </div>

                        {/* Sélection du membre */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            Assigner à
                          </label>
                          {!selectedExternalEntityId ? (
                            <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                              Sélectionnez d&apos;abord un organisme
                            </div>
                          ) : (
                            <>
                              <select
                                value={newActionForm.assigned_user_id}
                                onChange={(e) => setNewActionForm({ ...newActionForm, assigned_user_id: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={availableMembers.length === 0}
                              >
                                <option value="">-- Non assigné --</option>
                                {availableMembers.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.first_name} {member.last_name}
                                    {member.role ? ` (${member.role})` : ''}
                                    {member.email ? ` - ${member.email}` : ''}
                                  </option>
                                ))}
                              </select>
                              {availableMembers.length === 0 ? (
                                <p className="text-xs text-amber-600 mt-1 flex items-center">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                  Aucun membre dans cet organisme
                                </p>
                              ) : (
                                <p className="text-xs text-gray-500 mt-1">
                                  {availableMembers.length} membre(s) disponible(s)
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Section Point de contrôle (optionnel) */}
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-orange-900 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-orange-500" />
                    Point(s) de contrôle associé(s) <span className="text-gray-500 text-xs ml-2">(optionnel)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuestionSelector(true)}
                    className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Sélectionner une question
                  </button>
                </div>

                {selectedQuestion ? (
                  <div className="space-y-3">
                    {/* Question sélectionnée */}
                    <div className="bg-white rounded-lg p-3 border border-orange-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {selectedQuestion.question_code && (
                              <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                {selectedQuestion.question_code}
                              </span>
                            )}
                            {selectedQuestion.domain_name && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                {selectedQuestion.domain_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{selectedQuestion.question_text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuestion(null);
                            setNewActionForm({ ...newActionForm, source_question_id: '' });
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-500 ml-2"
                          title="Retirer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Points de contrôle */}
                    {selectedQuestion.control_points && selectedQuestion.control_points.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-orange-800">Points de contrôle associés :</p>
                        {selectedQuestion.control_points.map((cp) => (
                          <div key={cp.id} className="bg-white rounded-lg p-2 border border-gray-200 flex items-center gap-2">
                            <span className="text-xs font-semibold bg-orange-500 text-white px-2 py-0.5 rounded">
                              {cp.referential_code}
                            </span>
                            <span className="text-xs font-medium text-orange-900">{cp.control_id}</span>
                            <span className="text-xs text-gray-600 truncate">{cp.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Aucune question sélectionnée. Cliquez sur le bouton ci-dessus pour associer un point de contrôle.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-100 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateAction}
                disabled={isCreating || !newActionForm.title.trim() || (assignmentType === 'external' && !selectedExternalEntityId)}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Créer l&apos;action
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de question */}
      <GlobalQuestionSelectorModal
        isOpen={showQuestionSelector}
        onClose={() => setShowQuestionSelector(false)}
        onSelect={handleQuestionSelect}
        selectedQuestionId={newActionForm.source_question_id}
      />
    </div>
  );
}
