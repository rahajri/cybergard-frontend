/**
 * Types pour les pôles métier
 */

export interface Pole {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoleUser {
  id: string;
  pole_id: string;
  user_id: string;
  role?: string;
  assigned_at: string;
}
