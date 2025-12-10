'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, AtSign, X } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Collaborator {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface Mention {
  id: string;
  mentioned_user_id: string;
  is_read: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface Comment {
  id: string;
  question_id: string;
  audit_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_first_name?: string;
  author_last_name?: string;
  author_email?: string;
  mentions: Mention[];
}

interface QuestionCommentsProps {
  questionId: string;
  auditId: string;
}

export function QuestionComments({ questionId, auditId }: QuestionCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Ouvrir automatiquement les commentaires si une notification a été cliquée
  useEffect(() => {
    const openCommentId = localStorage.getItem('openCommentId');

    if (openCommentId) {
      // Ouvrir les commentaires
      setShowComments(true);

      // Attendre que les commentaires soient chargés puis scroller
      setTimeout(() => {
        const commentElement = commentRefs.current[openCommentId];
        if (commentElement) {
          commentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          // Ajouter un effet de surbrillance temporaire (rose comme dans le menu)
          commentElement.classList.add('ring-2', 'ring-pink-500', 'bg-pink-50');
          setTimeout(() => {
            commentElement.classList.remove('ring-2', 'ring-pink-500', 'bg-pink-50');
          }, 3000);
        }
        // Nettoyer le localStorage après avoir scrollé
        localStorage.removeItem('openCommentId');
      }, 500);
    }
  }, [comments]);

  // Charger les commentaires
  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, questionId, auditId]);

  // Charger les contributeurs pour l'autocomplete
  useEffect(() => {
    if (showComments) {
      loadCollaborators();
    }
  }, [showComments, auditId]);

  const loadComments = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/v1/collaboration/questions/${questionId}/comments?audit_id=${auditId}`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des commentaires:', error);
    }
  };

  const loadCollaborators = async () => {
    try {
      console.log('🔍 [FRONTEND] Chargement des collaborateurs pour audit:', auditId, 'question:', questionId);
      const response = await authenticatedFetch(`/api/v1/collaboration/audits/${auditId}/collaborators?question_id=${questionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [FRONTEND] Collaborateurs reçus:', data);
        console.log('📊 [FRONTEND] Nombre de collaborateurs:', data.length);
        data.forEach((collab: Collaborator) => {
          console.log(`  → ${collab.first_name} ${collab.last_name} (${collab.email}) - Role: ${collab.role}`);
        });
        setCollaborators(data);
      } else {
        console.error('❌ [FRONTEND] Erreur HTTP:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Erreur lors du chargement des contributeurs:', error);
    }
  };

  // Détection de @ pour afficher l'autocomplete
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setNewComment(text);

    // Chercher le dernier @ avant le curseur
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // Vérifier qu'il n'y a pas d'espace après le @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setShowMentionSuggestions(true);
        setSelectedSuggestionIndex(0);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Filtrer les suggestions basées sur la recherche
  const filteredSuggestions = collaborators.filter((collab) => {
    const search = mentionSearch.toLowerCase();
    const fullName = `${collab.first_name} ${collab.last_name}`.toLowerCase();
    const mentionFormat = `${collab.first_name.toLowerCase()}.${collab.last_name.toLowerCase()}`;
    return fullName.includes(search) || mentionFormat.includes(search) || collab.email.toLowerCase().includes(search);
  });

  // Insérer une mention
  const insertMention = (collaborator: Collaborator) => {
    if (mentionStartIndex === -1) return;

    const mentionText = `@${collaborator.first_name}.${collaborator.last_name}`;
    const before = newComment.substring(0, mentionStartIndex);
    const after = newComment.substring(textareaRef.current?.selectionStart || newComment.length);

    setNewComment(before + mentionText + ' ' + after);
    setShowMentionSuggestions(false);
    setMentionStartIndex(-1);

    // Remettre le focus sur le textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPosition = before.length + mentionText.length + 1;
      textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  // Gérer les touches clavier pour l'autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault();
      insertMention(filteredSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentionSuggestions(false);
    }
  };

  // Envoyer le commentaire
  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/v1/collaboration/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          audit_id: auditId,
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment('');
        toast.success('Commentaire ajouté');
      } else {
        toast.error('Erreur lors de l\'ajout du commentaire');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setLoading(false);
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Mettre en évidence les @mentions dans le texte
  const highlightMentions = (text: string) => {
    const mentionRegex = /@([\w\.\-]+(?:@[\w\.\-]+)?)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // C'est une mention
        return (
          <span key={index} className="bg-blue-100 text-blue-700 px-1 rounded">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="mt-4">
      {/* Bouton pour afficher/masquer les commentaires */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>
          {showComments ? 'Masquer' : 'Afficher'} les commentaires
          {comments.length > 0 && ` (${comments.length})`}
        </span>
      </button>

      {/* Zone de commentaires */}
      {showComments && (
        <div className="mt-4 space-y-4">
          {/* Liste des commentaires */}
          {comments.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  ref={(el) => {
                    commentRefs.current[comment.id] = el;
                  }}
                  className="bg-gray-50 rounded-lg p-3 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {comment.author_first_name?.[0]}{comment.author_last_name?.[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {comment.author_first_name} {comment.author_last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {highlightMentions(comment.content)}
                  </div>
                  {comment.mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {comment.mentions.map((mention) => (
                        <span
                          key={mention.id}
                          className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full"
                        >
                          <AtSign className="w-3 h-3 inline mr-1" />
                          {mention.first_name} {mention.last_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Nouveau commentaire */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Ajouter un commentaire... (utilisez @ pour mentionner un contributeur)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />

            {/* Autocomplete des mentions */}
            {showMentionSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                {filteredSuggestions.map((collab, index) => (
                  <button
                    key={collab.id}
                    onClick={() => insertMention(collab)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                      index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {collab.first_name[0]}{collab.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {collab.first_name} {collab.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{collab.first_name.toLowerCase()}.{collab.last_name.toLowerCase()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                <AtSign className="w-3 h-3 inline mr-1" />
                Tapez @ pour mentionner une personne
              </div>
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
