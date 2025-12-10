/**
 * Types pour le module Écosystème
 */

export interface EcosystemEntity {
  id: string;
  tenant_id?: string;
  client_organization_id?: string;
  name: string;
  stakeholder_type: 'internal' | 'external';
  entity_category?: string;
  is_domain: boolean;
  is_base_template: boolean;
  hierarchy_level: number;
  parent_entity_id?: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreateData {
  name: string;
  stakeholder_type: 'internal' | 'external';
  entity_category: string;
  parent_entity_id?: string;
  description?: string;
  client_organization_id: string;
  tenant_id?: string;
}

export interface OrganismCreateData {
  name: string;
  stakeholder_type: 'internal' | 'external';
  entity_category?: string;
  parent_entity_id?: string;
  description?: string;
  client_organization_id: string;
  tenant_id?: string;
}

export interface INSEEData {
  siren?: string;
  siret?: string;
  denomination?: string;
  address?: string;
  postal_code?: string;
  city?: string;
}

export type RelationType = 'parent' | 'child' | 'peer' | 'supplier' | 'customer' | 'partner';