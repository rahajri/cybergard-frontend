'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/lib/api';
import { MessageSquare, FileText, Target, Shield, Users } from 'lucide-react';

// ============================================================================
// TYPES - Mentions (système existant)
// ============================================================================

interface MentionNotification {
  id: string;
  comment_id: string;
  comment_content: string;
  comment_created_at: string;
  author_first_name: string;
  author_last_name: string;
  question_id: string;
  question_text: string;
  question_order: number;
  audit_id: string;
  questionnaire_id: string;
  created_at: string;
  user_type?: string; // 'auditor' ou 'entity_member'
  campaign_id?: string; // Pour les audités
}

interface UnreadMentionsResponse {
  total_unread: number;
  mentions: MentionNotification[];
}

// ============================================================================
// TYPES - Discussions (nouveau système)
// ============================================================================

interface DiscussionNotification {
  id: string;
  user_id: string;
  user_type: string;
  conversation_id: string;
  message_id: string | null;
  notification_type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  conversation_title: string | null;
  conversation_type: 'RIGHTS' | 'ACTION' | 'QUESTION' | 'DIRECT_MESSAGE' | null;
  message_preview: string | null;
  author_name: string | null;
}

interface UnreadDiscussionsResponse {
  total_unread: number;
  notifications: DiscussionNotification[];
}

// ============================================================================
// TYPES - Notification unifiée
// ============================================================================

type NotificationType = 'mention' | 'discussion';

interface UnifiedNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  preview: string;
  authorInitials: string;
  createdAt: string;
  icon: React.ReactNode;
  color: string;
  // Données originales pour navigation
  original: MentionNotification | DiscussionNotification;
}

interface NotificationBellProps {
  position?: 'top' | 'bottom';
}

// ============================================================================
// HELPERS
// ============================================================================

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

const getDiscussionIcon = (type: string | null) => {
  switch (type) {
    case 'DIRECT_MESSAGE':
      return <Users className="w-4 h-4" />;
    case 'QUESTION':
      return <FileText className="w-4 h-4" />;
    case 'ACTION':
      return <Target className="w-4 h-4" />;
    case 'RIGHTS':
      return <Shield className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
};

const getDiscussionColor = (type: string | null) => {
  switch (type) {
    case 'DIRECT_MESSAGE':
      return 'bg-teal-600';
    case 'QUESTION':
      return 'bg-blue-600';
    case 'ACTION':
      return 'bg-orange-600';
    case 'RIGHTS':
      return 'bg-purple-600';
    default:
      return 'bg-slate-600';
  }
};

const getDiscussionTypeLabel = (type: string | null) => {
  switch (type) {
    case 'DIRECT_MESSAGE':
      return 'Discussion';
    case 'QUESTION':
      return 'Question';
    case 'ACTION':
      return 'Action';
    case 'RIGHTS':
      return 'Demande de droits';
    default:
      return 'Discussion';
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function NotificationBell({ position = 'top' }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'discussions'>('all');

  // Récupérer toutes les notifications
  const fetchAllNotifications = async () => {
    try {
      const unified: UnifiedNotification[] = [];

      // 1. Récupérer les mentions
      const mentionsResponse = await authenticatedFetch('/api/v1/collaboration/mentions/unread');
      if (mentionsResponse.ok) {
        const mentionsData: UnreadMentionsResponse = await mentionsResponse.json();

        mentionsData.mentions.forEach(mention => {
          unified.push({
            id: `mention-${mention.id}`,
            type: 'mention',
            title: `${mention.author_first_name} ${mention.author_last_name}`,
            subtitle: `Q${mention.question_order}: ${mention.question_text}`,
            preview: mention.comment_content,
            authorInitials: `${mention.author_first_name?.charAt(0) || ''}${mention.author_last_name?.charAt(0) || ''}`,
            createdAt: mention.created_at,
            icon: <span className="text-xs">@</span>,
            color: 'bg-red-600',
            original: mention
          });
        });
      }

      // 2. Récupérer les notifications de discussions
      try {
        const discussionsResponse = await authenticatedFetch('/api/v1/discussions/notifications/unread');
        if (discussionsResponse.ok) {
          const discussionsData: UnreadDiscussionsResponse = await discussionsResponse.json();

          discussionsData.notifications.forEach(notif => {
            const authorParts = notif.author_name?.split(' ') || ['?', ''];
            unified.push({
              id: `discussion-${notif.id}`,
              type: 'discussion',
              title: notif.author_name || 'Système',
              subtitle: notif.conversation_title || getDiscussionTypeLabel(notif.conversation_type),
              preview: notif.message_preview || 'Nouveau message',
              authorInitials: `${authorParts[0]?.charAt(0) || ''}${authorParts[1]?.charAt(0) || ''}`,
              createdAt: notif.created_at,
              icon: getDiscussionIcon(notif.conversation_type),
              color: getDiscussionColor(notif.conversation_type),
              original: notif
            });
          });
        }
      } catch (e) {
        // Module discussions peut ne pas encore exister
        console.debug('Module discussions non disponible:', e);
      }

      // Trier par date (plus récent en premier)
      unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(unified);
      setUnreadCount(unified.length);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    }
  };

  // Marquer une notification comme lue
  const handleNotificationClick = async (notification: UnifiedNotification) => {
    setIsOpen(false);

    if (notification.type === 'mention') {
      const mention = notification.original as MentionNotification;

      // Marquer comme lue
      try {
        await authenticatedFetch(`/api/v1/collaboration/mentions/${mention.id}/read`, {
          method: 'PATCH',
        });
      } catch (e) {
        console.error('Erreur marquage mention:', e);
      }

      // Stocker l'ID du commentaire pour l'ouvrir automatiquement
      localStorage.setItem('openCommentId', mention.comment_id);

      // Navigation selon le type d'utilisateur
      if (mention.user_type === 'auditor') {
        router.push(`/audite/${mention.audit_id}/${mention.questionnaire_id}?question=${mention.question_id}`);
      } else {
        const campaignId = mention.campaign_id || mention.audit_id;
        router.push(`/audite/campaign/${campaignId}/${mention.questionnaire_id}?question=${mention.question_id}`);
      }
    } else if (notification.type === 'discussion') {
      const discussionNotif = notification.original as DiscussionNotification;

      // Marquer comme lue
      try {
        await authenticatedFetch(`/api/v1/discussions/notifications/${discussionNotif.id}/read`, {
          method: 'PATCH',
        });
      } catch (e) {
        console.error('Erreur marquage discussion:', e);
      }

      // Navigation vers la page discussions
      router.push(`/client/discussions?conversation=${discussionNotif.conversation_id}`);
    }

    // Retirer de la liste locale
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Filtrer les notifications selon l'onglet actif
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mentions') return n.type === 'mention';
    if (activeTab === 'discussions') return n.type === 'discussion';
    return true;
  });

  // Compter par type
  const mentionsCount = notifications.filter(n => n.type === 'mention').length;
  const discussionsCount = notifications.filter(n => n.type === 'discussion').length;

  // Charger au montage et toutes les 30 secondes
  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Cloche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge avec le compteur */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full border-2 border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau des notifications */}
      {isOpen && (
        <>
          {/* Overlay pour fermer au clic */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panneau */}
          <div className={`absolute w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] max-h-[600px] overflow-hidden flex flex-col ${
            position === 'bottom'
              ? 'top-12 left-0'
              : 'bottom-12 left-0'
          }`}>
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Toutes ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab('mentions')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'mentions'
                    ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Mentions ({mentionsCount})
              </button>
              <button
                onClick={() => setActiveTab('discussions')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'discussions'
                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Discussions ({discussionsCount})
              </button>
            </div>

            {/* Liste des notifications */}
            <div className="overflow-y-auto flex-1">
              {filteredNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 transition-colors text-left focus:outline-none ${
                        notification.type === 'mention'
                          ? 'hover:bg-red-50 focus:bg-red-50'
                          : 'hover:bg-teal-50 focus:bg-teal-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar avec initiales */}
                        <div className={`flex-shrink-0 w-10 h-10 ${notification.color} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                          {notification.type === 'mention' ? (
                            notification.authorInitials
                          ) : (
                            notification.icon
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Auteur et temps */}
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>

                          {/* Sous-titre (question ou type de discussion) */}
                          <p className="text-xs text-gray-600 mb-1 truncate">
                            {notification.subtitle}
                          </p>

                          {/* Aperçu du contenu */}
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {notification.preview}
                          </p>

                          {/* Badge type */}
                          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs ${
                            notification.type === 'mention'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-teal-100 text-teal-700'
                          }`}>
                            {notification.type === 'mention' ? '@mention' : 'Discussion'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/audite');
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Questions
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/client/discussions');
                  }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Discussions
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
