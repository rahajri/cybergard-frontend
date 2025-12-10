/**
 * Hook principal pour gérer un audit (sauvegarde, soumission)
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { QuestionnaireForAudite } from '@/types/audite';
import { saveAnswer } from '../api/answers';
import { submitAudit } from '../api/audit';

export function useAudit(
  questionnaire: QuestionnaireForAudite | null,
  isTestMode: boolean,
  refetchQuestionnaire: () => Promise<void>
) {
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  /**
   * Sauvegarde une réponse individuelle
   */
  const handleSaveAnswer = async (questionId: string, answerValue: Record<string, unknown>) => {
    // En mode test, ne pas sauvegarder réellement
    if (isTestMode) {
      toast.info('Mode test : réponse enregistrée localement (non sauvegardée)');
      return;
    }

    if (!questionnaire?.audit_id) {
      toast.error('Audit non trouvé');
      return;
    }

    try {
      await saveAnswer({
        questionId,
        auditId: questionnaire.audit_id,
        campaignId: questionnaire.campaign_id,
        answerValue,
        status: 'draft',
      });

      // Rafraîchir le questionnaire pour mettre à jour les statistiques
      await refetchQuestionnaire();

      toast.success('Réponse sauvegardée');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Erreur lors de la sauvegarde');
      throw error;
    }
  };

  /**
   * Sauvegarde toutes les réponses (brouillon)
   */
  const handleSaveAll = async () => {
    if (isTestMode) {
      toast.info('Mode test : aucune sauvegarde effectuée');
      return;
    }

    setSaving(true);
    try {
      // Les réponses sont déjà sauvegardées individuellement
      // Cette action est juste pour informer l'utilisateur
      toast.success('Toutes les réponses sont sauvegardées');
      await refetchQuestionnaire(); // Rafraîchir pour s'assurer
    } catch (error: unknown) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Soumet l'audit complet
   */
  const handleSubmit = async () => {
    if (isTestMode) {
      toast.success('Mode test : soumission simulée avec succès ! 🎉');
      setSubmissionSuccess(true);
      return;
    }

    if (!questionnaire?.can_submit) {
      toast.error('Veuillez répondre à toutes les questions obligatoires');
      return;
    }

    if (!questionnaire?.audit_id) {
      toast.error('Audit non trouvé');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitAudit(questionnaire.audit_id);
      // Ne pas afficher de toast ici, la popup s'en chargera

      // Rafraîchir pour voir le nouveau statut
      await refetchQuestionnaire();

      // Marquer la soumission comme réussie pour afficher la popup
      setSubmissionSuccess(true);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Réinitialise l'état de succès
   */
  const resetSubmissionSuccess = () => {
    setSubmissionSuccess(false);
  };

  return {
    saving,
    submitting,
    submissionSuccess,
    handleSaveAnswer,
    handleSaveAll,
    handleSubmit,
    resetSubmissionSuccess,
  };
}
