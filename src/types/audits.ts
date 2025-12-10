/**
 * Types pour les audits
 */

export interface Audit {
  id: string;
  title: string;
  description?: string;
  campaign_id?: string;
  questionnaire_id: string;
  entity_id?: string;
  status: AuditStatus;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export type AuditStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'archived';

export interface AuditResponse {
  id: string;
  audit_id: string;
  question_id: string;
  response_value?: string;
  comment?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface AuditUserAssignment {
  id: string;
  audit_id: string;
  user_id: string;
  role: string;
  assigned_at: string;
}
