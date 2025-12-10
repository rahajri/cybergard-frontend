'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Users,
  Send,
  Paperclip,
  MoreVertical,
  Clock,
  CheckCircle,
  Trash2,
  RefreshCw,
  ChevronLeft,
  X,
  User,
  FileText,
  Target,
  Shield,
  Loader2,
  Check,
  XCircle
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Types
interface Participant {
  user_id: string;
  user_type: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  joined_at: string | null;
  last_read_at: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  author_id: string | null;
  author_type: string | null;
  author_first_name: string | null;
  author_last_name: string | null;
  author_email: string | null;
  body: string;
  attachments: any[];
  is_system: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

interface Conversation {
  id: string;
  type: 'RIGHTS' | 'ACTION' | 'QUESTION' | 'DIRECT_MESSAGE';
  title: string | null;
  object_id: string | null;
  campaign_id: string | null;
  tenant_id: string;
  created_by: string;
  created_by_type: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  participants: Participant[];
  last_message: Message | null;
  unread_count: number;
  object_title?: string;
  object_status?: string;
}

interface ConversationDetail extends Conversation {
  messages: Message[];
  messages_total: number;
}

interface SearchMember {
  user_id: string;
  user_type: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

// Composants utilitaires
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'DIRECT_MESSAGE': 'Discussion directe',
    'QUESTION': 'Question',
    'ACTION': 'Action',
    'RIGHTS': 'Demande de droits'
  };
  return labels[type] || type;
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    'DIRECT_MESSAGE': <Users className="w-4 h-4" />,
    'QUESTION': <FileText className="w-4 h-4" />,
    'ACTION': <Target className="w-4 h-4" />,
    'RIGHTS': <Shield className="w-4 h-4" />
  };
  return icons[type] || <MessageSquare className="w-4 h-4" />;
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'DIRECT_MESSAGE': 'bg-teal-100 text-teal-700',
    'QUESTION': 'bg-blue-100 text-blue-700',
    'ACTION': 'bg-orange-100 text-orange-700',
    'RIGHTS': 'bg-purple-100 text-purple-700'
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'À l\'instant';
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
  return date.toLocaleDateString('fr-FR');
};

const getInitials = (firstName: string | null, lastName: string | null) => {
  const f = firstName?.charAt(0) || '';
  const l = lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '?';
};

// Mapping des codes de permission vers des labels lisibles
const PERMISSION_LABELS: Record<string, string> = {
  // Campagnes
  'CAMPAIGN_CREATE': 'Créer des campagnes',
  'CAMPAIGN_EDIT': 'Modifier des campagnes',
  'CAMPAIGN_DELETE': 'Supprimer des campagnes',
  'CAMPAIGN_VIEW': 'Voir les campagnes',
  'CAMPAIGN_LAUNCH': 'Lancer des campagnes',
  'CAMPAIGN_FREEZE': 'Figer des campagnes',
  // Écosystème
  'ECOSYSTEM_CREATE': 'Créer des entités',
  'ECOSYSTEM_EDIT': 'Modifier des entités',
  'ECOSYSTEM_DELETE': 'Supprimer des entités',
  'ECOSYSTEM_VIEW': 'Voir l\'écosystème',
  // Utilisateurs
  'USER_CREATE': 'Créer des utilisateurs',
  'USER_EDIT': 'Modifier des utilisateurs',
  'USER_DELETE': 'Supprimer des utilisateurs',
  'USER_VIEW': 'Voir les utilisateurs',
  // Rôles
  'ROLE_CREATE': 'Créer des rôles',
  'ROLE_EDIT': 'Modifier des rôles',
  'ROLE_DELETE': 'Supprimer des rôles',
  'ROLE_VIEW': 'Voir les rôles',
  'ROLE_ASSIGN': 'Assigner des rôles',
  // Rapports
  'REPORT_CREATE': 'Créer des rapports',
  'REPORT_VIEW': 'Voir les rapports',
  'REPORT_EXPORT': 'Exporter des rapports',
  // Plans d'action
  'ACTION_PLAN_CREATE': 'Créer des plans d\'action',
  'ACTION_PLAN_EDIT': 'Modifier des plans d\'action',
  'ACTION_PLAN_DELETE': 'Supprimer des plans d\'action',
  'ACTION_PLAN_VIEW': 'Voir les plans d\'action',
  // Questionnaires
  'QUESTIONNAIRE_CREATE': 'Créer des questionnaires',
  'QUESTIONNAIRE_EDIT': 'Modifier des questionnaires',
  'QUESTIONNAIRE_DELETE': 'Supprimer des questionnaires',
  'QUESTIONNAIRE_VIEW': 'Voir les questionnaires',
  // Référentiels
  'REFERENTIAL_CREATE': 'Créer des référentiels',
  'REFERENTIAL_EDIT': 'Modifier des référentiels',
  'REFERENTIAL_DELETE': 'Supprimer des référentiels',
  'REFERENTIAL_VIEW': 'Voir les référentiels',
};

// Composant pour afficher un message de demande de droits de manière formatée
const RightsRequestMessage = ({ message }: { message: Message }) => {
  const metadata = message.metadata || {};
  const permissionCodes = (metadata.permission_code || '').split(', ').filter(Boolean);
  const actionName = metadata.action_name || 'Module inconnu';
  const requesterEmail = metadata.requester_email || '';

  // Extraire le message personnalisé du body (après "**Message:**")
  const bodyParts = message.body.split('**Message:**');
  const customMessage = bodyParts.length > 1 ? bodyParts[1].trim() : '';

  return (
    <div className="space-y-4">
      {/* En-tête de la demande */}
      <div className="flex items-center gap-2 text-teal-700">
        <Shield className="w-5 h-5" />
        <span className="font-semibold">Demande d'accès</span>
      </div>

      {/* Module concerné */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Module :</span>
        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
          {actionName}
        </span>
      </div>

      {/* Permissions demandées */}
      {permissionCodes.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm text-slate-600">Permissions demandées :</span>
          <div className="flex flex-wrap gap-2">
            {permissionCodes.map((code: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm"
              >
                <Check className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                {PERMISSION_LABELS[code] || code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Message personnalisé */}
      {customMessage && customMessage !== 'L\'utilisateur souhaite obtenir cette permission.' && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600 mb-1">Message :</p>
          <p className="text-sm text-slate-800">{customMessage}</p>
        </div>
      )}
    </div>
  );
};

export default function DiscussionsPage() {
  // Hook permissions pour vérifier si admin
  const { isAdmin } = usePermissions();

  // États
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Nouveau message
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Modal nouvelle conversation
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState('');
  const [newConvMessage, setNewConvMessage] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<SearchMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<SearchMember[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Demande de droits
  const [isProcessingRightsRequest, setIsProcessingRightsRequest] = useState(false);
  const [rightsRequestProcessed, setRightsRequestProcessed] = useState(false);

  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'accept' | 'reject' | null;
  }>({ isOpen: false, action: null });
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
  } | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les conversations
  const loadConversations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `${API_BASE}/api/v1/discussions?limit=50`;
      if (typeFilter) url += `&type=${typeFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await authenticatedFetch(url);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des conversations');
      }

      const data = await response.json();
      setConversations(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger une conversation avec ses messages
  const loadConversation = async (conversationId: string) => {
    setIsLoadingMessages(true);

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/v1/discussions/${conversationId}?limit=100`
      );

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la conversation');
      }

      const data: ConversationDetail = await response.json();
      setSelectedConversation(data);

      // Mettre à jour le unread_count dans la liste
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Envoyer un message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/v1/discussions/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: newMessage.trim(), attachments: [] })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du message');
      }

      const message: Message = await response.json();

      // Ajouter le message à la conversation
      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, message],
        last_message: message,
        messages_total: prev.messages_total + 1
      } : null);

      // Mettre à jour la liste des conversations
      setConversations(prev =>
        prev.map(c => c.id === selectedConversation.id ? {
          ...c,
          last_message: message,
          updated_at: message.created_at
        } : c).sort((a, b) =>
          new Date(b.last_message?.created_at || b.updated_at).getTime() -
          new Date(a.last_message?.created_at || a.updated_at).getTime()
        )
      );

      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSending(false);
    }
  };

  // Rechercher des membres
  const searchMembers = async (query: string) => {
    if (query.length < 2) {
      setMemberResults([]);
      return;
    }

    setIsSearchingMembers(true);

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/v1/discussions/members/search?q=${encodeURIComponent(query)}&limit=10`
      );

      if (response.ok) {
        const data = await response.json();
        // Filtrer les membres déjà sélectionnés
        const filtered = data.filter(
          (m: SearchMember) => !selectedParticipants.find(p => p.user_id === m.user_id)
        );
        setMemberResults(filtered);
      }
    } catch (err) {
      console.error('Erreur lors de la recherche:', err);
    } finally {
      setIsSearchingMembers(false);
    }
  };

  // Créer une nouvelle conversation
  const createConversation = async () => {
    if (selectedParticipants.length === 0 || isCreatingConversation) return;

    setIsCreatingConversation(true);

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/v1/discussions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newConvTitle.trim() || null,
            participant_ids: selectedParticipants.map(p => p.user_id),
            initial_message: newConvMessage.trim() || null
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la conversation');
      }

      const newConv: Conversation = await response.json();

      // Ajouter à la liste et sélectionner
      setConversations(prev => [newConv, ...prev]);
      loadConversation(newConv.id);

      // Fermer le modal et réinitialiser
      setShowNewConversationModal(false);
      setNewConvTitle('');
      setNewConvMessage('');
      setSelectedParticipants([]);
      setMemberSearch('');
      setMemberResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Supprimer une conversation
  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) return;

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/v1/discussions/${conversationId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      // Retirer de la liste
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // Désélectionner si c'était la conversation active
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  // Ouvrir la modal de confirmation pour accepter/refuser
  const openRightsConfirmModal = (action: 'accept' | 'reject') => {
    if (!selectedConversation || isProcessingRightsRequest) return;
    setConfirmModal({ isOpen: true, action });
  };

  // Traiter une demande de droits (Accepter/Refuser)
  const processRightsRequest = async () => {
    if (!selectedConversation || !confirmModal.action) return;

    const action = confirmModal.action;
    setConfirmModal({ isOpen: false, action: null });
    setIsProcessingRightsRequest(true);

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/api/v1/discussions/${selectedConversation.id}/rights-action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Erreur lors du traitement');
      }

      // Recharger la conversation pour voir le message système
      await loadConversation(selectedConversation.id);

      setRightsRequestProcessed(true);

      // Afficher le modal de succès
      const actionText = action === 'accept' ? 'acceptée' : 'refusée';
      setResultModal({
        isOpen: true,
        type: 'success',
        title: action === 'accept' ? 'Demande acceptée' : 'Demande refusée',
        message: action === 'accept'
          ? 'Les permissions ont été ajoutées au rôle de l\'utilisateur avec succès.'
          : 'La demande de droits a été refusée.'
      });

    } catch (err) {
      setResultModal({
        isOpen: true,
        type: 'error',
        title: 'Erreur',
        message: err instanceof Error ? err.message : 'Une erreur est survenue'
      });
    } finally {
      setIsProcessingRightsRequest(false);
    }
  };

  // Vérifier si la demande de droits a déjà été traitée
  const isRightsRequestAlreadyProcessed = () => {
    if (!selectedConversation || selectedConversation.type !== 'RIGHTS') return false;

    // Chercher un message système avec action accept ou reject
    return selectedConversation.messages.some(
      msg => msg.is_system && msg.metadata?.action && ['accept', 'reject'].includes(msg.metadata.action)
    );
  };

  // Effects
  useEffect(() => {
    loadConversations();
  }, [typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) loadConversations();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMembers(memberSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // Polling pour rafraîchir
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      if (selectedConversation) {
        loadConversation(selectedConversation.id);
      }
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Discussions</h1>
                <p className="text-sm text-slate-500">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadConversations()}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowNewConversationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Nouvelle discussion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-[calc(100vh-180px)] flex overflow-hidden">
          {/* Liste des conversations */}
          <div className={`w-96 border-r border-slate-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Recherche et filtres */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTypeFilter(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !typeFilter ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Toutes
                </button>
                {['DIRECT_MESSAGE', 'QUESTION', 'ACTION', 'RIGHTS'].map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      typeFilter === type ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
                  <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="text-center">Aucune conversation</p>
                  <button
                    onClick={() => setShowNewConversationModal(true)}
                    className="mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium"
                  >
                    Démarrer une nouvelle discussion
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-teal-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {conv.participants[0] ? getInitials(
                            conv.participants[0].first_name,
                            conv.participants[0].last_name
                          ) : '?'}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Titre et badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getTypeColor(conv.type)}`}>
                              {getTypeIcon(conv.type)}
                              {getTypeLabel(conv.type)}
                            </span>
                            {conv.unread_count > 0 && (
                              <span className="w-5 h-5 bg-teal-600 text-white text-xs rounded-full flex items-center justify-center">
                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                              </span>
                            )}
                          </div>

                          {/* Titre ou participants */}
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {conv.title || conv.participants.map(p =>
                              `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email
                            ).join(', ') || 'Conversation'}
                          </p>

                          {/* Dernier message */}
                          {conv.last_message && (
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {conv.last_message.is_system ? (
                                <span className="italic">{conv.last_message.body}</span>
                              ) : (
                                <>
                                  <span className="font-medium">
                                    {conv.last_message.author_first_name}:
                                  </span>{' '}
                                  {conv.last_message.body}
                                </>
                              )}
                            </p>
                          )}

                          {/* Date */}
                          <p className="text-xs text-slate-400 mt-1">
                            {formatRelativeTime(conv.last_message?.created_at || conv.updated_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Zone de conversation */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                {/* Header conversation */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getTypeColor(selectedConversation.type)}`}>
                          {getTypeIcon(selectedConversation.type)}
                          {getTypeLabel(selectedConversation.type)}
                        </span>
                      </div>
                      <h2 className="font-semibold text-slate-900">
                        {selectedConversation.title || selectedConversation.participants.map(p =>
                          `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email
                        ).join(', ')}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {selectedConversation.participants.length} participant{selectedConversation.participants.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Boutons Accepter/Refuser pour les demandes de droits (admin uniquement) */}
                    {selectedConversation.type === 'RIGHTS' && isAdmin && !isRightsRequestAlreadyProcessed() && (
                      <>
                        <button
                          onClick={() => openRightsConfirmModal('accept')}
                          disabled={isProcessingRightsRequest}
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          title="Accepter la demande"
                        >
                          {isProcessingRightsRequest ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Accepter</span>
                        </button>
                        <button
                          onClick={() => openRightsConfirmModal('reject')}
                          disabled={isProcessingRightsRequest}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          title="Refuser la demande"
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Refuser</span>
                        </button>
                      </>
                    )}
                    {/* Badge si déjà traité */}
                    {selectedConversation.type === 'RIGHTS' && isRightsRequestAlreadyProcessed() && (
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm">
                        Demande traitée
                      </span>
                    )}
                    <button
                      onClick={() => deleteConversation(selectedConversation.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                    </div>
                  ) : selectedConversation.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
                      <p>Aucun message</p>
                      <p className="text-sm">Démarrez la conversation !</p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((message, index) => {
                      const isOwnMessage = message.author_id === localStorage.getItem('userId');
                      const showAvatar = index === 0 ||
                        selectedConversation.messages[index - 1].author_id !== message.author_id;

                      // Message système (notification)
                      if (message.is_system) {
                        return (
                          <div key={message.id} className="flex justify-center">
                            <p className="px-4 py-2 bg-slate-100 rounded-full text-xs text-slate-500 italic">
                              {message.body}
                            </p>
                          </div>
                        );
                      }

                      // Message de demande de droits (premier message avec métadonnées)
                      const isRightsRequest = selectedConversation.type === 'RIGHTS' &&
                        index === 0 &&
                        message.metadata?.permission_code;

                      if (isRightsRequest) {
                        return (
                          <div key={message.id} className="flex gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-teal-100 text-teal-600">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-slate-900">
                                  {message.author_first_name} {message.author_last_name}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatRelativeTime(message.created_at)}
                                </span>
                              </div>
                              <div className="bg-gradient-to-br from-teal-50 to-purple-50 border border-teal-200 rounded-xl p-4">
                                <RightsRequestMessage message={message} />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Message normal
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                        >
                          {showAvatar ? (
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                              isOwnMessage ? 'bg-teal-600' : 'bg-slate-500'
                            }`}>
                              {getInitials(message.author_first_name, message.author_last_name)}
                            </div>
                          ) : (
                            <div className="w-8" />
                          )}

                          <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {showAvatar && (
                              <p className={`text-xs text-slate-500 mb-1 ${isOwnMessage ? 'text-right' : ''}`}>
                                {message.author_first_name} {message.author_last_name}
                              </p>
                            )}
                            <div className={`px-4 py-2 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-teal-600 text-white rounded-tr-sm'
                                : 'bg-slate-100 text-slate-900 rounded-tl-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                            </div>
                            <p className={`text-xs text-slate-400 mt-1 ${isOwnMessage ? 'text-right' : ''}`}>
                              {formatRelativeTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Zone de saisie */}
                <div className="p-4 border-t border-slate-200">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Écrivez votre message..."
                        rows={1}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <MessageSquare className="w-16 h-16 mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  Sélectionnez une conversation
                </h3>
                <p className="text-sm text-center max-w-md">
                  Choisissez une conversation existante ou créez-en une nouvelle pour commencer à échanger.
                </p>
                <button
                  onClick={() => setShowNewConversationModal(true)}
                  className="mt-6 flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nouvelle discussion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal nouvelle conversation */}
      {showNewConversationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Nouvelle discussion
                </h2>
                <button
                  onClick={() => {
                    setShowNewConversationModal(false);
                    setNewConvTitle('');
                    setNewConvMessage('');
                    setSelectedParticipants([]);
                    setMemberSearch('');
                    setMemberResults([]);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Titre (optionnel) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre (optionnel)
                </label>
                <input
                  type="text"
                  value={newConvTitle}
                  onChange={(e) => setNewConvTitle(e.target.value)}
                  placeholder="Ex: Projet sécurité Q1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Recherche participants */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Participants *
                </label>

                {/* Participants sélectionnés */}
                {selectedParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedParticipants.map(p => (
                      <span
                        key={p.user_id}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm"
                      >
                        {p.first_name} {p.last_name}
                        <button
                          onClick={() => setSelectedParticipants(prev => prev.filter(x => x.user_id !== p.user_id))}
                          className="hover:text-teal-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Champ de recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Rechercher par nom ou email..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Résultats de recherche */}
                {memberResults.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    {memberResults.map(member => (
                      <button
                        key={member.user_id}
                        onClick={() => {
                          setSelectedParticipants(prev => [...prev, member]);
                          setMemberSearch('');
                          setMemberResults([]);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-semibold">
                          {getInitials(member.first_name, member.last_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isSearchingMembers && (
                  <div className="mt-2 text-center text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                    Recherche en cours...
                  </div>
                )}
              </div>

              {/* Message initial (optionnel) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Premier message (optionnel)
                </label>
                <textarea
                  value={newConvMessage}
                  onChange={(e) => setNewConvMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewConversationModal(false);
                  setNewConvTitle('');
                  setNewConvMessage('');
                  setSelectedParticipants([]);
                  setMemberSearch('');
                  setMemberResults([]);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createConversation}
                disabled={selectedParticipants.length === 0 || isCreatingConversation}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isCreatingConversation && <Loader2 className="w-4 h-4 animate-spin" />}
                Créer la discussion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="hover:text-red-900">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Modal de confirmation pour accepter/refuser une demande de droits */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null })}
        onConfirm={processRightsRequest}
        title={confirmModal.action === 'accept' ? 'Accepter la demande' : 'Refuser la demande'}
        message={
          confirmModal.action === 'accept'
            ? 'Voulez-vous accepter cette demande de droits ?\n\nLes permissions demandées seront ajoutées au rôle de l\'utilisateur.'
            : 'Voulez-vous refuser cette demande de droits ?\n\nL\'utilisateur sera notifié du refus.'
        }
        type="confirm"
        confirmText={confirmModal.action === 'accept' ? 'Accepter' : 'Refuser'}
        cancelText="Annuler"
        confirmButtonColor={confirmModal.action === 'accept' ? 'green' : 'red'}
      />

      {/* Modal de résultat (succès ou erreur) */}
      {resultModal && (
        <ConfirmModal
          isOpen={resultModal.isOpen}
          onClose={() => setResultModal(null)}
          title={resultModal.title}
          message={resultModal.message}
          type={resultModal.type}
        />
      )}
    </div>
  );
}
