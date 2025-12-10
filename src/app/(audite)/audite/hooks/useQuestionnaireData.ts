/**
 * Hook pour gérer les données du questionnaire
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { QuestionnaireForAudite, QuestionForAudite } from '@/types/audite';
import { fetchQuestionnaire } from '../api/audit';

export function useQuestionnaireData(
  auditId: string,
  questionnaireId: string,
  isTestMode: boolean = false,
  usePreviewEndpoint: boolean = false
) {
  const searchParams = useSearchParams();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireForAudite | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadQuestionnaire = useCallback(async (showLoading: boolean = false) => {
    try {
      // Ne montrer le loading que pour le chargement initial, pas pour les refetch
      if (showLoading || isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const data = await fetchQuestionnaire(auditId, questionnaireId, isTestMode, usePreviewEndpoint);
      setQuestionnaire(data);

      // Vérifier si un paramètre question est présent pour focus automatique (seulement au premier chargement)
      if (isInitialLoad) {
        const focusQuestionId = searchParams.get('question');

        if (focusQuestionId && data.questions_by_node) {
          // Trouver le domaine contenant cette question
          let foundDomainId: string | null = null;
          for (const [domainId, questions] of Object.entries(data.questions_by_node)) {
            if (questions.some((q: QuestionForAudite) => q.id === focusQuestionId)) {
              foundDomainId = domainId;
              break;
            }
          }

          if (foundDomainId) {
            console.log(`🎯 Focus automatique sur question ${focusQuestionId} dans domaine ${foundDomainId}`);
            setSelectedNodeId(foundDomainId);
            setSelectedQuestionId(focusQuestionId);
            toast.info('📍 Question ciblée chargée', { duration: 2000 });
          } else {
            console.warn(`⚠️ Question ${focusQuestionId} non trouvée dans le questionnaire`);
            // Sélectionner le premier noeud par défaut
            if (data.domain_tree && data.domain_tree.length > 0) {
              setSelectedNodeId(data.domain_tree[0].id);
            }
          }
        } else {
          // Sélectionner le premier noeud par défaut UNIQUEMENT au chargement initial
          if (data.domain_tree && data.domain_tree.length > 0 && !selectedNodeId) {
            setSelectedNodeId(data.domain_tree[0].id);
          }
        }
        setIsInitialLoad(false);
      }
    } catch (error: unknown) {
      const err = error as Error;
      const errorMessage = err.message || 'Erreur inconnue';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [auditId, questionnaireId, isTestMode, usePreviewEndpoint, searchParams, selectedNodeId, isInitialLoad]);

  useEffect(() => {
    loadQuestionnaire(true); // Afficher le loading uniquement au premier chargement
  }, [auditId, questionnaireId]); // Retirer loadQuestionnaire des dépendances pour éviter les boucles

  // Fonction de refetch sans afficher le loading spinner
  const refetch = useCallback(async () => {
    await loadQuestionnaire(false);
  }, [loadQuestionnaire]);

  return {
    questionnaire,
    selectedNodeId,
    setSelectedNodeId,
    selectedQuestionId,
    setSelectedQuestionId,
    loading,
    error,
    refetch,
  };
}
