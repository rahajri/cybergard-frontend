/**
 * Types pour les frameworks/référentiels (NIS2, RGPD, ISO27001, etc.)
 */

export interface Framework {
  id: string;
  code: string;
  name: string;
  description?: string;
  version?: string;
  is_active: boolean;
  requirements_count?: number;
  embeddings_count?: number;
  embedding_coverage?: number;
  mappings_count?: number;
  import_date?: string;
  statistics?: {
    total_requirements?: number;
    total_domains?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface FrameworkStats {
  total_frameworks: number;
  total_requirements: number;
  total_embeddings: number;
  total_mappings: number;
  average_embedding_coverage: number;
  frameworks_with_mappings: number;
  last_sync: string;
}

export interface CrossReferentialSummary {
  global_stats: FrameworkStats;
  frameworks: Framework[];
}

export interface FrameworkHierarchy {
  id: string;
  code: string;
  name: string;
  domains: FrameworkDomain[];
  statistics?: {
    total_domains?: number;
    total_requirements?: number;
  };
}

export interface FrameworkDomain {
  id: string;
  code: string;
  name: string;
  description?: string;
  requirements_count?: number;
  order_index?: number;
}
