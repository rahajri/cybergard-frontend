import { useQuery } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface GenerationProgress {
  current_phase: number;
  phase1_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase2_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase3_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase4_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  questions_analyzed: number;
  total_questions: number;
  non_conformities_found: number;
  actions_generated: number;
  actions_assigned: number;
  estimated_time_remaining: number | null;
  error_message: string | null;
}

interface ActionPlan {
  id: string;
  campaign_id: string;
  tenant_id: string;
  status: 'NOT_STARTED' | 'GENERATING' | 'DRAFT' | 'PUBLISHED';
  summary_title: string | null;
  overall_risk_level: string | null;
  dominant_language: string | null;
  total_actions: number;
  critical_count: number;
  major_count: number;
  minor_count: number;
  info_count: number;
  generation_progress: GenerationProgress | null;
  generated_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  generated_by: string | null;
  published_by: string | null;
}

interface ActionPlanResponse {
  action_plan: ActionPlan | null;
  campaign_status?: string;
  can_generate?: boolean;
}

// Erreur personnalisée avec code HTTP
export class ActionPlanError extends Error {
  statusCode: number;
  permissionCode?: string;

  constructor(message: string, statusCode: number, permissionCode?: string) {
    super(message);
    this.name = 'ActionPlanError';
    this.statusCode = statusCode;
    this.permissionCode = permissionCode;
  }
}

/**
 * Hook pour récupérer le plan d'action d'une campagne
 */
export function useActionPlan(campaignId: string) {
  return useQuery<ActionPlanResponse, ActionPlanError>({
    queryKey: ['action-plan', campaignId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/v1/campaigns/${campaignId}/action-plan`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la récupération du plan d\'action';
        let permissionCode: string | undefined;

        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
            // Extraire le code de permission du message d'erreur
            const match = errorMessage.match(/'([A-Z][A-Z_]+)'/);
            if (match) {
              permissionCode = match[1];
            }
          }
        } catch {
          // Ignore JSON parse errors
        }

        throw new ActionPlanError(errorMessage, response.status, permissionCode);
      }

      return response.json();
    },
    // Polling toutes les 3 secondes si en génération
    refetchInterval: (query) => {
      if (query.state.data?.action_plan?.status === 'GENERATING') {
        return 3000; // Poll every 3 seconds
      }
      return false; // Don't poll otherwise
    },
    // Garder les anciennes données pendant le refetch
    placeholderData: (previousData) => previousData,
  });
}
