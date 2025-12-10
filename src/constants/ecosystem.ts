/**
 * Constantes pour le module Écosystème
 */

export const STAKEHOLDER_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
} as const;

export const INTERNAL_CATEGORIES = [
  { value: 'pole', label: 'Pôle', description: 'Grande division organisationnelle' },
  { value: 'service', label: 'Service', description: 'Unité opérationnelle' },
  { value: 'department', label: 'Département', description: 'Département fonctionnel' },
  { value: 'division', label: 'Division', description: 'Division spécialisée' },
] as const;

export const EXTERNAL_CATEGORIES = [
  { value: 'clients', label: 'Clients', description: 'Organisations clientes' },
  { value: 'fournisseurs', label: 'Fournisseurs', description: 'Prestataires et fournisseurs' },
  { value: 'sous_traitants', label: 'Sous-traitants', description: 'Sous-traitance' },
  { value: 'partenaires', label: 'Partenaires', description: 'Partenaires stratégiques' },
] as const;

export const ECOSYSTEM_TEXT = {
  // Titres
  createCategory: 'Créer une catégorie',
  newCategory: 'Nouvelle catégorie',
  
  // Labels
  stakeholderType: 'Type d\'écosystème',
  internal: 'Interne',
  external: 'Externe',
  categoryType: 'Type de catégorie',
  name: 'Nom de la catégorie',
  parent: 'Catégorie parente (optionnel)',
  description: 'Description',
  
  // Actions
  create: 'Créer la catégorie',
  cancel: 'Annuler',
  
  // Messages
  nameRequired: 'Le nom est obligatoire',
  categoryTypeRequired: 'Le type de catégorie est obligatoire',
  success: 'Catégorie créée avec succès',
  error: 'Erreur lors de la création',
} as const;