/**
 * Système de mapping des libellés techniques vers des libellés utilisateur
 * Centralise tous les mappings pour une utilisation cohérente dans l'application
 */

// ==================== RÔLES INTERNES ====================
export const ROLE_LABELS: Record<string, string> = {
  // Rôles administratifs
  'super_admin': 'Super Administrateur',
  'admin': 'Administrateur',

  // Rôles métier
  'rssi': 'RSSI',
  'dpo': 'DPO',
  'chef_projet': 'Chef de Projet',
  'auditeur': 'Auditeur',
  'pilote': 'Pilote',
  'consultant': 'Consultant',

  // Rôles clients
  'client': 'Client',
  'viewer': 'Observateur',
  'manager': 'Manager',
  'owner': 'Propriétaire',
};

// ==================== RÔLES EXTERNES (Audités) ====================
export const EXTERNAL_ROLE_LABELS: Record<string, string> = {
  'audite_resp': 'Responsable',
  'audite_contrib': 'Contributeur',
  'audite_viewer': 'Observateur',
};

// ==================== STATUTS DE CAMPAGNE ====================
export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  'draft': 'Brouillon',
  'ongoing': 'En cours',
  'late': 'En retard',
  'frozen': 'Gelée',
  'completed': 'Terminée',
  'cancelled': 'Annulée',
};

// ==================== TYPES DE RÉCURRENCE ====================
export const RECURRENCE_TYPE_LABELS: Record<string, string> = {
  'once': 'Ponctuelle',
  'monthly': 'Mensuelle',
  'quarterly': 'Trimestrielle',
  'yearly': 'Annuelle',
};

// ==================== TYPES DE PÉRIMÈTRE ====================
export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  'internal': 'Interne',
  'external': 'Externe',
};

// ==================== TYPES D'ENTITÉS ====================
export const STAKEHOLDER_TYPE_LABELS: Record<string, string> = {
  'internal': 'Interne',
  'external': 'Externe',
};

// ==================== STATUTS D'ENTITÉ ====================
export const ENTITY_STATUS_LABELS: Record<string, string> = {
  'active': 'Actif',
  'inactive': 'Inactif',
  'archived': 'Archivé',
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Retourne le libellé utilisateur d'un rôle interne
 * @param role - Le code technique du rôle (ex: 'super_admin')
 * @returns Le libellé utilisateur (ex: 'Super Administrateur')
 */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Sans rôle';
  return ROLE_LABELS[role.toLowerCase()] || role;
}

/**
 * Retourne le libellé utilisateur d'un rôle externe (audité)
 * @param role - Le code technique du rôle (ex: 'audite_resp')
 * @returns Le libellé utilisateur (ex: 'Responsable')
 */
export function getExternalRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Sans rôle';
  return EXTERNAL_ROLE_LABELS[role.toLowerCase()] || role;
}

/**
 * Retourne le libellé utilisateur d'un statut de campagne
 * @param status - Le code technique du statut (ex: 'ongoing')
 * @returns Le libellé utilisateur (ex: 'En cours')
 */
export function getCampaignStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Inconnu';
  return CAMPAIGN_STATUS_LABELS[status.toLowerCase()] || status;
}

/**
 * Retourne le libellé utilisateur d'un type de récurrence
 * @param type - Le code technique du type (ex: 'monthly')
 * @returns Le libellé utilisateur (ex: 'Mensuelle')
 */
export function getRecurrenceTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Non spécifié';
  return RECURRENCE_TYPE_LABELS[type.toLowerCase()] || type;
}

/**
 * Retourne le libellé utilisateur d'un type de périmètre/campagne
 * @param type - Le code technique du type (ex: 'internal')
 * @returns Le libellé utilisateur (ex: 'Interne')
 */
export function getCampaignTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Non spécifié';
  return CAMPAIGN_TYPE_LABELS[type.toLowerCase()] || type;
}

/**
 * Retourne le libellé utilisateur d'un type d'entité
 * @param type - Le code technique du type (ex: 'internal')
 * @returns Le libellé utilisateur (ex: 'Interne')
 */
export function getStakeholderTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Non spécifié';
  return STAKEHOLDER_TYPE_LABELS[type.toLowerCase()] || type;
}

/**
 * Retourne le libellé utilisateur d'un statut d'entité
 * @param status - Le code technique du statut (ex: 'active')
 * @returns Le libellé utilisateur (ex: 'Actif')
 */
export function getEntityStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Inconnu';
  return ENTITY_STATUS_LABELS[status.toLowerCase()] || status;
}

/**
 * Retourne automatiquement le bon libellé selon le contexte (interne ou externe)
 * @param role - Le code technique du rôle
 * @param isExternal - true si c'est un rôle externe (audité), false si interne
 * @returns Le libellé utilisateur approprié
 */
export function getContextualRoleLabel(role: string | null | undefined, isExternal: boolean = false): string {
  return isExternal ? getExternalRoleLabel(role) : getRoleLabel(role);
}

// ==================== EXPORTS GROUPÉS ====================
const labels = {
  // Constantes
  ROLE_LABELS,
  EXTERNAL_ROLE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  RECURRENCE_TYPE_LABELS,
  CAMPAIGN_TYPE_LABELS,
  STAKEHOLDER_TYPE_LABELS,
  ENTITY_STATUS_LABELS,

  // Fonctions
  getRoleLabel,
  getExternalRoleLabel,
  getCampaignStatusLabel,
  getRecurrenceTypeLabel,
  getCampaignTypeLabel,
  getStakeholderTypeLabel,
  getEntityStatusLabel,
  getContextualRoleLabel,
};

export default labels;
