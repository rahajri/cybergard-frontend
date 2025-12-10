/**
 * Service API pour la gestion des organisations
 */

import type { Organization, OrganizationListResponse } from '@/types/organization';
import type { ClientStats } from '@/types/stats';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Récupère la liste des organisations avec pagination
 */
export async function getOrganizations(limit = 1000): Promise<OrganizationListResponse> {
  const response = await fetch(`${API_BASE}/api/v1/admin/organizations?limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère les statistiques globales des organisations
 */
export async function getOrganizationsStats(): Promise<Partial<ClientStats>> {
  const response = await fetch(`${API_BASE}/api/v1/admin/organizations/stats/overview`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère le nombre d'utilisateurs d'une organisation
 */
export async function getUserCountByOrganization(organizationId: string): Promise<number> {
  const response = await fetch(`${API_BASE}/api/v1/users/count/by-organization/${organizationId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.total || 0;
}

/**
 * Supprime une organisation
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/admin/organizations/${organizationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la suppression');
  }
}

/**
 * Active ou désactive une organisation
 */
export async function toggleOrganizationActive(
  organizationId: string,
  isActive: boolean
): Promise<Organization> {
  const response = await fetch(`${API_BASE}/api/v1/admin/organizations/${organizationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la mise à jour');
  }

  return response.json();
}
