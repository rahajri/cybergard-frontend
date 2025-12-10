'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
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
  Building,
  Users2,
  Network
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';

// Types
interface Pole {
  id: string;
  name: string;
  description?: string;
  short_code?: string;
  tenant_id: string | null;
  is_base_template: boolean;
  parent_pole_id?: string | null;
}

interface PoleWithChildren extends Pole {
  children: PoleWithChildren[];
  isExpanded: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  entity_category?: string;
  tenant_id: string | null;
  is_base_template: boolean;
  parent_category_id?: string | null;
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

type ActiveTab = 'poles' | 'categories';

export default function PolesCategoriesPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();

  // Tab actif
  const [activeTab, setActiveTab] = useState<ActiveTab>('poles');

  // États Pôles
  const [poles, setPoles] = useState<Pole[]>([]);
  const [polesTree, setPolesTree] = useState<PoleWithChildren[]>([]);
  const [loadingPoles, setLoadingPoles] = useState(true);

  // États Catégories
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<CategoryWithChildren[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // États communs
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [internalDomainId, setInternalDomainId] = useState<string>('');
  const [externalDomainId, setExternalDomainId] = useState<string>('');

  // États pour les modals de pôles
  const [showCreatePoleModal, setShowCreatePoleModal] = useState(false);
  const [showEditPoleModal, setShowEditPoleModal] = useState(false);
  const [showDeletePoleConfirm, setShowDeletePoleConfirm] = useState(false);
  const [selectedPole, setSelectedPole] = useState<Pole | null>(null);

  // États pour les modals de catégories
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // États formulaires
  const [poleFormData, setPoleFormData] = useState({
    name: '',
    description: '',
    short_code: '',
    parent_pole_id: ''
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    entity_category: 'autre',
    parent_category_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: ModalType; message: string } | null>(null);

  // Charger l'organisation et les domaines
  useEffect(() => {
    if (!userLoading && user) {
      const orgId = user.organization_id || user.organizationId;
      const orgName = user.organization_name || user.organizationName;
      const tenantId = user.tenant_id || user.tenantId;

      if (!orgId) {
        setError('Votre compte n\'est pas associé à une organisation.');
        setLoadingPoles(false);
        setLoadingCategories(false);
        return;
      }

      const orgInfo: OrganizationInfo = {
        client_organization_id: orgId,
        organization_name: orgName,
        tenant_id: tenantId || null
      };

      setOrganizationInfo(orgInfo);
      fetchDomains();
    } else if (!userLoading && !user) {
      setError('Session expirée.');
      setTimeout(() => router.push('/login'), 2000);
    }
  }, [user, userLoading, router]);

  const fetchDomains = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/hierarchy/domains`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const domains = await response.json();
        const internalDomain = domains.find((d: { stakeholder_type: string }) => d.stakeholder_type === 'internal');
        const externalDomain = domains.find((d: { stakeholder_type: string }) => d.stakeholder_type === 'external');

        if (internalDomain) {
          setInternalDomainId(internalDomain.id);
          fetchPoles();
        }
        if (externalDomain) {
          setExternalDomainId(externalDomain.id);
          fetchCategories();
        }
      }
    } catch (err) {
      console.error('Erreur chargement domaines:', err);
      setError('Impossible de charger les domaines.');
      setLoadingPoles(false);
      setLoadingCategories(false);
    }
  };

  // ================== PÔLES ==================

  const fetchPoles = async () => {
    setLoadingPoles(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles?limit=200`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const polesData = data.items || data || [];
        setPoles(polesData);
        setPolesTree(buildPolesTree(polesData));
      }
    } catch (err) {
      console.error('Erreur chargement pôles:', err);
    } finally {
      setLoadingPoles(false);
    }
  };

  const buildPolesTree = (polesData: Pole[]): PoleWithChildren[] => {
    const poleMap = new Map<string, PoleWithChildren>();

    polesData.forEach(pole => {
      poleMap.set(pole.id, { ...pole, children: [], isExpanded: false });
    });

    const rootPoles: PoleWithChildren[] = [];

    poleMap.forEach(pole => {
      if (!pole.parent_pole_id) {
        rootPoles.push(pole);
      } else {
        const parent = poleMap.get(pole.parent_pole_id);
        if (parent) {
          parent.children.push(pole);
        } else {
          rootPoles.push(pole);
        }
      }
    });

    return rootPoles;
  };

  const togglePoleExpansion = (poleId: string) => {
    const toggleRecursive = (poles: PoleWithChildren[]): PoleWithChildren[] => {
      return poles.map(pole => {
        if (pole.id === poleId) return { ...pole, isExpanded: !pole.isExpanded };
        if (pole.children.length > 0) return { ...pole, children: toggleRecursive(pole.children) };
        return pole;
      });
    };
    setPolesTree(prev => toggleRecursive(prev));
  };

  const handleOpenCreatePole = (parentPoleId?: string) => {
    setPoleFormData({ name: '', description: '', short_code: '', parent_pole_id: parentPoleId || '' });
    setShowCreatePoleModal(true);
  };

  const handleOpenEditPole = (pole: Pole) => {
    setSelectedPole(pole);
    setPoleFormData({
      name: pole.name,
      description: pole.description || '',
      short_code: pole.short_code || '',
      parent_pole_id: pole.parent_pole_id || ''
    });
    setShowEditPoleModal(true);
  };

  const handleOpenDeletePole = (pole: Pole) => {
    setSelectedPole(pole);
    setShowDeletePoleConfirm(true);
  };

  const handleCreatePole = async () => {
    if (!poleFormData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom du pôle est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        ecosystem_domain_id: internalDomainId,
        tenant_id: organizationInfo?.tenant_id || null,
        client_organization_id: organizationInfo?.client_organization_id,
        name: poleFormData.name,
        description: poleFormData.description || null,
        short_code: poleFormData.short_code || null,
        parent_pole_id: poleFormData.parent_pole_id || null,
        is_base_template: false,
        status: 'active',
        is_active: true
      };

      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowCreatePoleModal(false);
        setActionResult({ type: 'success', message: 'Pôle créé avec succès !' });
        fetchPoles();
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

  const handleEditPole = async () => {
    if (!selectedPole || !poleFormData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom du pôle est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: poleFormData.name,
        description: poleFormData.description || null,
        short_code: poleFormData.short_code || null,
        parent_pole_id: poleFormData.parent_pole_id || null
      };

      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles/${selectedPole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowEditPoleModal(false);
        setSelectedPole(null);
        setActionResult({ type: 'success', message: 'Pôle modifié avec succès !' });
        fetchPoles();
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

  const handleDeletePole = async () => {
    if (!selectedPole) return;

    setFormLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles/${selectedPole.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        setShowDeletePoleConfirm(false);
        setSelectedPole(null);
        setActionResult({ type: 'success', message: 'Pôle supprimé avec succès !' });
        fetchPoles();
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

  // ================== CATÉGORIES ==================

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/categories?stakeholder_type=external&limit=200`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const categoriesData = Array.isArray(data) ? data : (data.items || []);
        setCategories(categoriesData);
        setCategoriesTree(buildCategoriesTree(categoriesData));
      }
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const buildCategoriesTree = (categoriesData: Category[]): CategoryWithChildren[] => {
    const categoryMap = new Map<string, CategoryWithChildren>();

    categoriesData.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [], isExpanded: false });
    });

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

  const toggleCategoryExpansion = (categoryId: string) => {
    const toggleRecursive = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
      return cats.map(cat => {
        if (cat.id === categoryId) return { ...cat, isExpanded: !cat.isExpanded };
        if (cat.children.length > 0) return { ...cat, children: toggleRecursive(cat.children) };
        return cat;
      });
    };
    setCategoriesTree(prev => toggleRecursive(prev));
  };

  const handleOpenCreateCategory = (parentCategoryId?: string) => {
    setCategoryFormData({ name: '', description: '', entity_category: 'autre', parent_category_id: parentCategoryId || '' });
    setShowCreateCategoryModal(true);
  };

  const handleOpenEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      entity_category: category.entity_category || 'autre',
      parent_category_id: category.parent_category_id || ''
    });
    setShowEditCategoryModal(true);
  };

  const handleOpenDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteCategoryConfirm(true);
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom de la catégorie est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        entity_category: categoryFormData.entity_category,
        stakeholder_type: 'external',
        parent_category_id: categoryFormData.parent_category_id || null,
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
        setShowCreateCategoryModal(false);
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

  const handleEditCategory = async () => {
    if (!selectedCategory || !categoryFormData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom de la catégorie est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        entity_category: categoryFormData.entity_category,
        parent_category_id: categoryFormData.parent_category_id || null
      };

      const response = await fetch(`${API_BASE}/api/v1/hierarchy/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowEditCategoryModal(false);
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

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    setFormLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/hierarchy/categories/${selectedCategory.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        setShowDeleteCategoryConfirm(false);
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

  // ================== HELPERS ==================

  const getCategoryLabel = (entityCategory?: string): string => {
    const option = ENTITY_CATEGORY_OPTIONS.find(o => o.value === entityCategory);
    return option?.label || entityCategory || 'Autre';
  };

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

  // Filtrage
  const filterPoles = (poles: PoleWithChildren[], term: string): PoleWithChildren[] => {
    if (!term) return poles;
    const lowerTerm = term.toLowerCase();

    const filterRecursive = (polesList: PoleWithChildren[]): PoleWithChildren[] => {
      return polesList.reduce((acc: PoleWithChildren[], pole) => {
        const matchesSelf = pole.name.toLowerCase().includes(lowerTerm) ||
          (pole.short_code?.toLowerCase().includes(lowerTerm)) ||
          (pole.description?.toLowerCase().includes(lowerTerm));
        const filteredChildren = filterRecursive(pole.children);
        if (matchesSelf || filteredChildren.length > 0) {
          acc.push({ ...pole, children: filteredChildren, isExpanded: filteredChildren.length > 0 ? true : pole.isExpanded });
        }
        return acc;
      }, []);
    };
    return filterRecursive(poles);
  };

  const filterCategories = (cats: CategoryWithChildren[], term: string): CategoryWithChildren[] => {
    if (!term) return cats;
    const lowerTerm = term.toLowerCase();

    const filterRecursive = (catsList: CategoryWithChildren[]): CategoryWithChildren[] => {
      return catsList.reduce((acc: CategoryWithChildren[], cat) => {
        const matchesSelf = cat.name.toLowerCase().includes(lowerTerm) ||
          (cat.entity_category?.toLowerCase().includes(lowerTerm)) ||
          (cat.description?.toLowerCase().includes(lowerTerm));
        const filteredChildren = filterRecursive(cat.children);
        if (matchesSelf || filteredChildren.length > 0) {
          acc.push({ ...cat, children: filteredChildren, isExpanded: filteredChildren.length > 0 ? true : cat.isExpanded });
        }
        return acc;
      }, []);
    };
    return filterRecursive(cats);
  };

  // ================== RENDER ==================

  const renderPole = (pole: PoleWithChildren, depth: number = 0) => {
    const hasChildren = pole.children.length > 0;
    const isUniversal = !pole.tenant_id || pole.is_base_template;

    return (
      <div key={pole.id} className={depth > 0 ? 'ml-8 border-l-2 border-blue-100 pl-4' : ''}>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => togglePoleExpansion(pole.id)}
                className={`p-1 rounded hover:bg-gray-100 transition-colors ${!hasChildren ? 'invisible' : ''}`}
              >
                {pole.isExpanded ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
              </button>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 truncate">{pole.name}</h3>
                  {pole.short_code && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{pole.short_code}</span>
                  )}
                  {isUniversal && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Universel</span>
                  )}
                  {hasChildren && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {pole.children.length} sous-pôle{pole.children.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {pole.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{pole.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleOpenCreatePole(pole.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Ajouter un sous-pôle">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => handleOpenEditPole(pole)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleOpenDeletePole(pole)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer" disabled={hasChildren}>
                <Trash2 className={`w-4 h-4 ${hasChildren ? 'opacity-50' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        {pole.isExpanded && hasChildren && (
          <div className="mt-2">{pole.children.map(child => renderPole(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const renderCategory = (category: CategoryWithChildren, depth: number = 0) => {
    const hasChildren = category.children.length > 0;
    const isUniversal = !category.tenant_id || category.is_base_template;

    return (
      <div key={category.id} className={depth > 0 ? 'ml-8 border-l-2 border-green-100 pl-4' : ''}>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => toggleCategoryExpansion(category.id)}
                className={`p-1 rounded hover:bg-gray-100 transition-colors ${!hasChildren ? 'invisible' : ''}`}
              >
                {category.isExpanded ? <ChevronDown className="w-5 h-5 text-green-600" /> : <ChevronRight className="w-5 h-5 text-green-600" />}
              </button>
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderTree className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${getCategoryColor(category.entity_category)}`}>
                    {getCategoryLabel(category.entity_category)}
                  </span>
                  {isUniversal && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Universel</span>
                  )}
                  {hasChildren && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {category.children.length} sous-catégorie{category.children.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {category.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{category.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleOpenCreateCategory(category.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Ajouter une sous-catégorie">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => handleOpenEditCategory(category)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleOpenDeleteCategory(category)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer" disabled={hasChildren}>
                <Trash2 className={`w-4 h-4 ${hasChildren ? 'opacity-50' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        {category.isExpanded && hasChildren && (
          <div className="mt-2">{category.children.map(child => renderCategory(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  // Modal Pôle
  const renderPoleFormModal = (isEdit: boolean) => {
    const parentPoleOptions = poles.filter(p => isEdit ? p.id !== selectedPole?.id : true);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6" />
              <h3 className="text-lg font-semibold">{isEdit ? 'Modifier le pôle' : 'Créer un pôle'}</h3>
            </div>
            <button onClick={() => isEdit ? setShowEditPoleModal(false) : setShowCreatePoleModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du pôle <span className="text-red-500">*</span></label>
              <input type="text" value={poleFormData.name} onChange={(e) => setPoleFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ex: Direction Générale..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code court (optionnel)</label>
              <input type="text" value={poleFormData.short_code} onChange={(e) => setPoleFormData(prev => ({ ...prev, short_code: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ex: DG, RH..." maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pôle parent (optionnel)</label>
              <select value={poleFormData.parent_pole_id} onChange={(e) => setPoleFormData(prev => ({ ...prev, parent_pole_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Aucun (pôle racine)</option>
                {parentPoleOptions.map(pole => <option key={pole.id} value={pole.id}>{pole.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
              <textarea value={poleFormData.description} onChange={(e) => setPoleFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} placeholder="Décrivez ce pôle..." />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button onClick={() => isEdit ? setShowEditPoleModal(false) : setShowCreatePoleModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100" disabled={formLoading}>Annuler</button>
            <button onClick={isEdit ? handleEditPole : handleCreatePole} disabled={formLoading || !poleFormData.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? 'Modification...' : 'Création...'}</> : <><CheckCircle className="w-4 h-4" />{isEdit ? 'Modifier' : 'Créer'}</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal Catégorie
  const renderCategoryFormModal = (isEdit: boolean) => {
    const parentCategoryOptions = categories.filter(c => isEdit ? c.id !== selectedCategory?.id : true);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderTree className="w-6 h-6" />
              <h3 className="text-lg font-semibold">{isEdit ? 'Modifier la catégorie' : 'Créer une catégorie'}</h3>
            </div>
            <button onClick={() => isEdit ? setShowEditCategoryModal(false) : setShowCreateCategoryModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la catégorie <span className="text-red-500">*</span></label>
              <input type="text" value={categoryFormData.name} onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Ex: Clients France..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de catégorie</label>
              <select value={categoryFormData.entity_category} onChange={(e) => setCategoryFormData(prev => ({ ...prev, entity_category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                {ENTITY_CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie parente (optionnel)</label>
              <select value={categoryFormData.parent_category_id} onChange={(e) => setCategoryFormData(prev => ({ ...prev, parent_category_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option value="">Aucune (catégorie racine)</option>
                {parentCategoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
              <textarea value={categoryFormData.description} onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" rows={3} placeholder="Décrivez cette catégorie..." />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button onClick={() => isEdit ? setShowEditCategoryModal(false) : setShowCreateCategoryModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100" disabled={formLoading}>Annuler</button>
            <button onClick={isEdit ? handleEditCategory : handleCreateCategory} disabled={formLoading || !categoryFormData.name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
              {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? 'Modification...' : 'Création...'}</> : <><CheckCircle className="w-4 h-4" />{isEdit ? 'Modifier' : 'Créer'}</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loader
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const filteredPoles = filterPoles(polesTree, searchTerm);
  const filteredCategories = filterCategories(categoriesTree, searchTerm);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 client" data-section="poles-categories">
      {/* Header sticky - Pattern GUIDE_HEADER_STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Network className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pôles & Catégories</h1>
                <p className="text-sm text-gray-600">
                  Gérez la structure de votre écosystème interne et externe
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenCreatePole()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Nouveau pôle
              </button>
              <button
                onClick={() => handleOpenCreateCategory()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FolderTree className="w-4 h-4" />
                Nouvelle catégorie
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container avec flex-1 - Pattern GUIDE_HEADER_STICKY */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total Pôles */}
          <div className="bg-white border border-blue-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Pôles Internes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{poles.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Layers className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Catégories */}
          <div className="bg-white border border-green-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Catégories Externes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{categories.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <FolderTree className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Pôles racines (sans parent) */}
          <div className="bg-white border border-purple-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Pôles Racines</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {poles.filter(p => !p.parent_pole_id).length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Total éléments */}
          <div className="bg-white border border-emerald-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Total Éléments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{poles.length + categories.length}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Network className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium text-sm">
                {poles.length} pôle{poles.length > 1 ? 's' : ''}
              </span>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium text-sm">
                {categories.length} catégorie{categories.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('poles')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'poles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building className="w-4 h-4" />
              Pôles internes
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'poles' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {poles.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'categories'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users2 className="w-4 h-4" />
              Catégories externes
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'categories' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {categories.length}
              </span>
            </button>
          </div>
        </div>

        {/* Contenu des tabs */}
        {activeTab === 'poles' && (
          <>
            {loadingPoles ? (
              <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">Chargement des pôles...</p>
              </div>
            ) : filteredPoles.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
                <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Aucun pôle trouvé' : 'Aucun pôle créé'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-4">
                  {searchTerm ? 'Aucun pôle ne correspond à votre recherche.' : 'Créez votre premier pôle pour organiser votre structure interne.'}
                </p>
                {!searchTerm && (
                  <button onClick={() => handleOpenCreatePole()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Créer un pôle
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">{filteredPoles.map(pole => renderPole(pole))}</div>
            )}
          </>
        )}

        {activeTab === 'categories' && (
          <>
            {loadingCategories ? (
              <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto" />
                <p className="mt-4 text-gray-600">Chargement des catégories...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
                <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Aucune catégorie trouvée' : 'Aucune catégorie créée'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-4">
                  {searchTerm ? 'Aucune catégorie ne correspond à votre recherche.' : 'Créez votre première catégorie pour organiser vos partenaires externes.'}
                </p>
                {!searchTerm && (
                  <button onClick={() => handleOpenCreateCategory()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Créer une catégorie
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">{filteredCategories.map(category => renderCategory(category))}</div>
            )}
          </>
        )}
      </div>

      {/* Modals Pôles */}
      {showCreatePoleModal && renderPoleFormModal(false)}
      {showEditPoleModal && renderPoleFormModal(true)}

      {/* Modals Catégories */}
      {showCreateCategoryModal && renderCategoryFormModal(false)}
      {showEditCategoryModal && renderCategoryFormModal(true)}

      {/* Confirmations de suppression */}
      <ConfirmModal
        isOpen={showDeletePoleConfirm}
        onClose={() => { setShowDeletePoleConfirm(false); setSelectedPole(null); }}
        onConfirm={handleDeletePole}
        title="Supprimer le pôle"
        message={`Êtes-vous sûr de vouloir supprimer le pôle "${selectedPole?.name}" ? Cette action est irréversible.`}
        type="confirm"
        confirmText="Supprimer"
        confirmButtonColor="red"
      />

      <ConfirmModal
        isOpen={showDeleteCategoryConfirm}
        onClose={() => { setShowDeleteCategoryConfirm(false); setSelectedCategory(null); }}
        onConfirm={handleDeleteCategory}
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
