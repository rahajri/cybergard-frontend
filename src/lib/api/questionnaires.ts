/**
 * Service API pour la gestion des questionnaires
 */

import type { Questionnaire } from '@/types/questionnaire';

export interface QuestionnaireStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

/**
 * Récupère les statistiques des questionnaires
 */
export async function getQuestionnairesStats(): Promise<QuestionnaireStats> {
  const response = await fetch('/api/v1/questionnaires/stats');

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère la liste des questionnaires
 */
export async function getQuestionnaires(): Promise<Questionnaire[]> {
  const response = await fetch('/api/v1/questionnaires/');

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Duplique un questionnaire avec traduction optionnelle
 */
export async function duplicateQuestionnaire(
  questionnaireId: string,
  translateToLanguage?: string
): Promise<Questionnaire> {
  const params = new URLSearchParams();
  if (translateToLanguage && translateToLanguage !== 'fr') {
    params.append('translate_to', translateToLanguage);
  }

  const url = `/api/v1/questionnaires/${questionnaireId}/duplicate${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la duplication');
  }

  return response.json();
}

/**
 * Génère les embeddings pour un questionnaire
 */
export async function generateQuestionnaireEmbeddings(questionnaireId: string): Promise<void> {
  const response = await fetch(`/api/v1/questionnaires/${questionnaireId}/generate-embeddings`, {
    method: 'POST'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la génération des embeddings');
  }
}

/**
 * Supprime un questionnaire
 */
export async function deleteQuestionnaire(questionnaireId: string): Promise<void> {
  const response = await fetch(`/api/v1/questionnaires/${questionnaireId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la suppression');
  }
}
