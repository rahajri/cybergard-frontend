/**
 * Types pour les organisations et entités
 */

export interface InseeData {
  siret?: string;
  siren?: string;
  denomination?: string;
  activite_principale?: string;
  code_naf?: string;
  libelle_naf?: string;
  forme_juridique?: string;
  adresse?: string;
  code_postal?: string;
  commune?: string;
  date_creation?: string;
  tranche_effectif?: string;
  etat_administratif?: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  subscription_type: string;
  billing_email?: string;
  country_code: string;
  sector?: string;
  category?: string;
  size_category?: string;
  employee_count?: number;
  workforce?: number;
  tenant_id?: string;
  is_active: boolean;
  max_suppliers: number;
  max_auditors: number;
  insee_data?: InseeData;
  created_at: string;
  updated_at: string;
}

export interface OrganizationStats {
  users_count: number;
  active_campaigns: number;
  total_audits: number;
}

export interface OrganizationListResponse {
  items: Organization[];
  total: number;
  page: number;
  size: number;
}
