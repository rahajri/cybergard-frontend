'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// Hooks
import { useQuestionnaireData, useAudit, useAuditNavigation } from '@/app/(audite)/audite/hooks';

// Components
import SidebarAudite from '@/app/(audite)/sidebar.audite';
import { QuestionList } from '@/app/(audite)/audite/components/QuestionList';
import { ProgressBar } from '@/app/(audite)/audite/components/ProgressBar';
import { Button } from '@/components/ui/button';

function QuestionnairePreviewContent() {
  const params = useParams();
  const router = useRouter();
  const questionnaireId = params.id as string;
  const previewAuditId = 'preview-mode'; // Identifiant spécial pour le mode preview

  const isPreviewMode = true; // Mode preview (pas de sauvegarde)

  // Hook principal : chargement des données
  const {
    questionnaire,
    selectedNodeId,
    setSelectedNodeId,
    loading,
    refetch,
  } = useQuestionnaireData(previewAuditId, questionnaireId, false, true); // usePreviewEndpoint = true

  // Hook : gestion des actions (désactivé en mode preview)
  const { saving, submitting, handleSaveAnswer, handleSaveAll, handleSubmit } = useAudit(
    questionnaire,
    true, // isTestMode pour désactiver les sauvegardes
    refetch
  );

  // Hook : navigation entre domaines
  const { handleNextNode } = useAuditNavigation(questionnaire, selectedNodeId, setSelectedNodeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Questionnaire non trouvé
          </h2>
          <p className="text-gray-600">
            Le questionnaire demandé n'existe pas ou vous n'y avez pas accès.
          </p>
          <Button
            onClick={() => router.push('/admin/questionnaires')}
            className="mt-4"
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    );
  }

  // Extraire le domaine parent et l'ID de question
  let activeDomainId: string | null = null;
  let activeQuestionId: string | null = null;

  if (selectedNodeId) {
    // Si c'est un ID de question (format: domainId_q_questionId)
    if (selectedNodeId.includes('_q_')) {
      const parts = selectedNodeId.split('_q_');
      activeDomainId = parts[0];
      activeQuestionId = parts[1];
    } else {
      // Sinon c'est directement un domaine
      activeDomainId = selectedNodeId;
    }
  }

  const currentQuestions = activeDomainId && questionnaire
    ? questionnaire.questions_by_node[activeDomainId] || []
    : [];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Arbre des domaines */}
      <aside className="bg-slate-900 text-white border-r border-slate-800 flex-shrink-0 relative z-30">
        <SidebarAudite
          domainTree={questionnaire.domain_tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          questionnaireName={questionnaire.name}
        />
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Bandeau Mode Preview Admin */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👁️</span>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Mode Prévisualisation Admin
                </p>
                <p className="text-xs text-blue-700">
                  Cette vue permet de prévisualiser le questionnaire tel qu'il sera affiché aux audités. Les modifications ne seront pas sauvegardées.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/questionnaires')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la liste
            </Button>
          </div>
        </div>

        {/* Header avec progression */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {questionnaire.name}
          </h1>
          <ProgressBar
            total={questionnaire.total_questions}
            answered={questionnaire.answered_questions}
            percentage={questionnaire.progress_percentage}
          />
        </div>

        {/* Liste des questions */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <QuestionList
            questions={currentQuestions}
            auditId={previewAuditId}
            onSaveAnswer={handleSaveAnswer}
            onNext={handleNextNode}
            isLastNode={
              selectedNodeId ===
              questionnaire.domain_tree[questionnaire.domain_tree.length - 1]?.id
            }
            highlightedQuestionId={activeQuestionId}
            isPreviewMode={true}
          />
        </div>

        {/* Footer avec indication preview */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mode prévisualisation - Les réponses ne seront pas sauvegardées
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (window.opener) {
                    window.close();
                  } else {
                    router.push(`/admin/questionnaires/${questionnaireId}`);
                  }
                }}
              >
                Modifier le questionnaire
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (window.opener) {
                    window.close();
                  } else {
                    router.push('/admin/questionnaires');
                  }
                }}
              >
                Fermer la prévisualisation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuestionnairePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la prévisualisation...</p>
        </div>
      </div>
    }>
      <QuestionnairePreviewContent />
    </Suspense>
  );
}
