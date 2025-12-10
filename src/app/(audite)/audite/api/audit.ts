/**
 * Services API pour les audits (audité)
 */

import { authenticatedFetch } from '@/lib/api';
import { QuestionnaireForAudite } from '@/types/audite';

/**
 * Récupère un questionnaire pour un audit
 */
export async function fetchQuestionnaire(
  auditId: string,
  questionnaireId: string,
  isTestMode: boolean = false,
  usePreviewEndpoint: boolean = false
): Promise<QuestionnaireForAudite> {
  let endpoint: string;

  if (usePreviewEndpoint) {
    // Mode preview admin : endpoint simple avec requêtes SQL directes
    endpoint = `/api/v1/questionnaires/preview/${questionnaireId}`;
  } else if (isTestMode) {
    // Mode test : endpoint de test avec structure hiérarchique complète
    endpoint = `/api/v1/audite-test/test/${questionnaireId}`;
  } else {
    // Mode normal : essayer d'abord avec audit_id (nouvelle route pour notifications)
    // puis fallback vers campaign_id (ancienne route pour Magic Links)
    endpoint = `/api/v1/audite/${auditId}/questionnaire/${questionnaireId}`;
  }

  let response = await authenticatedFetch(endpoint);

  // Si 404 et qu'on utilisait la nouvelle route audit_id, essayer l'ancienne route campaign_id
  if (!response.ok && response.status === 404 && endpoint.includes('/audite/') && !endpoint.includes('/campaign/') && endpoint.includes('/questionnaire/')) {
    console.log(`Route ${endpoint} not found, trying legacy campaign route`);
    endpoint = `/api/v1/audite/campaign/${auditId}/questionnaire/${questionnaireId}`;
    response = await authenticatedFetch(endpoint);
  }

  if (!response.ok) {
    // Récupérer le message d'erreur détaillé du backend
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erreur lors du chargement du questionnaire');
    } catch (parseError) {
      // Si on ne peut pas parser la réponse JSON
      if (response.status === 403) {
        throw new Error('Accès refusé. La campagne n\'est peut-être pas encore active.');
      } else if (response.status === 404) {
        throw new Error('Questionnaire non trouvé');
      } else if (response.status === 401) {
        throw new Error('Session expirée. Veuillez utiliser le lien d\'invitation à nouveau.');
      }
      throw new Error('Erreur lors du chargement du questionnaire');
    }
  }

  return response.json();
}

/**
 * Soumet un audit complet
 */
export async function submitAudit(auditId: string): Promise<{ message: string }> {
  const response = await authenticatedFetch(`/api/v1/audite/${auditId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audit_id: auditId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erreur lors de la soumission');
  }

  return response.json();
}
