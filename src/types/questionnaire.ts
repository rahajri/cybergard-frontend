/**
 * Types pour les questionnaires
 */

export interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  referential_id?: string;
  status: QuestionnaireStatus;
  is_activated_for_tenant: boolean;
  created_at: string;
  updated_at: string;
}

export type QuestionnaireStatus = 'draft' | 'published' | 'archived';

export interface Question {
  id: string;
  questionnaire_id: string;
  text: string;
  type: QuestionType;
  order_index: number;
  is_mandatory: boolean;
  control_point_id?: string;
}

export type QuestionType = 'text' | 'multiple_choice' | 'yes_no' | 'scale' | 'file_upload';
