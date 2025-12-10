'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Star, AlertCircle, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CategoryParent {
  relationship_id: string;
  parent_category_id: string;
  parent_name: string;
  parent_entity_category: string;
  is_primary: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  entity_category: string;
}

interface ManageCategoryRelationshipsProps {
  categoryId: string;
  categoryName: string;
  onRelationshipsChanged?: () => void;
}

/**
 * Composant de gestion des relations many-to-many entre catégories
 *
 * Permet de:
 * - Voir tous les parents d'une catégorie
 * - Ajouter un nouveau parent
 * - Supprimer une relation parent-enfant
 * - Promouvoir une relation en primaire
 */
export default function ManageCategoryRelationships({
  categoryId,
  categoryName,
  onRelationshipsChanged
}: ManageCategoryRelationshipsProps) {
  const [parents, setParents] = useState<CategoryParent[]>([]);
  const [availableParents, setAvailableParents] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddParent, setShowAddParent] = useState(false);
  const [selectedNewParent, setSelectedNewParent] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Charger les parents actuels
  const fetchParents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Token manquant');

      const response = await fetch(
        `${API_BASE}/api/v1/hierarchy/categories/${categoryId}/parents`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erreur chargement parents');

      const data = await response.json();
      setParents(data || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur chargement parents:', err);
      toast.error('Erreur lors du chargement des relations');
    } finally {
      setLoading(false);
    }
  };

  // Charger les catégories racines disponibles (potentiels parents)
  const fetchAvailableParents = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Token manquant');

      // Récupérer toutes les catégories racines (celles sans parent)
      const response = await fetch(
        `${API_BASE}/api/v1/hierarchy/root-categories`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erreur chargement catégories');

      const data = await response.json();

      // Filtrer pour ne garder que celles qui ne sont pas déjà parents
      const parentIds = parents.map(p => p.parent_category_id);
      const available = data.filter((cat: Category) =>
        !parentIds.includes(cat.id) && cat.id !== categoryId
      );

      setAvailableParents(available);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur chargement catégories disponibles:', err);
    }
  };

  useEffect(() => {
    fetchParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useEffect(() => {
    if (showAddParent) {
      fetchAvailableParents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddParent, parents]);

  // Ajouter un nouveau parent
  const handleAddParent = async () => {
    if (!selectedNewParent) {
      toast.error('Veuillez sélectionner une catégorie parente');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Token manquant');

      const response = await fetch(
        `${API_BASE}/api/v1/hierarchy/categories/relationships`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent_category_id: selectedNewParent,
            child_category_id: categoryId,
            is_primary: parents.length === 0, // Si c'est le premier parent, le mettre en primaire
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur lors de la création de la relation');
      }

      const result = await response.json();
      toast.success(`✅ ${result.message}`);

      // Rafraîchir la liste
      await fetchParents();
      setShowAddParent(false);
      setSelectedNewParent('');

      if (onRelationshipsChanged) {
        onRelationshipsChanged();
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur ajout parent:', err);
      toast.error(error.message || 'Erreur lors de l\'ajout du parent');
    } finally {
      setSubmitting(false);
    }
  };

  // Promouvoir une relation en primaire
  const handlePromote = async (relationshipId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Token manquant');

      const response = await fetch(
        `${API_BASE}/api/v1/hierarchy/categories/relationships/${relationshipId}/promote`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erreur lors de la promotion');

      const result = await response.json();
      toast.success(`✅ ${result.message}`);

      await fetchParents();

      if (onRelationshipsChanged) {
        onRelationshipsChanged();
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur promotion:', err);
      toast.error('Erreur lors de la promotion de la relation');
    }
  };

  // Supprimer une relation
  const handleDelete = async (relationshipId: string, parentName: string) => {
    if (!confirm(`Voulez-vous vraiment retirer "${categoryName}" de "${parentName}" ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Token manquant');

      const response = await fetch(
        `${API_BASE}/api/v1/hierarchy/categories/relationships/${relationshipId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur lors de la suppression');
      }

      const result = await response.json();
      toast.success(`✅ ${result.message}`);

      if (result.entities_affected > 0) {
        toast.warning(`⚠️ ${result.warning}`);
      }

      await fetchParents();

      if (onRelationshipsChanged) {
        onRelationshipsChanged();
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur suppression:', err);
      toast.error(error.message || 'Erreur lors de la suppression de la relation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Relations Hiérarchiques</h3>
          <p className="text-sm text-gray-500">
            Gérez les contextes où &quot;{categoryName}&quot; apparaît
          </p>
        </div>
        <Button
          onClick={() => setShowAddParent(true)}
          disabled={showAddParent}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un parent
        </Button>
      </div>

      {/* Formulaire d'ajout de parent */}
      {showAddParent && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-blue-900">Ajouter une nouvelle relation</p>
            <button
              onClick={() => {
                setShowAddParent(false);
                setSelectedNewParent('');
              }}
              className="p-1 hover:bg-blue-100 rounded"
            >
              <X className="w-4 h-4 text-blue-700" />
            </button>
          </div>

          <select
            value={selectedNewParent}
            onChange={(e) => setSelectedNewParent(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Sélectionnez un parent --</option>
            {availableParents.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.entity_category})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button
              onClick={handleAddParent}
              disabled={!selectedNewParent || submitting}
              className="flex-1"
            >
              {submitting ? 'Ajout en cours...' : 'Ajouter'}
            </Button>
            <Button
              onClick={() => {
                setShowAddParent(false);
                setSelectedNewParent('');
              }}
              variant="outline"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Liste des parents */}
      {parents.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">Aucune relation parente</p>
          <p className="text-sm text-gray-500 mt-1">
            Cette catégorie n'a pas encore de parent
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {parents.map((parent) => (
            <div
              key={parent.relationship_id}
              className={`
                flex items-center gap-3 p-4 rounded-lg border-2
                ${parent.is_primary
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200'
                }
              `}
            >
              {/* Icône primaire */}
              {parent.is_primary && (
                <Star className="w-5 h-5 text-green-600 fill-green-600 flex-shrink-0" />
              )}

              {/* Chemin */}
              <div className="flex-1 flex items-center gap-2">
                <span className="font-medium text-gray-900">{parent.parent_name}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{categoryName}</span>
              </div>

              {/* Badge primaire */}
              {parent.is_primary && (
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">
                  Primaire
                </span>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!parent.is_primary && (
                  <button
                    onClick={() => handlePromote(parent.relationship_id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Définir comme primaire"
                  >
                    <Star className="w-4 h-4 text-gray-600 hover:text-green-600" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(parent.relationship_id, parent.parent_name)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer cette relation"
                  disabled={parents.length === 1}
                >
                  <Trash2 className={`w-4 h-4 ${parents.length === 1 ? 'text-gray-300' : 'text-red-600 hover:text-red-700'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note informative */}
      {parents.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Relations multiples détectées</p>
            <p className="mt-1 text-blue-700">
              La relation primaire (⭐) est utilisée par défaut lors de la création d'entités.
              Vous pouvez promouvoir une autre relation en cliquant sur l'icône étoile.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
