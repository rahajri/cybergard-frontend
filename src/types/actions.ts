/**
 * Types pour les plans d'action
 */

export interface Action {
  id: string;
  title: string;
  description?: string;
  status: ActionStatus;
  priority: ActionPriority;
  assignee?: string;
  due_date?: string;
  audit_id?: string;
  control_point_id?: string;
  created_at: string;
  updated_at: string;
}

export type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled'
  | 'closed';

export type ActionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ActionComment {
  id: string;
  action_id: string;
  user_id: string;
  content: string;
  created_at: string;
}
