'use client';
import "@/app/styles/questionnaire-editor.css";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Plus, Edit3, Eye, Trash2, Settings,
  FileText, Target, Calendar, User, AlertCircle, CheckCircle2,
  Clock, Sparkles, RefreshCw, Send, Copy, MoreVertical, ChevronRight,
  ChevronDown, ChevronUp, GripVertical, X, Search, Folder, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import SuccessToast from '@/app/components/shared/SuccessToast';
import DeleteConfirmModal from '@/app/components/shared/DeleteConfirmModal';

// === Labels lisibles ===
const normalizeKey = (v: unknown) =>
  String(v ?? '').trim().replace(/[\s-]+/g, '_').toLowerCase();

// Mapper le statut du questionnaire vers le statut de la question
const mapQuestionnaireStatusToQuestionStatus = (
  questionnaireStatus?: 'draft' | 'published' | 'archived'
): 'draft' | 'validated' | 'rejected' | 'pending' => {
  switch (questionnaireStatus) {
    case 'published':
      return 'validated';
    case 'draft':
    case 'archived':
    default:
      return 'draft';
  }
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  yes_no: 'Oui/Non',
  boolean: 'Oui/Non',
  single_choice: 'Choix unique',
  select_one: 'Choix unique',
  radio: 'Choix unique',
  multiple_choice: 'Choix multiples',
  multi_choice: 'Choix multiples',
  select_many: 'Choix multiples',
  checkboxes: 'Choix multiples',
  text: 'Texte libre',
  textarea: 'Texte libre',
  free_text: 'Texte libre',
  number: 'Nombre',
  numeric: 'Nombre',
  integer: 'Nombre',
  date: 'Date',
  datetime: 'Date',
  file: 'Fichier',
  upload: 'Fichier',
  json: 'JSON',
};

function getQuestionTypeLabel(raw: unknown) {
  const key = normalizeKey(raw);
  return QUESTION_TYPE_LABELS[key] ?? String(raw ?? '');
}

const SOURCE_LABELS: Record<string, string> = {
  framework: 'Référentiel',
  control_points: 'Points de contrôle',
  manual: 'Manuel',
  MASTER: 'Original',
  ORG_VARIANT: 'Copie personnalisée',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
};

function labelFrom(dict: Record<string, string>, raw: unknown) {
  const key = normalizeKey(raw);
  return dict[key] ?? String(raw ?? '');
}

// Types
interface Questionnaire {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  source_type: 'framework' | 'control_points' | 'manual' | 'MASTER' | 'ORG_VARIANT';
  framework_id?: string;
  source_ref?: string;
  questions_count: number;
  ai_model?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  parent_questionnaire_id?: string;
  owner_org_id?: string;
}

interface Question {
  id: string;
  questionnaire_id: string;
  question_text: string;
  response_type: 'yes_no' | 'text' | 'textarea' | 'number' | 'date' | 'select_one' | 'select_many' | 'file';
  is_required: boolean;
  help_text?: string;
  estimated_time_minutes?: number;
  sort_order: number;
  ai_generated: boolean;
  ai_confidence?: number;
  options?: string[];
  validation_rules?: Record<string, unknown>;
  control_point_id?: string;
  requirement_id?: string;
  framework_id?: string;
  domain_id?: string;
  tags?: string[];
  chapter?: string;
  domain?: string;
  status?: 'draft' | 'validated' | 'rejected' | 'pending';
  requirement?: Requirement;
  control_point?: ControlPoint;
}

interface QuestionEditorState {
  editingId: string | null;
  draggedId: string | null;
  hasUnsavedChanges: boolean;
  showPreview: boolean;
}

interface Requirement {
  id: string;
  official_code: string;
  title: string;
  requirement_text: string;
  framework_id: string;
  section_id?: string;
}

interface ControlPoint {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface Domain {
  id: string;
  code: string;
  title: string;
  level: number;
  requirement_count: number;
  children?: Domain[];
  parent_id?: string;
}

interface DomainGroup {
  domain: Domain | null;
  questions: Question[];
}

export default function ClientQuestionnaireEditorPage({
  params
}: {
  params: { id: string } | Promise<{ id: string }>
}) {
  const router = useRouter();
  const newQuestionRef = useRef<HTMLDivElement>(null);

  // Support both sync and async params (Next.js 13/14/15 compatibility)
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Mode lecture seule pour les questionnaires MASTER (non-copies)
  const isReadOnly = questionnaire?.source_type !== 'ORG_VARIANT';

  const [editorState, setEditorState] = useState<QuestionEditorState>({
    editingId: null,
    draggedId: null,
    hasUnsavedChanges: false,
    showPreview: false
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    questionId: string | null;
    questionText: string;
  }>({
    isOpen: false,
    questionId: null,
    questionText: ''
  });

  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [questionsToDelete, setQuestionsToDelete] = useState<Set<string>>(new Set());
  const [deleteDomainModal, setDeleteDomainModal] = useState<{
    isOpen: boolean;
    domainName: string;
    questionIds: string[];
  }>({
    isOpen: false,
    domainName: '',
    questionIds: []
  });
  const [deleteSelectionModal, setDeleteSelectionModal] = useState<{
    isOpen: boolean;
    questionIds: string[];
  }>({
    isOpen: false,
    questionIds: []
  });

  // Resolve params (handles both sync and async)
  useEffect(() => {
    const resolveParams = async () => {
      if (params instanceof Promise) {
        const resolved = await params;
        setQuestionnaireId(resolved.id);
      } else {
        setQuestionnaireId(params.id);
      }
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (questionnaireId) {
      loadQuestionnaire();
    }
  }, [questionnaireId]);

  useEffect(() => {
    if (editorState.editingId && editorState.editingId.startsWith('temp-') && newQuestionRef.current) {
      const timer = setTimeout(() => {
        newQuestionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        const firstInput = newQuestionRef.current?.querySelector('textarea, input');
        if (firstInput instanceof HTMLElement) {
          firstInput.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [editorState.editingId]);

  const loadQuestionnaire = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Chargement questionnaire client...');

      // Utiliser l'endpoint client pour vérifier les droits d'accès
      const questionnaireResponse = await authenticatedFetch(`/api/v1/client/questionnaires/${questionnaireId}`);
      if (!questionnaireResponse.ok) {
        if (questionnaireResponse.status === 403) {
          throw new Error('Vous n\'avez pas accès à ce questionnaire');
        }
        throw new Error(`Questionnaire introuvable`);
      }
      const questionnaireData = await questionnaireResponse.json();
      console.log('📋 Questionnaire:', questionnaireData);

      // Les questions sont chargées via l'endpoint standard (lecture seule OK)
      const questionsResponse = await authenticatedFetch(`/api/v1/questionnaires/${questionnaireId}/questions`);
      if (!questionsResponse.ok) {
        throw new Error('Erreur chargement questions');
      }
      const questionsData = await questionsResponse.json();
      console.log(`📊 ${questionsData.length} questions chargées`);

      const enrichedQuestions = questionsData.map((q: unknown) => {
        const question = q as Record<string, unknown>;
        return {
          ...question,
          chapter: question.domain || 'Questions sans domaine'
        };
      });

      if (!questionnaireData.framework_id && enrichedQuestions.length > 0) {
        const firstWithFramework = enrichedQuestions.find((q: unknown) => (q as Record<string, unknown>).framework_id);
        if (firstWithFramework?.framework_id) {
          console.log('✅ Framework ID récupéré depuis question:', firstWithFramework.framework_id);
          questionnaireData.framework_id = firstWithFramework.framework_id;
        }
      }

      setQuestionnaire(questionnaireData);

      const uniqueChapters = new Set<string>(enrichedQuestions.map((q: Question) => q.chapter || 'Questions sans domaine'));
      setExpandedDomains(uniqueChapters);

      setQuestions(enrichedQuestions);

    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const groupQuestionsByDomain = (): DomainGroup[] => {
    const chapterMap = new Map<string, Question[]>();

    questions.forEach(q => {
      const chapter = q.chapter || 'Questions sans domaine';
      if (!chapterMap.has(chapter)) {
        chapterMap.set(chapter, []);
      }
      chapterMap.get(chapter)!.push(q);
    });

    const groups: DomainGroup[] = [];
    chapterMap.forEach((questions, chapterName) => {
      groups.push({
        domain: {
          id: chapterName,
          code: chapterName,
          title: chapterName,
          level: 0,
          requirement_count: questions.length
        } as Domain,
        questions: questions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      });
    });

    return groups.sort((a, b) => {
      if (!a.domain) return 1;
      if (!b.domain) return -1;
      return (a.domain.title || '').localeCompare(b.domain.title || '');
    });
  };

  const handleSaveQuestionnaire = async () => {
    if (!questionnaire || isReadOnly) return;

    setSaving(true);
    try {
      // 1. Sauvegarder les métadonnées du questionnaire via endpoint standard
      const response = await authenticatedFetch(`/api/v1/questionnaires/${questionnaireId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: questionnaire.name,
          status: questionnaire.status
        })
      });

      if (!response.ok) {
        throw new Error('Erreur de sauvegarde du questionnaire');
      }

      // 2. Supprimer les questions marquées pour suppression
      const deletePromises = Array.from(questionsToDelete).map(async (questionId) => {
        // Ne pas supprimer les questions temporaires (non encore créées)
        if (questionId.startsWith('temp-')) {
          return { success: true, id: questionId };
        }

        const deleteResponse = await authenticatedFetch(
          `/api/v1/questionnaires/${questionnaireId}/questions/${questionId}`,
          { method: 'DELETE' }
        );

        if (!deleteResponse.ok) {
          console.error(`❌ Erreur suppression question ${questionId}`);
          return { success: false, id: questionId };
        }

        return { success: true, id: questionId };
      });

      const deleteResults = await Promise.all(deletePromises);
      const failedDeletions = deleteResults.filter(r => !r.success);

      if (failedDeletions.length > 0) {
        toast.error(`${failedDeletions.length} questions n'ont pas pu être supprimées`);
      }

      // 3. Mettre à jour l'état local
      const deletedIds = new Set(deleteResults.filter(r => r.success).map(r => r.id));
      setQuestions(prev => prev.filter(q => !deletedIds.has(q.id)));
      setQuestionsToDelete(new Set());
      setSelectedQuestions(new Set());
      setEditorState(prev => ({ ...prev, hasUnsavedChanges: false }));

      const deletedCount = deletedIds.size;
      toast.custom(() => (
        <SuccessToast
          title="Questionnaire sauvegardé"
          message={deletedCount > 0
            ? `Modifications enregistrées. ${deletedCount} questions supprimées.`
            : "Les modifications ont été enregistrées avec succès"
          }
        />
      ));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionnaireId || isReadOnly) return;

    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      questionnaire_id: questionnaireId,
      question_text: '',
      response_type: 'text',
      is_required: false,
      sort_order: questions.length + 1,
      ai_generated: false,
      options: [],
      framework_id: questionnaire?.framework_id,
      requirement_id: undefined,
      control_point_id: undefined,
      chapter: 'Questions sans domaine',
      domain: 'Questions sans domaine',
      status: mapQuestionnaireStatusToQuestionStatus(questionnaire?.status)
    };

    setQuestions(prev => [...prev, newQuestion]);

    setExpandedDomains(prev => {
      const newSet = new Set(prev);
      newSet.add('Questions sans domaine');
      return newSet;
    });

    setEditorState(prev => ({
      ...prev,
      editingId: newQuestion.id,
      hasUnsavedChanges: true
    }));
  };

  const handleSaveQuestion = async (questionId: string, questionData: Partial<Question>) => {
    if (isReadOnly) return;

    setSaving(true);
    try {
      const isNew = questionId.startsWith('temp-');
      const endpoint = isNew
        ? `/api/v1/questionnaires/${questionnaireId}/questions`
        : `/api/v1/questionnaires/${questionnaireId}/questions/${questionId}`;

      const method = isNew ? 'POST' : 'PUT';

      const response = await authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      await loadQuestionnaire();

      setEditorState(prev => ({
        ...prev,
        editingId: null,
        hasUnsavedChanges: false
      }));

      toast.custom(() => (
        <SuccessToast
          title={isNew ? "Question ajoutée" : "Question modifiée"}
          message="La question a été enregistrée avec succès"
        />
      ));

    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (isReadOnly) return;

    const question = questions.find(q => q.id === questionId);
    setDeleteModal({
      isOpen: true,
      questionId,
      questionText: question?.question_text || 'Cette question'
    });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteModal.questionId || isReadOnly) return;

    try {
      const response = await authenticatedFetch(
        `/api/v1/questionnaires/${questionnaireId}/questions/${deleteModal.questionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      setQuestions(prev => prev.filter(q => q.id !== deleteModal.questionId));
      setDeleteModal({ isOpen: false, questionId: null, questionText: '' });

      toast.custom(() => (
        <SuccessToast
          title="Question supprimée"
          message={deleteModal.questionText}
        />
      ));

    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setDeleteModal({ isOpen: false, questionId: null, questionText: '' });
    }
  };

  const handleCancelEdit = () => {
    setQuestions(prev => prev.filter(q => !q.id.startsWith('temp-')));
    setEditorState(prev => ({
      ...prev,
      editingId: null,
      hasUnsavedChanges: false
    }));
  };

  const handleToggleQuestionSelection = (questionId: string) => {
    if (isReadOnly) return;

    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSelectAllInDomain = (questionIds: string[]) => {
    if (isReadOnly) return;

    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      const allSelected = questionIds.every(id => newSet.has(id));
      if (allSelected) {
        questionIds.forEach(id => newSet.delete(id));
      } else {
        questionIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleDeleteDomain = (domainName: string, questionIds: string[]) => {
    if (isReadOnly) return;

    setDeleteDomainModal({
      isOpen: true,
      domainName,
      questionIds
    });
  };

  const confirmDeleteDomain = async () => {
    if (isReadOnly) return;

    setQuestionsToDelete(prev => {
      const newSet = new Set(prev);
      deleteDomainModal.questionIds.forEach(id => newSet.add(id));
      return newSet;
    });
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      deleteDomainModal.questionIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    setEditorState(prev => ({ ...prev, hasUnsavedChanges: true }));
    setDeleteDomainModal({ isOpen: false, domainName: '', questionIds: [] });
    toast.custom(() => (
      <SuccessToast
        title="Questions marquées pour suppression"
        message={`${deleteDomainModal.questionIds.length} questions seront supprimées lors de la sauvegarde`}
      />
    ));
  };

  const handleDeleteSelection = () => {
    if (isReadOnly) return;

    const idsToDelete = Array.from(selectedQuestions);
    if (idsToDelete.length === 0) {
      toast.error('Aucune question sélectionnée');
      return;
    }
    setDeleteSelectionModal({
      isOpen: true,
      questionIds: idsToDelete
    });
  };

  const confirmDeleteSelection = async () => {
    if (isReadOnly) return;

    setQuestionsToDelete(prev => {
      const newSet = new Set(prev);
      deleteSelectionModal.questionIds.forEach(id => newSet.add(id));
      return newSet;
    });
    setSelectedQuestions(new Set());
    setEditorState(prev => ({ ...prev, hasUnsavedChanges: true }));
    setDeleteSelectionModal({ isOpen: false, questionIds: [] });
    toast.custom(() => (
      <SuccessToast
        title="Questions marquées pour suppression"
        message={`${deleteSelectionModal.questionIds.length} questions seront supprimées lors de la sauvegarde`}
      />
    ));
  };

  const handleRestoreQuestion = (questionId: string) => {
    if (isReadOnly) return;

    setQuestionsToDelete(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
    setEditorState(prev => ({ ...prev, hasUnsavedChanges: true }));
  };

  const toggleDomain = (domainId: string) => {
    setExpandedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domainId)) {
        newSet.delete(domainId);
      } else {
        newSet.add(domainId);
      }
      return newSet;
    });
  };

  const domainGroups = groupQuestionsByDomain();
  console.log('📁 Domain groups:', domainGroups.length, 'groupes', domainGroups.map(g => ({ domain: g.domain?.title, questions: g.questions.length })));

  if (loading) {
    return <LoadingState />;
  }

  if (error && !questionnaire) {
    return <ErrorState error={error} onRetry={loadQuestionnaire} />;
  }

  if (!questionnaire) {
    return <NotFoundState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 questionnaire-editor-namespace">
      {/* Header Sticky - Pattern GUIDE_HEADER_STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="questionnaire-editor-page" style={{ backgroundColor: 'transparent', color: '#1f2937' }}>
            <QuestionnaireTitleBar
              questionnaire={questionnaire}
              hasUnsavedChanges={editorState.hasUnsavedChanges}
              saving={saving}
              isReadOnly={isReadOnly}
              onUpdateName={(name) => {
                if (isReadOnly) return;
                setQuestionnaire(prev => prev ? { ...prev, name } : null);
                setEditorState(prev => ({ ...prev, hasUnsavedChanges: true }));
              }}
              onUpdateStatus={(status) => {
                if (isReadOnly) return;
                setQuestionnaire(prev => prev ? { ...prev, status } : null);
                setEditorState(prev => ({ ...prev, hasUnsavedChanges: true }));
              }}
              onSave={handleSaveQuestionnaire}
              onBack={() => router.push('/client/questionnaires')}
            />
          </div>
        </div>
      </header>

      {/* Bannière mode lecture seule */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-[1600px] mx-auto flex items-center gap-3 text-amber-800">
            <Lock size={20} />
            <div>
              <span className="font-medium">Mode lecture seule</span>
              <span className="mx-2">-</span>
              <span>Ce questionnaire est un original. Pour le modifier, vous devez d&apos;abord le dupliquer.</span>
            </div>
            <button
              onClick={() => router.push('/client/questionnaires')}
              className="ml-auto px-4 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
            >
              Retour pour dupliquer
            </button>
          </div>
        </div>
      )}

      {/* Contenu principal - flex-1 */}
      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 questionnaire-editor-page" style={{ color: '#1f2937' }}>

        <div className="editor-main-content" style={{ color: '#1f2937' }}>
          <EditorToolbar
            questionsCount={questions.length}
            hasUnsavedChanges={editorState.hasUnsavedChanges}
            showPreview={editorState.showPreview}
            selectedCount={selectedQuestions.size}
            deletedCount={questionsToDelete.size}
            isReadOnly={isReadOnly}
            onTogglePreview={() => setEditorState(prev => ({
              ...prev,
              showPreview: !prev.showPreview
            }))}
            onAddQuestion={handleAddQuestion}
            onDeleteSelection={handleDeleteSelection}
          />

          <div className="questions-by-domain">
            {domainGroups.map((group, groupIndex) => (
              <DomainQuestionGroup
                key={group.domain?.id || `group-${groupIndex}`}
                group={group}
                isExpanded={!group.domain || expandedDomains.has(group.domain.id)}
                onToggle={() => group.domain && toggleDomain(group.domain.id)}
                editingId={editorState.editingId}
                showPreview={editorState.showPreview}
                frameworkId={questionnaire.framework_id}
                newQuestionRef={newQuestionRef}
                selectedQuestions={selectedQuestions}
                questionsToDelete={questionsToDelete}
                isReadOnly={isReadOnly}
                onEdit={(id) => !isReadOnly && setEditorState(prev => ({ ...prev, editingId: id }))}
                onSave={handleSaveQuestion}
                onCancel={handleCancelEdit}
                onDelete={handleDeleteQuestion}
                onToggleSelection={handleToggleQuestionSelection}
                onSelectAllInDomain={handleSelectAllInDomain}
                onDeleteDomain={handleDeleteDomain}
                onRestoreQuestion={handleRestoreQuestion}
              />
            ))}
          </div>

          {questions.length === 0 && (
            <EmptyQuestionsState onAddFirst={handleAddQuestion} isReadOnly={isReadOnly} />
          )}
        </div>

        {error && (
          <ErrorNotification
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, questionId: null, questionText: '' })}
          onConfirm={confirmDeleteQuestion}
          title="Supprimer la question"
          subtitle="Action irréversible"
          warningMessage={`Êtes-vous sûr de vouloir supprimer : "${deleteModal.questionText}" ?`}
          elements={[
            { count: 1, label: 'Question', color: 'red' }
          ]}
        />

        <DeleteConfirmModal
          isOpen={deleteDomainModal.isOpen}
          onClose={() => setDeleteDomainModal({ isOpen: false, domainName: '', questionIds: [] })}
          onConfirm={confirmDeleteDomain}
          title="Supprimer le domaine"
          subtitle={`Domaine : ${deleteDomainModal.domainName}`}
          warningMessage={`Cette action marquera ${deleteDomainModal.questionIds.length} questions pour suppression. Elles seront définitivement supprimées lors de la sauvegarde.`}
          elements={[
            { count: deleteDomainModal.questionIds.length, label: 'Questions', color: 'red' }
          ]}
        />

        <DeleteConfirmModal
          isOpen={deleteSelectionModal.isOpen}
          onClose={() => setDeleteSelectionModal({ isOpen: false, questionIds: [] })}
          onConfirm={confirmDeleteSelection}
          title="Supprimer la sélection"
          subtitle="Suppression multiple"
          warningMessage={`Cette action marquera ${deleteSelectionModal.questionIds.length} questions pour suppression. Elles seront définitivement supprimées lors de la sauvegarde.`}
          elements={[
            { count: deleteSelectionModal.questionIds.length, label: 'Questions sélectionnées', color: 'red' }
          ]}
        />

        {editorState.hasUnsavedChanges && !editorState.editingId && !isReadOnly && (
          <FloatingActions
            hasUnsavedChanges={editorState.hasUnsavedChanges}
            saving={saving}
            onSave={handleSaveQuestionnaire}
            onPublish={() => {/* TODO */}}
          />
        )}
        </div>
      </main>
    </div>
  );
}

const DomainQuestionGroup = ({
  group,
  isExpanded,
  onToggle,
  editingId,
  showPreview,
  frameworkId,
  newQuestionRef,
  selectedQuestions,
  questionsToDelete,
  isReadOnly,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleSelection,
  onSelectAllInDomain,
  onDeleteDomain,
  onRestoreQuestion
}: {
  group: DomainGroup;
  isExpanded: boolean;
  onToggle: () => void;
  editingId: string | null;
  showPreview: boolean;
  frameworkId?: string;
  newQuestionRef: React.RefObject<HTMLDivElement | null>;
  selectedQuestions: Set<string>;
  questionsToDelete: Set<string>;
  isReadOnly: boolean;
  onEdit: (id: string) => void;
  onSave: (id: string, data: Partial<Question>) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onSelectAllInDomain: (ids: string[]) => void;
  onDeleteDomain: (domainName: string, questionIds: string[]) => void;
  onRestoreQuestion: (id: string) => void;
}) => {
  const questionIds = group.questions.map(q => q.id);
  const allSelected = questionIds.length > 0 && questionIds.every(id => selectedQuestions.has(id));
  const someSelected = questionIds.some(id => selectedQuestions.has(id));
  const activeQuestions = group.questions.filter(q => !questionsToDelete.has(q.id));
  const deletedCount = group.questions.length - activeQuestions.length;

  return (
    <div className={`domain-group ${deletedCount === group.questions.length ? 'domain-deleted' : ''}`}>
      <div className="domain-group-header">
        <div className="domain-header-left">
          {!isReadOnly && (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={() => onSelectAllInDomain(questionIds)}
              onClick={(e) => e.stopPropagation()}
              className="domain-checkbox"
              title="Sélectionner toutes les questions du domaine"
            />
          )}
          <div className="domain-info" onClick={onToggle}>
            <Folder size={20} className="domain-icon" />
            <h3>{group.domain?.title || 'Questions sans domaine'}</h3>
            <span className="question-count">
              {activeQuestions.length} questions
              {deletedCount > 0 && (
                <span className="deleted-count"> ({deletedCount} supprimées)</span>
              )}
            </span>
          </div>
        </div>
        <div className="domain-header-actions">
          {!isReadOnly && (
            <button
              className="delete-domain-button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteDomain(group.domain?.title || 'Questions sans domaine', questionIds);
              }}
              title="Supprimer toutes les questions du domaine"
            >
              <Trash2 size={16} />
              Supprimer le domaine
            </button>
          )}
          <button className="expand-toggle" onClick={onToggle}>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="domain-questions-list">
          {group.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isEditing={editingId === question.id}
              showPreview={showPreview}
              frameworkId={frameworkId}
              questionRef={question.id.startsWith('temp-') && editingId === question.id ? newQuestionRef : undefined}
              isSelected={selectedQuestions.has(question.id)}
              isMarkedForDeletion={questionsToDelete.has(question.id)}
              isReadOnly={isReadOnly}
              onEdit={() => onEdit(question.id)}
              onSave={(data) => onSave(question.id, data)}
              onCancel={onCancel}
              onDelete={() => onDelete(question.id)}
              onToggleSelection={() => onToggleSelection(question.id)}
              onRestore={() => onRestoreQuestion(question.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const QuestionnaireTitleBar = ({
  questionnaire,
  hasUnsavedChanges,
  saving,
  isReadOnly,
  onUpdateName,
  onUpdateStatus,
  onSave,
  onBack
}: {
  questionnaire: Questionnaire;
  hasUnsavedChanges: boolean;
  saving: boolean;
  isReadOnly: boolean;
  onUpdateName: (name: string) => void;
  onUpdateStatus: (status: Questionnaire['status']) => void;
  onSave: () => void;
  onBack: () => void;
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(questionnaire.name);

  const handleNameSave = () => {
    onUpdateName(tempName);
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(questionnaire.name);
    setIsEditingName(false);
  };

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={20} />
          <span>Retour</span>
        </button>
        <div className="title-section">
          {!isReadOnly && isEditingName ? (
            <div className="name-editor">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') handleNameCancel();
                }}
                className="name-input"
                autoFocus
              />
            </div>
          ) : (
            <div
              className={`name-display ${!isReadOnly ? 'cursor-pointer' : ''}`}
              onClick={() => !isReadOnly && setIsEditingName(true)}
            >
              <h1>{questionnaire.name}</h1>
              {!isReadOnly && <Edit3 size={16} className="edit-icon" />}
              {isReadOnly && <Lock size={16} className="text-amber-600 ml-2" />}
            </div>
          )}

          <div className="questionnaire-badges">
            {/* Badge source type */}
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              questionnaire.source_type === 'ORG_VARIANT'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {questionnaire.source_type === 'ORG_VARIANT' ? 'Copie personnalisée' : 'Original'}
            </span>

            {!isReadOnly ? (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Statut</span>
                <select
                  value={questionnaire.status}
                  onChange={(e) => onUpdateStatus(e.target.value as Questionnaire['status'])}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: 9999,
                    padding: '4px 10px',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </label>
            ) : (
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                questionnaire.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {questionnaire.status === 'published' ? 'Publié' : questionnaire.status === 'draft' ? 'Brouillon' : 'Archivé'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="title-bar-actions">
        {!isReadOnly && (
          <button
            onClick={onSave}
            disabled={saving || !hasUnsavedChanges}
            className="save-button"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        )}
      </div>
    </div>
  );
};

const EditorToolbar = ({
  questionsCount,
  hasUnsavedChanges,
  showPreview,
  selectedCount,
  deletedCount,
  isReadOnly,
  onTogglePreview,
  onAddQuestion,
  onDeleteSelection
}: {
  questionsCount: number;
  hasUnsavedChanges: boolean;
  showPreview: boolean;
  selectedCount?: number;
  deletedCount?: number;
  isReadOnly: boolean;
  onTogglePreview: () => void;
  onAddQuestion: () => void;
  onDeleteSelection?: () => void;
}) => (
  <div className="editor-toolbar">
    <div className="toolbar-left">
      <h2>Questions ({questionsCount})</h2>
      {hasUnsavedChanges && !isReadOnly && (
        <span className="changes-indicator">
          <AlertCircle size={14} />
          Modifications non sauvegardées
        </span>
      )}
      {deletedCount && deletedCount > 0 && !isReadOnly && (
        <span className="deletion-indicator">
          <Trash2 size={14} />
          {deletedCount} à supprimer
        </span>
      )}
    </div>

    <div className="toolbar-actions">
      {!isReadOnly && selectedCount && selectedCount > 0 && onDeleteSelection && (
        <button onClick={onDeleteSelection} className="delete-selection-button">
          <Trash2 size={16} />
          Supprimer la sélection ({selectedCount})
        </button>
      )}

      <button
        onClick={onTogglePreview}
        className={`preview-toggle ${showPreview ? 'active' : ''}`}
      >
        <Eye size={16} />
        {showPreview ? 'Masquer aperçu' : 'Aperçu'}
      </button>

      {/* Pas de bouton "Régénérer via IA" côté client */}

      {!isReadOnly && (
        <button onClick={onAddQuestion} className="add-question-button">
          <Plus size={16} />
          Ajouter une question
        </button>
      )}
    </div>
  </div>
);

const QuestionCard = ({
  question,
  index,
  isEditing,
  showPreview,
  frameworkId,
  questionRef,
  isSelected,
  isMarkedForDeletion,
  isReadOnly,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleSelection,
  onRestore
}: {
  question: Question;
  index: number;
  isEditing: boolean;
  showPreview: boolean;
  frameworkId?: string;
  questionRef?: React.RefObject<HTMLDivElement | null>;
  isSelected?: boolean;
  isMarkedForDeletion?: boolean;
  isReadOnly: boolean;
  onEdit: () => void;
  onSave: (data: Partial<Question>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggleSelection?: () => void;
  onRestore?: () => void;
}) => {
  if (isEditing && !isReadOnly) {
    return (
      <div ref={questionRef}>
        <QuestionEditor
          question={question}
          frameworkId={frameworkId}
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <div className={`question-card ${isSelected ? 'selected' : ''} ${isMarkedForDeletion ? 'marked-for-deletion' : ''}`}>
      <div className="question-header">
        <div className="question-header-left">
          {!isReadOnly && onToggleSelection && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={onToggleSelection}
              className="question-checkbox"
              disabled={isMarkedForDeletion}
            />
          )}
          <div className="question-number">Q{index + 1}</div>
        </div>
        <div className="question-meta">
          <ResponseTypeBadge type={question.response_type} />
          {question.is_required && (
            <span className="required-badge">Obligatoire</span>
          )}
          {question.estimated_time_minutes && (
            <span className="time-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#f3e8ff',
              color: '#7c3aed'
            }}>
              <Clock size={12} />
              {question.estimated_time_minutes} min
            </span>
          )}
          {question.ai_generated && (
            <span className="ai-badge">
              <Sparkles size={12} />
              IA
            </span>
          )}
          {question.status && (
            <span className={`status-badge status-${question.status}`}>
              {question.status === 'draft' && 'Brouillon'}
              {question.status === 'validated' && 'Validée'}
              {question.status === 'rejected' && 'Rejetée'}
              {question.status === 'pending' && 'En attente'}
            </span>
          )}
          {isMarkedForDeletion && (
            <span className="deletion-badge">
              <Trash2 size={12} />
              Suppression en attente
            </span>
          )}
        </div>
        <div className="question-actions">
          {isMarkedForDeletion && !isReadOnly ? (
            <button onClick={onRestore} className="restore-action" title="Restaurer la question">
              <RefreshCw size={16} />
            </button>
          ) : !isReadOnly ? (
            <>
              <button onClick={onEdit} className="edit-action">
                <Edit3 size={16} />
              </button>
              <button onClick={onDelete} className="delete-action">
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <button onClick={onEdit} className="edit-action" title="Voir les détails">
              <Eye size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="question-content">
        <h3>{question.question_text || 'Question sans titre'}</h3>
        {question.help_text && (
          <p className="help-text">{question.help_text}</p>
        )}

        {question.options && question.options.length > 0 && (
          <div className="options-preview">
            <span className="options-label">Options :</span>
            <ul>
              {question.options.slice(0, 3).map((option, i) => (
                <li key={i}>{option}</li>
              ))}
              {question.options.length > 3 && (
                <li className="more-options">... et {question.options.length - 3} autres</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {showPreview && (
        <div className="question-preview">
          <QuestionRenderer question={question} />
        </div>
      )}
    </div>
  );
};

const QuestionEditor = ({
  question,
  frameworkId,
  onSave,
  onCancel
}: {
  question: Question;
  frameworkId?: string;
  onSave: (data: Partial<Question>) => void;
  onCancel: () => void;
}) => {
  const [editData, setEditData] = useState<Question>({ ...question });
  const [frameworks, setFrameworks] = useState<Array<{id: string; code: string; name: string}>>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>(question.framework_id || frameworkId || '');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>(question.domain_id || '');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loadingFrameworks, setLoadingFrameworks] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

  // Synchroniser editData avec question quand elle change
  useEffect(() => {
    setEditData({ ...question });
    setSelectedFrameworkId(question.framework_id || frameworkId || '');
    setSelectedDomainId(question.domain_id || '');
  }, [question.id, question, frameworkId]);

  // Initialiser les données au chargement si la question existe déjà
  useEffect(() => {
    loadFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFrameworkId) {
      loadDomains();
    } else {
      setDomains([]);
      setRequirements([]);
    }
  }, [selectedFrameworkId]);

  useEffect(() => {
    if (selectedDomainId && selectedFrameworkId) {
      loadRequirements();
    } else {
      setRequirements([]);
    }
  }, [selectedDomainId, selectedFrameworkId]);

  const flattenDomains = (domainsList: Domain[]): Domain[] => {
    let result: Domain[] = [];
    domainsList.forEach(domain => {
      result.push(domain);
      if (domain.children && domain.children.length > 0) {
        result = result.concat(flattenDomains(domain.children));
      }
    });
    return result;
  };

  const loadFrameworks = async () => {
    setLoadingFrameworks(true);
    try {
      const response = await authenticatedFetch(`/api/v1/frameworks?limit=100`);
      if (response.ok) {
        const data = await response.json();
        const frameworksList = Array.isArray(data) ? data : (data.frameworks || []);
        setFrameworks(frameworksList);

        if (frameworkId && !selectedFrameworkId) {
          setSelectedFrameworkId(frameworkId);
        }
      }
    } catch (err) {
      console.error('❌ Erreur chargement frameworks:', err);
    } finally {
      setLoadingFrameworks(false);
    }
  };

  const loadDomains = async () => {
    setLoadingDomains(true);
    try {
      const response = await authenticatedFetch(`/api/v1/frameworks/${selectedFrameworkId}/domains`);
      if (response.ok) {
        const data = await response.json();
        const flattenedDomains = flattenDomains(Array.isArray(data) ? data : []);
        setDomains(flattenedDomains);
      }
    } catch (err) {
      console.error('❌ Erreur chargement domaines:', err);
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadRequirements = async () => {
    setLoadingRequirements(true);
    try {
      const response = await authenticatedFetch(
        `/api/v1/frameworks/${selectedFrameworkId}/requirements?section_id=${selectedDomainId}`
      );
      if (response.ok) {
        const data = await response.json();
        setRequirements(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('❌ Erreur chargement exigences:', err);
    } finally {
      setLoadingRequirements(false);
    }
  };

  const handleFieldChange = (field: keyof Question, value: unknown) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleRequirementChange = async (requirementId: string) => {
    handleFieldChange('requirement_id', requirementId);

    try {
      const response = await authenticatedFetch(`/api/v1/requirements/${requirementId}/control-points`);
      if (response.ok) {
        const controlPoints = await response.json();
        if (Array.isArray(controlPoints) && controlPoints.length > 0) {
          handleFieldChange('control_point_id', controlPoints[0].id);
          console.log('✅ PC automatiquement associé:', controlPoints[0].code);
        }
      }
    } catch (err) {
      console.error('❌ Erreur chargement PC:', err);
    }

    const selectedDomain = domains.find(d => d.id === selectedDomainId);
    if (selectedDomain) {
      handleFieldChange('chapter', selectedDomain.title);
      handleFieldChange('domain', selectedDomain.title);
    }
  };

  const handleSave = () => {
    if (!editData.question_text.trim()) {
      toast.error('Le texte de la question est obligatoire');
      return;
    }
    if (!selectedFrameworkId) {
      toast.error('Veuillez sélectionner un référentiel');
      return;
    }
    if (!selectedDomainId) {
      toast.error('Veuillez sélectionner un domaine');
      return;
    }
    if (!editData.requirement_id) {
      toast.error('Veuillez sélectionner une exigence');
      return;
    }

    onSave({
      ...editData,
      framework_id: selectedFrameworkId
    });
  };

  const isFormValid =
    editData.question_text.trim().length > 0 &&
    selectedFrameworkId.length > 0 &&
    selectedDomainId.length > 0 &&
    editData.requirement_id !== undefined;

  return (
    <div className="question-editor">
      <div className="editor-header">
        <h3>
          {question.id.startsWith('temp-') ? 'Nouvelle question' : 'Modifier la question'}
        </h3>
      </div>

      <div className="editor-form">
        <div className="form-section">
          <h4 className="section-title">
            <Target size={16} />
            Lien avec le référentiel <span className="required-star">*</span>
          </h4>

          <div className="form-group">
            <label>Référentiel <span className="required-star">*</span></label>
            {loadingFrameworks ? (
              <div className="loading-state">Chargement des référentiels...</div>
            ) : (
              <select
                value={selectedFrameworkId}
                onChange={(e) => {
                  setSelectedFrameworkId(e.target.value);
                  setSelectedDomainId('');
                  handleFieldChange('requirement_id', undefined);
                }}
                className="select-input"
              >
                <option value="">-- Sélectionner un référentiel --</option>
                {frameworks.map(fw => (
                  <option key={fw.id} value={fw.id}>
                    {fw.code} - {fw.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedFrameworkId && (
            <div className="form-group">
              <label>Domaine / Chapitre <span className="required-star">*</span></label>
              {loadingDomains ? (
                <div className="loading-state">Chargement...</div>
              ) : (
                <select
                  value={selectedDomainId}
                  onChange={(e) => {
                    setSelectedDomainId(e.target.value);
                    handleFieldChange('requirement_id', undefined);
                  }}
                  className="select-input"
                >
                  <option value="">-- Sélectionner un domaine --</option>
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {selectedDomainId && (
            <div className="form-group">
              <label>Exigence <span className="required-star">*</span></label>
              {loadingRequirements ? (
                <div className="loading-state">Chargement...</div>
              ) : requirements.length === 0 ? (
                <div className="empty-state">Aucune exigence dans ce domaine</div>
              ) : (
                <div className="requirements-list">
                  {requirements.map(req => (
                    <label key={req.id} className="radio-label">
                      <input
                        type="radio"
                        name="requirement"
                        checked={editData.requirement_id === req.id}
                        onChange={() => handleRequirementChange(req.id)}
                      />
                      <span>{req.official_code} - {req.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Question <span className="required-star">*</span></label>
          <textarea
            value={editData.question_text}
            onChange={(e) => handleFieldChange('question_text', e.target.value)}
            placeholder="Saisissez votre question..."
            rows={3}
            className="question-input"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Type de réponse</label>
            <select
              value={editData.response_type}
              onChange={(e) => handleFieldChange('response_type', e.target.value)}
              className="select-input"
            >
              <option value="yes_no">Oui/Non</option>
              <option value="text">Texte court</option>
              <option value="textarea">Texte long</option>
              <option value="number">Nombre</option>
              <option value="date">Date</option>
              <option value="select_one">Choix unique</option>
              <option value="select_many">Choix multiples</option>
              <option value="file">Fichier</option>
            </select>
          </div>

          <div className="form-group">
            <label>Statut</label>
            <select
              value={editData.status || 'draft'}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              className="select-input"
            >
              <option value="draft">Brouillon</option>
              <option value="validated">Validée</option>
              <option value="pending">En attente</option>
              <option value="rejected">Rejetée</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editData.is_required}
                onChange={(e) => handleFieldChange('is_required', e.target.checked)}
              />
              <span>Question obligatoire</span>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Texte d&apos;aide (optionnel)</label>
            <textarea
              value={editData.help_text || ''}
              onChange={(e) => handleFieldChange('help_text', e.target.value)}
              placeholder="Texte d'aide pour guider la réponse..."
              rows={2}
              className="help-input"
            />
          </div>

          <div className="form-group">
            <label>
              <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Charge estimée (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={editData.estimated_time_minutes || ''}
              onChange={(e) => handleFieldChange('estimated_time_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Ex: 5"
              className="select-input"
            />
          </div>
        </div>

        {(editData.response_type === 'select_one' || editData.response_type === 'select_many') && (
          <div className="form-group">
            <label>Options de réponse</label>
            <OptionsEditor
              options={editData.options || []}
              onChange={(options) => handleFieldChange('options', options)}
            />
          </div>
        )}
      </div>

      <div className="editor-actions">
        <button onClick={onCancel} className="cancel-button">
          <X size={16} />
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="save-button"
          disabled={!isFormValid}
        >
          <CheckCircle2 size={16} />
          Enregistrer
        </button>
      </div>
    </div>
  );
};

const OptionsEditor = ({
  options,
  onChange
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) => {
  const [newOption, setNewOption] = useState('');

  const handleAddOption = () => {
    if (newOption.trim()) {
      onChange([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="options-editor">
      <div className="options-list">
        {options.map((option, index) => (
          <div key={index} className="option-item">
            <span>{option}</span>
            <button
              onClick={() => handleRemoveOption(index)}
              className="remove-option"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="add-option">
        <input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddOption();
            }
          }}
          placeholder="Ajouter une option..."
          className="option-input"
        />
        <button onClick={handleAddOption} className="add-button">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

const ResponseTypeBadge = ({ type }: { type: string }) => {
  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'yes_no': 'blue',
      'text': 'gray',
      'textarea': 'gray',
      'number': 'purple',
      'date': 'orange',
      'select_one': 'green',
      'select_many': 'green',
      'file': 'red'
    };
    return colorMap[type] || 'gray';
  };

  return (
    <span className={`response-type-badge ${getTypeColor(type)}`}>
      {getQuestionTypeLabel(type)}
    </span>
  );
};

const QuestionRenderer = ({ question }: { question: Question }) => {
  const renderInput = () => {
    switch (question.response_type) {
      case 'yes_no':
        return (
          <div className="radio-group">
            <label><input type="radio" name={`q-${question.id}`} /> Oui</label>
            <label><input type="radio" name={`q-${question.id}`} /> Non</label>
          </div>
        );

      case 'textarea':
        return <textarea placeholder="Votre réponse..." rows={4} />;

      case 'number':
        return <input type="number" placeholder="Entrez un nombre" />;

      case 'date':
        return <input type="date" />;

      case 'select_one':
        return (
          <div className="radio-group">
            {question.options?.map((opt, i) => (
              <label key={i}>
                <input type="radio" name={`q-${question.id}`} /> {opt}
              </label>
            ))}
          </div>
        );

      case 'select_many':
        return (
          <div className="checkbox-group">
            {question.options?.map((opt, i) => (
              <label key={i}>
                <input type="checkbox" /> {opt}
              </label>
            ))}
          </div>
        );

      case 'file':
        return (
          <div className="file-upload">
            <input type="file" />
          </div>
        );

      default:
        return <input type="text" placeholder="Votre réponse..." />;
    }
  };

  return (
    <div className="question-renderer">
      <div className="question-label">
        {question.question_text}
        {question.is_required && <span className="required-star">*</span>}
      </div>
      {question.help_text && (
        <div className="question-help">{question.help_text}</div>
      )}
      <div className="question-input">
        {renderInput()}
      </div>
    </div>
  );
};

const FloatingActions = ({
  hasUnsavedChanges,
  saving,
  onSave,
  onPublish
}: {
  hasUnsavedChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onPublish: () => void;
}) => {
  if (!hasUnsavedChanges) return null;

  return (
    <div className="floating-actions">
      <div className="floating-content">
        <div className="floating-message">
          <AlertCircle size={16} />
          <span>Modifications non sauvegardées</span>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="floating-save-button"
        >
          {saving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="loading-state-full">
    <RefreshCw size={32} className="animate-spin" />
    <p>Chargement du questionnaire...</p>
  </div>
);

const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="error-state-full">
    <AlertCircle size={48} className="error-icon" />
    <h2>Erreur de chargement</h2>
    <p>{error}</p>
    <button onClick={onRetry} className="retry-button">
      <RefreshCw size={16} />
      Réessayer
    </button>
  </div>
);

const NotFoundState = () => (
  <div className="not-found-state">
    <FileText size={48} />
    <h2>Questionnaire introuvable</h2>
    <p>Ce questionnaire n&apos;existe pas ou a été supprimé.</p>
    <Link href="/client/questionnaires" className="back-link">
      Retour aux questionnaires
    </Link>
  </div>
);

const EmptyQuestionsState = ({ onAddFirst, isReadOnly }: { onAddFirst: () => void; isReadOnly: boolean }) => (
  <div className="empty-questions-state">
    <FileText size={64} className="empty-icon" />
    <h3>Aucune question pour le moment</h3>
    {!isReadOnly ? (
      <>
        <p>Commencez par ajouter votre première question</p>
        <button onClick={onAddFirst} className="add-first-button">
          <Plus size={20} />
          Ajouter la première question
        </button>
      </>
    ) : (
      <p>Ce questionnaire ne contient pas encore de questions.</p>
    )}
  </div>
);

const ErrorNotification = ({
  message,
  onDismiss
}: {
  message: string;
  onDismiss: () => void;
}) => (
  <div className="error-notification">
    <div className="error-content">
      <AlertCircle size={20} />
      <span>{message}</span>
    </div>
    <button onClick={onDismiss} className="dismiss-button">
      <X size={16} />
    </button>
  </div>
);
