'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Tags,
  Users2
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';

// Types
interface Category {
  id: string;
  name: string;
  description?: string;
  entity_category?: string;
  short_code?: string;
  tenant_id: string | null;
  is_base_template: boolean;
  parent_category_id?: string | null;
  hierarchy_level?: number;
  stakeholder_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  isExpanded: boolean;
}

interface OrganizationInfo {
  client_organization_id: string;
  tenant_id: string | null;
  organization_name?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types de catégories externes
const ENTITY_CATEGORY_OPTIONS = [
  { value: 'client', label: 'Client' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'sous_traitant', label: 'Sous-traitant' },
  { value: 'partenaire', label: 'Partenaire' },
  { value: 'autre', label: 'Autre' }
];

export default function CategoriesListPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();

  // États principaux
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [domainId, setDomainId] = useState<string>('');

  // États pour les modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [actionResult, setActionResult] = useState<{ type: ModalType; message: string } | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entity_category: 'autre',
    parent_category_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // Charger l'organisation et le domaine
  useEffect(() => {
    if (!userLoading && user) {
      const orgId = user.organization_id || user.organizationId;
      const orgName = user.organization_name || user.organizationName;
      const tenantId = user.tenant_id || user.tenantId;

      if (!orgId) {
        setError('Votre compte n\'est pas associé à une organisation.');
        setLoading(false);
        return;
      }

      const orgInfo: OrganizationInfo = {
        client_organization_id: orgId,
        organization_name: orgName,
        tenant_id: tenantId || null
      };

      setOrganizationInfo(orgInfo);
      fetchExternalDomain();
    } else if (!userLoading && !user) {
      setError('Session expirée.');
      setTimeout(() => router.push('/login'), 2000);
    }
  }, [user, userLoading, router]);

  const fetchExternalDomain = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/hierarchy/domains`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const domains = await response.json();
        const externalDomain = domains.find((d: { stakeholder_type: string }) => d.stakeholder_type === 'external');

        if (externalDomain) {
          setDomainId(externalDomain.id);
          fetchCategories();
        } else {
          setError('Domaine Externe introuvable.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Erreur chargement domaine:', err);
      setError('Impossible de charger le domaine Externe.');
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/categories?stakeholder_type=external&limit=200`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const categoriesData = Array.isArray(data) ? data : (data.items || []);
        setCategories(categoriesData);

        // Construire l'arbre hiérarchique
        const tree = buildCategoriesTree(categoriesData);
        setCategoriesTree(tree);
      } else {
        setError('Erreur lors du chargement des catégories.');
      }
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setError('Impossible de charger les catégories.');
    } finally {
      setLoading(false);
    }
  };

  // Construire l'arbre hiérarchique des catégories
  const buildCategoriesTree = (categoriesData: Category[]): CategoryWithChildren[] => {
    const categoryMap = new Map<string, CategoryWithChildren>();

    // Créer tous les nœuds
    categoriesData.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
        isExpanded: false
      });
    });

    // Construire les relations parent-enfant
    const rootCategories: CategoryWithChildren[] = [];

    categoryMap.forEach(category => {
      if (!category.parent_category_id) {
        rootCategories.push(category);
      } else {
        const parent = categoryMap.get(category.parent_category_id);
        if (parent) {
          parent.children.push(category);
        } else {
          rootCategories.push(category);
        }
      }
    });

    return rootCategories;
  };

  // Toggle expansion d'une catégorie
  const toggleCategoryExpansion = (categoryId: string) => {
    const toggleRecursive = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
      return cats.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, isExpanded: !cat.isExpanded };
        }
        if (cat.children.length > 0) {
          return { ...cat, children: toggleRecursive(cat.children) };
        }
        return cat;
      });
    };

    setCategoriesTree(prev => toggleRecursive(prev));
  };

  // Filtrer les catégories
  const filterCategories = (cats: CategoryWithChildren[], term: string): CategoryWithChildren[] => {
    if (!term) return cats;

    const lowerTerm = term.toLowerCase();

    const filterRecursive = (catsList: CategoryWithChildren[]): CategoryWithChildren[] => {
      return catsList.reduce((acc: CategoryWithChildren[], cat) => {
        const matchesSelf =
          cat.name.toLowerCase().includes(lowerTerm) ||
          (cat.entity_category?.toLowerCase().includes(lowerTerm)) ||
          (cat.description?.toLowerCase().includes(lowerTerm));

        const filteredChildren = filterRecursive(cat.children);

        if (matchesSelf || filteredChildren.length > 0) {
          acc.push({
            ...cat,
            children: filteredChildren,
            isExpanded: filteredChildren.length > 0 ? true : cat.isExpanded
          });
        }

        return acc;
      }, []);
    };

    return filterRecursive(cats);
  };

  // Ouvrir le modal de création
  const handleOpenCreate = (parentCategoryId?: string) => {
    setFormData({
      name: '',
      description: '',
      entity_category: 'autre',
      parent_category_id: parentCategoryId || ''
    });
    setShowCreateModal(true);
  };

  // Ouvrir le modal d'édition
  const handleOpenEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      entity_category: category.entity_category || 'autre',
      parent_category_id: category.parent_category_id || ''
    });
    setShowEditModal(true);
  };

  // Ouvrir la confirmation de suppression
  const handleOpenDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteConfirm(true);
  };

  // Créer une catégorie
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom de la catégorie est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        entity_category: formData.entity_category,
        stakeholder_type: 'external',
        parent_category_id: formData.parent_category_id || null,
        client_organization_id: organizationInfo?.client_organization_id,
        tenant_id: organizationInfo?.tenant_id || null
      };

      const response = await fetch(`${API_BASE}/api/v1/hierarchy/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setActionResult({ type: 'success', message: 'Catégorie créée avec succès !' });
        fetchCategories();
      } else {
        const errorData = await response.json();
        setActionResult({ type: 'error', message: errorData.detail || 'Erreur lors de la création.' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: 'Une erreur est survenue.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Modifier une catégorie
  const handleEdit = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom de la catégorie est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        entity_category: formData.entity_category,
        parent_category_id: formData.parent_category_id || null
      };

      const response = await fetch(`${API_BASE}/api/v1/hierarchy/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedCategory(null);
        setActionResult({ type: 'success', message: 'Catégorie modifiée avec succès !' });
        fetchCategories();
      } else {
        const errorData = await response.json();
        setActionResult({ type: 'error', message: errorData.detail || 'Erreur lors de la modification.' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: 'Une erreur est survenue.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Supprimer une catégorie
  const handleDelete = async () => {
    if (!selectedCategory) return;

    setFormLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/hierarchy/categories/${selectedCategory.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        setSelectedCategory(null);
        setActionResult({ type: 'success', message: 'Catégorie supprimée avec succès !' });
        fetchCategories();
      } else {
        const errorData = await response.json();
        setActionResult({ type: 'error', message: errorData.detail || 'Erreur lors de la suppression.' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: 'Une erreur est survenue.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Obtenir le label d'une catégorie
  const getCategoryLabel = (entityCategory?: string): string => {
    const option = ENTITY_CATEGORY_OPTIONS.find(o => o.value === entityCategory);
    return option?.label || entityCategory || 'Autre';
  };

  // Obtenir la couleur d'un type de catégorie
  const getCategoryColor = (entityCategory?: string): string => {
    const colors: Record<string, string> = {
      'client': 'bg-green-50 text-green-700 border-green-200',
      'fournisseur': 'bg-orange-50 text-orange-700 border-orange-200',
      'sous_traitant': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'partenaire': 'bg-teal-50 text-teal-700 border-teal-200',
      'autre': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[entityCategory || 'autre'] || colors['autre'];
  };

  // Rendu récursif d'une catégorie
  const renderCategory = (category: CategoryWithChildren, depth: number = 0) => {
    const hasChildren = category.children.length > 0;
    const isUniversal = !category.tenant_id || category.is_base_template;

    return (
      <div key={category.id} className={depth > 0 ? 'ml-8 border-l-2 border-green-100 pl-4' : ''}>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Bouton expand/collapse */}
              <button
                onClick={() => toggleCategoryExpansion(category.id)}
                className={`p-1 rounded hover:bg-gray-100 transition-colors ${!hasChildren ? 'invisible' : ''}`}
              >
                {category.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-green-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-green-600" />
                )}
              </button>

              {/* Icône catégorie */}
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderTree className="w-5 h-5 text-green-600" />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${getCategoryColor(category.entity_category)}`}>
                    {getCategoryLabel(category.entity_category)}
                  </span>
                  {isUniversal && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                      Universel
                    </span>
                  )}
                  {hasChildren && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {category.children.length} sous-catégorie{category.children.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{category.description}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreate(category.id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Ajouter une sous-catégorie"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenEdit(category)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenDelete(category)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
                disabled={hasChildren}
              >
                <Trash2 className={`w-4 h-4 ${hasChildren ? 'opacity-50' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Enfants */}
        {category.isExpanded && hasChildren && (
          <div className="mt-2">
            {category.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Formulaire modal (création/édition)
  const renderFormModal = (isEdit: boolean) => {
    const parentCategoryOptions = categories.filter(c =>
      isEdit ? c.id !== selectedCategory?.id : true
    );

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderTree className="w-6 h-6" />
              <h3 className="text-lg font-semibold">
                {isEdit ? 'Modifier la catégorie' : 'Créer une catégorie'}
              </h3>
            </div>
            <button
              onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-6 space-y-4">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la catégorie <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Clients France, Fournisseurs IT..."
              />
            </div>

            {/* Type de catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de catégorie
              </label>
              <select
                value={formData.entity_category}
                onChange={(e) => setFormData(prev => ({ ...prev, entity_category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {ENTITY_CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Catégorie parente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie parente (optionnel)
              </label>
              <select
                value={formData.parent_category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_category_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Aucune (catégorie racine)</option>
                {parentCategoryOptions.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optionnel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Décrivez cette catégorie..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={formLoading}
            >
              Annuler
            </button>
            <button
              onClick={isEdit ? handleEdit : handleCreate}
              disabled={formLoading || !formData.name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit ? 'Modification...' : 'Création...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isEdit ? 'Modifier' : 'Créer'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loader
  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des catégories...</p>
        </div>
      </div>
    );
  }

  const filteredCategories = filterCategories(categoriesTree, searchTerm);
  const totalCategories = categories.length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 client" data-section="categories">
      {/* Header sticky - Pattern GUIDE_HEADER_STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderTree className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Catégories</h1>
                <p className="text-sm text-gray-600">
                  Organisez vos partenaires externes avec des catégories hiérarchiques
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenCreate()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer une catégorie
            </button>
          </div>
        </div>
      </div>

      {/* Content Container avec flex-1 - Pattern GUIDE_HEADER_STICKY */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {/* Barre de recherche et stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une catégorie..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                {totalCategories} catégorie{totalCategories > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Erreur</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Liste des catégories */}
        {filteredCategories.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
            <Tags className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Aucune catégorie trouvée' : 'Aucune catégorie créée'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              {searchTerm
                ? 'Aucune catégorie ne correspond à votre recherche.'
                : 'Créez votre première catégorie pour organiser vos partenaires externes.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => handleOpenCreate()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer une catégorie
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCategories.map(category => renderCategory(category))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && renderFormModal(false)}
      {showEditModal && renderFormModal(true)}

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer la catégorie"
        message={`Êtes-vous sûr de vouloir supprimer la catégorie "${selectedCategory?.name}" ? Cette action est irréversible.`}
        type="confirm"
        confirmText="Supprimer"
        confirmButtonColor="red"
      />

      {/* Modal de résultat */}
      {actionResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setActionResult(null)}
          title={actionResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={actionResult.message}
          type={actionResult.type}
        />
      )}
    </div>
  );
}
