'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';

// Hooks
import { useQuestionnaireData, useAudit, useAuditNavigation } from '../../hooks';

// Components
import SidebarAudite from '../../../sidebar.audite';
import { QuestionList } from '../../components/QuestionList';
import { ProgressBar } from '../../components/ProgressBar';
import { ActionButtons } from '../../components/ActionButtons';

function AuditeTestContent() {
  const params = useParams();
  const auditId = 'test-audit-id'; // Force test mode
  const questionnaireId = params.questionnaireId as string;

  const isTestMode = true; // Always test mode

  // Hook principal : chargement des données
  const {
    questionnaire,
    selectedNodeId,
    setSelectedNodeId,
    loading,
    refetch,
  } = useQuestionnaireData(auditId, questionnaireId, isTestMode);

  // Hook : gestion des actions (save, submit)
  const { saving, submitting, handleSaveAnswer, handleSaveAll, handleSubmit } = useAudit(
    questionnaire,
    isTestMode,
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
        {/* Bandeau Mode Test */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <div>
              <p className="text-sm font-medium text-amber-900">
                Mode Test - Les réponses ne seront pas sauvegardées
              </p>
              <p className="text-xs text-amber-700">
                Cette interface est en mode démonstration pour tester les questionnaires.
              </p>
            </div>
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
            auditId={auditId}
            onSaveAnswer={handleSaveAnswer}
            onNext={handleNextNode}
            isLastNode={
              selectedNodeId ===
              questionnaire.domain_tree[questionnaire.domain_tree.length - 1]?.id
            }
            highlightedQuestionId={activeQuestionId}
          />
        </div>

        {/* Footer avec boutons d'action */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <ActionButtons
            canSubmit={questionnaire.can_submit}
            onSave={handleSaveAll}
            onSubmit={handleSubmit}
            saving={saving}
            submitting={submitting}
            userRole="audite_resp"
          />
        </div>
      </div>
    </div>
  );
}

export default function AuditeTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du test...</p>
        </div>
      </div>
    }>
      <AuditeTestContent />
    </Suspense>
  );
}
