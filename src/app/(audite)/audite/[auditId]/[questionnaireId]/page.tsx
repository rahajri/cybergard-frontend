'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Hooks
import { useQuestionnaireData, useAudit, useAuditNavigation } from '../../hooks';

// Components
import SidebarAudite from '../../../sidebar.audite';
import { QuestionList } from '../../components/QuestionList';
import { ProgressBar } from '../../components/ProgressBar';
import { ActionButtons } from '../../components/ActionButtons';
import { SubmissionSuccessModal } from '../../components/SubmissionSuccessModal';
import { AuditSubmittedMessage } from '../../components/AuditSubmittedMessage';
import { NotificationBell } from '@/components/notifications/NotificationBell';

import { AddCollaboratorModal } from '@/components/AddCollaboratorModal';

export default function AuditePage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.auditId as string;
  const questionnaireId = params.questionnaireId as string;

  // Détecter le mode test
  const isTestMode = auditId === 'test-audit-id';

  const [showAddCollaboratorModal, setShowAddCollaboratorModal] = useState(false);

  // Hook principal : chargement des données
  const {
    questionnaire,
    selectedNodeId,
    setSelectedNodeId,
    loading,
    error,
    refetch,
  } = useQuestionnaireData(auditId, questionnaireId, isTestMode);

  // Hook : gestion des actions (save, submit)
  const {
    saving,
    submitting,
    submissionSuccess,
    handleSaveAnswer,
    handleSaveAll,
    handleSubmit,
    resetSubmissionSuccess
  } = useAudit(
    questionnaire,
    isTestMode,
    refetch
  );

  // Hook : navigation entre domaines
  const { handleNextNode } = useAuditNavigation(questionnaire, selectedNodeId, setSelectedNodeId);

  // Gestion de la redirection après soumission reussie
  const handleSubmissionConfirm = () => {
    resetSubmissionSuccess();
    // Supprimer le token d'authentification audité
    localStorage.removeItem('audite_token');
    // Rediriger vers la page de login
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-lg mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error ? 'Accès refusé' : 'Questionnaire non trouvé'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Le questionnaire demandé n\'existe pas ou vous n\'y avez pas accès.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // Afficher le message "Audit déjà soumis" si l'audit a été soumis
  if (questionnaire.is_submitted && !isTestMode) {
    return (
      <AuditSubmittedMessage
        campaignName={questionnaire.name}
        onReturnToLogin={() => {
          // Supprimer le token d'authentification audité
          localStorage.removeItem('audite_token');
          // Rediriger vers la page de login
          router.push('/login');
        }}
      />
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

  // Debug: afficher les informations de sélection
  if (selectedNodeId) {
    console.log('=== DEBUG INFO ===');
    console.log('selectedNodeId:', selectedNodeId);
    console.log('activeDomainId:', activeDomainId);
    console.log('activeQuestionId:', activeQuestionId);
    console.log('questions_by_node keys:', questionnaire ? Object.keys(questionnaire.questions_by_node) : []);
    console.log('currentQuestions.length:', currentQuestions.length);
    console.log('==================');
  }

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
        {isTestMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧪</span>
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Mode Test - Les réponses ne seront pas sauvegardées
                </p>
                <p className="text-xs text-amber-700">
                  Cette interface est en mode démonstration. Le système complet sera disponible en Phase 2.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header avec progression */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {questionnaire.name}
            </h1>
            <div className="flex items-center gap-3">
              {/* Cloche de notifications */}
              {!isTestMode && <NotificationBell position="bottom" />}

              {/* Bouton ajouter contributeur */}
              {!isTestMode && questionnaire.user_role === 'audite_resp' && (
                <button
                  onClick={() => setShowAddCollaboratorModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Ajouter un contributeur
                </button>
              )}
            </div>
          </div>
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
            auditId={questionnaire.audit_id || auditId}
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
            userRole={questionnaire.user_role}
          />
        </div>
      </div>

      {/* Modal Ajouter un contributeur */}
      {showAddCollaboratorModal && (
        <AddCollaboratorModal
          auditId={questionnaire.audit_id}
          onClose={() => setShowAddCollaboratorModal(false)}
          onCollaboratorAdded={() => {
            // Rafraîchir si nécessaire
            setShowAddCollaboratorModal(false);
          }}
        />
      )}

      {/* Modal de succes de soumission */}
      <SubmissionSuccessModal
        isOpen={submissionSuccess}
        onClose={resetSubmissionSuccess}
        onConfirm={handleSubmissionConfirm}
        campaignName={questionnaire.name}
      />
    </div>
  );
}
