'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Users,
  FileText,
  CheckCircle,
  Building2,
  Globe,
  Search,
  AlertCircle,
  Loader2,
  Sparkles,
  Send,
  Bot,
  User as UserIcon
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';

// ==================== TYPES ====================

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
  short_code?: string;
  entity_category?: string;
  description?: string;
  parent_category_id?: string | null;
  hierarchy_level?: number;
  tenant_id?: string | null;
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
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  entity_id: string;
  entity_name?: string;
  is_active: boolean;
  roles?: string[];
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface EbiosFormData {
  // Étape 1 - Configuration
  name: string;
  description: string;
  start_date: string;
  end_date: string;

  // Étape 2 - Périmètre
  perimeter_type: 'internal' | 'external' | '';
  selected_pole_ids: string[];
  selected_category_ids: string[];
  selected_entity_ids: string[];

  // Étape 3 - Pilotes
  pilot_user_ids: string[];

  // Étape 4 - Contributeurs
  contributor_user_ids: string[];

  // Étape 5 - Initialisation IA
  ai_context: string;
  ai_messages: AIMessage[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ==================== FORMATAGE MESSAGES IA ====================

/**
 * Parse le texte markdown en éléments React
 * Gère **bold**, *italic* et texte normal
 */
function parseMarkdownText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let partKey = 0;

  // Pattern pour **bold**, *italic*, et texte normal
  // On traite d'abord **bold** puis *italic*
  const markdownRegex = /(\*\*(.+?)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = markdownRegex.exec(text)) !== null) {
    // Ajouter le texte avant le match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Ajouter le texte formaté
    if (match[2]) {
      // **bold**
      parts.push(<strong key={partKey++} className="font-semibold text-gray-900">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic* - souvent utilisé comme titre ou emphase
      parts.push(<span key={partKey++} className="font-medium text-gray-800">{match[3]}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Formate le contenu des messages IA avec des styles CSS
 * Gère à la fois les balises HTML personnalisées ET le texte brut formaté
 * Supporte le markdown: **bold**, *italic*, listes à puces (•, -, *)
 */
function formatAIMessage(content: string): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Diviser par paragraphes (double saut de ligne ou simple)
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    // Vérifier si c'est un titre markdown (commence par # ou ##)
    const isMarkdownTitle = (line: string) => {
      return /^#{1,3}\s+/.test(line.trim());
    };

    // Vérifier si c'est un titre (se termine par ":" et est court, ou contient des mots clés)
    // Aussi détecter les lignes qui commencent par **Titre** ou *Titre*
    const isTitleLine = (line: string) => {
      const l = line.trim();
      // Titre markdown avec ** seul sur la ligne (ex: **Valeurs métier:**)
      if (/^\*\*[^*]+\*\*\s*:?\s*$/.test(l)) return true;
      // Titre avec * seul sur la ligne
      if (/^\*[^*]+\*\s*:?\s*$/.test(l) && l.length < 80) return true;
      return (
        (l.endsWith(':') && l.length < 100 && !l.startsWith('•') && !l.startsWith('-') && !/^\d+\./.test(l)) ||
        /^(Valeurs? métier|Biens? supports?|Événements? redoutés?|Sources? de risques?|Questions?|Recommandations?|En résumé|Conclusion|Synthèse|Analyse|Contexte)/i.test(l)
      );
    };

    // Vérifier si une ligne est une puce (•, -, ou * suivi d'espace et non-*)
    const isBulletLine = (line: string) => {
      const t = line.trim();
      return t.startsWith('•') || t.startsWith('-') || /^\*\s+[^*]/.test(t);
    };

    // Vérifier si le paragraphe est une liste à puces (incluant * comme puce)
    const allLines = trimmed.split('\n').filter(l => l.trim());
    const bulletLines = allLines.filter(isBulletLine);
    const numberedLines = allLines.filter(l => /^\d+\.\s/.test(l.trim()));

    if (bulletLines.length > 0 && bulletLines.length === allLines.length) {
      // C'est une liste à puces
      elements.push(
        <ul key={key++} className="space-y-2 my-3">
          {bulletLines.map((line, i) => {
            // Nettoyer le préfixe de puce (•, -, ou * suivi d'espace)
            const text = line.trim().replace(/^[•\-]\s*/, '').replace(/^\*\s+/, '');
            const gravityMatch = text.match(/\(Gravité\s*:\s*(\d)\/4\)/i) || text.match(/Gravité\s*:\s*(\d)/i);

            if (gravityMatch) {
              const cleanText = text.replace(/\s*\(Gravité\s*:\s*\d\/4\)/i, '').replace(/\s*Gravité\s*:\s*\d/i, '');
              const gravity = parseInt(gravityMatch[1]);
              const badgeColor = gravity >= 4 ? 'bg-red-100 text-red-700' :
                                 gravity >= 3 ? 'bg-orange-100 text-orange-700' :
                                 'bg-yellow-100 text-yellow-700';
              return (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <span className="text-red-500 mt-1">•</span>
                  <span className="flex-1">{parseMarkdownText(cleanText)}</span>
                  <span className={`px-2 py-0.5 ${badgeColor} rounded-full text-xs font-medium whitespace-nowrap`}>
                    Gravité: {gravity}/4
                  </span>
                </li>
              );
            }

            return (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="text-red-500 mt-1">•</span>
                <span>{parseMarkdownText(text)}</span>
              </li>
            );
          })}
        </ul>
      );
    } else if (numberedLines.length > 0 && numberedLines.length === allLines.length) {
      // C'est une liste numérotée
      elements.push(
        <ol key={key++} className="space-y-2 my-3 list-none">
          {numberedLines.map((line, i) => {
            const text = line.trim().replace(/^\d+\.\s*/, '');
            const gravityMatch = text.match(/\(Gravité\s*:\s*(\d)\/4\)/i) || text.match(/Gravité\s*:\s*(\d)/i);

            if (gravityMatch) {
              const cleanText = text.replace(/\s*\(Gravité\s*:\s*\d\/4\)/i, '').replace(/\s*Gravité\s*:\s*\d/i, '');
              const gravity = parseInt(gravityMatch[1]);
              const badgeColor = gravity >= 4 ? 'bg-red-100 text-red-700' :
                                 gravity >= 3 ? 'bg-orange-100 text-orange-700' :
                                 'bg-yellow-100 text-yellow-700';
              return (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <span className="font-semibold text-red-600 min-w-[24px]">{i + 1}.</span>
                  <span className="flex-1">{parseMarkdownText(cleanText)}</span>
                  <span className={`px-2 py-0.5 ${badgeColor} rounded-full text-xs font-medium whitespace-nowrap`}>
                    Gravité: {gravity}/4
                  </span>
                </li>
              );
            }

            return (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="font-semibold text-red-600 min-w-[24px]">{i + 1}.</span>
                <span>{parseMarkdownText(text)}</span>
              </li>
            );
          })}
        </ol>
      );
    } else {
      // Paragraphe mixte ou simple texte
      const lines = trimmed.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Titre markdown avec #
        if (isMarkdownTitle(line)) {
          const titleText = line.replace(/^#{1,3}\s+/, '');
          elements.push(
            <h4 key={key++} className="font-semibold text-gray-900 mt-4 mb-2 text-base border-b border-gray-200 pb-1">
              {parseMarkdownText(titleText)}
            </h4>
          );
        } else if (isTitleLine(line)) {
          // C'est un titre - nettoyer les ** ou * si présents
          const cleanTitle = line.replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/^\*/, '').replace(/\*$/, '').trim();
          elements.push(
            <h4 key={key++} className="font-semibold text-gray-900 mt-4 mb-2 text-base border-b border-gray-200 pb-1">
              {cleanTitle}
            </h4>
          );
        } else if (isBulletLine(line)) {
          // Puce isolée (incluant * comme puce)
          const text = line.trim().replace(/^[•\-]\s*/, '').replace(/^\*\s+/, '');
          elements.push(
            <div key={key++} className="flex items-start gap-2 text-gray-700 ml-2">
              <span className="text-red-500">•</span>
              <span>{parseMarkdownText(text)}</span>
            </div>
          );
        } else if (/^\d+\.\s/.test(line)) {
          // Numéro isolé
          const num = line.match(/^(\d+)\./)?.[1];
          const text = line.replace(/^\d+\.\s*/, '');
          elements.push(
            <div key={key++} className="flex items-start gap-2 text-gray-700 ml-2">
              <span className="font-semibold text-red-600 min-w-[24px]">{num}.</span>
              <span>{parseMarkdownText(text)}</span>
            </div>
          );
        } else {
          // Texte normal - parser le markdown pour **bold** et *italic*
          elements.push(
            <p key={key++} className="text-gray-700 my-2 leading-relaxed">
              {parseMarkdownText(line)}
            </p>
          );
        }
      }
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

// ==================== COMPOSANT PRINCIPAL ====================

export default function NouveauProjetEbiosPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Data
  const [formData, setFormData] = useState<EbiosFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    perimeter_type: '',
    selected_pole_ids: [],
    selected_category_ids: [],
    selected_entity_ids: [],
    pilot_user_ids: [],
    contributor_user_ids: [],
    ai_context: '',
    ai_messages: []
  });

  // Data from API
  const [poles, setPoles] = useState<Pole[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [entityMembers, setEntityMembers] = useState<EntityMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // UI States
  const [searchEntity, setSearchEntity] = useState('');
  const [searchPilot, setSearchPilot] = useState('');
  const [searchContributor, setSearchContributor] = useState('');
  const [expandedPoles, setExpandedPoles] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Steps configuration - Ordre: Config > Pilotes > Périmètre > Contributeurs > IA > Résumé
  const steps = [
    { id: 0, label: 'Configuration', icon: FileText },
    { id: 1, label: 'Pilotes', icon: Users },
    { id: 2, label: 'Périmètre', icon: Building2 },
    { id: 3, label: 'Contributeurs', icon: Users },
    { id: 4, label: 'Initialisation IA', icon: Sparkles },
    { id: 5, label: 'Résumé', icon: CheckCircle }
  ];

  // ==================== EFFECTS ====================

  // Étape 1: Pilotes - Charger les utilisateurs internes
  useEffect(() => {
    if (currentStep === 1) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Étape 2: Périmètre - Charger poles/categories et entités
  useEffect(() => {
    if (currentStep === 2) {
      if (formData.perimeter_type === 'internal') {
        loadPoles();
        loadEntities('internal');
      } else if (formData.perimeter_type === 'external') {
        loadCategories();
        loadEntities('external');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.perimeter_type]);

  // Étape 3: Contributeurs - Charger les membres des entités sélectionnées
  useEffect(() => {
    if (currentStep === 3) {
      if (formData.perimeter_type === 'external') {
        // Externe: membres des entités (entity_member)
        if (entities.length > 0 || formData.selected_entity_ids.length > 0) {
          loadEntityMembers();
        }
      }
      // Note: Pour périmètre interne, on réutilise les users déjà chargés
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.perimeter_type, formData.selected_entity_ids, formData.selected_category_ids, entities]);

  // ==================== API CALLS ====================

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

  const loadEntities = async (stakeholderType: 'internal' | 'external') => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetchWithAuth(
        `${API_BASE}/api/v1/ecosystem/entities?client_organization_id=${user.organizationId}&stakeholder_type=${stakeholderType}&limit=1000`
      );
      if (response.ok) {
        const data = await response.json();
        const allEntities = data.items || data || [];
        // Filtrer côté client également pour être sûr
        const filteredEntities = allEntities.filter((e: Entity) => e.stakeholder_type === stakeholderType);
        setEntities(filteredEntities);
        console.log(`✅ ${filteredEntities.length} entités ${stakeholderType} chargées pour EBIOS RM`);
      }
    } catch (err) {
      console.error('Error loading entities:', err);
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
        console.log(`✅ ${(data.items || data || []).length} catégories externes chargées`);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/user-management/users?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const allUsers = data.items || data || [];
        const filteredUsers = allUsers.filter((user: User) =>
          user.role !== 'platform_admin' && user.role !== 'super_admin' && user.tenant_id
        );
        setUsers(filteredUsers);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadEntityMembers = async () => {
    // Charger les membres de toutes les entités sélectionnées
    const selectedEntityIds = formData.selected_entity_ids.length > 0
      ? formData.selected_entity_ids
      : entities
          .filter(e => formData.selected_category_ids.includes(e.category_id || ''))
          .map(e => e.id);

    if (selectedEntityIds.length === 0) {
      console.log('⚠️ Aucune entité sélectionnée pour charger les membres');
      setEntityMembers([]);
      return;
    }

    setLoadingMembers(true);
    try {
      const allMembers: EntityMember[] = [];
      const seenIds = new Set<string>();

      // Charger les membres pour chaque entité sélectionnée
      for (const entityId of selectedEntityIds) {
        try {
          const response = await fetchWithAuth(`${API_BASE}/api/v1/ecosystem/entities/${entityId}/members`);
          if (response.ok) {
            const members = await response.json();
            const entityName = entities.find(e => e.id === entityId)?.name || '';

            for (const member of (members.items || members || [])) {
              if (!seenIds.has(member.id) && member.is_active !== false) {
                seenIds.add(member.id);
                allMembers.push({
                  ...member,
                  entity_name: entityName
                });
              }
            }
          }
        } catch (err) {
          console.error(`Error loading members for entity ${entityId}:`, err);
        }
      }

      setEntityMembers(allMembers);
      console.log(`✅ ${allMembers.length} membres chargés depuis ${selectedEntityIds.length} entités externes`);
    } catch (err) {
      console.error('Error loading entity members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // ==================== AI CHAT ====================

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput('');
    setAiLoading(true);

    // Add user message
    const newMessages: AIMessage[] = [
      ...formData.ai_messages,
      { role: 'user', content: userMessage }
    ];
    setFormData(prev => ({ ...prev, ai_messages: newMessages }));

    try {
      // Appel à l'API EBIOS AI Chat
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage,
          context: `Projet: ${formData.name}. ${formData.description || ''}`,
          history: formData.ai_messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.response) {
        setFormData(prev => ({
          ...prev,
          ai_messages: [...newMessages, { role: 'assistant', content: data.response }],
          ai_context: userMessage
        }));
      } else {
        // Erreur de l'IA
        toast.error(data.error || 'Erreur lors de la génération de la réponse');
        // Retirer le message utilisateur si échec
        setFormData(prev => ({ ...prev, ai_messages: formData.ai_messages }));
      }

    } catch (err) {
      console.error('Error sending AI message:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la communication avec l\'IA');
      // Retirer le message utilisateur si échec
      setFormData(prev => ({ ...prev, ai_messages: formData.ai_messages }));
    } finally {
      setAiLoading(false);
    }
  };

  // ==================== VALIDATION ====================

  const validateStep = (step: number): boolean => {
    setError('');

    switch (step) {
      case 0: // Configuration
        if (!formData.name.trim()) {
          setError('Le nom du projet est obligatoire');
          return false;
        }
        if (!formData.start_date) {
          setError('La date de début est obligatoire');
          return false;
        }
        if (!formData.end_date) {
          setError('La date de fin est obligatoire');
          return false;
        }
        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
          setError('La date de fin doit être après la date de début');
          return false;
        }
        break;

      case 1: // Pilotes (utilisateurs internes)
        if (formData.pilot_user_ids.length === 0) {
          setError('Veuillez sélectionner au moins un pilote');
          return false;
        }
        break;

      case 2: // Périmètre
        if (!formData.perimeter_type) {
          setError('Veuillez sélectionner le type de périmètre (Interne ou Externe)');
          return false;
        }
        if (formData.perimeter_type === 'internal' &&
            formData.selected_pole_ids.length === 0 &&
            formData.selected_entity_ids.length === 0) {
          setError('Veuillez sélectionner au moins un pôle ou une entité interne');
          return false;
        }
        if (formData.perimeter_type === 'external' &&
            formData.selected_category_ids.length === 0 &&
            formData.selected_entity_ids.length === 0) {
          setError('Veuillez sélectionner au moins une catégorie ou une entité externe');
          return false;
        }
        break;

      case 3: // Contributeurs (personnes des organismes sélectionnés)
        // Contributeurs optionnels
        break;

      case 4: // IA
        // IA optionnelle mais recommandée
        break;
    }

    return true;
  };

  // ==================== NAVIGATION ====================

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ==================== SUBMIT ====================

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Determine entity IDs based on perimeter type
      let entityIds = formData.selected_entity_ids;
      if (entityIds.length === 0) {
        if (formData.perimeter_type === 'internal' && formData.selected_pole_ids.length > 0) {
          entityIds = entities
            .filter(e => formData.selected_pole_ids.includes(e.pole_id || ''))
            .map(e => e.id);
        } else if (formData.perimeter_type === 'external' && formData.selected_category_ids.length > 0) {
          entityIds = entities
            .filter(e => formData.selected_category_ids.includes(e.category_id || ''))
            .map(e => e.id);
        }
      }

      // Préparer le contexte IA avec tous les messages échangés
      const aiInitialContext = formData.ai_messages.length > 0 ? {
        context: formData.ai_context || formData.name,  // Utilise le contexte ou le nom du projet
        messages: formData.ai_messages  // Tous les messages échangés avec l'IA
      } : null;

      const payload = {
        label: formData.name,  // Backend attend 'label', pas 'name'
        description: formData.description || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        scope_entity_ids: entityIds.length > 0 ? entityIds : null,  // Backend attend 'scope_entity_ids'
        pilot_user_ids: formData.pilot_user_ids.length > 0 ? formData.pilot_user_ids : null,
        contributor_user_ids: formData.contributor_user_ids.length > 0 ? formData.contributor_user_ids : null,
        ai_initial_context: aiInitialContext  // Backend attend 'ai_initial_context' (Dict avec context + messages)
      };

      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/projects`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const project = await response.json();
        toast.success('Projet EBIOS RM créé avec succès !');
        router.push(`/client/ebios/${project.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la création du projet');
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating project:', err);
      setError(error.message || 'Erreur lors de la création du projet');
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // ==================== HELPERS ====================

  const togglePole = (poleId: string) => {
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

  const toggleEntitySelection = (entityId: string) => {
    setFormData(prev => {
      const isSelected = prev.selected_entity_ids.includes(entityId);
      return {
        ...prev,
        selected_entity_ids: isSelected
          ? prev.selected_entity_ids.filter(id => id !== entityId)
          : [...prev.selected_entity_ids, entityId]
      };
    });
  };

  const toggleUserSelection = (userId: string, field: 'pilot_user_ids' | 'contributor_user_ids') => {
    setFormData(prev => {
      const isSelected = prev[field].includes(userId);
      return {
        ...prev,
        [field]: isSelected
          ? prev[field].filter(id => id !== userId)
          : [...prev[field], userId]
      };
    });
  };

  const getSelectedEntitiesCount = () => {
    if (formData.selected_entity_ids.length > 0) {
      return formData.selected_entity_ids.length;
    }
    if (formData.perimeter_type === 'internal') {
      return entities.filter(e => formData.selected_pole_ids.includes(e.pole_id || '')).length;
    }
    if (formData.perimeter_type === 'external') {
      return entities.filter(e => formData.selected_category_ids.includes(e.category_id || '')).length;
    }
    return 0;
  };

  // ==================== RENDER STEPS ====================

  const renderStep0Configuration = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom du projet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Ex: Analyse EBIOS RM - Infrastructure 2024"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          rows={4}
          placeholder="Décrivez les objectifs et le contexte de cette analyse de risques..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de début <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de fin <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-red-900">Méthode EBIOS Risk Manager</h4>
            <p className="text-sm text-red-700 mt-1">
              Ce projet suivra la méthodologie officielle ANSSI avec les 5 ateliers :
              Cadrage, Sources de risques, Scénarios stratégiques, Scénarios opérationnels et Matrice des risques.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2Perimetre = () => {
    // Calculer les stats de sélection selon le type
    const selectedGroupCount = formData.perimeter_type === 'internal'
      ? formData.selected_pole_ids.length
      : formData.selected_category_ids.length;
    const selectedEntitiesCount = formData.selected_entity_ids.length;

    // Rendu de l'arbre pour les pôles (Interne)
    const renderPolesTree = () => (
      <>
        {poles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun pôle disponible</p>
            <p className="text-xs mt-2">Vérifiez que des pôles sont configurés dans l&apos;écosystème.</p>
          </div>
        ) : (
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
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePole(pole.id); }}
                      className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    <div
                      onClick={() => {
                        const poleEntityIds = poleEntities.map(e => e.id);
                        if (isPoleSelected || allPoleEntitiesSelected) {
                          setFormData({
                            ...formData,
                            selected_pole_ids: formData.selected_pole_ids.filter(id => id !== pole.id),
                            selected_entity_ids: formData.selected_entity_ids.filter(id => !poleEntityIds.includes(id))
                          });
                        } else {
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
                        isPoleSelected || allPoleEntitiesSelected ? 'border-red-600 bg-red-600'
                          : somePoleEntitiesSelected ? 'border-red-600 bg-red-200' : 'border-gray-300'
                      }`}>
                        {(isPoleSelected || allPoleEntitiesSelected) && <CheckCircle className="w-3 h-3 text-white" />}
                        {somePoleEntitiesSelected && !isPoleSelected && !allPoleEntitiesSelected && (
                          <span className="text-xs text-red-600 font-bold">−</span>
                        )}
                      </div>
                    </div>

                    <Building2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0" onClick={() => togglePole(pole.id)}>
                      <span className="text-sm font-semibold text-gray-900 truncate block">{pole.name}</span>
                      {pole.code && <span className="text-xs text-gray-500">{pole.code}</span>}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{poleEntities.length} entité(s)</span>
                  </div>

                  {isExpanded && poleEntities.length > 0 && (
                    <div className="ml-7 mt-1 space-y-1">
                      {poleEntities.map(entity => (
                        <div
                          key={entity.id}
                          onClick={(e) => { e.stopPropagation(); toggleEntitySelection(entity.id); }}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                            formData.selected_entity_ids.includes(entity.id)
                              ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            formData.selected_entity_ids.includes(entity.id) ? 'border-red-600 bg-red-600' : 'border-gray-300'
                          }`}>
                            {formData.selected_entity_ids.includes(entity.id) && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{entity.name}</p>
                            {entity.description && <p className="text-xs text-gray-500 truncate">{entity.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && poleEntities.length === 0 && (
                    <div className="ml-7 mt-1 p-3 text-center text-sm text-gray-500 bg-gray-50 rounded">
                      Aucune entité dans ce pôle
                    </div>
                  )}
                </div>
              );
            })
        )}
      </>
    );

    // Rendu de l'arbre pour les catégories (Externe)
    const renderCategoriesTree = () => (
      <>
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucune catégorie disponible</p>
            <p className="text-xs mt-2">Vérifiez que des catégories externes sont configurées dans l&apos;écosystème.</p>
          </div>
        ) : (
          categories
            .filter(category => !category.parent_category_id)
            .filter(category =>
              searchEntity === '' ||
              category.name.toLowerCase().includes(searchEntity.toLowerCase()) ||
              entities.some(e => e.category_id === category.id && e.name.toLowerCase().includes(searchEntity.toLowerCase())) ||
              categories.some(sub => sub.parent_category_id === category.id && sub.name.toLowerCase().includes(searchEntity.toLowerCase()))
            )
            .map(category => {
              const subCategories = categories.filter(c => c.parent_category_id === category.id);
              const categoryEntities = entities.filter(e => e.category_id === category.id);
              const allSubEntities = entities.filter(e =>
                e.category_id === category.id || subCategories.some(sub => sub.id === e.category_id)
              );

              const isCategorySelected = formData.selected_category_ids.includes(category.id);
              const allCategoryEntitiesSelected = allSubEntities.length > 0 && allSubEntities.every(e => formData.selected_entity_ids.includes(e.id));
              const someCategoryEntitiesSelected = allSubEntities.some(e => formData.selected_entity_ids.includes(e.id));
              const isExpanded = expandedCategories.has(category.id);
              const hasChildren = subCategories.length > 0 || categoryEntities.length > 0;

              return (
                <div key={category.id} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    {hasChildren && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpandCategory(category.id); }}
                        className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors"
                      >
                        <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                    {!hasChildren && <div className="w-5" />}

                    <div
                      onClick={() => {
                        const allEntityIds = allSubEntities.map(e => e.id);
                        if (isCategorySelected || allCategoryEntitiesSelected) {
                          setFormData({
                            ...formData,
                            selected_category_ids: formData.selected_category_ids.filter(id => id !== category.id),
                            selected_entity_ids: formData.selected_entity_ids.filter(id => !allEntityIds.includes(id))
                          });
                        } else {
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
                        isCategorySelected || allCategoryEntitiesSelected ? 'border-red-600 bg-red-600'
                          : someCategoryEntitiesSelected ? 'border-red-600 bg-red-200' : 'border-gray-300'
                      }`}>
                        {(isCategorySelected || allCategoryEntitiesSelected) && <CheckCircle className="w-3 h-3 text-white" />}
                        {someCategoryEntitiesSelected && !isCategorySelected && !allCategoryEntitiesSelected && (
                          <span className="text-xs text-red-600 font-bold">−</span>
                        )}
                      </div>
                    </div>

                    <Globe className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0" onClick={() => toggleExpandCategory(category.id)}>
                      <span className="text-sm font-semibold text-gray-900 truncate block">{category.name}</span>
                      {category.short_code && <span className="text-xs text-gray-500">{category.short_code}</span>}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{allSubEntities.length} entité(s)</span>
                  </div>

                  {isExpanded && hasChildren && (
                    <div className="ml-7 mt-1 space-y-1">
                      {/* Sous-catégories */}
                      {subCategories.map(subCategory => {
                        const subCategoryEntities = entities.filter(e => e.category_id === subCategory.id);
                        const isSubExpanded = expandedSubCategories.has(subCategory.id);
                        const allSubCatEntitiesSelected = subCategoryEntities.length > 0 && subCategoryEntities.every(e => formData.selected_entity_ids.includes(e.id));
                        const someSubCatEntitiesSelected = subCategoryEntities.some(e => formData.selected_entity_ids.includes(e.id));

                        return (
                          <div key={subCategory.id} className="mb-1">
                            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border border-gray-300 hover:bg-gray-200 transition-colors">
                              {subCategoryEntities.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleExpandSubCategory(subCategory.id); }}
                                  className="flex-shrink-0 p-0.5 hover:bg-gray-300 rounded transition-colors"
                                >
                                  <ChevronRight className={`w-3 h-3 text-gray-600 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              )}
                              {subCategoryEntities.length === 0 && <div className="w-4" />}

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
                                  allSubCatEntitiesSelected ? 'border-red-600 bg-red-600'
                                    : someSubCatEntitiesSelected ? 'border-red-600 bg-red-200' : 'border-gray-300'
                                }`}>
                                  {allSubCatEntitiesSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                                  {someSubCatEntitiesSelected && !allSubCatEntitiesSelected && (
                                    <span className="text-[10px] text-red-600 font-bold">−</span>
                                  )}
                                </div>
                              </div>

                              <span className="text-sm font-medium text-gray-800 flex-1">{subCategory.name}</span>
                              <span className="text-xs text-gray-500">{subCategoryEntities.length} entité(s)</span>
                            </div>

                            {isSubExpanded && subCategoryEntities.length > 0 && (
                              <div className="ml-6 mt-1 space-y-1">
                                {subCategoryEntities.map(entity => (
                                  <div
                                    key={entity.id}
                                    onClick={(e) => { e.stopPropagation(); toggleEntitySelection(entity.id); }}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                                      formData.selected_entity_ids.includes(entity.id)
                                        ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                  >
                                    <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                                      formData.selected_entity_ids.includes(entity.id) ? 'border-red-600 bg-red-600' : 'border-gray-300'
                                    }`}>
                                      {formData.selected_entity_ids.includes(entity.id) && <CheckCircle className="w-2 h-2 text-white" />}
                                    </div>
                                    <span className="text-sm text-gray-700">{entity.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Entités directes de la catégorie */}
                      {categoryEntities.map(entity => (
                        <div
                          key={entity.id}
                          onClick={(e) => { e.stopPropagation(); toggleEntitySelection(entity.id); }}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                            formData.selected_entity_ids.includes(entity.id)
                              ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            formData.selected_entity_ids.includes(entity.id) ? 'border-red-600 bg-red-600' : 'border-gray-300'
                          }`}>
                            {formData.selected_entity_ids.includes(entity.id) && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{entity.name}</p>
                            {entity.description && <p className="text-xs text-gray-500 truncate">{entity.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </>
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Sélection du périmètre</h3>
          <p className="text-sm text-gray-600 mt-1">
            Choisissez le type de périmètre puis sélectionnez les organismes concernés par l&apos;analyse EBIOS RM.
          </p>
        </div>

        {/* Choix du type de périmètre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Type de périmètre <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  perimeter_type: 'internal',
                  selected_pole_ids: [],
                  selected_category_ids: [],
                  selected_entity_ids: []
                }));
                setSearchEntity('');
              }}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                formData.perimeter_type === 'internal'
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formData.perimeter_type === 'internal' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Interne</div>
                  <div className="text-sm text-gray-500">Pôles et entités internes</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  perimeter_type: 'external',
                  selected_pole_ids: [],
                  selected_category_ids: [],
                  selected_entity_ids: []
                }));
                setSearchEntity('');
              }}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                formData.perimeter_type === 'external'
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formData.perimeter_type === 'external' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Externe</div>
                  <div className="text-sm text-gray-500">Catégories et parties prenantes</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Afficher l'arbre seulement si un type est sélectionné */}
        {formData.perimeter_type && (
          <>
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchEntity}
                onChange={(e) => setSearchEntity(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={`Rechercher ${formData.perimeter_type === 'internal' ? 'un pôle ou une entité' : 'une catégorie ou une entité'}...`}
              />
            </div>

            {/* Compteur de sélection */}
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-red-900">
                  {selectedGroupCount} {formData.perimeter_type === 'internal' ? 'pôle(s)' : 'catégorie(s)'}
                </span>
                <span className="text-red-700 mx-2">•</span>
                <span className="font-medium text-red-900">
                  {selectedEntitiesCount} entité(s) sélectionnée(s)
                </span>
              </div>
            </div>

            {/* Vue en arbre hiérarchique */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sélectionner les {formData.perimeter_type === 'internal' ? 'pôles et entités' : 'catégories et entités'} <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Cliquez sur {formData.perimeter_type === 'internal' ? 'un pôle' : 'une catégorie'} pour sélectionner toutes ses entités, ou sélectionnez des entités spécifiques.
              </p>

              <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                {formData.perimeter_type === 'internal' ? renderPolesTree() : renderCategoriesTree()}
              </div>
            </div>
          </>
        )}

        {/* Info si aucun type sélectionné */}
        {!formData.perimeter_type && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Info :</strong> Sélectionnez d&apos;abord le type de périmètre (Interne ou Externe) pour afficher les organismes disponibles.
            </p>
          </div>
        )}

        {/* Info EBIOS */}
        {formData.perimeter_type && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              <strong>Note :</strong> Le périmètre définit les entités {formData.perimeter_type === 'internal' ? 'internes' : 'externes'} de votre organisation qui seront concernées par l&apos;analyse de risques EBIOS RM.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Étape 1: Pilotes - Toujours des utilisateurs internes de la plateforme (table users)
  const renderStep1Pilotes = () => {
    // Filtrer les utilisateurs actifs pour la sélection en masse
    const filteredPilotUsers = users.filter(user =>
      user.is_active &&
      (`${user.first_name} ${user.last_name}`.toLowerCase().includes(searchPilot.toLowerCase()) ||
        user.email.toLowerCase().includes(searchPilot.toLowerCase()))
    );

    const allPilotsSelected = filteredPilotUsers.length > 0 &&
      filteredPilotUsers.every(u => formData.pilot_user_ids.includes(u.id));

    const selectAllPilots = () => {
      const allIds = filteredPilotUsers.map(u => u.id);
      setFormData(prev => ({
        ...prev,
        pilot_user_ids: [...new Set([...prev.pilot_user_ids, ...allIds])]
      }));
    };

    const deselectAllPilots = () => {
      const filteredIds = new Set(filteredPilotUsers.map(u => u.id));
      setFormData(prev => ({
        ...prev,
        pilot_user_ids: prev.pilot_user_ids.filter(id => !filteredIds.has(id))
      }));
    };

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Sélection des pilotes</h3>
        <span className="text-sm text-gray-500">
          {formData.pilot_user_ids.length} pilote(s) sélectionné(s)
        </span>
      </div>

      <p className="text-sm text-gray-600">
        Les pilotes sont les utilisateurs internes responsables de la conduite de l&apos;analyse EBIOS RM.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchPilot}
          onChange={(e) => setSearchPilot(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Rechercher un utilisateur..."
        />
      </div>

      {users.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
          <span className="text-gray-500">Chargement des utilisateurs...</span>
        </div>
      ) : (
        <>
          {/* Boutons de sélection en masse */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-600">
              {filteredPilotUsers.length} utilisateur(s) affiché(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllPilots}
                disabled={allPilotsSelected}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={deselectAllPilots}
                disabled={formData.pilot_user_ids.length === 0}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto divide-y divide-gray-100">
          {users
            .filter(user =>
              user.is_active &&
              (`${user.first_name} ${user.last_name}`.toLowerCase().includes(searchPilot.toLowerCase()) ||
                user.email.toLowerCase().includes(searchPilot.toLowerCase()))
            )
            .map(user => {
              const isSelected = formData.pilot_user_ids.includes(user.id);
              return (
                <label
                  key={user.id}
                  className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 ${
                    isSelected ? 'bg-green-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUserSelection(user.id, 'pilot_user_ids')}
                    className="w-5 h-5 rounded border-gray-300 focus:ring-green-500 mr-4 accent-green-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded uppercase">
                    {user.role}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
    );
  };

  const renderStep3Contributeurs = () => {
    const isExternal = formData.perimeter_type === 'external';
    const isLoading = isExternal ? loadingMembers : false;

    // Filtrer pour exclure les pilotes déjà sélectionnés
    const availablePeople = isExternal
      ? entityMembers.filter(m => !formData.pilot_user_ids.includes(m.id))
      : users.filter(u => u.is_active && !formData.pilot_user_ids.includes(u.id));

    // Filtrer selon la recherche pour la sélection en masse
    const filteredContributors = isExternal
      ? entityMembers.filter(member =>
          !formData.pilot_user_ids.includes(member.id) &&
          (`${member.first_name} ${member.last_name}`.toLowerCase().includes(searchContributor.toLowerCase()) ||
            member.email.toLowerCase().includes(searchContributor.toLowerCase()) ||
            (member.entity_name || '').toLowerCase().includes(searchContributor.toLowerCase()))
        )
      : users.filter(user =>
          user.is_active &&
          !formData.pilot_user_ids.includes(user.id) &&
          (`${user.first_name} ${user.last_name}`.toLowerCase().includes(searchContributor.toLowerCase()) ||
            user.email.toLowerCase().includes(searchContributor.toLowerCase()))
        );

    const allContributorsSelected = filteredContributors.length > 0 &&
      filteredContributors.every(p => formData.contributor_user_ids.includes(p.id));

    const selectAllContributors = () => {
      const allIds = filteredContributors.map(p => p.id);
      setFormData(prev => ({
        ...prev,
        contributor_user_ids: [...new Set([...prev.contributor_user_ids, ...allIds])]
      }));
    };

    const deselectAllContributors = () => {
      const filteredIds = new Set(filteredContributors.map(p => p.id));
      setFormData(prev => ({
        ...prev,
        contributor_user_ids: prev.contributor_user_ids.filter(id => !filteredIds.has(id))
      }));
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Sélection des contributeurs</h3>
          <span className="text-sm text-gray-500">
            {formData.contributor_user_ids.length} contributeur(s) sélectionné(s)
          </span>
        </div>

        <p className="text-sm text-gray-600">
          Les contributeurs participent à l&apos;analyse sans en être responsables. Cette étape est optionnelle.
          {isExternal && (
            <span className="block mt-1 text-gray-500">
              Liste des personnes issues des organismes externes sélectionnés.
            </span>
          )}
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchContributor}
            onChange={(e) => setSearchContributor(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Rechercher une personne..."
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
            <span className="text-gray-500">Chargement des personnes...</span>
          </div>
        ) : availablePeople.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucune personne disponible</p>
            <p className="text-xs mt-2">
              Toutes les personnes sont déjà sélectionnées comme pilotes.
            </p>
          </div>
        ) : (
          <>
            {/* Boutons de sélection en masse */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm text-gray-600">
                {filteredContributors.length} personne(s) affichée(s)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllContributors}
                  disabled={allContributorsSelected || filteredContributors.length === 0}
                  className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tout sélectionner
                </button>
                <button
                  type="button"
                  onClick={deselectAllContributors}
                  disabled={formData.contributor_user_ids.length === 0}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {isExternal
              ? entityMembers
                  .filter(member =>
                    !formData.pilot_user_ids.includes(member.id) &&
                    (`${member.first_name} ${member.last_name}`.toLowerCase().includes(searchContributor.toLowerCase()) ||
                      member.email.toLowerCase().includes(searchContributor.toLowerCase()) ||
                      (member.entity_name || '').toLowerCase().includes(searchContributor.toLowerCase()))
                  )
                  .map(member => {
                    const isSelected = formData.contributor_user_ids.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-green-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(member.id, 'contributor_user_ids')}
                          className="w-5 h-5 rounded border-gray-300 focus:ring-green-500 mr-4 accent-green-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                          {member.entity_name && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {member.entity_name}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                          {member.position || 'Membre'}
                        </span>
                      </label>
                    );
                  })
              : users
                  .filter(user =>
                    user.is_active &&
                    !formData.pilot_user_ids.includes(user.id) &&
                    (`${user.first_name} ${user.last_name}`.toLowerCase().includes(searchContributor.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchContributor.toLowerCase()))
                  )
                  .map(user => {
                    const isSelected = formData.contributor_user_ids.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-green-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(user.id, 'contributor_user_ids')}
                          className="w-5 h-5 rounded border-gray-300 focus:ring-green-500 mr-4 accent-green-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {user.role}
                        </span>
                      </label>
                    );
                  })
            }
            </div>
          </>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            {isExternal ? (
              <>
                <strong>Périmètre externe :</strong> Les contributeurs sont les membres des organismes externes sélectionnés à l&apos;étape précédente.
              </>
            ) : (
              <>
                <strong>Périmètre interne :</strong> Les contributeurs sont des utilisateurs internes qui peuvent participer à l&apos;analyse. Les pilotes n&apos;apparaissent pas dans cette liste.
              </>
            )}
          </p>
        </div>
      </div>
    );
  };

  const renderStep4IA = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-red-600" />
          Initialisation IA du projet
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Dialoguez avec l&apos;IA pour définir le contexte de votre analyse.
          L&apos;IA pré-remplira l&apos;Atelier 1 (Cadrage) avec vos valeurs métier, biens supports et événements redoutés.
        </p>
      </div>

      {/* Chat Container */}
      <div className="border border-gray-200 rounded-lg bg-gray-50">
        {/* Messages */}
        <div className="h-[350px] overflow-y-auto p-4 space-y-4">
          {formData.ai_messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                Décrivez votre contexte pour que l&apos;IA vous aide à initialiser l&apos;analyse.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Ex: &quot;Notre organisation gère des données de santé et nous devons être conformes au RGPD...&quot;
              </p>
            </div>
          ) : (
            formData.ai_messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    {msg.role === 'assistant' ? (
                      <Bot className="w-4 h-4 mr-2 text-red-600" />
                    ) : (
                      <UserIcon className="w-4 h-4 mr-2" />
                    )}
                    <span className="text-xs font-medium">
                      {msg.role === 'assistant' ? 'Assistant IA' : 'Vous'}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.role === 'assistant' ? formatAIMessage(msg.content) : msg.content}
                  </div>
                </div>
              </div>
            ))
          )}

          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-red-600" />
                  <span className="text-sm text-gray-500">L&apos;IA réfléchit...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
          <div className="flex space-x-3 items-end">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendAiMessage();
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none min-h-[80px] max-h-[200px]"
              placeholder="Décrivez votre contexte... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
              disabled={aiLoading}
              rows={3}
            />
            <button
              onClick={sendAiMessage}
              disabled={!aiInput.trim() || aiLoading}
              className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-fit"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-700">
          <strong>Optionnel :</strong> Vous pouvez passer cette étape et configurer l&apos;Atelier 1 manuellement après la création du projet.
        </p>
      </div>
    </div>
  );

  const renderStep5Resume = () => {
    const isExternal = formData.perimeter_type === 'external';
    const selectedPoles = poles.filter(p => formData.selected_pole_ids.includes(p.id));
    const selectedCategories = categories.filter(c => formData.selected_category_ids.includes(c.id));
    const selectedEntities = entities.filter(e => formData.selected_entity_ids.includes(e.id));

    // Pilotes: TOUJOURS des utilisateurs internes (table users)
    const selectedPilots = users.filter(u => formData.pilot_user_ids.includes(u.id));

    // Contributeurs: selon le type de périmètre
    // - Externe: membres des entités (entity_member)
    // - Interne: utilisateurs internes (users)
    const selectedContributors = isExternal
      ? entityMembers.filter(m => formData.contributor_user_ids.includes(m.id))
      : users.filter(u => formData.contributor_user_ids.includes(u.id));

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Résumé du projet EBIOS RM</h3>

        {/* Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-red-600" />
            Configuration
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Nom :</span>
              <span className="ml-2 font-medium text-gray-900">{formData.name}</span>
            </div>
            <div>
              <span className="text-gray-500">Période :</span>
              <span className="ml-2 font-medium text-gray-900">
                {new Date(formData.start_date).toLocaleDateString('fr-FR')} → {new Date(formData.end_date).toLocaleDateString('fr-FR')}
              </span>
            </div>
            {formData.description && (
              <div className="col-span-2">
                <span className="text-gray-500">Description :</span>
                <p className="mt-1 text-gray-700">{formData.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Périmètre */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            {formData.perimeter_type === 'internal' ? (
              <Building2 className="w-5 h-5 mr-2 text-red-600" />
            ) : (
              <Globe className="w-5 h-5 mr-2 text-red-600" />
            )}
            Périmètre {formData.perimeter_type === 'internal' ? 'Interne' : 'Externe'} ({getSelectedEntitiesCount()} organismes)
          </h4>
          <div className="flex flex-wrap gap-2">
            {formData.perimeter_type === 'internal' && selectedPoles.map(pole => (
              <span
                key={pole.id}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
              >
                {pole.name} (pôle)
              </span>
            ))}
            {formData.perimeter_type === 'external' && selectedCategories.map(category => (
              <span
                key={category.id}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
              >
                {category.name} (catégorie)
              </span>
            ))}
            {selectedEntities.map(entity => (
              <span
                key={entity.id}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {entity.name}
              </span>
            ))}
          </div>
        </div>

        {/* Équipe */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-red-600" />
            Équipe projet
          </h4>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Pilotes :</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedPilots.map(user => (
                  <span
                    key={user.id}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {user.first_name} {user.last_name}
                  </span>
                ))}
              </div>
            </div>
            {selectedContributors.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Contributeurs :</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedContributors.map(user => (
                    <span
                      key={user.id}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {user.first_name} {user.last_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IA Context */}
        {formData.ai_messages.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-red-600" />
              Contexte IA initialisé
            </h4>
            <p className="text-sm text-green-600 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              L&apos;IA a collecté des informations pour pré-remplir l&apos;Atelier 1
            </p>
          </div>
        )}

        {/* Ateliers */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <h4 className="font-medium text-red-900 mb-3">Ateliers EBIOS RM</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            {['AT1 Cadrage', 'AT2 Sources', 'AT3 Stratégique', 'AT4 Opérationnel', 'AT5 Matrice'].map((at, idx) => (
              <div
                key={idx}
                className="bg-white border border-red-200 rounded-lg p-3 text-center"
              >
                <div className="font-medium text-red-800">{at}</div>
                <div className="text-xs text-red-600 mt-1">À compléter</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster position="top-right" richColors />

      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/client/ebios"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <ShieldAlert className="w-7 h-7 mr-3 text-red-600" />
                  Nouveau Projet EBIOS RM
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Créez une nouvelle analyse de risques selon la méthode ANSSI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-red-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`ml-3 text-sm font-medium hidden md:block ${
                        isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-4 rounded ${
                        idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1200px] mx-auto w-full px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step Content - Ordre: Config > Pilotes > Périmètre > Contributeurs > IA > Résumé */}
          {currentStep === 0 && renderStep0Configuration()}
          {currentStep === 1 && renderStep1Pilotes()}
          {currentStep === 2 && renderStep2Perimetre()}
          {currentStep === 3 && renderStep3Contributeurs()}
          {currentStep === 4 && renderStep4IA()}
          {currentStep === 5 && renderStep5Resume()}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Créer le projet
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
