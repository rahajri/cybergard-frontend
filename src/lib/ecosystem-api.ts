/**
 * Client API pour le module Écosystème
 */

import { 
  EcosystemEntity, 
  CategoryCreateData, 
  OrganismCreateData,
  INSEEData,
  RelationType 
} from '@/types/ecosystem';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// ENTITIES
// ============================================================================

export async function getEntities(params?: {
  client_organization_id?: string;
  stakeholder_type?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch entities');
  return response.json();
}

export async function getEntity(id: string): Promise<EcosystemEntity> {
  const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${id}`);
  if (!response.ok) throw new Error('Failed to fetch entity');
  return response.json();
}

export async function createCategory(data: CategoryCreateData): Promise<EcosystemEntity> {
  const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create category');
  }
  
  return response.json();
}

export async function createOrganism(data: OrganismCreateData): Promise<EcosystemEntity> {
  const response = await fetch(
    `${API_BASE}/api/v1/ecosystem/entities?enrich_with_insee=true`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create organism');
  }
  
  return response.json();
}

export async function updateEntity(id: string, data: Partial<EcosystemEntity>): Promise<EcosystemEntity> {
  const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('Failed to update entity');
  return response.json();
}

export async function deleteEntity(id: string, force: boolean = false): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/v1/ecosystem/entities/${id}?force=${force}`,
    { method: 'DELETE' }
  );
  
  if (!response.ok) throw new Error('Failed to delete entity');
}

// ============================================================================
// INSEE
// ============================================================================

export async function enrichWithINSEE(siret: string): Promise<INSEEData> {
  const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities/enrich-insee`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siret }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch INSEE data');
  }
  
  return response.json();
}

// ============================================================================
// RELATION TYPES
// ============================================================================

export async function getRelationTypes(params?: {
  category?: string;
  is_active?: boolean;
}): Promise<RelationType[]> {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const response = await fetch(`${API_BASE}/api/v1/ecosystem/relationship-types?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch relation types');
  return response.json();
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getEcosystemStats(client_organization_id: string) {
  const response = await fetch(
    `${API_BASE}/api/v1/ecosystem/stats/overview?client_organization_id=${client_organization_id}`
  );
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}