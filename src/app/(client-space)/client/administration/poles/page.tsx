'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Building,
  Users,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  FolderTree,
  MoreVertical
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
  hierarchy_level?: number;
  entity_count?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface PoleWithChildren extends Pole {
  children: PoleWithChildren[];
  isExpanded: boolean;
}

interface OrganizationInfo {
  client_organization_id: string;
  tenant_id: string | null;
  organization_name?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PolesListPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();

  // États principaux
  const [poles, setPoles] = useState<Pole[]>([]);
  const [polesTree, setPolesTree] = useState<PoleWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [domainId, setDomainId] = useState<string>('');

  // États pour les modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPole, setSelectedPole] = useState<Pole | null>(null);
  const [actionResult, setActionResult] = useState<{ type: ModalType; message: string } | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_code: '',
    parent_pole_id: ''
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
      fetchInternalDomain();
    } else if (!userLoading && !user) {
      setError('Session expirée.');
      setTimeout(() => router.push('/login'), 2000);
    }
  }, [user, userLoading, router]);

  const fetchInternalDomain = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/hierarchy/domains`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const domains = await response.json();
        const internalDomain = domains.find((d: { stakeholder_type: string }) => d.stakeholder_type === 'internal');

        if (internalDomain) {
          setDomainId(internalDomain.id);
          fetchPoles();
        } else {
          setError('Domaine Interne introuvable.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Erreur chargement domaine:', err);
      setError('Impossible de charger le domaine Interne.');
      setLoading(false);
    }
  };

  const fetchPoles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles?limit=200`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const polesData = data.items || data || [];
        setPoles(polesData);

        // Construire l'arbre hiérarchique
        const tree = buildPolesTree(polesData);
        setPolesTree(tree);
      } else {
        setError('Erreur lors du chargement des pôles.');
      }
    } catch (err) {
      console.error('Erreur chargement pôles:', err);
      setError('Impossible de charger les pôles.');
    } finally {
      setLoading(false);
    }
  };

  // Construire l'arbre hiérarchique des pôles
  const buildPolesTree = (polesData: Pole[]): PoleWithChildren[] => {
    const poleMap = new Map<string, PoleWithChildren>();

    // Créer tous les nœuds
    polesData.forEach(pole => {
      poleMap.set(pole.id, {
        ...pole,
        children: [],
        isExpanded: false
      });
    });

    // Construire les relations parent-enfant
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

  // Toggle expansion d'un pôle
  const togglePoleExpansion = (poleId: string) => {
    const toggleRecursive = (poles: PoleWithChildren[]): PoleWithChildren[] => {
      return poles.map(pole => {
        if (pole.id === poleId) {
          return { ...pole, isExpanded: !pole.isExpanded };
        }
        if (pole.children.length > 0) {
          return { ...pole, children: toggleRecursive(pole.children) };
        }
        return pole;
      });
    };

    setPolesTree(prev => toggleRecursive(prev));
  };

  // Filtrer les pôles
  const filterPoles = (poles: PoleWithChildren[], term: string): PoleWithChildren[] => {
    if (!term) return poles;

    const lowerTerm = term.toLowerCase();

    const filterRecursive = (polesList: PoleWithChildren[]): PoleWithChildren[] => {
      return polesList.reduce((acc: PoleWithChildren[], pole) => {
        const matchesSelf =
          pole.name.toLowerCase().includes(lowerTerm) ||
          (pole.short_code?.toLowerCase().includes(lowerTerm)) ||
          (pole.description?.toLowerCase().includes(lowerTerm));

        const filteredChildren = filterRecursive(pole.children);

        if (matchesSelf || filteredChildren.length > 0) {
          acc.push({
            ...pole,
            children: filteredChildren,
            isExpanded: filteredChildren.length > 0 ? true : pole.isExpanded
          });
        }

        return acc;
      }, []);
    };

    return filterRecursive(poles);
  };

  // Ouvrir le modal de création
  const handleOpenCreate = (parentPoleId?: string) => {
    setFormData({
      name: '',
      description: '',
      short_code: '',
      parent_pole_id: parentPoleId || ''
    });
    setShowCreateModal(true);
  };

  // Ouvrir le modal d'édition
  const handleOpenEdit = (pole: Pole) => {
    setSelectedPole(pole);
    setFormData({
      name: pole.name,
      description: pole.description || '',
      short_code: pole.short_code || '',
      parent_pole_id: pole.parent_pole_id || ''
    });
    setShowEditModal(true);
  };

  // Ouvrir la confirmation de suppression
  const handleOpenDelete = (pole: Pole) => {
    setSelectedPole(pole);
    setShowDeleteConfirm(true);
  };

  // Créer un pôle
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom du pôle est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        ecosystem_domain_id: domainId,
        tenant_id: organizationInfo?.tenant_id || null,
        client_organization_id: organizationInfo?.client_organization_id,
        name: formData.name,
        description: formData.description || null,
        short_code: formData.short_code || null,
        parent_pole_id: formData.parent_pole_id || null,
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
        setShowCreateModal(false);
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

  // Modifier un pôle
  const handleEdit = async () => {
    if (!selectedPole || !formData.name.trim()) {
      setActionResult({ type: 'error', message: 'Le nom du pôle est obligatoire.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        short_code: formData.short_code || null,
        parent_pole_id: formData.parent_pole_id || null
      };

      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles/${selectedPole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowEditModal(false);
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

  // Supprimer un pôle
  const handleDelete = async () => {
    if (!selectedPole) return;

    setFormLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles/${selectedPole.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
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

  // Rendu récursif d'un pôle
  const renderPole = (pole: PoleWithChildren, depth: number = 0) => {
    const hasChildren = pole.children.length > 0;
    const isUniversal = !pole.tenant_id || pole.is_base_template;

    return (
      <div key={pole.id} className={depth > 0 ? 'ml-8 border-l-2 border-blue-100 pl-4' : ''}>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-2 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Bouton expand/collapse */}
              <button
                onClick={() => togglePoleExpansion(pole.id)}
                className={`p-1 rounded hover:bg-gray-100 transition-colors ${!hasChildren ? 'invisible' : ''}`}
              >
                {pole.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-blue-600" />
                )}
              </button>

              {/* Icône pôle */}
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{pole.name}</h3>
                  {pole.short_code && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                      {pole.short_code}
                    </span>
                  )}
                  {isUniversal && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                      Universel
                    </span>
                  )}
                  {hasChildren && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {pole.children.length} sous-pôle{pole.children.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {pole.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{pole.description}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreate(pole.id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Ajouter un sous-pôle"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenEdit(pole)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenDelete(pole)}
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
        {pole.isExpanded && hasChildren && (
          <div className="mt-2">
            {pole.children.map(child => renderPole(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Formulaire modal (création/édition)
  const renderFormModal = (isEdit: boolean) => {
    const parentPoleOptions = poles.filter(p =>
      isEdit ? p.id !== selectedPole?.id : true
    );

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6" />
              <h3 className="text-lg font-semibold">
                {isEdit ? 'Modifier le pôle' : 'Créer un pôle'}
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
                Nom du pôle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Direction Générale, Pôle Innovation..."
              />
            </div>

            {/* Code court */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code court (optionnel)
              </label>
              <input
                type="text"
                value={formData.short_code}
                onChange={(e) => setFormData(prev => ({ ...prev, short_code: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: DG, INNOV, RH..."
                maxLength={10}
              />
            </div>

            {/* Pôle parent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pôle parent (optionnel)
              </label>
              <select
                value={formData.parent_pole_id}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_pole_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Aucun (pôle racine)</option>
                {parentPoleOptions.map(pole => (
                  <option key={pole.id} value={pole.id}>{pole.name}</option>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Décrivez le rôle de ce pôle..."
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des pôles...</p>
        </div>
      </div>
    );
  }

  const filteredPoles = filterPoles(polesTree, searchTerm);
  const totalPoles = poles.length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 client" data-section="poles">
      {/* Header sticky - Pattern GUIDE_HEADER_STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Pôles</h1>
                <p className="text-sm text-gray-600">
                  Organisez votre structure interne avec des pôles hiérarchiques
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenCreate()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer un pôle
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
                placeholder="Rechercher un pôle..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                {totalPoles} pôle{totalPoles > 1 ? 's' : ''}
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

        {/* Liste des pôles */}
        {filteredPoles.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
            <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Aucun pôle trouvé' : 'Aucun pôle créé'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              {searchTerm
                ? 'Aucun pôle ne correspond à votre recherche.'
                : 'Créez votre premier pôle pour organiser votre structure interne.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => handleOpenCreate()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Créer un pôle
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPoles.map(pole => renderPole(pole))}
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
          setSelectedPole(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer le pôle"
        message={`Êtes-vous sûr de vouloir supprimer le pôle "${selectedPole?.name}" ? Cette action est irréversible.`}
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
