/**
 * API Client pour le module de génération de rapports
 *
 * Endpoints:
 * - Templates: CRUD, duplication, preview
 * - Génération: Créer, suivre progression, télécharger
 * - Rapports: Lister, détails, supprimer
 */

import { authenticatedFetch } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================

export type TemplateType = 'system' | 'executive' | 'technical' | 'detailed' | 'custom';
export type GenerationMode = 'draft' | 'final';
export type ReportStatus = 'pending' | 'generating' | 'draft' | 'final' | 'error' | 'archived';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Scope des rapports - détermine le type de contenu généré
 *
 * - consolidated: Vue écosystème campagne (multi-organismes)
 *   * Stats comparatives entre organismes
 *   * NC critiques globales
 *   * Plan d'action consolidé
 *
 * - entity: Vue individuelle campagne (mono-organisme)
 *   * Score personnalisé de l'entité
 *   * Analyse par domaine
 *   * Benchmarking vs pairs
 *
 * - scan_individual: Rapport d'un scan individuel
 *   * Détails d'un scan spécifique
 *   * Vulnérabilités détectées
 *   * Score d'exposition
 *
 * - scan_ecosystem: Vue écosystème scanner (multi-cibles)
 *   * Synthèse de tous les scans
 *   * Comparaison des organismes
 *   * Top vulnérabilités
 */
export type ReportScope = 'consolidated' | 'entity' | 'scan_individual' | 'scan_ecosystem';

/**
 * Scope des templates - définit pour quel type de rapport le template est utilisable
 */
export type TemplateScope = 'consolidated' | 'entity' | 'both' | 'scan_individual' | 'scan_ecosystem' | 'scan_both';

export interface ReportTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  code: string | null;
  template_type: TemplateType;
  report_scope: TemplateScope; // Scope du template (consolidated, entity, both)
  is_system: boolean;
  is_default: boolean;
  page_size: string;
  orientation: string;
  margins: Record<string, number>;
  color_scheme: Record<string, string>;
  fonts: Record<string, any>;
  custom_css: string | null;
  default_logo: string;
  structure: WidgetConfig[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  id?: string;
  widget_type: string;
  position: number;
  parent_widget_id?: string | null;
  config: Record<string, any>;
  display_condition?: Record<string, any> | null;
}

export interface GeneratedReport {
  id: string;
  tenant_id: string;
  campaign_id: string | null;
  audit_id: string | null;
  template_id: string | null;
  report_scope: ReportScope; // Type de rapport (consolidated ou entity)
  entity_id: string | null; // UUID de l'entité (si scope='entity')
  entity_name?: string | null; // Nom de l'entité (pour affichage)
  title: string;
  description: string | null;
  status: ReportStatus;
  generation_mode: GenerationMode;
  file_path: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  file_mime_type: string;
  file_checksum: string | null;
  page_count: number | null;
  generation_time_ms: number | null;
  error_message: string | null;
  version: number;
  is_latest: boolean;
  previous_version_id: string | null;
  generated_by: string | null;
  generated_at: string | null;
  downloaded_count: number;
  last_downloaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportGenerationJob {
  id: string;
  tenant_id: string;
  report_id: string;
  status: JobStatus;
  progress_percent: number;
  current_step: string | null;
  total_steps: number | null;
  current_step_number: number | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  worker_id: string | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  error_stack: string | null;
}

/**
 * Requête de génération de rapport
 *
 * RÈGLES DE VALIDATION:
 * - Si report_scope='consolidated' : entity_id DOIT être undefined/null
 * - Si report_scope='entity' : entity_id DOIT être fourni
 */
export interface GenerateReportRequest {
  campaign_id: string;
  template_id: string;
  report_scope: ReportScope; // Type de rapport (consolidated ou entity)
  entity_id?: string | null; // REQUIS si scope='entity', NULL si scope='consolidated'
  title?: string;
  options?: {
    force_mode?: GenerationMode | null;
    include_appendix?: boolean;
    include_ai_summary?: boolean; // Inclure le résumé IA
    include_benchmarking?: boolean; // Inclure le benchmarking
    language?: string;
    ai_widget_configs?: Array<{
      widget_id: string;
      use_ai: boolean;
      manual_content: string;
      tone: string;
    }>;
  };
}

export interface GenerateReportResponse {
  job_id: string;
  report_id: string;
  status: string;
  estimated_time_seconds: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

// ============================================================================
// API TEMPLATES
// ============================================================================

export const templatesApi = {
  /**
   * Liste tous les templates
   *
   * @param params.type - Filtrer par type (system, executive, etc.)
   * @param params.template_category - Filtrer par catégorie (audit, ebios, scan)
   * @param params.report_scope - Filtrer par scope (consolidated, entity, both)
   * @param params.is_system - Filtrer par templates système
   * @param params.tenant_id - Filtrer par tenant (admin uniquement)
   */
  async list(params?: {
    type?: TemplateType;
    template_category?: 'audit' | 'ebios' | 'scan'; // Filtrer par catégorie
    report_scope?: TemplateScope; // Filtrer par scope
    is_system?: boolean;
    tenant_id?: string; // Filtrer par tenant (admin uniquement)
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ReportTemplate>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('template_type', params.type);
    if (params?.template_category) searchParams.append('template_category', params.template_category);
    if (params?.report_scope) searchParams.append('report_scope', params.report_scope);
    if (params?.is_system !== undefined) searchParams.append('is_system', String(params.is_system));
    if (params?.tenant_id) searchParams.append('tenant_id', params.tenant_id);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const response = await authenticatedFetch(
      `/api/v1/reports/templates?${searchParams.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch templates');
    }

    return response.json();
  },

  /**
   * Récupère un template par ID
   */
  async get(templateId: string): Promise<ReportTemplate> {
    const response = await authenticatedFetch(
      `/api/v1/reports/templates/${templateId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Template not found');
    }

    return response.json();
  },

  /**
   * Crée un nouveau template (SUPER_ADMIN uniquement)
   */
  async create(data: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const response = await authenticatedFetch('/api/v1/reports/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create template');
    }

    return response.json();
  },

  /**
   * Met à jour un template
   */
  async update(templateId: string, data: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const response = await authenticatedFetch(`/api/v1/reports/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update template');
    }

    return response.json();
  },

  /**
   * Supprime un template
   */
  async delete(templateId: string): Promise<void> {
    const response = await authenticatedFetch(`/api/v1/reports/templates/${templateId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete template');
    }
  },

  /**
   * Duplique un template existant
   */
  async duplicate(templateId: string, newName: string): Promise<ReportTemplate> {
    const response = await authenticatedFetch(
      `/api/v1/reports/templates/${templateId}/duplicate?new_name=${encodeURIComponent(newName)}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to duplicate template');
    }

    return response.json();
  },
};

// ============================================================================
// API RAPPORTS
// ============================================================================

export const reportsApi = {
  /**
   * Génère un rapport pour une campagne
   *
   * Supporte deux types de rapports:
   * - CONSOLIDÉ (report_scope='consolidated'): Vue écosystème multi-organismes
   * - INDIVIDUEL (report_scope='entity'): Vue mono-organisme
   *
   * @param request - Requête de génération avec scope et entity_id optionnel
   */
  async generate(request: GenerateReportRequest): Promise<GenerateReportResponse> {
    // Validation côté client
    if (request.report_scope === 'entity' && !request.entity_id) {
      throw new Error('entity_id est requis pour un rapport individuel (scope=entity)');
    }
    if (request.report_scope === 'consolidated' && request.entity_id) {
      throw new Error('entity_id doit être vide pour un rapport consolidé (scope=consolidated)');
    }

    const response = await authenticatedFetch(
      `/api/v1/reports/campaigns/${request.campaign_id}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: request.template_id,
          report_scope: request.report_scope,
          entity_id: request.entity_id || null,
          title: request.title,
          options: request.options,
        }),
      }
    );

    // Lire le body UNE SEULE FOIS pour éviter l'erreur "Body has already been consumed"
    const responseText = await response.text();

    if (!response.ok) {
      // Gérer les cas où la réponse n'est pas du JSON valide
      let errorMessage = 'Failed to generate report';
      try {
        const error = JSON.parse(responseText);
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          // Erreurs de validation Pydantic (format: [{msg: "...", loc: [...], type: "..."}])
          errorMessage = error.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (error.detail && typeof error.detail === 'object') {
          errorMessage = error.detail.msg || error.detail.message || JSON.stringify(error.detail);
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        // Si le parsing JSON échoue, utiliser le texte brut
        errorMessage = responseText || `Erreur HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    // Parser la réponse JSON
    try {
      return JSON.parse(responseText);
    } catch {
      console.error('❌ Réponse non-JSON de generate:', responseText.substring(0, 200));
      throw new Error(`Réponse invalide du serveur: ${responseText.substring(0, 100)}`);
    }
  },

  /**
   * Récupère le statut d'un job de génération
   */
  async getJobStatus(jobId: string): Promise<ReportGenerationJob> {
    const response = await authenticatedFetch(`/api/v1/reports/jobs/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Job not found');
    }

    return response.json();
  },

  /**
   * Liste les rapports d'une campagne
   *
   * @param params.report_scope - Filtrer par type (consolidated ou entity)
   * @param params.entity_id - Filtrer par entité (pour rapports individuels)
   * @param params.status - Filtrer par statut
   * @param params.version - 'latest' ou 'all'
   */
  async listByCampaign(
    campaignId: string,
    params?: {
      report_scope?: ReportScope; // Filtrer par scope
      entity_id?: string; // Filtrer par entité
      status?: ReportStatus;
      version?: 'latest' | 'all';
    }
  ): Promise<PaginatedResponse<GeneratedReport>> {
    const searchParams = new URLSearchParams();
    if (params?.report_scope) searchParams.append('report_scope', params.report_scope);
    if (params?.entity_id) searchParams.append('entity_id', params.entity_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.version) searchParams.append('version', params.version);

    const response = await authenticatedFetch(
      `/api/v1/reports/campaigns/${campaignId}/reports?${searchParams.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch reports');
    }

    return response.json();
  },

  /**
   * Récupère les détails d'un rapport
   */
  async get(reportId: string): Promise<GeneratedReport> {
    const response = await authenticatedFetch(`/api/v1/reports/reports/${reportId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Report not found');
    }

    return response.json();
  },

  /**
   * Télécharge un rapport PDF
   */
  async download(reportId: string, fileName?: string): Promise<void> {
    const response = await authenticatedFetch(`/api/v1/reports/reports/${reportId}/download`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to download report');
    }

    // Créer un blob et déclencher le téléchargement
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `rapport_${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Supprime un rapport
   */
  async delete(reportId: string): Promise<void> {
    const response = await authenticatedFetch(`/api/v1/reports/reports/${reportId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete report');
    }
  },

  /**
   * Régénère un rapport existant
   */
  async regenerate(reportId: string): Promise<GenerateReportResponse> {
    const response = await authenticatedFetch(`/api/v1/reports/reports/${reportId}/regenerate`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to regenerate report');
    }

    return response.json();
  },
};

// ============================================================================
// API RAPPORTS SCANNER
// ============================================================================

/**
 * Requête de génération de rapport scanner
 */
export interface GenerateScanReportRequest {
  template_id: string;
  title?: string;
  report_scope: 'scan_individual' | 'scan_ecosystem';
  options?: {
    include_ai_summary?: boolean;
    include_positioning_chart?: boolean;
    language?: string;
  };
}

export const scanReportsApi = {
  /**
   * Génère un rapport pour un scan individuel
   */
  async generateIndividual(scanId: string, request: GenerateScanReportRequest): Promise<GenerateReportResponse> {
    const response = await authenticatedFetch(
      `/api/v1/reports/scans/${scanId}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = 'Failed to generate scan report';
      try {
        const error = JSON.parse(responseText);
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          errorMessage = error.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (error.detail && typeof error.detail === 'object') {
          errorMessage = error.detail.msg || error.detail.message || JSON.stringify(error.detail);
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        errorMessage = responseText || `Erreur HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error(`Réponse invalide du serveur: ${responseText.substring(0, 100)}`);
    }
  },

  /**
   * Génère un rapport écosystème scanner (multi-cibles)
   */
  async generateEcosystem(request: GenerateScanReportRequest, entityId?: string): Promise<GenerateReportResponse> {
    const params = entityId ? `?entity_id=${entityId}` : '';
    const response = await authenticatedFetch(
      `/api/v1/reports/scans/ecosystem/generate${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = 'Failed to generate ecosystem scan report';
      try {
        const error = JSON.parse(responseText);
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        errorMessage = responseText || `Erreur HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error(`Réponse invalide du serveur: ${responseText.substring(0, 100)}`);
    }
  },

  /**
   * Liste les rapports d'un scan spécifique
   */
  async list(params?: {
    scan_id?: string;
    entity_id?: string;
    report_scope?: 'scan_individual' | 'scan_ecosystem';
    status?: ReportStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<GeneratedReport>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    // Si un scan_id est fourni, utiliser l'endpoint spécifique
    let url: string;
    if (params?.scan_id) {
      url = `/api/v1/reports/scans/${params.scan_id}/reports?${searchParams.toString()}`;
    } else {
      // Sinon, utiliser l'endpoint écosystème
      url = `/api/v1/reports/scans/ecosystem/reports?${searchParams.toString()}`;
    }

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch scan reports');
    }

    return response.json();
  },
};

// ============================================================================
// HOOKS REACT (Optionnels)
// ============================================================================

/**
 * Hook pour sonder le statut d'un job en cours
 */
export function useJobPolling(
  jobId: string | null,
  options?: {
    interval?: number;
    onComplete?: (job: ReportGenerationJob) => void;
    onError?: (error: Error) => void;
  }
) {
  const interval = options?.interval || 2000; // 2 secondes par défaut

  const [job, setJob] = React.useState<ReportGenerationJob | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!jobId) return;

    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const jobStatus = await reportsApi.getJobStatus(jobId);
        setJob(jobStatus);

        // Arrêter le polling si terminé
        if (jobStatus.status === 'completed') {
          clearInterval(intervalId);
          options?.onComplete?.(jobStatus);
        } else if (jobStatus.status === 'failed' || jobStatus.status === 'cancelled') {
          clearInterval(intervalId);
          const err = new Error(jobStatus.error_message || 'Job failed');
          setError(err);
          options?.onError?.(err);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        clearInterval(intervalId);
        options?.onError?.(error);
      }
    };

    // Premier appel immédiat
    pollStatus();

    // Puis polling régulier
    intervalId = setInterval(pollStatus, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [jobId, interval, options]);

  return { job, error };
}

// Importer React si nécessaire pour le hook
import React from 'react';

// Export par défaut pour faciliter l'import
export default {
  templates: templatesApi,
  reports: reportsApi,
  scanReports: scanReportsApi,
  useJobPolling,
};
