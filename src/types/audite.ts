/**
 * Types pour la vue audité
 */

export interface UploadCondition {
  required_for_values?: string[];
  attachment_types?: string[];
  min_files?: number;
  max_files?: number;
  max_size_mb?: number;
  accepted_types?: string[];
  accepts_links?: boolean;
  help_text?: string;
  is_mandatory?: boolean;
}

export interface QuestionAnswer {
  id: string;
  question_id: string;
  audit_id: string;
  answered_by?: string;
  answer_value: Record<string, any>;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  version: number;
  is_current: boolean;
  comment?: string;
  answered_at: string;
  submitted_at?: string;
  updated_at: string;
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface QuestionForAudite {
  id: string;
  question_text: string;
  response_type: 'text' | 'textarea' | 'boolean' | 'single_choice' | 'multiple_choice' | 'number' | 'rating' | 'date' | 'open' | 'file_upload';
  is_required: boolean;
  help_text?: string;
  options?: QuestionOption[];  // Changed from string[] to QuestionOption[]
  upload_conditions?: UploadCondition;
  order_index: number;
  current_answer?: QuestionAnswer;
}

export interface DomainNode {
  id: string;
  name: string;
  type: 'domain' | 'requirement';
  order_index: number;
  children: DomainNode[];
  question_count: number;
  answered_count: number;
  has_mandatory_unanswered: boolean;
}

export interface QuestionnaireForAudite {
  id: string;
  name: string;
  audit_id: string; // ID de l'audit individuel (créé automatiquement pour les campagnes)
  campaign_id?: string; // ID de la campagne (si applicable)
  user_role?: 'audite_resp' | 'audite_contrib'; // Rôle de l'utilisateur
  domain_tree: DomainNode[];
  questions_by_node: Record<string, QuestionForAudite[]>;
  total_questions: number;
  answered_questions: number;
  mandatory_questions: number;
  mandatory_answered: number;
  progress_percentage: number;
  can_submit: boolean;
  is_submitted?: boolean; // Indique si l'audit a déjà été soumis
}

export interface Progress {
  audit_id: string;
  questionnaire_id: string;
  total_questions: number;
  answered_questions: number;
  mandatory_questions: number;
  mandatory_answered: number;
  progress_percentage: number;
  can_submit: boolean;
  last_updated?: string;
}

export interface SubmitAuditRequest {
  audit_id: string;
  comment?: string;
}

export interface SubmitAuditResponse {
  success: boolean;
  message: string;
  submitted_at: string;
  total_answers: number;
  audit_id: string;
}
