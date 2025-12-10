/**
 * Types pour les campagnes d'audit
 */

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface CampaignUser {
  id: string;
  campaign_id: string;
  user_id: string;
  role: string;
  assigned_at: string;
}
