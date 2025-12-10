'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  ChevronRight,
  Target,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Building2,
  Globe,
  Briefcase,
  Shield,
  Search,
  AlertCircle,
  Loader2,
  Save,
  Send,
  Clock,
  RefreshCw,
  Plus,
  X,
  UserCog
} from 'lucide-react';
import { getRoleLabel, getExternalRoleLabel, getCampaignTypeLabel } from '@/utils/labels';
import { fetchWithAuth } from '@/lib/auth';
import DatePicker, { registerLocale } from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '@/app/(audite)/audite/components/datepicker-custom.css';

// Enregistrer la locale française
registerLocale('fr', fr);

// ==================== TYPES ====================

interface Questionnaire {
  id: string;
  name: string;
  version: string;
  questions_count: number;
  description?: string;
  is_active: boolean;
}

interface Domain {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  level: number;
}

interface Entity {
  id: string;
  name: string;
  stakeholder_type: 'internal' | 'external';
  pole_id?: string;
  pole_name?: string;
  category_id?: string;
  category_name?: string;
  status?: string;
  description?: string;
}

interface Pole {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  stakeholder_type: string;
  parent_category_id?: string | null;
  hierarchy_level?: number;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  tenant_id?: string;
}

interface EntityMember {
  id: string;
  entity_id: string;
  user_id: string;
  roles: string[];
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

interface CampaignScope {
  id: string;
  name: string;
  description?: string;
  entity_ids: string[];
  auditor_ids: string[];
  is_active: boolean;
}

interface CampaignFormData {
  // Phase 0 - Configuration
  title: string;
  description: string;
  launch_date: string;
  due_date: string;
  is_recurrent: boolean;
  recurrence_type: 'once' | 'monthly' | 'quarterly' | 'yearly';
  recurrence_interval: number;
  recurrence_end_date: string;

  // Phase 1 - Questionnaire
  questionnaire_id: string;

  // Phase 2 - Pilotes et Auditeurs
  pilot_user_ids: string[];
  auditor_user_ids: string[]; // Nouveaux : auditeurs internes

  // Phase 3 - Type de périmètre
  campaign_type: 'internal' | 'external' | '';

  // Phase 4 - Périmètre
  use_existing_scope: boolean;
  scope_id: string;
  selected_pole_ids: string[];
  selected_category_ids: string[];
  selected_entity_ids: string[];
  save_as_scope: boolean;
  new_scope_name: string;

  // Phase 5 - Audités et domaines
  audited_user_ids: string[];
  audited_domain_scope: Record<string, {
    domain_ids: string[];
    all_domains: boolean;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ==================== COMPOSANT PRINCIPAL ====================

export default function GenererCampagnePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('id');
  const isEditMode = !!campaignId;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [error, setError] = useState('');

  // Form Data
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    launch_date: '',
    due_date: '',
    is_recurrent: false,
    recurrence_type: 'once',
    recurrence_interval: 1,
    recurrence_end_date: '',
    pilot_user_ids: [],
    auditor_user_ids: [],
    campaign_type: '',
    use_existing_scope: false,
    scope_id: '',
    selected_pole_ids: [],
    selected_category_ids: [],
    selected_entity_ids: [],
    save_as_scope: false,
    new_scope_name: '',
    questionnaire_id: '',
    audited_user_ids: [],
    audited_domain_scope: {}
  });

  // Data from API
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditedMembers, setAuditedMembers] = useState<EntityMember[]>([]);
  const [availableDomains, setAvailableDomains] = useState<Domain[]>([]);
  const [scopes, setScopes] = useState<CampaignScope[]>([]);

  // Expanded state for tree view
  const [expandedPoles, setExpandedPoles] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());

  // UI States
  const [searchEntity, setSearchEntity] = useState('');
  const [searchPilot, setSearchPilot] = useState('');
  const [searchAuditor, setSearchAuditor] = useState('');
  const [searchAudited, setSearchAudited] = useState('');
  const [rolePilotFilter, setRolePilotFilter] = useState('all');
  const [roleAuditorFilter, setRoleAuditorFilter] = useState('all');
  const [roleAuditedFilter, setRoleAuditedFilter] = useState('all');
  const [expandedAuditeId, setExpandedAuditeId] = useState<string | null>(null);

  // ==================== EFFECTS ====================

  useEffect(() => {
    // Load data based on current step
    if (currentStep === 1) {
      loadQuestionnaires(); // Phase 1: Questionnaire
    }
    if (currentStep === 2 || currentStep === 3) {
      loadUsers(); // Phase 2 & 3: Pilotes et Auditeurs (internal users)
    }
    if (currentStep === 5) {
      loadScopes();
      if (formData.campaign_type === 'internal') {
        loadPoles();
      } else if (formData.campaign_type === 'external') {
        loadCategories();
      }
      loadEntities();
    }
    if (currentStep === 6) {
      loadAuditedMembers(); // Phase 6: Audités (external users from entity_member)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.campaign_type, formData.selected_entity_ids, formData.selected_pole_ids, formData.selected_category_ids, formData.scope_id]);

  // Charger les domaines du questionnaire sélectionné
  useEffect(() => {
    if (formData.questionnaire_id) {
      loadDomains();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.questionnaire_id]);

  // Charger la campagne en mode édition
  useEffect(() => {
    if (isEditMode && campaignId) {
      loadCampaign(campaignId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, isEditMode]);

  // ==================== API CALLS ====================

  const loadCampaign = async (id: string) => {
    setLoadingCampaign(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${id}`);

      if (response.ok) {
        const campaign = await response.json();
        console.log('Campagne chargée:', campaign);

        // Pré-remplir le formulaire avec toutes les données
        setFormData({
          title: campaign.title || '',
          description: campaign.description || '',
          launch_date: campaign.launch_date || '',
          due_date: campaign.due_date || '',
          is_recurrent: campaign.recurrence_type !== 'once',
          recurrence_type: campaign.recurrence_type || 'once',
          recurrence_interval: campaign.recurrence_interval || 1,
          recurrence_end_date: campaign.recurrence_end_date || '',
          pilot_user_ids: campaign.pilot_user_ids || [],
          auditor_user_ids: campaign.auditor_user_ids || [],
          campaign_type: campaign.campaign_type || '',
          use_existing_scope: !!campaign.scope_id,
          scope_id: campaign.scope_id || '',
          selected_pole_ids: campaign.pole_ids || [],
          selected_category_ids: campaign.category_ids || [],
          selected_entity_ids: campaign.entity_ids || [],
          save_as_scope: false,
          new_scope_name: '',
          audited_user_ids: campaign.auditor_ids || [],
          audited_domain_scope: campaign.audited_domain_scope || {},  // Charger les domain scopes
          questionnaire_id: campaign.questionnaire_id || ''
        });

        toast.success('Campagne chargée pour modification');
      } else {
        toast.error('Impossible de charger la campagne');
        router.push('/client/campagnes');
      }
    } catch (err) {
      console.error('Error loading campaign:', err);
      toast.error('Erreur lors du chargement de la campagne');
      router.push('/client/campagnes');
    } finally {
      setLoadingCampaign(false);
    }
  };

  const loadQuestionnaires = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/questionnaires/?status=published&activated_for_tenant=true&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setQuestionnaires(data.items || data || []);
      }
    } catch (err) {
      console.error('Error loading questionnaires:', err);
    }
  };

  const loadDomains = async () => {
    if (!formData.questionnaire_id) {
      console.warn('Cannot load domains: no questionnaire selected');
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/questionnaires/${formData.questionnaire_id}/domains`);
      if (response.ok) {
        const domains = await response.json();

        // Transform to our Domain interface
        const transformedDomains: Domain[] = domains.map((d: unknown) => {
          const domain = d as Record<string, unknown>;
          return {
            id: domain.id as string,
            name: domain.name as string,
            description: domain.description as string | undefined,
            parent_id: domain.parent_id as string | null,
            level: domain.level as number
          };
        });

        setAvailableDomains(transformedDomains.sort((a, b) => {
          // Sort by level then by name
          if (a.level !== b.level) return a.level - b.level;
          return a.name.localeCompare(b.name);
        }));

        console.log(`✅ Loaded ${transformedDomains.length} domains for questionnaire ${formData.questionnaire_id}`);
      } else {
        console.error(`Failed to load domains: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error loading domains:', err);
    }
  };

  const loadPoles = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/ecosystem/poles`);
      if (response.ok) {
        const data = await response.json();
        setPoles(data.items || data || []);
      }
    } catch (err) {
      console.error('Error loading poles:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/ecosystem/categories?stakeholder_type=external&client_organization_id=${user.organizationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data.items || data || []);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadEntities = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/ecosystem/entities?client_organization_id=${user.organizationId}&limit=1000`
      );
      if (response.ok) {
        const data = await response.json();
        setEntities(data.items || data || []);
      }
    } catch (err) {
      console.error('Error loading entities:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/user-management/users?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const allUsers = data.items || data || [];
        // Filter only internal users (with tenant_id), excluding platform admins
        const filteredUsers = allUsers.filter((user: User) =>
          user.role !== 'platform_admin' && user.role !== 'super_admin' && user.tenant_id
        );
        setUsers(filteredUsers);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadAuditedMembers = async () => {
    try {
      // Determine which entity IDs to query based on scope selection
      let entityIds: string[] = [];

      if (formData.use_existing_scope && formData.scope_id) {
        // Use entity IDs from existing scope
        const scope = scopes.find(s => s.id === formData.scope_id);
        if (scope) {
          entityIds = scope.entity_ids;
        }
      } else {
        // Use explicitly selected entities OR entities from selected poles/categories
        if (formData.selected_entity_ids.length > 0) {
          entityIds = formData.selected_entity_ids;
        } else {
          // Get entities from selected poles/categories
          if (formData.campaign_type === 'internal') {
            entityIds = entities
              .filter(e => formData.selected_pole_ids.includes(e.pole_id || ''))
              .map(e => e.id);
          } else {
            entityIds = entities
              .filter(e => formData.selected_category_ids.includes(e.category_id || ''))
              .map(e => e.id);
          }
        }
      }

      if (entityIds.length === 0) {
        setAuditedMembers([]);
        return;
      }

      // Fetch entity members for all selected entities
      const allMembers: EntityMember[] = [];
      const seenMemberIds = new Set<string>();

      for (const entityId of entityIds) {
        try {
          const response = await fetch(
            `${API_BASE}/api/v1/ecosystem/entities/${entityId}/members`,
            { credentials: 'include' }
          );

          if (response.ok) {
            const data = await response.json();
            const members = data.items || data || [];

            // Deduplicate by member ID (not user_id, which is NULL for contacts)
            for (const member of members) {
              // Only include members with audited roles (case-insensitive)
              const hasAuditedRole = member.roles && member.roles.some((role: string) =>
                role.toLowerCase() === 'audite_resp' || role.toLowerCase() === 'audite_contrib'
              );

              if (!seenMemberIds.has(member.id) && member.is_active && hasAuditedRole) {
                seenMemberIds.add(member.id);
                allMembers.push(member);
              }
            }
          }
        } catch (err) {
          console.error(`Error loading members for entity ${entityId}:`, err);
        }
      }

      setAuditedMembers(allMembers);
    } catch (err) {
      console.error('Error loading audited members:', err);
      setAuditedMembers([]);
    }
  };

  const loadScopes = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/campaign-scopes?is_active=true&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setScopes(data.items || data || []);
      }
    } catch (err) {
      console.error('Error loading scopes:', err);
    }
  };

  // ==================== VALIDATION ====================

  const validateStep = (step: number): boolean => {
    setError('');

    switch (step) {
      case 0: // Configuration
        if (!formData.title.trim()) {
          setError('Le titre de la campagne est obligatoire');
          return false;
        }
        if (!formData.launch_date) {
          setError('La date de début est obligatoire');
          return false;
        }
        if (!formData.due_date) {
          setError('La date de fin est obligatoire');
          return false;
        }
        if (new Date(formData.launch_date) >= new Date(formData.due_date)) {
          setError('La date de fin doit être après la date de début');
          return false;
        }
        break;

      case 1: // Questionnaire
        if (!formData.questionnaire_id) {
          setError('Veuillez sélectionner un questionnaire');
          return false;
        }
        break;

      case 2: // Pilotes
        if (formData.pilot_user_ids.length === 0) {
          setError('Veuillez sélectionner au moins un pilote de campagne');
          return false;
        }
        break;

      case 3: // Auditeurs internes
        // Les auditeurs sont optionnels, pas de validation requise
        break;

      case 4: // Type
        if (!formData.campaign_type) {
          setError('Veuillez sélectionner le type de campagne (Interne ou Externe)');
          return false;
        }
        break;

      case 5: // Périmètre
        if (formData.use_existing_scope) {
          if (!formData.scope_id) {
            setError('Veuillez sélectionner un périmètre existant');
            return false;
          }
        } else {
          if (formData.campaign_type === 'internal' && formData.selected_pole_ids.length === 0) {
            setError('Veuillez sélectionner au moins un pôle ou organisme');
            return false;
          }
          // Pour les campagnes externes : au moins une catégorie OU un organisme
          if (formData.campaign_type === 'external' &&
              formData.selected_category_ids.length === 0 &&
              formData.selected_entity_ids.length === 0) {
            setError('Veuillez sélectionner au moins une catégorie ou un organisme');
            return false;
          }
          // Si l'utilisateur veut nommer son scope, le nom est obligatoire
          if (formData.save_as_scope && !formData.new_scope_name.trim()) {
            setError('Veuillez donner un nom au périmètre à enregistrer');
            return false;
          }
          // Note: Le scope sera automatiquement créé lors de la soumission
          // avec un nom auto-généré si save_as_scope n'est pas coché
        }
        break;

      case 6: // Audités
        if (formData.audited_user_ids.length === 0) {
          setError('Veuillez sélectionner au moins un utilisateur à auditer');
          return false;
        }

        // Vérifier que tous les domaines du questionnaire sont couverts par au moins un audité
        if (availableDomains.length > 0) {
          // Collecter tous les domaines assignés (directement ou via "tous les domaines")
          const coveredDomainIds = new Set<string>();

          for (const userId of formData.audited_user_ids) {
            const scope = formData.audited_domain_scope[userId];
            if (scope) {
              if (scope.all_domains) {
                // Cet audité couvre tous les domaines
                availableDomains.forEach(d => coveredDomainIds.add(d.id));
              } else {
                scope.domain_ids.forEach(id => coveredDomainIds.add(id));
              }
            }
          }

          // Vérifier si tous les domaines sont couverts
          const uncoveredDomains = availableDomains.filter(d => !coveredDomainIds.has(d.id));

          if (uncoveredDomains.length > 0) {
            const domainNames = uncoveredDomains.map(d => d.name).join(', ');
            setError(`Tous les domaines doivent être assignés à au moins un audité. Domaines non couverts : ${domainNames}`);
            return false;
          }
        }
        break;
    }

    return true;
  };

  // ==================== HANDLERS ====================

  // Vérifier si l'utilisateur est toujours authentifié
  const checkAuthentication = (): boolean => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      setError('Session expirée. Veuillez vous reconnecter.');
      // Sauvegarder l'URL courante pour y revenir après login
      localStorage.setItem('returnUrl', window.location.pathname + window.location.search);
      // Rediriger vers login après un court délai
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return false;
    }

    // Vérifier si le token n'est pas expiré (décodage basique du JWT)
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenPayload.exp * 1000; // exp est en secondes
      const currentTime = Date.now();

      if (currentTime >= expirationTime) {
        setError('Session expirée. Veuillez vous reconnecter.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.setItem('returnUrl', window.location.pathname + window.location.search);
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return false;
      }
    } catch {
      // Si le décodage échoue, on continue (le serveur vérifiera)
      console.warn('Impossible de vérifier l\'expiration du token localement');
    }

    return true;
  };

  const handleNext = () => {
    if (!checkAuthentication()) return;

    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!checkAuthentication()) return;
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        launch_date: formData.launch_date,
        due_date: formData.due_date,
        questionnaire_id: formData.questionnaire_id,
        recurrence_type: formData.is_recurrent ? formData.recurrence_type : 'once',
        recurrence_interval: formData.recurrence_interval,
      };

      if (formData.is_recurrent && formData.recurrence_end_date) {
        payload.recurrence_end_date = formData.recurrence_end_date;
      }

      // Scope handling
      if (formData.use_existing_scope) {
        payload.scope_id = formData.scope_id;
      } else {
        let finalEntityIds = formData.selected_entity_ids;
        if (finalEntityIds.length === 0) {
          if (formData.campaign_type === 'internal') {
            finalEntityIds = entities
              .filter(e => formData.selected_pole_ids.includes(e.pole_id || ''))
              .map(e => e.id);
          } else {
            finalEntityIds = entities
              .filter(e => formData.selected_category_ids.includes(e.category_id || ''))
              .map(e => e.id);
          }
        }

        payload.entity_ids = finalEntityIds;
        payload.auditor_ids = formData.audited_user_ids;

        // TOUJOURS créer un scope pour les nouvelles campagnes (même si save_as_scope n'est pas coché)
        // Cela garantit que les contacts sont bien liés à la campagne
        const cleanAuditorIds = formData.audited_user_ids.filter(id => id != null && id !== '');

        const scopeName = formData.save_as_scope && formData.new_scope_name.trim()
          ? formData.new_scope_name
          : `Scope auto - ${formData.title} - ${new Date().toISOString().slice(0, 10)}`;

        const scopePayload = {
          name: scopeName,
          description: formData.description || `Périmètre de la campagne ${formData.title}`,
          entity_ids: finalEntityIds,
          auditor_ids: cleanAuditorIds.length > 0 ? cleanAuditorIds : [],
          is_active: true
        };

        console.log('📝 Création automatique du scope:', scopePayload);

        const scopeResponse = await fetchWithAuth(`${API_BASE}/api/v1/campaign-scopes`, {
          method: 'POST',
          body: JSON.stringify(scopePayload)
        });

        if (scopeResponse.ok) {
          const newScope = await scopeResponse.json();
          payload.scope_id = newScope.id;
          console.log(`✅ Scope créé avec succès: ${newScope.id} - ${newScope.name}`);
        } else {
          const errorData = await scopeResponse.json().catch(() => ({ detail: 'Erreur inconnue' }));
          console.error('❌ Erreur lors de la création du scope:', errorData);
          throw new Error(`Échec de la création du périmètre: ${errorData.detail || 'Erreur inconnue'}`);
        }
      }

      let campaign;

      if (isEditMode && campaignId) {
        // Mode édition : PATCH
        const updatePayload = {
          title: formData.title,
          description: formData.description,
          launch_date: formData.launch_date,
          due_date: formData.due_date
        };

        const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaignId}`, {
          method: 'PATCH',
          body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Erreur lors de la mise à jour de la campagne');
        }

        campaign = await response.json();
        toast.success('Campagne modifiée avec succès !');
      } else {
        // Mode création : POST
        const response = await fetchWithAuth(`${API_BASE}/api/v1/campaigns`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Erreur lors de la création de la campagne');
        }

        campaign = await response.json();

        // Assigner les pilotes via campaign_user (uniquement en mode création)
        for (const pilotId of formData.pilot_user_ids) {
          await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaign.id}/users`, {
            method: 'POST',
            body: JSON.stringify({
              user_id: pilotId,
              role: 'manager'
            })
          });
        }

        // Assigner les auditeurs internes via campaign_user
        for (const auditorId of formData.auditor_user_ids) {
          await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaign.id}/users`, {
            method: 'POST',
            body: JSON.stringify({
              user_id: auditorId,
              role: 'auditor'
            })
          });
        }

        // Sauvegarder les domain scopes pour chaque audité RESPONSABLE uniquement
        for (const auditeId of formData.audited_user_ids) {
          const member = auditedMembers.find(m => m.id === auditeId);

          // Vérifier que c'est un AUDITE_RESP (les AUDITE_CONTRIB n'ont pas de domaines assignés)
          const isAuditeResp = member?.roles?.some((role: string) =>
            role.toLowerCase() === 'audite_resp'
          );

          if (!isAuditeResp) {
            continue; // Skip AUDITE_CONTRIB
          }

          const scope = formData.audited_domain_scope[auditeId];

          // Si un scope est défini pour cet audité responsable, on le sauvegarde
          if (scope && (scope.all_domains || scope.domain_ids.length > 0)) {
            try {
              await fetchWithAuth(`${API_BASE}/api/v1/campaigns/${campaign.id}/domain-scope`, {
                method: 'POST',
                body: JSON.stringify({
                  entity_member_id: auditeId,
                  domain_ids: scope.domain_ids,
                  all_domains: scope.all_domains
                })
              });
              console.log(`✅ Domain scope sauvegardé pour l'audité responsable ${auditeId}`);
            } catch (err) {
              console.error(`⚠️ Erreur lors de la sauvegarde du domain scope pour ${auditeId}:`, err);
              // On continue même en cas d'erreur pour sauvegarder les autres scopes
            }
          }
        }

        // NOTE: Les emails NE sont PAS envoyés ici
        // Ils seront envoyés lors du lancement de la campagne via le bouton "Lancer"
        console.log(`✅ Campagne créée en mode brouillon (${formData.audited_user_ids.length} contact(s) seront invités au lancement)`);
      }

      // Message de succès et redirection
      if (isEditMode) {
        // Mode édition : message simple
        setTimeout(() => {
          router.push('/client/campagnes');
        }, 1500);
      } else {
        // Mode création : campagne en brouillon
        toast.success('Campagne créée en mode brouillon !', {
          description: `Utilisez le bouton "Lancer" pour envoyer les invitations`
        });

        setTimeout(() => {
          router.push('/client/campagnes');
        }, 1500);
      }

    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Erreur lors de la création de la campagne');
      toast.error('Erreur', {
        description: error.message || 'Erreur lors de la création'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string, userType: 'pilot' | 'auditor' | 'audited') => {
    const field = userType === 'pilot' ? 'pilot_user_ids'
                : userType === 'auditor' ? 'auditor_user_ids'
                : 'audited_user_ids';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(userId)
        ? prev[field].filter(id => id !== userId)
        : [...prev[field], userId]
    }));
  };

  const togglePole = (poleId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_pole_ids: prev.selected_pole_ids.includes(poleId)
        ? prev.selected_pole_ids.filter(id => id !== poleId)
        : [...prev.selected_pole_ids, poleId]
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_category_ids: prev.selected_category_ids.includes(categoryId)
        ? prev.selected_category_ids.filter(id => id !== categoryId)
        : [...prev.selected_category_ids, categoryId]
    }));
  };

  const toggleEntity = (entityId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_entity_ids: prev.selected_entity_ids.includes(entityId)
        ? prev.selected_entity_ids.filter(id => id !== entityId)
        : [...prev.selected_entity_ids, entityId]
    }));
  };

  const toggleExpandPole = (poleId: string) => {
    setExpandedPoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(poleId)) {
        newSet.delete(poleId);
      } else {
        newSet.add(poleId);
      }
      return newSet;
    });
  };

  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleExpandSubCategory = (subCategoryId: string) => {
    setExpandedSubCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subCategoryId)) {
        newSet.delete(subCategoryId);
      } else {
        newSet.add(subCategoryId);
      }
      return newSet;
    });
  };

  // ==================== FILTERS ====================

  const filteredEntities = entities.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchEntity.toLowerCase());
    const matchesType = e.stakeholder_type === formData.campaign_type;

    if (formData.campaign_type === 'internal') {
      const matchesPole = formData.selected_pole_ids.length === 0 ||
                         formData.selected_pole_ids.includes(e.pole_id || '');
      return matchesSearch && matchesType && matchesPole;
    } else {
      const matchesCategory = formData.selected_category_ids.length === 0 ||
                             formData.selected_category_ids.includes(e.category_id || '');
      return matchesSearch && matchesType && matchesCategory;
    }
  });

  // Get unique roles for filter (for pilots - internal users)
  const availableRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));

  // Get unique roles for audited members (from entity_member roles array)
  const availableAuditedRoles = Array.from(
    new Set(auditedMembers.flatMap(m => m.roles || []).filter(Boolean))
  );

  // Filtered users pour pilotes (internal users with tenant_id)
  const filteredPilots = users.filter(u => {
    const matchesSearch = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase()
      .includes(searchPilot.toLowerCase());
    const matchesRole = rolePilotFilter === 'all' || u.role === rolePilotFilter;
    return matchesSearch && matchesRole && u.is_active;
  });

  // Filtered users pour auditeurs (internal users with tenant_id)
  const filteredAuditors = users.filter(u => {
    const matchesSearch = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase()
      .includes(searchAuditor.toLowerCase());
    const matchesRole = roleAuditorFilter === 'all' || u.role === roleAuditorFilter;
    return matchesSearch && matchesRole && u.is_active;
  });

  // Pour les audités: filter from entity_member based on selected scope
  const getFilteredAuditedMembers = () => {
    return auditedMembers.filter(member => {
      const matchesSearch = `${member.first_name} ${member.last_name} ${member.email}`.toLowerCase()
        .includes(searchAudited.toLowerCase());

      // Filter by role if specified
      const matchesRole = roleAuditedFilter === 'all' ||
        (member.roles && member.roles.includes(roleAuditedFilter));

      // Exclude AUDITE_CONTRIB: only show AUDITE_RESP for selection
      // AUDITE_CONTRIB will only be accessible via @mention system
      const isAuditeResp = member.roles?.some((role: string) =>
        role.toLowerCase() === 'audite_resp'
      );

      return matchesSearch && matchesRole && member.is_active && isAuditeResp;
    });
  };

  const filteredAudited = getFilteredAuditedMembers();

  // Selected data
  const selectedQuestionnaire = questionnaires.find(q => q.id === formData.questionnaire_id);
  const selectedScope = scopes.find(s => s.id === formData.scope_id);
  const selectedPilots = users.filter(u => formData.pilot_user_ids.includes(u.id));

  // For audited users, we need to get them from auditedMembers and convert to a compatible format
  const selectedAudited = auditedMembers
    .filter(m => formData.audited_user_ids.includes(m.id))
    .map(m => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      role: m.roles?.map(r => getExternalRoleLabel(r)).join(', ') || 'Sans rôle',
      is_active: m.is_active,
      tenant_id: undefined
    }));

  const selectedPoles = poles.filter(p => formData.selected_pole_ids.includes(p.id));
  const selectedCategories = categories.filter(c => formData.selected_category_ids.includes(c.id));
  const selectedEntities = entities.filter(e => formData.selected_entity_ids.includes(e.id));

  const getTotalEntitiesInScope = () => {
    if (formData.use_existing_scope && selectedScope) {
      return selectedScope.entity_ids.length;
    }
    if (formData.selected_entity_ids.length > 0) {
      return formData.selected_entity_ids.length;
    }
    if (formData.campaign_type === 'internal') {
      return entities.filter(e => formData.selected_pole_ids.includes(e.pole_id || '')).length;
    } else {
      return entities.filter(e => formData.selected_category_ids.includes(e.category_id || '')).length;
    }
  };

  // Render user selection component (réutilisable pour pilotes, auditeurs et audités)
  const renderUserSelection = (userType: 'pilot' | 'auditor' | 'audited') => {
    const isPilot = userType === 'pilot';
    const isAuditor = userType === 'auditor';
    const isAudited = userType === 'audited';

    const searchValue = isPilot ? searchPilot : isAuditor ? searchAuditor : searchAudited;
    const setSearchValue = isPilot ? setSearchPilot : isAuditor ? setSearchAuditor : setSearchAudited;
    const roleFilter = isPilot ? rolePilotFilter : isAuditor ? roleAuditorFilter : roleAuditedFilter;
    const setRoleFilter = isPilot ? setRolePilotFilter : isAuditor ? setRoleAuditorFilter : setRoleAuditedFilter;
    const selectedUserIds = isPilot ? formData.pilot_user_ids : isAuditor ? formData.auditor_user_ids : formData.audited_user_ids;

    const title = isPilot ? 'Pilotes de la Campagne'
                : isAuditor ? 'Auditeurs Internes'
                : 'Personnes à Auditer';

    const subtitle = isPilot
      ? 'Sélectionnez les gestionnaires qui piloteront cette campagne'
      : isAuditor
      ? 'Sélectionnez les auditeurs internes qui participeront à cette campagne'
      : 'Sélectionnez les personnes qui seront auditées dans le périmètre défini';

    // Get appropriate roles list
    const availableRolesList = isAudited ? availableAuditedRoles : availableRoles;

    // Group users/members by role
    const usersByRole = isAudited
      ? filteredAudited.reduce((acc, member) => {
          const roles = member.roles || ['Sans rôle'];
          roles.forEach(role => {
            const roleKey = role || 'Sans rôle';
            if (!acc[roleKey]) acc[roleKey] = [];
            acc[roleKey].push(member);
          });
          return acc;
        }, {} as Record<string, EntityMember[]>)
      : (isPilot ? filteredPilots : filteredAuditors).reduce((acc, user) => {
          const role = user.role || 'Sans rôle';
          if (!acc[role]) acc[role] = [];
          acc[role].push(user);
          return acc;
        }, {} as Record<string, User[]>);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Tous les rôles</option>
              {availableRolesList.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-sm font-medium text-purple-900">
            {selectedUserIds.length} utilisateur(s) sélectionné(s)
          </span>
          {selectedUserIds.length > 0 && (
            <button
              onClick={() => setFormData(prev => ({
                ...prev,
                [userType === 'pilot' ? 'pilot_user_ids' : userType === 'auditor' ? 'auditor_user_ids' : 'audited_user_ids']: []
              }))}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Tout désélectionner
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
          {Object.keys(usersByRole).length > 0 ? (
            Object.entries(usersByRole).map(([role, roleUsers]) => {
              // Both User and EntityMember have .id field
              const allRoleUsersSelected = roleUsers.every((u: unknown) => {
                const user = u as Record<string, unknown>;
                return selectedUserIds.includes(user.id as string);
              });
              const someRoleUsersSelected = roleUsers.some((u: unknown) => {
                const user = u as Record<string, unknown>;
                return selectedUserIds.includes(user.id as string);
              });

              return (
                <div key={role} className="mb-3 last:mb-0">
                  <div
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      // Both User and EntityMember have .id field
                      const roleUserIds = roleUsers.map((u: unknown) => {
                        const user = u as Record<string, unknown>;
                        return user.id as string;
                      });
                      if (allRoleUsersSelected) {
                        setFormData(prev => ({
                          ...prev,
                          [userType === 'pilot' ? 'pilot_user_ids' : userType === 'auditor' ? 'auditor_user_ids' : 'audited_user_ids']: selectedUserIds.filter(id => !roleUserIds.includes(id))
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          [userType === 'pilot' ? 'pilot_user_ids' : userType === 'auditor' ? 'auditor_user_ids' : 'audited_user_ids']: [...new Set([...selectedUserIds, ...roleUserIds])]
                        }));
                      }
                    }}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      allRoleUsersSelected
                        ? 'border-purple-600 bg-purple-600'
                        : someRoleUsersSelected
                        ? 'border-purple-600 bg-purple-200'
                        : 'border-gray-300'
                    }`}>
                      {allRoleUsersSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      {someRoleUsersSelected && !allRoleUsersSelected && <span className="text-xs text-purple-600">−</span>}
                    </div>
                    <Shield className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate block">{role}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {roleUsers.length} utilisateur(s)
                    </span>
                  </div>

                  <div className="ml-7 mt-1 space-y-1">
                    {roleUsers.map((userOrMember: unknown) => {
                      // Handle both User and EntityMember types
                      // Always use .id which exists for both User and EntityMember
                      const member = userOrMember as Record<string, unknown>;
                      const userId = member.id as string;
                      const firstName = member.first_name as string;
                      const lastName = member.last_name as string;
                      const email = member.email as string;

                      return (
                        <div
                          key={userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUser(userId, userType);
                          }}
                          className={`flex items-center gap-2 p-3 rounded cursor-pointer transition-all ${
                            selectedUserIds.includes(userId)
                              ? 'bg-purple-50 border border-purple-200'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            selectedUserIds.includes(userId)
                              ? 'border-purple-600 bg-purple-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedUserIds.includes(userId) && (
                              <CheckCircle className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {firstName} {lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Aucun utilisateur trouvé</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== RENDER STEPS ====================

  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderPhase0(); // Configuration
      case 1: return renderPhase5(); // Questionnaire
      case 2: return renderPhase1(); // Pilotes
      case 3: return renderPhase1b(); // Auditeurs internes
      case 4: return renderPhase2(); // Type
      case 5: return renderPhase3(); // Périmètre
      case 6: return renderPhase4(); // Audités avec domaines
      case 7: return renderPhase6(); // Résumé
      default: return null;
    }
  };

  // PHASE 0: Configuration (inchangé)
  const renderPhase0 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration de la Campagne</h2>
        <p className="text-gray-600">Définissez les informations de base et la planification de votre campagne d'audit.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom de la campagne <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Audit ISO 27001 - Q1 2025"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description de la campagne..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de début prévue <span className="text-red-600">*</span>
          </label>
          <DatePicker
            selected={formData.launch_date ? new Date(formData.launch_date) : null}
            onChange={(date: Date | null) => {
              if (date) {
                const formatted = date.toISOString().split('T')[0];
                setFormData({ ...formData, launch_date: formatted });
              }
            }}
            minDate={new Date()}
            dateFormat="dd/MM/yyyy"
            locale="fr"
            placeholderText="Sélectionnez une date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            wrapperClassName="w-full"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de fin prévue <span className="text-red-600">*</span>
          </label>
          <DatePicker
            selected={formData.due_date ? new Date(formData.due_date) : null}
            onChange={(date: Date | null) => {
              if (date) {
                const formatted = date.toISOString().split('T')[0];
                setFormData({ ...formData, due_date: formatted });
              }
            }}
            minDate={formData.launch_date ? new Date(formData.launch_date) : new Date()}
            dateFormat="dd/MM/yyyy"
            locale="fr"
            placeholderText="Sélectionnez une date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            wrapperClassName="w-full"
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Campagne récurrente</h3>
            <p className="text-xs text-gray-500">Générer automatiquement des campagnes périodiques</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_recurrent}
              onChange={(e) => setFormData({
                ...formData,
                is_recurrent: e.target.checked,
                recurrence_type: e.target.checked ? 'monthly' : 'once'
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {formData.is_recurrent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de récurrence
                </label>
                <select
                  value={formData.recurrence_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    recurrence_type: e.target.value as any
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="monthly">Mensuelle</option>
                  <option value="quarterly">Trimestrielle</option>
                  <option value="yearly">Annuelle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin de récurrence
                </label>
                <DatePicker
                  selected={formData.recurrence_end_date ? new Date(formData.recurrence_end_date) : null}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const formatted = date.toISOString().split('T')[0];
                      setFormData({ ...formData, recurrence_end_date: formatted });
                    }
                  }}
                  minDate={formData.due_date ? new Date(formData.due_date) : new Date()}
                  dateFormat="dd/MM/yyyy"
                  locale="fr"
                  placeholderText="Sélectionnez une date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  wrapperClassName="w-full"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // PHASE 1: Pilotes (NOUVEAU)
  const renderPhase1 = () => renderUserSelection('pilot');

  // PHASE 1b: Auditeurs internes (NOUVEAU)
  const renderPhase1b = () => renderUserSelection('auditor');

  // PHASE 2: Type (déplacé depuis ancienne phase 1)
  const renderPhase2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Type de Périmètre</h2>
        <p className="text-gray-600">Choisissez si cette campagne concerne des entités internes ou externes.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => setFormData({ ...formData, campaign_type: 'internal' })}
          className={`p-6 border-2 rounded-xl transition-all ${
            formData.campaign_type === 'internal'
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`p-4 rounded-full ${
              formData.campaign_type === 'internal' ? 'bg-purple-600' : 'bg-gray-100'
            }`}>
              <Building2 className={`w-8 h-8 ${
                formData.campaign_type === 'internal' ? 'text-white' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Périmètre Interne</h3>
              <p className="text-sm text-gray-600 mt-1">
                Audit des entités et services internes de votre organisation
              </p>
            </div>
            {formData.campaign_type === 'internal' && (
              <CheckCircle className="w-6 h-6 text-purple-600" />
            )}
          </div>
        </button>

        <button
          onClick={() => setFormData({ ...formData, campaign_type: 'external' })}
          className={`p-6 border-2 rounded-xl transition-all ${
            formData.campaign_type === 'external'
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`p-4 rounded-full ${
              formData.campaign_type === 'external' ? 'bg-purple-600' : 'bg-gray-100'
            }`}>
              <Globe className={`w-8 h-8 ${
                formData.campaign_type === 'external' ? 'text-white' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Périmètre Externe</h3>
              <p className="text-sm text-gray-600 mt-1">
                Audit de vos partenaires, fournisseurs et prestataires externes
              </p>
            </div>
            {formData.campaign_type === 'external' && (
              <CheckCircle className="w-6 h-6 text-purple-600" />
            )}
          </div>
        </button>
      </div>
    </div>
  );

  // PHASE 3: Périmètre
  const renderPhase3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Définition du Périmètre</h2>
        <p className="text-gray-600">
          Sélectionnez un périmètre existant ou créez-en un nouveau en choisissant les {formData.campaign_type === 'internal' ? 'pôles' : 'catégories'} et entités à auditer.
        </p>
      </div>

      {/* Toggle: Nouveau ou Existant */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setFormData({ ...formData, use_existing_scope: false, scope_id: '' })}
          className={`p-4 border-2 rounded-lg transition-all ${
            !formData.use_existing_scope
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <Plus className={`w-5 h-5 ${!formData.use_existing_scope ? 'text-purple-600' : 'text-gray-500'}`} />
            <span className={`font-medium ${!formData.use_existing_scope ? 'text-purple-900' : 'text-gray-700'}`}>
              Créer un nouveau périmètre
            </span>
          </div>
        </button>

        <button
          onClick={() => setFormData({ ...formData, use_existing_scope: true })}
          className={`p-4 border-2 rounded-lg transition-all ${
            formData.use_existing_scope
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <RefreshCw className={`w-5 h-5 ${formData.use_existing_scope ? 'text-purple-600' : 'text-gray-500'}`} />
            <span className={`font-medium ${formData.use_existing_scope ? 'text-purple-900' : 'text-gray-700'}`}>
              Utiliser un périmètre existant
            </span>
          </div>
        </button>
      </div>

      {formData.use_existing_scope ? (
        // Sélection d'un scope existant
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Sélectionner un périmètre
          </label>
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {scopes.map(scope => (
              <div
                key={scope.id}
                onClick={() => setFormData({ ...formData, scope_id: scope.id })}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.scope_id === scope.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    formData.scope_id === scope.id ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                  }`}>
                    {formData.scope_id === scope.id && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{scope.name}</h4>
                    {scope.description && (
                      <p className="text-sm text-gray-600 mt-1">{scope.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{scope.entity_ids.length} entité(s)</span>
                      <span>{scope.auditor_ids.length} auditeur(s)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {scopes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Aucun périmètre existant</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Création d'un nouveau périmètre avec arbre hiérarchique unifié
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              placeholder={`Rechercher ${formData.campaign_type === 'internal' ? 'un pôle ou' : 'une catégorie ou'} une entité...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Compteur de sélection */}
          <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-sm">
              <span className="font-medium text-purple-900">
                {formData.campaign_type === 'internal' ? formData.selected_pole_ids.length : formData.selected_category_ids.length} {formData.campaign_type === 'internal' ? 'pôle(s)' : 'catégorie(s)'}
              </span>
              <span className="text-purple-700 mx-2">•</span>
              <span className="font-medium text-purple-900">
                {formData.selected_entity_ids.length} entité(s)
              </span>
            </div>
          </div>

          {/* Vue en arbre hiérarchique unifié */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sélectionner les {formData.campaign_type === 'internal' ? 'pôles et entités' : 'catégories et entités'} <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Cliquez sur un {formData.campaign_type === 'internal' ? 'pôle' : 'une catégorie'} pour sélectionner toutes ses entités, ou sélectionnez des entités spécifiques.
            </p>

            <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
              {formData.campaign_type === 'internal' ? (
                // Arbre pour les pôles (Internal)
                poles
                  .filter(pole =>
                    searchEntity === '' ||
                    pole.name.toLowerCase().includes(searchEntity.toLowerCase()) ||
                    entities.some(e => e.pole_id === pole.id && e.name.toLowerCase().includes(searchEntity.toLowerCase()))
                  )
                  .map(pole => {
                    const poleEntities = entities.filter(e => e.pole_id === pole.id &&
                      (searchEntity === '' || e.name.toLowerCase().includes(searchEntity.toLowerCase()))
                    );
                    const isPoleSelected = formData.selected_pole_ids.includes(pole.id);
                    const allPoleEntitiesSelected = poleEntities.length > 0 && poleEntities.every(e => formData.selected_entity_ids.includes(e.id));
                    const somePoleEntitiesSelected = poleEntities.some(e => formData.selected_entity_ids.includes(e.id));
                    const isExpanded = expandedPoles.has(pole.id);

                    return (
                      <div key={pole.id} className="mb-2 last:mb-0">
                        {/* Pôle Header */}
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          {/* Chevron pour expand/collapse */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandPole(pole.id);
                            }}
                            className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors"
                          >
                            <ChevronRight
                              className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>

                          {/* Checkbox */}
                          <div
                            onClick={() => {
                              const poleEntityIds = poleEntities.map(e => e.id);

                              if (isPoleSelected || allPoleEntitiesSelected) {
                                // Désélectionner le pôle et toutes ses entités
                                setFormData({
                                  ...formData,
                                  selected_pole_ids: formData.selected_pole_ids.filter(id => id !== pole.id),
                                  selected_entity_ids: formData.selected_entity_ids.filter(id => !poleEntityIds.includes(id))
                                });
                              } else {
                                // Sélectionner le pôle et toutes ses entités
                                setFormData({
                                  ...formData,
                                  selected_pole_ids: [...formData.selected_pole_ids, pole.id],
                                  selected_entity_ids: [...new Set([...formData.selected_entity_ids, ...poleEntityIds])]
                                });
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isPoleSelected || allPoleEntitiesSelected
                                ? 'border-purple-600 bg-purple-600'
                                : somePoleEntitiesSelected
                                ? 'border-purple-600 bg-purple-200'
                                : 'border-gray-300'
                            }`}>
                              {(isPoleSelected || allPoleEntitiesSelected) && <CheckCircle className="w-3 h-3 text-white" />}
                              {somePoleEntitiesSelected && !isPoleSelected && !allPoleEntitiesSelected && <span className="text-xs text-purple-600 font-bold">−</span>}
                            </div>
                          </div>

                          {/* Icône et nom */}
                          <Building2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate block">{pole.name}</span>
                            {pole.code && <span className="text-xs text-gray-500">{pole.code}</span>}
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {poleEntities.length} entité(s)
                          </span>
                        </div>

                        {/* Entités du pôle (affichées seulement si expanded) */}
                        {isExpanded && poleEntities.length > 0 && (
                          <div className="ml-7 mt-1 space-y-1">
                            {poleEntities.map(entity => (
                              <div
                                key={entity.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEntity(entity.id);
                                }}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                                  formData.selected_entity_ids.includes(entity.id)
                                    ? 'bg-purple-50 border border-purple-200'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                  formData.selected_entity_ids.includes(entity.id)
                                    ? 'border-purple-600 bg-purple-600'
                                    : 'border-gray-300'
                                }`}>
                                  {formData.selected_entity_ids.includes(entity.id) && (
                                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{entity.name}</p>
                                  {entity.description && (
                                    <p className="text-xs text-gray-500 truncate">{entity.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                // Arbre pour les catégories (External) - 3 niveaux
                categories
                  .filter(category => !category.parent_category_id) // Seulement les catégories racines
                  .filter(category =>
                    searchEntity === '' ||
                    category.name.toLowerCase().includes(searchEntity.toLowerCase()) ||
                    entities.some(e => e.category_id === category.id && e.name.toLowerCase().includes(searchEntity.toLowerCase())) ||
                    categories.some(sub => sub.parent_category_id === category.id && sub.name.toLowerCase().includes(searchEntity.toLowerCase()))
                  )
                  .map(category => {
                    // Sous-catégories de cette catégorie
                    const subCategories = categories.filter(c => c.parent_category_id === category.id &&
                      (searchEntity === '' || c.name.toLowerCase().includes(searchEntity.toLowerCase()) ||
                       entities.some(e => e.category_id === c.id && e.name.toLowerCase().includes(searchEntity.toLowerCase())))
                    );

                    // Entités directement dans cette catégorie
                    const categoryEntities = entities.filter(e => e.category_id === category.id &&
                      (searchEntity === '' || e.name.toLowerCase().includes(searchEntity.toLowerCase()))
                    );

                    // Toutes les entités (directes + des sous-catégories)
                    const allSubEntities = entities.filter(e =>
                      e.category_id === category.id ||
                      subCategories.some(sub => sub.id === e.category_id)
                    );

                    const isCategorySelected = formData.selected_category_ids.includes(category.id);
                    const allCategoryEntitiesSelected = allSubEntities.length > 0 && allSubEntities.every(e => formData.selected_entity_ids.includes(e.id));
                    const someCategoryEntitiesSelected = allSubEntities.some(e => formData.selected_entity_ids.includes(e.id));
                    const isExpanded = expandedCategories.has(category.id);
                    const hasChildren = subCategories.length > 0 || categoryEntities.length > 0;

                    return (
                      <div key={category.id} className="mb-2 last:mb-0">
                        {/* Catégorie Header */}
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          {/* Chevron pour expand/collapse */}
                          {hasChildren && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandCategory(category.id);
                              }}
                              className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors"
                            >
                              <ChevronRight
                                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              />
                            </button>
                          )}
                          {!hasChildren && <div className="w-5" />}

                          {/* Checkbox */}
                          <div
                            onClick={() => {
                              const allEntityIds = allSubEntities.map(e => e.id);

                              if (isCategorySelected || allCategoryEntitiesSelected) {
                                // Désélectionner la catégorie et toutes ses entités
                                setFormData({
                                  ...formData,
                                  selected_category_ids: formData.selected_category_ids.filter(id => id !== category.id),
                                  selected_entity_ids: formData.selected_entity_ids.filter(id => !allEntityIds.includes(id))
                                });
                              } else {
                                // Sélectionner la catégorie et toutes ses entités
                                setFormData({
                                  ...formData,
                                  selected_category_ids: [...formData.selected_category_ids, category.id],
                                  selected_entity_ids: [...new Set([...formData.selected_entity_ids, ...allEntityIds])]
                                });
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isCategorySelected || allCategoryEntitiesSelected
                                ? 'border-purple-600 bg-purple-600'
                                : someCategoryEntitiesSelected
                                ? 'border-purple-600 bg-purple-200'
                                : 'border-gray-300'
                            }`}>
                              {(isCategorySelected || allCategoryEntitiesSelected) && <CheckCircle className="w-3 h-3 text-white" />}
                              {someCategoryEntitiesSelected && !isCategorySelected && !allCategoryEntitiesSelected && <span className="text-xs text-purple-600 font-bold">−</span>}
                            </div>
                          </div>

                          {/* Icône et nom */}
                          <Globe className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate block">{category.name}</span>
                            {category.code && <span className="text-xs text-gray-500">{category.code}</span>}
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {allSubEntities.length} entité(s)
                          </span>
                        </div>

                        {/* Contenu de la catégorie (sous-catégories + entités directes) */}
                        {isExpanded && hasChildren && (
                          <div className="ml-7 mt-1 space-y-1">
                            {/* Sous-catégories */}
                            {subCategories.map(subCategory => {
                              const subCategoryEntities = entities.filter(e => e.category_id === subCategory.id &&
                                (searchEntity === '' || e.name.toLowerCase().includes(searchEntity.toLowerCase()))
                              );
                              const isSubExpanded = expandedSubCategories.has(subCategory.id);
                              const allSubCatEntitiesSelected = subCategoryEntities.length > 0 && subCategoryEntities.every(e => formData.selected_entity_ids.includes(e.id));
                              const someSubCatEntitiesSelected = subCategoryEntities.some(e => formData.selected_entity_ids.includes(e.id));

                              return (
                                <div key={subCategory.id} className="mb-1">
                                  {/* Sous-catégorie Header */}
                                  <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border border-gray-300 hover:bg-gray-200 transition-colors">
                                    {/* Chevron pour sous-catégorie */}
                                    {subCategoryEntities.length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpandSubCategory(subCategory.id);
                                        }}
                                        className="flex-shrink-0 p-0.5 hover:bg-gray-300 rounded transition-colors"
                                      >
                                        <ChevronRight
                                          className={`w-3 h-3 text-gray-600 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`}
                                        />
                                      </button>
                                    )}
                                    {subCategoryEntities.length === 0 && <div className="w-4" />}

                                    {/* Checkbox sous-catégorie */}
                                    <div
                                      onClick={() => {
                                        const subEntityIds = subCategoryEntities.map(e => e.id);
                                        if (allSubCatEntitiesSelected) {
                                          setFormData({
                                            ...formData,
                                            selected_entity_ids: formData.selected_entity_ids.filter(id => !subEntityIds.includes(id))
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            selected_entity_ids: [...new Set([...formData.selected_entity_ids, ...subEntityIds])]
                                          });
                                        }
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                        allSubCatEntitiesSelected
                                          ? 'border-purple-600 bg-purple-600'
                                          : someSubCatEntitiesSelected
                                          ? 'border-purple-600 bg-purple-200'
                                          : 'border-gray-300'
                                      }`}>
                                        {allSubCatEntitiesSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                                        {someSubCatEntitiesSelected && !allSubCatEntitiesSelected && <span className="text-xs text-purple-600">−</span>}
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium text-gray-900 truncate block">{subCategory.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                      {subCategoryEntities.length}
                                    </span>
                                  </div>

                                  {/* Entités de la sous-catégorie */}
                                  {isSubExpanded && subCategoryEntities.length > 0 && (
                                    <div className="ml-6 mt-1 space-y-1">
                                      {subCategoryEntities.map(entity => (
                                        <div
                                          key={entity.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleEntity(entity.id);
                                          }}
                                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                                            formData.selected_entity_ids.includes(entity.id)
                                              ? 'bg-purple-50 border border-purple-200'
                                              : 'hover:bg-gray-50 border border-transparent'
                                          }`}
                                        >
                                          <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                                            formData.selected_entity_ids.includes(entity.id)
                                              ? 'border-purple-600 bg-purple-600'
                                              : 'border-gray-300'
                                          }`}>
                                            {formData.selected_entity_ids.includes(entity.id) && (
                                              <CheckCircle className="w-2 h-2 text-white" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-900 truncate">{entity.name}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Entités directement dans la catégorie principale */}
                            {categoryEntities.map(entity => (
                              <div
                                key={entity.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEntity(entity.id);
                                }}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                                  formData.selected_entity_ids.includes(entity.id)
                                    ? 'bg-purple-50 border border-purple-200'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                  formData.selected_entity_ids.includes(entity.id)
                                    ? 'border-purple-600 bg-purple-600'
                                    : 'border-gray-300'
                                }`}>
                                  {formData.selected_entity_ids.includes(entity.id) && (
                                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{entity.name}</p>
                                  {entity.description && (
                                    <p className="text-xs text-gray-500 truncate">{entity.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}

              {((formData.campaign_type === 'internal' && poles.length === 0) ||
                (formData.campaign_type === 'external' && categories.length === 0)) && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Aucun {formData.campaign_type === 'internal' ? 'pôle' : 'catégorie'} disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Enregistrer comme scope */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.save_as_scope}
                onChange={(e) => setFormData({ ...formData, save_as_scope: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Enregistrer ce périmètre pour réutilisation</span>
                <p className="text-xs text-gray-500">Vous pourrez réutiliser ce périmètre dans de futures campagnes</p>
              </div>
            </label>

            {formData.save_as_scope && (
              <div className="mt-3">
                <input
                  type="text"
                  value={formData.new_scope_name}
                  onChange={(e) => setFormData({ ...formData, new_scope_name: e.target.value })}
                  placeholder="Nom du périmètre..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // PHASE 5: Audités avec sélection de domaines du questionnaire
  const renderPhase4 = () => {
    const handleToggleDomainForAudite = (auditeId: string, domainId: string) => {
      setFormData(prev => {
        const currentScope = prev.audited_domain_scope[auditeId] || { domain_ids: [], all_domains: false };
        const newDomainIds = currentScope.domain_ids.includes(domainId)
          ? currentScope.domain_ids.filter(id => id !== domainId)
          : [...currentScope.domain_ids, domainId];

        return {
          ...prev,
          audited_domain_scope: {
            ...prev.audited_domain_scope,
            [auditeId]: {
              ...currentScope,
              domain_ids: newDomainIds,
              all_domains: false
            }
          }
        };
      });
    };

    const handleToggleAllDomains = (auditeId: string) => {
      setFormData(prev => {
        const currentScope = prev.audited_domain_scope[auditeId] || { domain_ids: [], all_domains: false };
        return {
          ...prev,
          audited_domain_scope: {
            ...prev.audited_domain_scope,
            [auditeId]: {
              domain_ids: [],
              all_domains: !currentScope.all_domains
            }
          }
        };
      });
    };

    return (
      <div className="space-y-6">
        {/* Section 1: Sélection des audités */}
        {renderUserSelection('audited')}

        {/* Section 2: Attribution des domaines (uniquement pour AUDITE_RESP) */}
        {formData.audited_user_ids.length > 0 && availableDomains.length > 0 && (
          <div className="mt-8">
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Attribution des domaines par audité responsable</h3>
              <p className="text-gray-600 mb-4">
                Sélectionnez les domaines du questionnaire que chaque audité <strong>responsable</strong> pourra consulter et remplir.
                Les contributeurs n'ont pas de domaines assignés directement.
              </p>

              <div className="space-y-3">
                {formData.audited_user_ids.map(userId => {
                  const member = auditedMembers.find(m => m.id === userId);
                  if (!member) return null;

                  // Afficher uniquement les AUDITE_RESP (les AUDITE_CONTRIB sont ajoutés par les responsables)
                  const isAuditeResp = member.roles?.some((role: string) =>
                    role.toLowerCase() === 'audite_resp'
                  );

                  if (!isAuditeResp) return null;

                  const isExpanded = expandedAuditeId === userId;
                  const scope = formData.audited_domain_scope[userId] || { domain_ids: [], all_domains: false };
                  const selectedCount = scope.all_domains ? availableDomains.length : scope.domain_ids.length;

                  return (
                    <div key={userId} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header - Audité info */}
                      <div
                        className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setExpandedAuditeId(isExpanded ? null : userId)}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-medium ${selectedCount > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                            {scope.all_domains
                              ? 'Tous les domaines'
                              : selectedCount > 0
                                ? `${selectedCount} domaine(s)`
                                : 'Aucun domaine'}
                          </span>
                          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {/* Body - Domain selection */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          {/* Option: Tous les domaines */}
                          <div
                            className="flex items-center gap-3 p-3 mb-3 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => handleToggleAllDomains(userId)}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              scope.all_domains
                                ? 'border-purple-600 bg-purple-600'
                                : 'border-gray-300'
                            }`}>
                              {scope.all_domains && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-purple-900">Tous les domaines</p>
                              <p className="text-sm text-purple-700">Accès complet à tous les domaines du questionnaire</p>
                            </div>
                          </div>

                          {/* Liste des domaines individuels */}
                          {!scope.all_domains && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {availableDomains.map(domain => {
                                const isSelected = scope.domain_ids.includes(domain.id);
                                return (
                                  <div
                                    key={domain.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-purple-50 border border-purple-200'
                                        : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                    onClick={() => handleToggleDomainForAudite(userId, domain.id)}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                      isSelected
                                        ? 'border-purple-600 bg-purple-600'
                                        : 'border-gray-300'
                                    }`}>
                                      {isSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">{domain.name}</p>
                                      {domain.description && (
                                        <p className="text-xs text-gray-500 mt-0.5">{domain.description}</p>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-400">{domain.id}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Avertissement si aucun domaine disponible */}
        {formData.audited_user_ids.length > 0 && availableDomains.length === 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Attribution des domaines</p>
              <p className="text-sm text-blue-700 mt-1">
                Les domaines du questionnaire seront disponibles pour sélection. Vous pourrez attribuer des domaines spécifiques ou donner l'accès complet à chaque audité.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // PHASE 4: Questionnaire
  const renderPhase5 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sélection du Questionnaire</h2>
        <p className="text-gray-600">Choisissez le questionnaire qui sera utilisé pour cette campagne d'audit.</p>
      </div>

      {/* Questionnaires List */}
      <div className="space-y-3">
        {questionnaires.map(quest => (
          <div
            key={quest.id}
            onClick={() => setFormData({ ...formData, questionnaire_id: quest.id })}
            className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
              formData.questionnaire_id === quest.id
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                formData.questionnaire_id === quest.id ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
              }`}>
                {formData.questionnaire_id === quest.id && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{quest.name}</h3>
                    {quest.description && (
                      <p className="text-sm text-gray-600 mt-1">{quest.description}</p>
                    )}
                  </div>
                  {quest.is_active && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      Actif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {quest.questions_count} questions
                  </span>
                  <span>Version {quest.version}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {questionnaires.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium">Aucun questionnaire disponible</p>
            <p className="text-sm mt-1">Veuillez d'abord créer un questionnaire actif</p>
          </div>
        )}
      </div>
    </div>
  );

  // PHASE 6: Résumé (avec distinction pilotes/audités)
  const renderPhase6 = () => {
    // Calcul des alertes sur les dates
    const launchDate = new Date(formData.launch_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    launchDate.setHours(0, 0, 0, 0);

    const diffTime = launchDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isLaunchTomorrow = diffDays === 1;
    const isLaunchToday = diffDays === 0;
    const isLaunchPast = diffDays < 0;

    return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation</h2>
        <p className="text-gray-600">Vérifiez les informations de votre campagne avant de la créer.</p>
      </div>

      {/* Alertes sur les dates */}
      {isLaunchToday && (
        <div className="border border-orange-300 rounded-lg p-4 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Attention - Lancement aujourd&apos;hui</h4>
              <p className="text-sm text-orange-700 mt-1">
                La campagne est configurée pour démarrer <strong>aujourd&apos;hui</strong>. Les invitations seront envoyées dès le lancement.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLaunchTomorrow && (
        <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">La campagne commence demain</h4>
              <p className="text-sm text-yellow-700 mt-1">
                La date de début est fixée à <strong>demain</strong>. Assurez-vous que tout est prêt avant de lancer la campagne.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLaunchPast && (
        <div className="border border-red-300 rounded-lg p-4 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Date de début dépassée</h4>
              <p className="text-sm text-red-700 mt-1">
                La date de début est dans le passé. Veuillez ajuster la date de lancement.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Configuration */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Configuration</h3>
          </div>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-600">Nom :</dt>
              <dd className="font-medium text-gray-900">{formData.title}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-600">Date de début :</dt>
              <dd className={`font-medium ${isLaunchPast ? 'text-red-600' : isLaunchToday ? 'text-orange-600' : isLaunchTomorrow ? 'text-yellow-600' : 'text-gray-900'}`}>
                {new Date(formData.launch_date).toLocaleDateString('fr-FR')}
                {isLaunchToday && ' (Aujourd\'hui)'}
                {isLaunchTomorrow && ' (Demain)'}
                {isLaunchPast && ' (Passée)'}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-600">Date de fin :</dt>
              <dd className="font-medium text-gray-900">{new Date(formData.due_date).toLocaleDateString('fr-FR')}</dd>
            </div>
          </dl>
        </div>

        {/* Pilotes */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <UserCog className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Pilotes de la Campagne</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">{selectedPilots.length} pilote(s)</p>
          <div className="space-y-2">
            {selectedPilots.slice(0, 5).map(user => (
              <div key={user.id} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span className="text-gray-900">{user.first_name} {user.last_name}</span>
                <span className="text-gray-500">({getRoleLabel(user.role)})</span>
              </div>
            ))}
            {selectedPilots.length > 5 && (
              <p className="text-sm text-gray-500 ml-6">
                ... et {selectedPilots.length - 5} autre(s)
              </p>
            )}
          </div>
        </div>

        {/* Type */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Type de Périmètre</h3>
          </div>
          <p className="text-sm">
            <span className={`px-3 py-1 rounded-full font-medium ${
              formData.campaign_type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              {getCampaignTypeLabel(formData.campaign_type)}
            </span>
          </p>
        </div>

        {/* Audités */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Personnes à Auditer</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">{selectedAudited.length} personne(s)</p>
          <div className="space-y-2">
            {selectedAudited.slice(0, 5).map(user => (
              <div key={user.id} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-900">{user.first_name} {user.last_name}</span>
                <span className="text-gray-500">({user.role})</span>
              </div>
            ))}
            {selectedAudited.length > 5 && (
              <p className="text-sm text-gray-500 ml-6">
                ... et {selectedAudited.length - 5} autre(s)
              </p>
            )}
          </div>
        </div>

        {/* Questionnaire */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Questionnaire</h3>
          </div>
          {selectedQuestionnaire && (
            <div>
              <p className="font-medium text-gray-900">{selectedQuestionnaire.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                Version {selectedQuestionnaire.version} • {selectedQuestionnaire.questions_count} questions
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Information</h4>
            <p className="text-sm text-blue-700 mt-1">
              La campagne sera créée avec le statut <strong>&quot;Brouillon&quot;</strong>. Vous pourrez la lancer ultérieurement depuis la liste des campagnes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  };

  // ==================== MAIN RENDER ====================

  const steps = [
    { num: 0, label: 'Configuration', icon: Calendar },
    { num: 1, label: 'Questionnaire', icon: FileText },
    { num: 2, label: 'Pilotes', icon: UserCog },
    { num: 3, label: 'Auditeurs', icon: UserCog },
    { num: 4, label: 'Type', icon: Target },
    { num: 5, label: 'Périmètre', icon: Briefcase },
    { num: 6, label: 'Audités', icon: Users },
    { num: 7, label: 'Résumé', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/client/campagnes"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Target className="w-7 h-7 text-purple-600" />
                  {isEditMode ? 'Modifier la Campagne' : 'Créer une Campagne d\'Audit'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Étape {currentStep + 1} sur {steps.length} - {steps[currentStep].label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;

              return (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isCompleted ? 'bg-green-500' : isActive ? 'bg-purple-600' : 'bg-gray-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <StepIcon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 transition-all ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {renderStep()}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={currentStep === 0 ? () => router.push('/client/campagnes') : handlePrevious}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 0 ? 'Annuler' : 'Précédent'}
            </button>

            <button
              onClick={currentStep === 7 ? handleSubmit : handleNext}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>En cours...</span>
                </>
              ) : (
                <>
                  <span>{currentStep === 7 ? 'Créer la campagne' : 'Suivant'}</span>
                  {currentStep < 7 && <ChevronRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
