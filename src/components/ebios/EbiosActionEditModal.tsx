'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, User, Target, FileText, Shield, Building2, TrendingDown, Bookmark, Zap, Clock, CheckCircle, Users } from 'lucide-react';

interface EbiosActionItem {
  id: number;
  code_action: string;
  titre: string;
  description: string;
  categorie: string;
  priorite: 'P1' | 'P2' | 'P3';
  objectif: string;
  justification: string;
  effort: string;
  cout_estime: string;
  sources_couvertes: string[];
  biens_supports: string[];
  scenarios_couverts: string[];
  risque_initial: number | null;
  risque_cible: number | null;
  responsable_suggere: string;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  delai_recommande: string;
  due_date?: string;
  statut: 'pending' | 'in_progress' | 'completed' | 'blocked';
  references_normatives: string[];
  source: 'AI' | 'MANUAL';
}

export interface EbiosActionFormData {
  id: number;
  code_action: string;
  titre: string;
  description: string;
  categorie: string;
  priorite: 'P1' | 'P2' | 'P3';
  objectif: string;
  justification: string;
  effort: string;
  cout_estime: string;
  sources_couvertes: string[];
  biens_supports: string[];
  scenarios_couverts: string[];
  risque_initial: number | null;
  risque_cible: number | null;
  responsable_suggere: string;
  assigned_user_id: string | null;
  delai_recommande: string;
  due_date?: string;
  statut: 'pending' | 'in_progress' | 'completed' | 'blocked';
  references_normatives: string[];
}

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
}

interface EbiosActionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAction: EbiosActionFormData) => Promise<void>;
  action: EbiosActionItem;
  studyId: string;
}

const CATEGORIES = [
  'Préventive',
  'Détective',
  'Corrective',
  'Organisation/Pilotage',
  'Contractuelle/Fournisseurs'
];

const EFFORTS = [
  'Faible',
  'Moyen',
  'Élevé'
];

const DELAIS = [
  'Court terme (< 3 mois)',
  'Moyen terme (3-6 mois)',
  'Long terme (> 6 mois)'
];

export function EbiosActionEditModal({ isOpen, onClose, onSave, action, studyId }: EbiosActionEditModalProps) {
  const [formData, setFormData] = useState<EbiosActionFormData>({
    id: action.id,
    code_action: action.code_action,
    titre: action.titre,
    description: action.description,
    categorie: action.categorie,
    priorite: action.priorite,
    objectif: action.objectif,
    justification: action.justification,
    effort: action.effort,
    cout_estime: action.cout_estime,
    sources_couvertes: action.sources_couvertes || [],
    biens_supports: action.biens_supports || [],
    scenarios_couverts: action.scenarios_couverts || [],
    risque_initial: action.risque_initial,
    risque_cible: action.risque_cible,
    responsable_suggere: action.responsable_suggere,
    assigned_user_id: action.assigned_user_id,
    delai_recommande: action.delai_recommande,
    due_date: action.due_date,
    statut: action.statut,
    references_normatives: action.references_normatives || [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Toggle Interne/Externe
  const [assignmentType, setAssignmentType] = useState<'internal' | 'external'>('internal');

  // Mode Interne: Rôles et utilisateurs par rôle
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('');
  const [usersByRole, setUsersByRole] = useState<UserByRole[]>([]);
  const [loadingUsersByRole, setLoadingUsersByRole] = useState(false);

  // Mode Externe: Scope entities, catégories, organismes
  const [loadingScope, setLoadingScope] = useState(false);
  const [scopeEntities, setScopeEntities] = useState<ScopeEntity[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredEntities, setFilteredEntities] = useState<ScopeEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [availableMembers, setAvailableMembers] = useState<ScopeEntityMember[]>([]);

  // Reset form when action changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: action.id,
        code_action: action.code_action,
        titre: action.titre,
        description: action.description,
        categorie: action.categorie,
        priorite: action.priorite,
        objectif: action.objectif,
        justification: action.justification,
        effort: action.effort,
        cout_estime: action.cout_estime,
        sources_couvertes: action.sources_couvertes || [],
        biens_supports: action.biens_supports || [],
        scenarios_couverts: action.scenarios_couverts || [],
        risque_initial: action.risque_initial,
        risque_cible: action.risque_cible,
        responsable_suggere: action.responsable_suggere,
        assigned_user_id: action.assigned_user_id,
        delai_recommande: action.delai_recommande,
        due_date: action.due_date,
        statut: action.statut,
        references_normatives: action.references_normatives || [],
      });
      setErrors({});
      setAssignmentType('internal');
      setSelectedRoleCode('');
      setSelectedCategory('');
      setSelectedEntityId('');
      setUsersByRole([]);
      setAvailableMembers([]);
    }
  }, [isOpen, action]);

  // Fetch roles for internal assignment
  useEffect(() => {
    const fetchRoles = async () => {
      if (!isOpen) return;

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
  }, [isOpen]);

  // Fetch users by role when role is selected (internal mode)
  useEffect(() => {
    const fetchUsersByRole = async () => {
      if (!isOpen || assignmentType !== 'internal' || !selectedRoleCode) {
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
  }, [isOpen, assignmentType, selectedRoleCode]);

  // Fetch scope entities for external assignment
  useEffect(() => {
    const fetchScopeEntities = async () => {
      if (!isOpen || !studyId) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      setLoadingScope(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/risk/projects/${studyId}/scope-entities`,
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
          // Pour chaque entité, on prend parent_category si elle existe, sinon entity_category
          const uniqueCategories = [...new Set(
            entities
              .map(e => e.parent_category || e.entity_category)
              .filter((cat): cat is string => !!cat)
          )].sort();
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Erreur chargement scope entities:', error);
      } finally {
        setLoadingScope(false);
      }
    };

    fetchScopeEntities();
  }, [isOpen, studyId]);

  // Filter entities by category (external mode)
  // Filtre par catégorie parente OU catégorie directe
  useEffect(() => {
    if (assignmentType !== 'external') return;

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
    setSelectedEntityId('');
    setAvailableMembers([]);
    setFormData(prev => ({ ...prev, assigned_user_id: null }));
  }, [assignmentType, selectedCategory, scopeEntities]);

  // Update available members when entity is selected (external mode)
  useEffect(() => {
    if (assignmentType !== 'external' || !selectedEntityId) {
      if (assignmentType === 'external') {
        setAvailableMembers([]);
      }
      return;
    }

    const entity = scopeEntities.find(e => e.id === selectedEntityId);
    setAvailableMembers(entity?.members || []);
    setFormData(prev => ({ ...prev, assigned_user_id: null }));
  }, [assignmentType, selectedEntityId, scopeEntities]);

  // Reset user assignment when switching modes
  useEffect(() => {
    setFormData(prev => ({ ...prev, assigned_user_id: null }));
    if (assignmentType === 'internal') {
      setSelectedCategory('');
      setSelectedEntityId('');
      setAvailableMembers([]);
    } else {
      setSelectedRoleCode('');
      setUsersByRole([]);
    }
  }, [assignmentType]);

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

    if (!formData.titre.trim()) {
      newErrors.titre = 'Le titre est requis';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }

    if (!formData.categorie) {
      newErrors.categorie = 'La catégorie est requise';
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

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'P1':
        return { label: 'P1 - Critique', className: 'bg-red-100 text-red-700 border-red-300' };
      case 'P2':
        return { label: 'P2 - Important', className: 'bg-orange-100 text-orange-700 border-orange-300' };
      case 'P3':
      default:
        return { label: 'P3 - Normal', className: 'bg-blue-100 text-blue-700 border-blue-300' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', className: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock };
      case 'in_progress':
        return { label: 'En cours', className: 'bg-blue-100 text-blue-700 border-blue-300', icon: Zap };
      case 'completed':
        return { label: 'Terminé', className: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle };
      case 'blocked':
        return { label: 'Bloqué', className: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle };
      default:
        return { label: 'En attente', className: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock };
    }
  };

  // Array input helpers
  const handleArrayAdd = (field: 'sources_couvertes' | 'biens_supports' | 'scenarios_couverts' | 'references_normatives', value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const handleArrayRemove = (field: 'sources_couvertes' | 'biens_supports' | 'scenarios_couverts' | 'references_normatives', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Gradient Rouge EBIOS */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Modifier l&apos;action EBIOS</h3>
              <p className="text-red-100 text-sm">{action.code_action}</p>
            </div>
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
              Titre de l&apos;action *
            </label>
            <input
              type="text"
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                errors.titre ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Implémenter une authentification multifacteur"
            />
            {errors.titre && (
              <p className="text-sm text-red-600 mt-1">{errors.titre}</p>
            )}
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-gray-500" />
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Description détaillée de l'action..."
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
            <textarea
              value={formData.objectif}
              onChange={(e) => setFormData({ ...formData, objectif: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Réduire la vraisemblance / Réduire la gravité..."
            />
          </div>

          {/* Justification */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <label className="block text-sm font-semibold text-amber-900 mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
              Justification
            </label>
            <textarea
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Pourquoi cette action est nécessaire..."
            />
          </div>

          {/* Catégorie et Priorité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Catégorie */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-red-600" />
                Catégorie *
              </label>
              <select
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.categorie ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner une catégorie</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.categorie && (
                <p className="text-sm text-red-600 mt-1">{errors.categorie}</p>
              )}
            </div>

            {/* Priorité */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
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
                        checked={formData.priorite === priority}
                        onChange={(e) => setFormData({ ...formData, priorite: e.target.value as 'P1' | 'P2' | 'P3' })}
                        className="mr-3 text-red-600 focus:ring-red-500"
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
              <Zap className="w-4 h-4 mr-2 text-blue-600" />
              Statut
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['pending', 'in_progress', 'completed', 'blocked'] as const).map((status) => {
                const config = getStatusConfig(status);
                const StatusIcon = config.icon;
                return (
                  <label key={status} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.statut === status}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as typeof formData.statut })}
                      className="mr-3 text-red-600 focus:ring-red-500"
                    />
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${config.className}`}>
                      <StatusIcon className="w-4 h-4 mr-1.5" />
                      {config.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Effort, Coût, Délai */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Effort */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-red-600" />
                Effort estimé
              </label>
              <select
                value={formData.effort}
                onChange={(e) => setFormData({ ...formData, effort: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Sélectionner</option>
                {EFFORTS.map(effort => (
                  <option key={effort} value={effort}>{effort}</option>
                ))}
              </select>
            </div>

            {/* Coût estimé */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-red-600" />
                Coût estimé
              </label>
              <input
                type="text"
                value={formData.cout_estime}
                onChange={(e) => setFormData({ ...formData, cout_estime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Ex: 10 000 €"
              />
            </div>

            {/* Délai recommandé */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                Délai recommandé
              </label>
              <select
                value={formData.delai_recommande}
                onChange={(e) => setFormData({ ...formData, delai_recommande: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Sélectionner</option>
                {DELAIS.map(delai => (
                  <option key={delai} value={delai}>{delai}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Échéance */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-orange-500" />
              Date d&apos;échéance
            </label>
            <input
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Assignation de l'action */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 border border-red-200 shadow-sm">
            <label className="block text-sm font-semibold text-red-900 mb-4 flex items-center">
              <Users className="w-4 h-4 mr-2 text-red-600" />
              Assignation de l&apos;action
            </label>

            {/* Toggle Interne/Externe */}
            <div className="flex items-center space-x-4 mb-4 p-3 bg-white rounded-lg border border-red-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="assignmentTypeEdit"
                  value="internal"
                  checked={assignmentType === 'internal'}
                  onChange={() => setAssignmentType('internal')}
                  className="mr-2 text-red-600 focus:ring-red-500"
                />
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  assignmentType === 'internal'
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'text-gray-600'
                }`}>
                  🏢 Interne
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="assignmentTypeEdit"
                  value="external"
                  checked={assignmentType === 'external'}
                  onChange={() => setAssignmentType('external')}
                  className="mr-2 text-red-600 focus:ring-red-500"
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
              <div className="space-y-4 bg-white rounded-lg p-4 border border-red-200">
                {/* Sélection du rôle */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                    <Shield className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    Rôle
                  </label>
                  {loadingRoles ? (
                    <div className="flex items-center py-2">
                      <svg className="animate-spin h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24">
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
                        setFormData(prev => ({ ...prev, responsable_suggere: e.target.value, assigned_user_id: null }));
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50"
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
                    <User className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    Assigner à
                  </label>
                  {!selectedRoleCode ? (
                    <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                      Sélectionnez d&apos;abord un rôle
                    </div>
                  ) : loadingUsersByRole ? (
                    <div className="flex items-center py-2">
                      <svg className="animate-spin h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24">
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        disabled={usersByRole.length === 0}
                      >
                        <option value="">-- Non assigné --</option>
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
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {categories.length} catégorie(s) disponible(s)
                      </p>
                    </div>

                    {/* Sélection de l'organisme */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                        <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        Organisme
                      </label>
                      <select
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
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
                        value={formData.responsable_suggere}
                        onChange={(e) => setFormData({ ...formData, responsable_suggere: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: Chef de projet, Responsable SI, DPO..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Suggestion IA ou saisie libre
                      </p>
                    </div>

                    {/* Sélection du membre */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        Assigner à
                      </label>
                      {!selectedEntityId ? (
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

          {/* Réduction de risque */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h5 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
              Réduction de risque estimée
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-red-700 mb-1">Score initial</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={formData.risque_initial || ''}
                  onChange={(e) => setFormData({ ...formData, risque_initial: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="1-25"
                />
              </div>
              <div>
                <label className="block text-xs text-green-700 mb-1">Score cible</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={formData.risque_cible || ''}
                  onChange={(e) => setFormData({ ...formData, risque_cible: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="1-25"
                />
              </div>
            </div>
            {formData.risque_initial && formData.risque_cible && (
              <div className="mt-3 p-2 bg-white rounded-lg border border-red-200 text-center">
                <span className="text-red-600 font-semibold">{formData.risque_initial}</span>
                <TrendingDown className="inline-block w-4 h-4 mx-2 text-green-600" />
                <span className="text-green-600 font-semibold">{formData.risque_cible}</span>
                <span className="text-gray-500 ml-2">
                  (-{Math.round((1 - formData.risque_cible / formData.risque_initial) * 100)}%)
                </span>
              </div>
            )}
          </div>

          {/* Scénarios couverts */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h5 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
              Scénarios de risque couverts
            </h5>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.scenarios_couverts.map((scenario, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-700">
                  {scenario}
                  <button
                    type="button"
                    onClick={() => handleArrayRemove('scenarios_couverts', idx)}
                    className="ml-2 text-red-400 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ajouter un scénario (ex: SO01)"
                className="flex-1 px-3 py-1.5 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd('scenarios_couverts', (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>

          {/* Sources de risque couvertes */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h5 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
              Sources de risque couvertes
            </h5>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.sources_couvertes.map((src, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-sm font-medium text-orange-700">
                  {src}
                  <button
                    type="button"
                    onClick={() => handleArrayRemove('sources_couvertes', idx)}
                    className="ml-2 text-orange-400 hover:text-orange-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ajouter une source (ex: SR01)"
                className="flex-1 px-3 py-1.5 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd('sources_couvertes', (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>

          {/* Biens supports */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-blue-500" />
              Biens supports protégés
            </h5>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.biens_supports.map((bs, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700">
                  {bs}
                  <button
                    type="button"
                    onClick={() => handleArrayRemove('biens_supports', idx)}
                    className="ml-2 text-blue-400 hover:text-blue-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ajouter un bien support"
                className="flex-1 px-3 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd('biens_supports', (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>

          {/* Références normatives */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Bookmark className="w-4 h-4 mr-2 text-gray-500" />
              Références normatives
            </h5>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.references_normatives.map((ref, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                  {ref}
                  <button
                    type="button"
                    onClick={() => handleArrayRemove('references_normatives', idx)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ajouter une référence (ex: ISO 27001 A.9.4)"
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd('references_normatives', (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>
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
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
