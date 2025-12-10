/**
 * Service API pour la gestion des frameworks/référentiels
 */

import type { CrossReferentialSummary, Framework, FrameworkHierarchy } from '@/types/framework';

/**
 * Récupère le résumé cross-référentiel avec stats globales
 */
export async function getCrossReferentialSummary(): Promise<CrossReferentialSummary> {
  const response = await fetch('/api/v1/frameworks/admin/cross-referential-summary');

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère un framework par ID
 */
export async function getFramework(frameworkId: string): Promise<Framework> {
  const response = await fetch(`/api/v1/frameworks/${frameworkId}`);

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère la hiérarchie d'un framework (domaines)
 */
export async function getFrameworkHierarchy(frameworkId: string): Promise<FrameworkHierarchy> {
  const response = await fetch(`/api/v1/frameworks/${frameworkId}/hierarchy`);

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Active ou désactive un framework
 */
export async function toggleFrameworkActive(
  frameworkId: string,
  isActive: boolean
): Promise<Framework> {
  const response = await fetch(`/api/v1/frameworks/${frameworkId}/toggle-active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive })
  });

  if (!response.ok) {
    throw new Error('Erreur lors du changement de statut');
  }

  return response.json();
}

/**
 * Supprime un framework
 */
export async function deleteFramework(frameworkId: string): Promise<void> {
  const response = await fetch(`/api/v1/frameworks/${frameworkId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la suppression');
  }
}

/**
 * Génère les embeddings pour un framework
 */
export async function generateFrameworkEmbeddings(frameworkId: string): Promise<void> {
  const response = await fetch(`/api/v1/frameworks/${frameworkId}/generate-embeddings`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la génération des embeddings');
  }
}

/**
 * Exporte un framework au format Excel
 */
export async function exportFramework(frameworkId: string, frameworkCode: string): Promise<void> {
  const response = await fetch(`/api/v1/frameworks/${frameworkId}/export?format=xlsx`);

  if (!response.ok) {
    throw new Error(`Export échoué (${response.status})`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `framework_${frameworkCode}_export.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
