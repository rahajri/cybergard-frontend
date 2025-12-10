/**
 * Types pour les statistiques
 */

export interface ClientStats {
  total_clients: number;
  active_clients: number;
  inactive_clients: number;
  total_users: number;
  premium_clients: number;
}

export interface DashboardStats {
  total_audits: number;
  active_audits: number;
  completed_audits: number;
  total_actions: number;
  pending_actions: number;
  completed_actions: number;
}

export interface OverviewStats {
  users_count: number;
  active_campaigns: number;
  total_audits: number;
  completion_rate: number;
}
