/**
 * Hook pour la navigation entre les domaines d'un questionnaire
 */

import { QuestionnaireForAudite } from '@/types/audite';

export function useAuditNavigation(
  questionnaire: QuestionnaireForAudite | null,
  selectedNodeId: string | null,
  setSelectedNodeId: (nodeId: string) => void
) {
  const handleNextNode = () => {
    if (!questionnaire || !selectedNodeId) return;

    const currentIndex = questionnaire.domain_tree.findIndex(
      node => node.id === selectedNodeId
    );

    if (currentIndex < questionnaire.domain_tree.length - 1) {
      setSelectedNodeId(questionnaire.domain_tree[currentIndex + 1].id);
    }
  };

  const handlePreviousNode = () => {
    if (!questionnaire || !selectedNodeId) return;

    const currentIndex = questionnaire.domain_tree.findIndex(
      node => node.id === selectedNodeId
    );

    if (currentIndex > 0) {
      setSelectedNodeId(questionnaire.domain_tree[currentIndex - 1].id);
    }
  };

  const goToNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const canGoNext = () => {
    if (!questionnaire || !selectedNodeId) return false;

    const currentIndex = questionnaire.domain_tree.findIndex(
      node => node.id === selectedNodeId
    );

    return currentIndex < questionnaire.domain_tree.length - 1;
  };

  const canGoPrevious = () => {
    if (!questionnaire || !selectedNodeId) return false;

    const currentIndex = questionnaire.domain_tree.findIndex(
      node => node.id === selectedNodeId
    );

    return currentIndex > 0;
  };

  return {
    handleNextNode,
    handlePreviousNode,
    goToNode,
    canGoNext: canGoNext(),
    canGoPrevious: canGoPrevious(),
  };
}
