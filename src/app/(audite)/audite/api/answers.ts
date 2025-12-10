/**
 * Services API pour les réponses d'audit
 */

import { authenticatedFetch } from '@/lib/api';

export interface SaveAnswerParams {
  questionId: string;
  auditId: string;
  campaignId?: string;
  answerValue: Record<string, unknown>;
  status?: 'draft' | 'submitted';
}

/**
 * Sauvegarde une réponse à une question
 */
export async function saveAnswer(params: SaveAnswerParams): Promise<void> {
  const response = await authenticatedFetch('/api/v1/audite/answers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question_id: params.questionId,
      audit_id: params.auditId,
      campaign_id: params.campaignId,
      answer_value: params.answerValue,
      status: params.status || 'draft',
    }),
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la sauvegarde de la réponse');
  }

  return response.json();
}
