'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Save, AlertCircle, Calendar, User, Target, FileText, Users, HelpCircle, Building2, Shield } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

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

interface EntityMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
}

interface Entity {
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
  full_name?: string;
}

interface AssignedUserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
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

interface ActionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAction: ActionFormData) => Promise<void>;
  action: {
    id: string;
    title: string;
    description: string;
    objective?: string;
    deliverables?: string;
    severity: 'critical' | 'major' | 'minor' | 'info';
    priority: 'P1' | 'P2' | 'P3';
    recommended_due_days: number;
    suggested_role: string;
    status: string;
    assigned_user_id: string | null;
    assigned_user_name?: string | null;  // Nom de l'utilisateur assigné
    entity_name?: string;
    control_points?: ControlPoint[];
    source_question?: SourceQuestion;
  };
  entityId?: string;  // Optionnel pour actions internes/standalone
  campaignId?: string;  // Optionnel pour actions standalone
}

export interface ActionFormData {
  id: string;
  title: string;
  description: string;
  objective?: string;
  deliverables?: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  priority: 'P1' | 'P2' | 'P3';
  recommended_due_days: number;
  suggested_role: string;
  status: string;
  assigned_user_id: string | null;
  entity_id?: string;
}

export function ActionEditModal({ isOpen, onClose, onSave, action, entityId, campaignId }: ActionEditModalProps) {
  const [formData, setFormData] = useState<ActionFormData>({
    id: action.id,
    title: action.title,
    description: action.description,
    objective: action.objective || '',
    deliverables: action.deliverables || '',
    severity: action.severity,
    priority: action.priority,
    recommended_due_days: action.recommended_due_days,
    suggested_role: action.suggested_role,
    status: action.status,
    assigned_user_id: action.assigned_user_id,
    entity_id: entityId,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [entityMembers, setEntityMembers] = useState<EntityMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(entityId);

  // États pour les rôles (actions standalone - mode Interne)
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [usersByRole, setUsersByRole] = useState<UserByRole[]>([]);
  const [loadingUsersByRole, setLoadingUsersByRole] = useState(false);
  const [currentAssignedUser, setCurrentAssignedUser] = useState<AssignedUserInfo | null>(null);

  // Toggle Interne/Externe pour les actions standalone
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

  // Déterminer si c'est une action standalone (sans campagne ni entité)
  // Note: Les actions Scanner ont une entité mais pas de campagne - elles ne sont PAS standalone
  const isStandaloneAction = !campaignId && !entityId;

  // Actions Scanner = actions avec entité mais sans campagne (provenant du module Scanner)
  const isScannerAction = !campaignId && !!entityId;

  // Handlers mémorisés pour éviter les re-renders infinis de Quill
  const handleDescriptionChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
  }, []);

  const handleObjectiveChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, objective: value }));
  }, []);

  const handleDeliverablesChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, deliverables: value }));
  }, []);

  // Reset form when action changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: action.id,
        title: action.title,
        description: action.description,
        objective: action.objective || '',
        deliverables: action.deliverables || '',
        severity: action.severity,
        priority: action.priority,
        recommended_due_days: action.recommended_due_days,
        suggested_role: action.suggested_role,
        status: action.status,
        assigned_user_id: action.assigned_user_id,
        entity_id: entityId,
      });
      setErrors({});
      setSelectedEntityId(entityId); // Reset selected entity to initial value

      // Reset états mode Interne/Externe pour actions standalone
      setAssignmentType('internal');
      setSelectedRoleCode('');
      setSelectedCategory('');
      setSelectedExternalEntityId('');
      setUsersByRole([]);
      setAvailableMembers([]);
    }
  }, [isOpen, action, entityId]);

  // Fetch available entities when modal opens
  useEffect(() => {
    const fetchEntities = async () => {
      if (!isOpen || !campaignId) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/campaigns/${campaignId}/entities`;
        console.log('🌐 Fetching entities from:', url);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📋 Entités chargées:', data);
          setEntities(data || []);

          // Si entityId n'est pas dans la liste, utiliser la première entité
          if (data && data.length > 0) {
            const entityExists = data.some((e: Entity) => e.id === entityId);
            if (!entityExists) {
              console.warn(`⚠️ entityId ${entityId} n'existe pas dans le scope, utilisation de ${data[0].id}`);
              setSelectedEntityId(data[0].id);
              setFormData(prev => ({ ...prev, entity_id: data[0].id }));
            }
          }
        } else {
          console.error('❌ Failed to fetch entities, status:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching entities:', error);
      }
    };

    fetchEntities();
  }, [isOpen, campaignId, entityId]);

  // Fetch entity members when modal opens or selectedEntityId changes
  useEffect(() => {
    const fetchEntityMembers = async () => {
      if (!isOpen || !selectedEntityId) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingMembers(false);
        return;
      }

      setLoadingMembers(true);
      try {
        // Construire l'URL avec campaign_id et action_item_id si disponibles
        const url = new URL(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/ecosystem/entities/${selectedEntityId}/members`
        );
        if (campaignId) {
          url.searchParams.append('campaign_id', campaignId);
        }
        if (action.id) {
          url.searchParams.append('action_item_id', action.id);
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Gérer deux formats de réponse possibles
          let members = [];
          if (Array.isArray(data)) {
            // Format: Array direct de membres
            members = data;
          } else if (data.members) {
            // Format: Object avec propriété members
            members = data.members;
          }

          setEntityMembers(members);
        } else if (response.status === 401) {
          console.warn('⚠️ Token expiré - Veuillez vous reconnecter');
          // Ne pas rediriger ici, laisser le fetch interceptor gérer
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to fetch entity members');
          console.error(`Status: ${response.status}`);
          console.error(`Error: ${errorText}`);
        }
      } catch (error) {
        console.error('❌ Error fetching entity members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchEntityMembers();
  }, [isOpen, selectedEntityId, campaignId]);

  // Fetch roles for standalone actions
  useEffect(() => {
    const fetchRoles = async () => {
      if (!isOpen || !isStandaloneAction) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      setLoadingRoles(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/actions/roles/list`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Erreur chargement rôles:', error);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [isOpen, isStandaloneAction]);

  // Set current assigned user from action data (no API call needed)
  useEffect(() => {
    if (!isOpen || !isStandaloneAction || !action.assigned_user_id) {
      setCurrentAssignedUser(null);
      return;
    }

    // Utiliser directement le nom de l'utilisateur assigné depuis l'action
    if (action.assigned_user_name) {
      // Parser le nom complet (format: "Prénom Nom")
      const nameParts = action.assigned_user_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setCurrentAssignedUser({
        id: action.assigned_user_id,
        first_name: firstName,
        last_name: lastName,
        email: '',
      });
    } else {
      // Fallback si le nom n'est pas disponible
      setCurrentAssignedUser({
        id: action.assigned_user_id,
        first_name: 'Utilisateur',
        last_name: 'assigné',
        email: '',
      });
    }
  }, [isOpen, isStandaloneAction, action.assigned_user_id, action.assigned_user_name]);

  // Fetch users by role for standalone actions (mode Interne)
  useEffect(() => {
    const fetchUsersByRole = async () => {
      if (!isOpen || !isStandaloneAction || assignmentType !== 'internal' || !selectedRoleCode) {
        setUsersByRole([]);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) return;

      setLoadingUsersByRole(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/actions/roles/${encodeURIComponent(selectedRoleCode)}/users`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUsersByRole(data.users || []);
        }
      } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
      } finally {
        setLoadingUsersByRole(false);
      }
    };

    fetchUsersByRole();
  }, [isOpen, isStandaloneAction, assignmentType, selectedRoleCode]);

  // Fetch scope entities for standalone actions (mode Externe)
  useEffect(() => {
    const fetchScopeEntities = async () => {
      if (!isOpen || !isStandaloneAction) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      setLoadingScope(true);
      try {
        // Utiliser l'endpoint global pour récupérer toutes les entités externes du tenant
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/actions/scope-entities`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
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
      } catch (error) {
        console.error('Erreur chargement scope entities:', error);
      } finally {
        setLoadingScope(false);
      }
    };

    fetchScopeEntities();
  }, [isOpen, isStandaloneAction]);

  // Filter entities by category (mode Externe)
  useEffect(() => {
    if (!isStandaloneAction || assignmentType !== 'external') return;

    if (selectedCategory) {
      // Filtrer les entités dont:
      // - la catégorie parente correspond (ex: MAROC, ESPAGNE sous Fournisseurs)
      // - OU la catégorie directe correspond (ex: entité directement dans Fournisseurs)
      const filtered = scopeEntities.filter(e =>
        e.parent_category === selectedCategory || e.entity_category === selectedCategory
      );
      setFilteredEntities(filtered);
    } else {
      setFilteredEntities(scopeEntities);
    }
    // Reset entity and user selection when category changes
    setSelectedExternalEntityId('');
    setAvailableMembers([]);
    setFormData(prev => ({ ...prev, assigned_user_id: null }));
  }, [isStandaloneAction, assignmentType, selectedCategory, scopeEntities]);

  // Update available members when entity is selected (mode Externe)
  useEffect(() => {
    if (!isStandaloneAction || assignmentType !== 'external' || !selectedExternalEntityId) {
      if (assignmentType === 'external') {
        setAvailableMembers([]);
      }
      return;
    }

    const entity = scopeEntities.find(e => e.id === selectedExternalEntityId);
    setAvailableMembers(entity?.members || []);
    // Mettre à jour entity_id et réinitialiser assigned_user_id
    // C'est crucial car le backend utilise entity_id pour déterminer le mode (interne vs externe)
    setFormData(prev => ({ ...prev, assigned_user_id: null, entity_id: selectedExternalEntityId }));
  }, [isStandaloneAction, assignmentType, selectedExternalEntityId, scopeEntities]);

  // Reset user assignment when switching modes
  useEffect(() => {
    if (!isStandaloneAction) return;

    if (assignmentType === 'internal') {
      // Mode Interne : effacer entity_id pour que le backend utilise assignee (users)
      setFormData(prev => ({ ...prev, assigned_user_id: null, entity_id: undefined }));
      setSelectedCategory('');
      setSelectedExternalEntityId('');
      setAvailableMembers([]);
    } else {
      // Mode Externe : entity_id sera défini quand on sélectionne un organisme
      setFormData(prev => ({ ...prev, assigned_user_id: null }));
      setSelectedRoleCode('');
      setUsersByRole([]);
    }
  }, [isStandaloneAction, assignmentType]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }

    if (formData.recommended_due_days < 1) {
      newErrors.recommended_due_days = 'Le délai doit être au moins 1 jour';
    }

    if (!formData.suggested_role.trim()) {
      newErrors.suggested_role = 'Le rôle suggéré est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving action:', error);
      setErrors({ submit: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsSaving(false);
    }
  };

  const getSeverityConfig = (severity: string) => {
    const configs = {
      critical: {
        label: 'Critique',
        className: 'bg-red-100 text-red-700 border-red-300',
      },
      major: {
        label: 'Majeure',
        className: 'bg-orange-100 text-orange-700 border-orange-300',
      },
      minor: {
        label: 'Mineure',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      },
      info: {
        label: 'Info',
        className: 'bg-blue-100 text-blue-700 border-blue-300',
      },
    };
    return configs[severity as keyof typeof configs] || configs.info;
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      P1: { label: 'P1 - Haute', className: 'bg-red-100 text-red-700 border-red-300' },
      P2: { label: 'P2 - Moyenne', className: 'bg-orange-100 text-orange-700 border-orange-300' },
      P3: { label: 'P3 - Basse', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    };
    return configs[priority as keyof typeof configs] || configs.P2;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: 'En attente', className: 'bg-gray-100 text-gray-700 border-gray-300' },
      in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      completed: { label: 'Terminé', className: 'bg-green-100 text-green-700 border-green-300' },
      blocked: { label: 'Bloqué', className: 'bg-red-100 text-red-700 border-red-300' },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Modifier l&apos;action</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Fermer"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Banner */}
          {errors.submit && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Titre */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-gray-500" />
              Titre de l&apos;action
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Mettre en place une politique de mots de passe"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-gray-500" />
              Description
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Description générale de l'action..."
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Objectif */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2 text-blue-600" />
              Objectif
            </label>
            <RichTextEditor
              value={formData.objective || ''}
              onChange={handleObjectiveChange}
              placeholder="Objectif spécifique de cette action..."
              className={errors.objective ? 'border-red-500' : ''}
            />
            {errors.objective && (
              <p className="text-sm text-red-600 mt-1">{errors.objective}</p>
            )}
          </div>

          {/* Livrables attendus */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <label className="block text-sm font-semibold text-green-900 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-green-600" />
              Livrables attendus
            </label>
            <RichTextEditor
              value={formData.deliverables || ''}
              onChange={handleDeliverablesChange}
              placeholder="Liste des livrables attendus..."
              className={errors.deliverables ? 'border-red-500' : ''}
            />
            {errors.deliverables && (
              <p className="text-sm text-red-600 mt-1">{errors.deliverables}</p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              💡 Utilisez la barre d&apos;outils pour mettre en forme votre texte (gras, listes, couleurs, etc.)
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
                  const config = getSeverityConfig(severity);
                  return (
                    <label key={severity} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="severity"
                        value={severity}
                        checked={formData.severity === severity}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="mr-3 text-indigo-600 focus:ring-indigo-500"
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
                  const config = getPriorityConfig(priority);
                  return (
                    <label key={priority} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value={priority}
                        checked={formData.priority === priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="mr-3 text-indigo-600 focus:ring-indigo-500"
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
                const config = getStatusConfig(status);
                return (
                  <label key={status} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.status === status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="mr-3 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${config.className}`}>
                      {config.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Délai, Rôle et Assignation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Délai recommandé */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                Délai recommandé (jours)
              </label>
              <input
                type="number"
                min="1"
                value={formData.recommended_due_days}
                onChange={(e) => setFormData({ ...formData, recommended_due_days: parseInt(e.target.value) || 0 })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.recommended_due_days ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.recommended_due_days && (
                <p className="text-sm text-red-600 mt-1">{errors.recommended_due_days}</p>
              )}
            </div>

            {/* Rôle suggéré */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-indigo-600" />
                Rôle suggéré
              </label>
              {isStandaloneAction ? (
                // Pour les actions standalone : sélecteur de rôles existants
                loadingRoles ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    Chargement des rôles...
                  </div>
                ) : (
                  <select
                    value={formData.suggested_role}
                    onChange={(e) => {
                      setFormData({ ...formData, suggested_role: e.target.value, assigned_user_id: null });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.suggested_role ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner un rôle</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.code}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                // Pour les actions de campagne : champ texte libre
                <input
                  type="text"
                  value={formData.suggested_role}
                  onChange={(e) => setFormData({ ...formData, suggested_role: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.suggested_role ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ex: RSSI, DSI, DPO"
                />
              )}
              {errors.suggested_role && (
                <p className="text-sm text-red-600 mt-1">{errors.suggested_role}</p>
              )}
            </div>

            {/* Organisme (Entité) - Affiché pour actions de campagne ET actions Scanner */}
            {(!isStandaloneAction || isScannerAction) && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-orange-500" />
                  Organisme
                </label>
                {isScannerAction ? (
                  // Pour les actions Scanner : afficher le nom de l'entité en lecture seule
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
                    {action.entity_name || 'Non défini'}
                  </div>
                ) : entities.length > 0 ? (
                  <>
                    <select
                      value={selectedEntityId}
                      onChange={(e) => {
                        console.log('🔄 Changement d\'organisme:', e.target.value);
                        setSelectedEntityId(e.target.value);
                        // Reset assigned user and update entity_id when entity changes
                        setFormData({ ...formData, assigned_user_id: null, entity_id: e.target.value });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      {entities.length} organisme(s) disponible(s)
                    </p>
                  </>
                ) : (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    Chargement des organismes...
                  </div>
                )}
              </div>
            )}

            {/* Assignation - Affiché pour actions de campagne ET actions Scanner */}
            {(!isStandaloneAction || isScannerAction) && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-600" />
                  Assigner à
                </label>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-2">
                    <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : (
                  <select
                    value={formData.assigned_user_id || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Non assigné</option>
                    {entityMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {entityMembers.length > 0
                    ? `${entityMembers.length} membre(s) disponible(s)`
                    : 'Aucun membre disponible'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Section pour les actions standalone : Toggle Interne/Externe */}
          {isStandaloneAction && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 shadow-sm">
              <label className="block text-sm font-semibold text-indigo-900 mb-4 flex items-center">
                <Users className="w-4 h-4 mr-2 text-indigo-600" />
                Assignation de l&apos;action
              </label>

              {/* Toggle Interne/Externe */}
              <div className="flex items-center space-x-4 mb-4 p-3 bg-white rounded-lg border border-indigo-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentTypeStandalone"
                    value="internal"
                    checked={assignmentType === 'internal'}
                    onChange={() => setAssignmentType('internal')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    assignmentType === 'internal'
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      : 'text-gray-600'
                  }`}>
                    🏢 Interne
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentTypeStandalone"
                    value="external"
                    checked={assignmentType === 'external'}
                    onChange={() => setAssignmentType('external')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
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
                <div className="space-y-4 bg-white rounded-lg p-4 border border-indigo-200">
                  {/* Sélection du rôle */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                      <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                      Rôle
                    </label>
                    {loadingRoles ? (
                      <div className="flex items-center py-2">
                        <svg className="animate-spin h-4 w-4 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm text-gray-500">Chargement des rôles...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedRoleCode}
                        onChange={(e) => {
                          setSelectedRoleCode(e.target.value);
                          setFormData(prev => ({ ...prev, suggested_role: e.target.value, assigned_user_id: null }));
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
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
                      <User className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                      Assigner à
                    </label>
                    {!selectedRoleCode ? (
                      <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                        Sélectionnez d&apos;abord un rôle
                      </div>
                    ) : loadingUsersByRole ? (
                      <div className="flex items-center py-2">
                        <svg className="animate-spin h-4 w-4 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm text-gray-500">Chargement des utilisateurs...</span>
                      </div>
                    ) : (
                      <>
                        <select
                          value={formData.assigned_user_id || ''}
                          onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value || null })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          disabled={usersByRole.length === 0}
                        >
                          <option value="">-- Non assigné --</option>
                          {/* Afficher l'utilisateur actuellement assigné s'il n'est pas dans la liste */}
                          {currentAssignedUser && !usersByRole.some(u => u.id === currentAssignedUser.id) && (
                            <option key={currentAssignedUser.id} value={currentAssignedUser.id}>
                              {currentAssignedUser.first_name} {currentAssignedUser.last_name} (actuel)
                            </option>
                          )}
                          {usersByRole.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} - {user.email}
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
                      <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="ml-2 text-sm text-gray-500">Chargement des organismes...</span>
                    </div>
                  ) : (
                    <>
                      {/* Sélection de la catégorie */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                          <Shield className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                          Catégorie d&apos;organisme
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
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
                          Organisme
                        </label>
                        <select
                          value={selectedExternalEntityId}
                          onChange={(e) => setSelectedExternalEntityId(e.target.value)}
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
                          value={formData.suggested_role}
                          onChange={(e) => setFormData({ ...formData, suggested_role: e.target.value })}
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
                              value={formData.assigned_user_id || ''}
                              onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value || null })}
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
          )}

          {/* Question Source et Points de Contrôle (lecture seule) */}
          {(action.source_question || (action.control_points && action.control_points.length > 0)) && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h5 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
                <HelpCircle className="w-4 h-4 mr-2 text-orange-500" />
                Question source et contrôles associés
              </h5>

              {/* Question Source */}
              {action.source_question && (
                <div className="bg-white rounded-lg p-4 border border-orange-200 mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                      <HelpCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {action.source_question.question_code && (
                          <span className="text-xs font-mono bg-orange-200 text-orange-800 px-2 py-0.5 rounded">
                            {action.source_question.question_code}
                          </span>
                        )}
                        {action.source_question.domain_name && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {action.source_question.domain_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-orange-900">
                        {action.source_question.question_text}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Control Points */}
              {action.control_points && action.control_points.length > 0 && (
                <>
                  <p className="text-xs font-medium text-orange-800 mb-2">
                    Points de contrôle référentiels ({action.control_points.length})
                  </p>
                  <div className="space-y-2">
                    {action.control_points.map((cp) => (
                      <div
                        key={cp.id}
                        className="bg-white rounded-lg p-3 border border-orange-200"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-orange-500 text-white flex-shrink-0">
                            {cp.referential_code}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-orange-900 text-sm">
                              {cp.control_id}
                            </div>
                            <div className="text-orange-700 text-xs mt-0.5">
                              {cp.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <p className="text-xs text-orange-700 mt-3">
                ℹ️ La question source et les contrôles référentiels ne peuvent pas être modifiés
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
            disabled={isSaving}
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
