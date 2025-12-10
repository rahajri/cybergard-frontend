'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  Eye,
  AlertCircle,
  Calendar,
  User,
  Users,
  Target,
  FileText,
  Shield,
  ExternalLink,
  Building2,
  Server,
  Clock,
  ChevronDown
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { RichTextDisplay } from './RichTextDisplay';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ScanVulnerability {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  port: number | null;
  service_name: string | null;
  protocol: string | null;
  cve_ids: string[];
  cvss_score: number | null;
  recommendation: string | null;
  is_remediated: boolean;
}

interface Role {
  id: string;
  code: string;
  name: string;
}

interface UserOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface EntityMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Structure de l'action proposée (avant génération)
export interface ProposedAction {
  vulnerability_id: string;
  title: string;
  description: string;
  objective: string;
  deliverables: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  priority: 'P1' | 'P2' | 'P3';
  recommended_due_days: number;
  suggested_role: string;
  suggested_role_id: string | null;
  // Infos techniques de la vulnérabilité
  port: number | null;
  service_name: string | null;
  protocol: string | null;
  cve_ids: string[];
  cvss_score: number | null;
  // Entité et assignation
  entity_id: string | null;
  entity_name: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
}

// Interface pour les entités externes avec catégories
interface ScopeEntity {
  id: string;
  name: string;
  stakeholder_type: string;
  entity_category?: string;  // Catégorie directe (ex: MAROC, Fournisseurs)
  parent_category?: string;  // Catégorie parente si existe (ex: Fournisseurs)
  members: EntityMember[];
}

interface ScanActionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (action: ProposedAction) => void;
  vulnerability: ScanVulnerability;
  mode: 'view' | 'edit';
  // Scan info - détermine le mode par défaut (Interne ou Externe)
  isInternalScan: boolean;
  entityId?: string | null;
  entityName?: string | null;
  // Action déjà personnalisée (si existante)
  existingAction?: ProposedAction | null;
}

// Fonction pour convertir la sévérité de la vulnérabilité en sévérité d'action
function mapVulnSeverityToActionSeverity(severity: string): 'critical' | 'major' | 'minor' | 'info' {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'major';
    case 'MEDIUM': return 'minor';
    case 'LOW':
    case 'INFO':
    default: return 'info';
  }
}

// Fonction pour déterminer la priorité basée sur la sévérité
function mapSeverityToPriority(severity: string): 'P1' | 'P2' | 'P3' {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 'P1';
    case 'HIGH': return 'P1';
    case 'MEDIUM': return 'P2';
    case 'LOW':
    case 'INFO':
    default: return 'P3';
  }
}

// Fonction pour déterminer le délai recommandé
function mapSeverityToDueDays(severity: string): number {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 7;
    case 'HIGH': return 14;
    case 'MEDIUM': return 30;
    case 'LOW': return 60;
    default: return 90;
  }
}

// Fonction pour suggérer un rôle basé sur le type de vulnérabilité
function suggestRole(vuln: ScanVulnerability): string {
  if (vuln.port) {
    return 'Administrateur Système';
  }
  if (vuln.title.toLowerCase().includes('ssl') || vuln.title.toLowerCase().includes('tls')) {
    return 'Administrateur Réseau';
  }
  return 'Responsable Sécurité';
}

export function ScanActionPreviewModal({
  isOpen,
  onClose,
  onSave,
  vulnerability,
  mode,
  isInternalScan,
  entityId,
  entityName,
  existingAction
}: ScanActionPreviewModalProps) {

  // Toggle Interne/Externe - par défaut basé sur le type de scan
  const [assignmentType, setAssignmentType] = useState<'internal' | 'external'>(
    isInternalScan ? 'internal' : 'external'
  );

  // États pour les listes dynamiques - Mode Interne
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // États pour le mode Externe
  const [loadingScope, setLoadingScope] = useState(false);
  const [scopeEntities, setScopeEntities] = useState<ScopeEntity[]>([]);
  const [externalCategories, setExternalCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredEntities, setFilteredEntities] = useState<ScopeEntity[]>([]);
  const [selectedExternalEntityId, setSelectedExternalEntityId] = useState<string>(entityId || '');
  const [availableMembers, setAvailableMembers] = useState<EntityMember[]>([]);

  // Backward compatibility - entityMembers pour le mode externe par défaut
  const [entityMembers, setEntityMembers] = useState<EntityMember[]>([]);

  // Créer l'action proposée à partir de la vulnérabilité
  const createProposedAction = (): ProposedAction => ({
    vulnerability_id: vulnerability.id,
    title: `Corriger: ${vulnerability.title}`,
    description: vulnerability.description || `Vulnérabilité détectée: ${vulnerability.title}`,
    objective: vulnerability.recommendation || `Corriger la vulnérabilité "${vulnerability.title}" pour réduire le risque de sécurité.`,
    deliverables: 'Preuve de correction (capture d\'écran, rapport de scan de validation, ticket de changement)',
    severity: mapVulnSeverityToActionSeverity(vulnerability.severity),
    priority: mapSeverityToPriority(vulnerability.severity),
    recommended_due_days: mapSeverityToDueDays(vulnerability.severity),
    suggested_role: suggestRole(vulnerability),
    suggested_role_id: null,
    port: vulnerability.port,
    service_name: vulnerability.service_name,
    protocol: vulnerability.protocol,
    cve_ids: vulnerability.cve_ids || [],
    cvss_score: vulnerability.cvss_score,
    entity_id: entityId || null,
    entity_name: isInternalScan ? 'Interne' : (entityName || null),
    assigned_user_id: null,
    assigned_user_name: null,
  });

  const [formData, setFormData] = useState<ProposedAction>(createProposedAction());
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les rôles pour le mode Interne
  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/actions/roles/list`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // Charger les utilisateurs par rôle (mode Interne)
  const loadUsersByRole = useCallback(async (roleCode: string) => {
    if (!roleCode) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/actions/roles/${encodeURIComponent(roleCode)}/users`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsers((data.users || []).map((u: { id: string; first_name: string; last_name: string; email: string }) => ({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email
        })));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Charger toutes les entités externes pour le mode Externe (toggle)
  const loadScopeEntities = useCallback(async () => {
    setLoadingScope(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/actions/scope-entities`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const entities: ScopeEntity[] = data.entities || [];
        setScopeEntities(entities);

        // Extraire les catégories principales uniques
        const uniqueCategories = [...new Set(
          entities
            .map(e => e.parent_category || e.entity_category)
            .filter((cat): cat is string => !!cat)
        )].sort();
        setExternalCategories(uniqueCategories);
        setFilteredEntities(entities);
      }
    } catch (error) {
      console.error('Error loading scope entities:', error);
    } finally {
      setLoadingScope(false);
    }
  }, []);

  // Charger les membres de l'entité (pour le mode externe par défaut du scan)
  const loadEntityMembers = useCallback(async () => {
    if (!entityId) {
      setEntityMembers([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/members`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const members = Array.isArray(data) ? data : (data.items || []);
        setEntityMembers(members.filter((m: EntityMember & { is_active?: boolean }) => m.is_active !== false));
      }
    } catch (error) {
      console.error('Error loading entity members:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [entityId]);

  // Charger les données initiales selon le mode d'assignation
  useEffect(() => {
    if (isOpen && (mode === 'edit' || existingAction)) {
      // Toujours charger les rôles (pour le mode interne)
      loadRoles();
      // Toujours charger les entités externes (pour le mode externe toggle)
      loadScopeEntities();

      // Si scan externe avec entité prédéfinie, charger ses membres
      if (!isInternalScan && entityId) {
        loadEntityMembers();
      }
    }
  }, [isOpen, mode, isInternalScan, entityId, loadRoles, loadScopeEntities, loadEntityMembers, existingAction]);

  // Quand le rôle change (mode Interne), charger les utilisateurs correspondants
  useEffect(() => {
    if (assignmentType === 'internal' && formData.suggested_role_id) {
      const selectedRole = roles.find(r => r.id === formData.suggested_role_id);
      if (selectedRole && selectedRole.code) {
        loadUsersByRole(selectedRole.code);
      }
    } else if (assignmentType === 'internal' && !formData.suggested_role_id) {
      setUsers([]);
    }
  }, [formData.suggested_role_id, assignmentType, roles, loadUsersByRole]);

  // Filtrer les entités par catégorie (mode Externe toggle)
  useEffect(() => {
    if (assignmentType !== 'external') return;

    if (selectedCategory) {
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
    setFormData(prev => ({ ...prev, assigned_user_id: null, assigned_user_name: null }));
  }, [assignmentType, selectedCategory, scopeEntities]);

  // Mettre à jour les membres disponibles quand une entité externe est sélectionnée
  useEffect(() => {
    if (assignmentType !== 'external' || !selectedExternalEntityId) {
      if (assignmentType === 'external') {
        setAvailableMembers([]);
      }
      return;
    }

    const entity = scopeEntities.find(e => e.id === selectedExternalEntityId);
    setAvailableMembers(entity?.members || []);
    // Mettre à jour entity_id et entity_name dans formData
    setFormData(prev => ({
      ...prev,
      entity_id: selectedExternalEntityId,
      entity_name: entity?.name || null,
      assigned_user_id: null,
      assigned_user_name: null
    }));
  }, [assignmentType, selectedExternalEntityId, scopeEntities]);

  // Reset quand on change de mode d'assignation
  useEffect(() => {
    if (assignmentType === 'internal') {
      // Mode Interne : effacer les sélections externes
      setSelectedCategory('');
      setSelectedExternalEntityId('');
      setAvailableMembers([]);
      setFormData(prev => ({
        ...prev,
        entity_id: null,
        entity_name: 'Interne',
        assigned_user_id: null,
        assigned_user_name: null
      }));
    } else {
      // Mode Externe : effacer les sélections internes et pré-sélectionner l'organisme si scan externe
      setUsers([]);

      // Si le scan est externe avec une entité prédéfinie, la pré-sélectionner
      if (!isInternalScan && entityId && entityName) {
        setSelectedExternalEntityId(entityId);
        // Les membres seront chargés automatiquement via l'effet ci-dessous
        setFormData(prev => ({
          ...prev,
          suggested_role_id: null,
          entity_id: entityId,
          entity_name: entityName,
          assigned_user_id: null,
          assigned_user_name: null
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          suggested_role_id: null,
          assigned_user_id: null,
          assigned_user_name: null
        }));
      }
    }
  }, [assignmentType, isInternalScan, entityId, entityName]);

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

  // Reset form when vulnerability changes - utiliser existingAction si disponible
  useEffect(() => {
    if (isOpen) {
      // Si une action personnalisée existe, l'utiliser
      if (existingAction) {
        setFormData(existingAction);
      } else {
        setFormData(createProposedAction());
      }
      setErrors({});
    }
  }, [isOpen, vulnerability.id, existingAction]);

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
      if (onSave) {
        onSave(formData);
      }
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
        iconColor: 'text-red-600'
      },
      major: {
        label: 'Majeure',
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        iconColor: 'text-orange-600'
      },
      minor: {
        label: 'Mineure',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        iconColor: 'text-yellow-600'
      },
      info: {
        label: 'Info',
        className: 'bg-blue-100 text-blue-700 border-blue-300',
        iconColor: 'text-blue-600'
      },
    };
    return configs[severity as keyof typeof configs] || configs.info;
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      P1: { label: 'P1 - Critique', className: 'bg-red-100 text-red-700 border-red-300' },
      P2: { label: 'P2 - Important', className: 'bg-orange-100 text-orange-700 border-orange-300' },
      P3: { label: 'P3 - Mineur', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    };
    return configs[priority as keyof typeof configs] || configs.P2;
  };

  const severityConfig = getSeverityConfig(formData.severity);
  const priorityConfig = getPriorityConfig(formData.priority);

  // Mode Visualisation
  if (mode === 'view') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between border-b border-cyan-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Aperçu de l'Action Proposée</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Titre et badges */}
            <div>
              <div className="flex items-start space-x-3">
                <AlertCircle className={`w-6 h-6 mt-1 ${severityConfig.iconColor} flex-shrink-0`} />
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900 leading-tight">
                    {formData.title}
                  </h4>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">Sévérité :</span>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${severityConfig.className}`}>
                  {severityConfig.label}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">Priorité :</span>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${priorityConfig.className}`}>
                  {priorityConfig.label}
                </span>
              </div>
            </div>

            {/* Informations techniques */}
            {(formData.port || formData.cvss_score || formData.cve_ids.length > 0) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Server className="w-4 h-4 mr-2 text-gray-500" />
                  Informations Techniques
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.port && (
                    <div>
                      <p className="text-xs text-gray-500">Port</p>
                      <p className="font-medium text-gray-900">{formData.port}/{formData.protocol || 'tcp'}</p>
                    </div>
                  )}
                  {formData.service_name && (
                    <div>
                      <p className="text-xs text-gray-500">Service</p>
                      <p className="font-medium text-gray-900">{formData.service_name}</p>
                    </div>
                  )}
                  {formData.cvss_score && (
                    <div>
                      <p className="text-xs text-gray-500">Score CVSS</p>
                      <p className={`font-medium ${
                        formData.cvss_score >= 9 ? 'text-red-600' :
                        formData.cvss_score >= 7 ? 'text-orange-600' :
                        formData.cvss_score >= 4 ? 'text-yellow-600' : 'text-blue-600'
                      }`}>{formData.cvss_score.toFixed(1)}</p>
                    </div>
                  )}
                </div>
                {formData.cve_ids.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">CVE associés</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.cve_ids.map((cve) => (
                        <a
                          key={cve}
                          href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          {cve}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-gray-500" />
                Description
              </h5>
              <RichTextDisplay content={formData.description} className="text-gray-800" />
            </div>

            {/* Objectif */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-blue-600" />
                Objectif
              </h5>
              <RichTextDisplay content={formData.objective} className="text-blue-800" />
            </div>

            {/* Livrables */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h5 className="text-sm font-semibold text-green-900 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-green-600" />
                Livrables attendus
              </h5>
              <RichTextDisplay content={formData.deliverables} className="text-green-800" />
            </div>

            {/* Infos complémentaires - Ligne 1 : Délai et Rôle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Délai recommandé</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formData.recommended_due_days} jours
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Rôle suggéré</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formData.suggested_role || 'Non défini'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Infos complémentaires - Ligne 2 : Organisme et Assigné à */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Organisme</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formData.entity_name || 'Non défini'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Assigné à</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formData.assigned_user_name || 'Non assigné'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode Édition
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between border-b border-cyan-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Modifier l'Action Proposée</h3>
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

          {/* Informations techniques (lecture seule) */}
          {(vulnerability.port || vulnerability.cvss_score || vulnerability.cve_ids?.length > 0) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Server className="w-4 h-4 mr-2 text-gray-500" />
                Informations Techniques (Lecture seule)
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {vulnerability.port && (
                  <div>
                    <p className="text-xs text-gray-500">Port</p>
                    <p className="font-medium text-gray-900">{vulnerability.port}/{vulnerability.protocol || 'tcp'}</p>
                  </div>
                )}
                {vulnerability.service_name && (
                  <div>
                    <p className="text-xs text-gray-500">Service</p>
                    <p className="font-medium text-gray-900">{vulnerability.service_name}</p>
                  </div>
                )}
                {vulnerability.cvss_score && (
                  <div>
                    <p className="text-xs text-gray-500">Score CVSS</p>
                    <p className={`font-medium ${
                      vulnerability.cvss_score >= 9 ? 'text-red-600' :
                      vulnerability.cvss_score >= 7 ? 'text-orange-600' :
                      vulnerability.cvss_score >= 4 ? 'text-yellow-600' : 'text-blue-600'
                    }`}>{vulnerability.cvss_score.toFixed(1)}</p>
                  </div>
                )}
              </div>
              {vulnerability.cve_ids && vulnerability.cve_ids.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">CVE associés</p>
                  <div className="flex flex-wrap gap-2">
                    {vulnerability.cve_ids.map((cve) => (
                      <a
                        key={cve}
                        href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        {cve}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Titre */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-gray-500" />
              Titre de l'action
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Corriger la vulnérabilité ROBOT Attack"
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
              placeholder="Description de la vulnérabilité et du contexte..."
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
              value={formData.objective}
              onChange={handleObjectiveChange}
              placeholder="Objectif de remédiation..."
            />
          </div>

          {/* Livrables */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <label className="block text-sm font-semibold text-green-900 mb-2 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-green-600" />
              Livrables attendus
            </label>
            <RichTextEditor
              value={formData.deliverables}
              onChange={handleDeliverablesChange}
              placeholder="Preuves et livrables attendus..."
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
                  const config = getSeverityConfig(severity);
                  return (
                    <label key={severity} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="severity"
                        value={severity}
                        checked={formData.severity === severity}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="mr-3 text-cyan-600 focus:ring-cyan-500"
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
                        className="mr-3 text-cyan-600 focus:ring-cyan-500"
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${
                errors.recommended_due_days ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.recommended_due_days && (
              <p className="text-sm text-red-600 mt-1">{errors.recommended_due_days}</p>
            )}
          </div>

          {/* Section Assignation avec Toggle Interne/Externe */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200 shadow-sm">
            <label className="block text-sm font-semibold text-cyan-900 mb-4 flex items-center">
              <Users className="w-4 h-4 mr-2 text-cyan-600" />
              Assignation de l&apos;action
            </label>

            {/* Toggle Interne/Externe */}
            <div className="flex items-center space-x-4 mb-4 p-3 bg-white rounded-lg border border-cyan-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="scanAssignmentType"
                  value="internal"
                  checked={assignmentType === 'internal'}
                  onChange={() => setAssignmentType('internal')}
                  className="mr-2 text-cyan-600 focus:ring-cyan-500"
                />
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  assignmentType === 'internal'
                    ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                    : 'text-gray-600'
                }`}>
                  🏢 Interne
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="scanAssignmentType"
                  value="external"
                  checked={assignmentType === 'external'}
                  onChange={() => setAssignmentType('external')}
                  className="mr-2 text-cyan-600 focus:ring-cyan-500"
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
              <div className="space-y-4 bg-white rounded-lg p-4 border border-cyan-200">
                {/* Sélection du rôle */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                    <Shield className="w-3.5 h-3.5 mr-1.5 text-cyan-500" />
                    Rôle
                  </label>
                  {loadingRoles ? (
                    <div className="flex items-center py-2">
                      <Clock className="w-4 h-4 text-cyan-500 animate-spin mr-2" />
                      <span className="text-sm text-gray-500">Chargement des rôles...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={formData.suggested_role_id || ''}
                        onChange={(e) => {
                          const selectedRole = roles.find(r => r.id === e.target.value);
                          setFormData({
                            ...formData,
                            suggested_role_id: e.target.value || null,
                            suggested_role: selectedRole?.name || '',
                            assigned_user_id: null,
                            assigned_user_name: null
                          });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-gray-50 appearance-none"
                      >
                        <option value="">-- Sélectionner un rôle --</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {roles.length} rôle(s) disponible(s)
                  </p>
                </div>

                {/* Sélection de l'utilisateur */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1.5 text-cyan-500" />
                    Assigner à
                  </label>
                  {!formData.suggested_role_id ? (
                    <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                      Sélectionnez d&apos;abord un rôle
                    </div>
                  ) : loadingUsers ? (
                    <div className="flex items-center py-2">
                      <Clock className="w-4 h-4 text-cyan-500 animate-spin mr-2" />
                      <span className="text-sm text-gray-500">Chargement des utilisateurs...</span>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <select
                          value={formData.assigned_user_id || ''}
                          onChange={(e) => {
                            const selectedUser = users.find(u => u.id === e.target.value);
                            setFormData({
                              ...formData,
                              assigned_user_id: e.target.value || null,
                              assigned_user_name: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : null
                            });
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 appearance-none"
                          disabled={users.length === 0}
                        >
                          <option value="">-- Non assigné --</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} - {user.email}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {users.length > 0
                          ? `${users.length} utilisateur(s) avec ce rôle`
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
                    <Clock className="w-6 h-6 text-blue-500 animate-spin" />
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
                      <div className="relative">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none"
                        >
                          <option value="">-- Toutes les catégories --</option>
                          {externalCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
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
                      <div className="relative">
                        <select
                          value={selectedExternalEntityId}
                          onChange={(e) => setSelectedExternalEntityId(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          disabled={filteredEntities.length === 0}
                        >
                          <option value="">-- Sélectionner un organisme --</option>
                          {filteredEntities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                              {entity.name} {entity.entity_category ? `(${entity.entity_category})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
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
                          <div className="relative">
                            <select
                              value={formData.assigned_user_id || ''}
                              onChange={(e) => {
                                const selectedMember = availableMembers.find(m => m.id === e.target.value);
                                setFormData({
                                  ...formData,
                                  assigned_user_id: e.target.value || null,
                                  assigned_user_name: selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : null
                                });
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                              disabled={availableMembers.length === 0}
                            >
                              <option value="">-- Non assigné --</option>
                              {availableMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.first_name} {member.last_name} - {member.email}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
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
            className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Clock className="animate-spin -ml-1 mr-2 h-4 w-4" />
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
