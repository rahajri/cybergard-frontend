'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Star } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CategoryContext {
  path: string;
  parent_id: string;
  parent_name: string;
  is_primary: boolean;
}

interface CategoryWithContextsData {
  category_id: string;
  category_name: string;
  entity_category: string;
  contexts: CategoryContext[];
}

interface CategoryWithContextsProps {
  categoryId: string;
  onContextsLoaded?: (contexts: CategoryContext[]) => void;
}

/**
 * Composant qui affiche tous les contextes hiérarchiques d'une catégorie
 *
 * Exemple: MAROC peut avoir ces contextes:
 * - Fournisseurs → MAROC (primaire)
 * - Clients → MAROC
 * - Partenaires → MAROC
 */
export default function CategoryWithContexts({
  categoryId,
  onContextsLoaded
}: CategoryWithContextsProps) {
  const [data, setData] = useState<CategoryWithContextsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Token d\'authentification manquant');
        }

        const response = await fetch(
          `${API_BASE}/api/v1/hierarchy/categories/${categoryId}/contexts`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Erreur lors du chargement des contextes');
        }

        const contextData = await response.json();
        setData(contextData);

        if (onContextsLoaded) {
          onContextsLoaded(contextData.contexts);
        }
      } catch (err: unknown) {
      const error = err as Error;
        console.error('❌ Erreur chargement contextes:', err);
        setError(error.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchContexts();
    }
  }, [categoryId, onContextsLoaded]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Chargement des contextes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Erreur: {error}
      </div>
    );
  }

  if (!data || data.contexts.length === 0) {
    return null;
  }

  // Si une seule relation, affichage simple
  if (data.contexts.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="font-medium">{data.contexts[0].path}</span>
      </div>
    );
  }

  // Si plusieurs relations, affichage avec indicateur primaire
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Cette catégorie apparaît dans {data.contexts.length} contextes:
      </p>
      <div className="space-y-1">
        {data.contexts.map((context, index) => (
          <div
            key={`${context.parent_id}-${index}`}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md text-sm
              ${context.is_primary
                ? 'bg-green-50 border-2 border-green-200'
                : 'bg-gray-50 border border-gray-200'
              }
            `}
          >
            {context.is_primary && (
              <span title="Contexte primaire">
                <Star className="w-4 h-4 text-green-600 fill-green-600" />
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className={context.is_primary ? 'font-semibold text-gray-900' : 'text-gray-700'}>
              {context.path}
            </span>
            {context.is_primary && (
              <span className="ml-auto text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                Primaire
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 italic mt-2">
        💡 Le contexte primaire (marqué avec ⭐) est celui utilisé par défaut lors de la création d'entités
      </p>
    </div>
  );
}
