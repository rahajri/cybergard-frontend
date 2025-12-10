/**
 * Types pour les référentiels (NIS2, RGPD, ISO27001, etc.)
 */

export interface Referential {
  id: string;
  code: string;
  name: string;
  description?: string;
  version?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferentialDomain {
  id: string;
  referential_id: string;
  code: string;
  name: string;
  description?: string;
  order_index?: number;
}

export interface ControlPoint {
  id: string;
  domain_id: string;
  code: string;
  title: string;
  description?: string;
  level?: string;
  order_index?: number;
}
