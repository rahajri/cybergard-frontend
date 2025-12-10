/**
 * Types pour les utilisateurs
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  tenant_id?: string;
  organization_id?: string;
  default_org_id?: string;
  is_active: boolean;
  is_email_verified: boolean;
  role?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  actions_count?: number;
  evaluations_count?: number;
  organization_name?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_active: boolean;
  permissions?: Record<string, boolean>;
  created_at: string;
}

export type RoleCode =
  | 'ADMIN'
  | 'MANAGER'
  | 'SUPERADMIN'
  | 'RSSI'
  | 'RSSI_EXTERNE'
  | 'DIR_CONFORMITE_DPO'
  | 'DPO_EXTERNE'
  | 'CHEF_PROJET'
  | 'AUDITEUR'
  | 'AUDITE_RESP'
  | 'AUDITE_CONTRIB';
