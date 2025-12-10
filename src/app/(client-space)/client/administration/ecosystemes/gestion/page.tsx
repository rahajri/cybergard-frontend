'use client';
import '@/app/styles/client-header.css';
import '@/app/styles/ecosystem.css';
import React, { useState, useEffect } from 'react';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import {
  Building2,
  Users,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  List,
  Edit2,
  Check,
  X,
  UserPlus,
  Briefcase,
  Globe,
  Building,
  Trash2,
  MoreVertical
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EditOrganismModal from '../../components/EditOrganismModal';
import DeleteOrganismModal from '../../components/DeleteOrganismModal';
import { authenticatedFetch } from '@/lib/api';
import OrganismSuccessModal from '../../components/OrganismSuccessModal';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

interface EcosystemEntity {
  id: string;
  name: string;
  legal_name?: string;
  trade_name?: string;
  short_name?: string;
  siret?: string;
  siren?: string;
  ape_code?: string;
  country_code: string;
  status: 'active' | 'pending' | 'inactive';
  stakeholder_type?: 'internal' | 'external';
  
  // Contacts
  legal_representative_contact_id?: string;
  legal_representative_firstname?: string;
  legal_representative_lastname?: string;
  dpo_contact_id?: string;
  dpo_firstname?: string;
  dpo_lastname?: string;
  has_dpo: boolean;
  
  // Hiérarchie
  pole_id?: string;
  category_id?: string;
  hierarchy_level: number;
  parent_entity_id?: string;
  
  // Adresse
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  postal_code?: string;
  city?: string;
  region?: string;
  
  // Informations complémentaires
  sector?: string;
  size_category?: string;
  employee_count?: number;
  annual_revenue?: number;
  description?: string;
  
  // Données INSEE
  insee_data?: Record<string, unknown>;
  insee_last_sync?: string;
}

interface Pole {
  id: string;
  name: string;
  code: string;
  entities: EcosystemEntity[];
  children?: Pole[];
  isExpanded: boolean;
  is_base_template?: boolean;
  tenant_id?: string | null;
  parent_pole_id?: string | null;
  hierarchy_level?: number;
  hierarchy_path?: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  entity_category?: string;
  entities: EcosystemEntity[];
  children?: Category[];
  parent_category_id?: string | null;
  isExpanded: boolean;
  is_base_template?: boolean;
  tenant_id?: string | null;
}

interface EcosystemDomain {
  id: string;
  name: string;
  stakeholder_type: 'internal' | 'external';
  poles?: Pole[];
  categories?: Category[];
  isExpanded: boolean;
}

export default function GestionEcosystemePage() {
  const [domains, setDomains] = useState<EcosystemDomain[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [unassignedEntities, setUnassignedEntities] = useState<EcosystemEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ entityId: string; field: 'representative' | 'dpo' } | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [selectedOrganism, setSelectedOrganism] = useState<EcosystemEntity | null>(null);
  const [availableRepresentatives, setAvailableRepresentatives] = useState<User[]>([]);
  const [availableDPOs, setAvailableDPOs] = useState<User[]>([]);
  
  useEffect(() => {
    loadData();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Utilisateur non connecté');
      }

      const user = JSON.parse(userStr);
      const orgId = user.organizationId;

      if (!orgId) {
        throw new Error('Organization ID manquant');
      }

      console.log('🔍 [GESTION] Chargement pour orgId:', orgId);

      // Charger les utilisateurs
      const usersResponse = await authenticatedFetch(
        `/api/v1/users?tenant_id=${user.tenantId}&is_active=true`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.items || []);
        console.log('✅ [GESTION] Users chargés:', usersData.items?.length || 0);
      }

      // Charger les entités
      const entitiesResponse = await authenticatedFetch(
        `/api/v1/ecosystem/entities?client_organization_id=${orgId}&limit=1000`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!entitiesResponse.ok) {
        // Capturer le code HTTP et le message détaillé pour un affichage cohérent
        const errorData = await entitiesResponse.json().catch(() => ({}));
        const statusCode = entitiesResponse.status;
        const errorMessage = errorData.detail || entitiesResponse.statusText || 'Erreur inconnue';
        throw new Error(`Erreur ${statusCode}: ${errorMessage}`);
      }

      const entitiesData = await entitiesResponse.json();
      console.log('✅ [GESTION] Entités reçues:', entitiesData.total);
      
      const allEntities = entitiesData.items.filter(
        (e: unknown) => {const entity = e as Record<string, unknown>; return !entity.is_domain && !entity.is_base_template}
      );

      console.log('📊 [GESTION] Entités filtrées:', allEntities.length);

      // ✅ CORRECTION : Charger les pôles avec le bon endpoint
      const polesResponse = await authenticatedFetch(
        `/api/v1/ecosystem/poles?client_organization_id=${orgId}&limit=100`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      const polesData = polesResponse.ok ? await polesResponse.json() : { items: [] };
      const poles = polesData.items || [];
      console.log('✅ [GESTION] Pôles chargés:', poles.length);
      console.log('🔍 [DEBUG] Pôles bruts:', poles.map((p: unknown) => {
        const pole = p as Record<string, unknown>;
        return {
          id: pole.id,
          name: pole.name,
          parent_pole_id: pole.parent_pole_id,
          hierarchy_level: pole.hierarchy_level
        };
      }));

      // ✅ CORRECTION : Charger les catégories avec stakeholder_type=external
      const categoriesResponse = await authenticatedFetch(
        `/api/v1/ecosystem/categories?stakeholder_type=external&client_organization_id=${orgId}&limit=100`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      let categoriesData;
      if (categoriesResponse.ok) {
        categoriesData = await categoriesResponse.json();
      } else {
        // Fallback : essayer sans client_organization_id (pour avoir au moins les templates)
        console.warn('⚠️ [GESTION] Tentative avec templates uniquement');
        const fallbackResponse = await authenticatedFetch(
          `/api/v1/ecosystem/categories?stakeholder_type=external`,
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          }
        );
        categoriesData = fallbackResponse.ok ? await fallbackResponse.json() : { items: [] };
      }

      const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData.items || []);
      console.log('✅ [GESTION] Catégories chargées:', categories.length);

      // Construire la hiérarchie des pôles
      const poleHierarchy = buildHierarchy(poles, 'parent_pole_id');
      console.log('🌳 [GESTION] Hiérarchie pôles construite:', poleHierarchy);
      console.log('🔍 [DEBUG] Structure hiérarchie:', poleHierarchy.map((p: unknown) => {
        const pole = p as Record<string, unknown>;
        const poleChildren = pole.children as unknown[] | undefined;
        return {
          name: pole.name,
          hasChildren: poleChildren && poleChildren.length > 0,
          childrenCount: poleChildren?.length || 0,
          childrenNames: poleChildren?.map((c: unknown) => (c as Record<string, unknown>).name) || []
        };
      }));

      // Construire la hiérarchie des catégories
      const categoryHierarchy = buildHierarchy(categories, 'parent_category_id');
      console.log('🌳 [GESTION] Hiérarchie catégories construite:', categoryHierarchy);

      // Organiser les entités
      const internalEntities = allEntities.filter((e: unknown) => {
        const entity = e as Record<string, unknown>;
        return entity.stakeholder_type === 'internal' || entity.pole_id;
      });
      const externalEntities = allEntities.filter((e: unknown) => {
        const entity = e as Record<string, unknown>;
        return entity.stakeholder_type === 'external' || entity.category_id;
      });
      const unassigned = allEntities.filter((e: unknown) => {
        const entity = e as Record<string, unknown>;
        return !entity.pole_id && !entity.category_id;
      });

      console.log('📊 [GESTION] Répartition:', {
        internes: internalEntities.length,
        externes: externalEntities.length,
        nonAssignes: unassigned.length
      });

      // Assigner les entités aux pôles de manière récursive
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const polesWithEntities = assignEntitiesToHierarchy(poleHierarchy as any, internalEntities, 'pole_id');

      // Fonction récursive pour afficher l'arbre
      const showTree = (node: Record<string, unknown>, depth = 0): Record<string, unknown> => ({
        name: node.name,
        children: Array.isArray(node.children) ? node.children.map((c: unknown) => showTree(c as Record<string, unknown>, depth + 1)) : []
      });

      console.log('🔍 [DEBUG] Arbre complet des pôles:', JSON.stringify(polesWithEntities.map((p: unknown) => showTree(p as Record<string, unknown>)), null, 2));

      // Assigner les entités aux catégories de manière récursive
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categoriesWithEntities = assignEntitiesToHierarchy(categoryHierarchy as any, externalEntities, 'category_id');

      // Créer les domaines
      const domainsData: EcosystemDomain[] = [
        {
          id: 'internal',
          name: 'Organismes Internes',
          stakeholder_type: 'internal',
          poles: polesWithEntities.map(p => ({ ...p, isExpanded: false } as Pole)),
          isExpanded: true
        },
        {
          id: 'external',
          name: 'Organismes Externes',
          stakeholder_type: 'external',
          categories: categoriesWithEntities.map(c => ({ ...c, isExpanded: false } as Category)),
          isExpanded: true
        }
      ];

      setDomains(domainsData);
      setUnassignedEntities(unassigned);

      console.log('✅ [GESTION] Domaines finaux:', domainsData);
      console.log('🔍 [DEBUG] Pôles dans domaines:', domainsData[0]?.poles?.map((p: unknown) => {
        const pole = p as Record<string, unknown>;
        const poleChildren = pole.children as unknown[] | undefined;
        return {
          name: pole.name,
          isExpanded: pole.isExpanded,
          hasChildren: poleChildren && poleChildren.length > 0,
          childrenCount: poleChildren?.length || 0,
          childrenNames: poleChildren?.map((c: unknown) => (c as Record<string, unknown>).name) || []
        };
      }));

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ [GESTION] Erreur:', err);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Construit une hiérarchie récursive à partir d'une liste plate
   */
  const buildHierarchy = <T extends { id: string; [key: string]: unknown }>(
    items: T[],
    parentKey: string
  ): (T & { children: unknown[] })[] => {
    const map = new Map<string, T & { children: unknown[] }>();
    const roots: (T & { children: unknown[] })[] = [];

    // Créer une map de tous les items avec un tableau children vide
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Construire l'arbre
    items.forEach(item => {
      const node = map.get(item.id)!;
      const parentId = item[parentKey] as string | undefined;

      if (parentId) {
        const parent = map.get(parentId);
        if (parent) {
          parent.children.push(node);
          console.log(`🔗 [buildHierarchy] ${item.name} → ajouté comme enfant de ${parent.name}`);
        } else {
          // Parent introuvable, considéré comme racine
          console.warn(`⚠️ [buildHierarchy] Parent ${parentId} introuvable pour ${item.name}, ajouté comme racine`);
          roots.push(node);
        }
      } else {
        console.log(`🌱 [buildHierarchy] ${item.name} → ajouté comme racine (pas de parent)`);
        roots.push(node);
      }
    });

    return roots;
  };

  /**
   * Assigne les entités à la hiérarchie de manière récursive
   */
  const assignEntitiesToHierarchy = <T extends { id: string; children?: T[]; entities?: EcosystemEntity[] }>(
    hierarchy: T[],
    entities: EcosystemEntity[],
    idField: 'pole_id' | 'category_id'
  ): T[] => {
    return hierarchy.map(node => {
      // Entités directement rattachées à ce nœud
      const directEntities = entities.filter(e => (e as any)[idField] === node.id);
      
      // Traiter récursivement les enfants
      const childrenWithEntities = node.children 
        ? assignEntitiesToHierarchy(node.children, entities, idField)
        : [];
      
      return {
        ...node,
        entities: directEntities,
        children: childrenWithEntities
      };
    });
  };

  /**
   * Calcule le nombre total d'entités (parent + tous les enfants)
   */
  const calculateTotalEntities = (node: Pole | Category): number => {
    let total = node.entities?.length || 0;
    
    if (node.children && node.children.length > 0) {
      total += node.children.reduce(
        (sum, child) => sum + calculateTotalEntities(child), 
        0
      );
    }
    
    return total;
  };

  /**
   * Vérifie si un template est universel
   */
  const isUniversalTemplate = (item: Pole | Category): boolean => {
    // Un élément est universel UNIQUEMENT si tenant_id est NULL ET is_base_template est true
    // Les éléments créés par un tenant spécifique (tenant_id != NULL) ne sont PAS universels
    return item.tenant_id === null && item.is_base_template === true;
  };

  const loadUsers = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const response = await authenticatedFetch(
        `/api/v1/users?tenant_id=${user.tenantId}&is_active=true`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        const allUsers = data.items || [];
        setUsers(allUsers);
        setAvailableRepresentatives(allUsers);
        setAvailableDPOs(allUsers);
      }
    } catch (err) {
      console.error('❌ Erreur chargement users:', err);
    }
  };

  const togglePole = (poleId: string) => {
    const toggleRecursive = (poles: Pole[]): Pole[] => {
      return poles.map(pole => {
        if (pole.id === poleId) {
          return { ...pole, isExpanded: !pole.isExpanded };
        }
        if (pole.children && pole.children.length > 0) {
          return { ...pole, children: toggleRecursive(pole.children) };
        }
        return pole;
      });
    };

    setDomains(prev => prev.map(domain => {
      if (domain.stakeholder_type === 'internal' && domain.poles) {
        return { ...domain, poles: toggleRecursive(domain.poles) };
      }
      return domain;
    }));
  };

  const toggleCategory = (categoryId: string) => {
    const toggleRecursive = (categories: Category[]): Category[] => {
      return categories.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, isExpanded: !cat.isExpanded };
        }
        if (cat.children && cat.children.length > 0) {
          return { ...cat, children: toggleRecursive(cat.children) };
        }
        return cat;
      });
    };

    setDomains(prev => prev.map(domain => {
      if (domain.stakeholder_type === 'external' && domain.categories) {
        return { ...domain, categories: toggleRecursive(domain.categories) };
      }
      return domain;
    }));
  };

  const handleEdit = (entity: EcosystemEntity) => {
    setSelectedOrganism(entity);
    setEditModalOpen(true);
  };

  const handleDelete = (entity: EcosystemEntity) => {
    setSelectedOrganism(entity);
    setDeleteModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = async (updatedData: any) => {
    try {
      const response = await authenticatedFetch(
        `/api/v1/ecosystem/entities/${selectedOrganism?.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedData)
        }
      );

      if (response.ok) {
        setEditModalOpen(false);
        setSuccessModalOpen(true);
        await loadData();
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrganism) return;

    try {
      const response = await authenticatedFetch(
        `/api/v1/ecosystem/entities/${selectedOrganism.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (response.ok) {
        setDeleteModalOpen(false);
        await loadData();
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const updateContact = async (
    entityId: string, 
    field: 'legal_representative_contact_id' | 'dpo_contact_id', 
    userId: string | null
  ) => {
    setSavingCell(entityId);
    try {
      const response = await authenticatedFetch(
        `/api/v1/ecosystem/entities/${entityId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [field]: userId })
        }
      );

      if (response.ok) {
        await loadData();
        setEditingCell(null);
      } else {
        throw new Error('Erreur mise à jour contact');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      alert('Erreur lors de la mise à jour du contact');
    } finally {
      setSavingCell(null);
    }
  };

  /**
   * Rendu d'une ligne d'entité avec indentation
   */
  const renderEntityRow = (entity: EcosystemEntity, isInternal: boolean, depth: number = 0) => {
    const isEditing = editingCell?.entityId === entity.id;
    const isSaving = savingCell === entity.id;
    const indentStyle = depth > 0 ? { paddingLeft: `${depth * 2}rem` } : {};

    return (
      <tr 
        key={entity.id}
        className="hover:bg-gray-50 transition-colors"
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div style={indentStyle} className="flex items-center space-x-2">
            {/* Ligne de connexion hiérarchique */}
            {depth > 0 && (
              <div className="flex items-center mr-2">
                <div className="w-4 h-px bg-gray-300" />
                <div className="w-2 h-2 rounded-full bg-gray-400" />
              </div>
            )}
            
            {/* Icône */}
            <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
            
            {/* Nom cliquable */}
            <button
              onClick={() => window.location.href = `/client/administration/entities/${entity.id}`}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left truncate"
              title={entity.name}
            >
              {entity.name}
            </button>
          </div>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {entity.country_code || 'N/A'}
          </span>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-center">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            entity.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : entity.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {entity.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
            {entity.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {entity.status === 'active' ? 'Validé' : entity.status === 'pending' ? 'En attente' : 'Inactif'}
          </span>
        </td>

        <td className="px-6 py-4 whitespace-nowrap">
          {isEditing && editingCell?.field === 'representative' ? (
            <div className="flex items-center space-x-2">
              <select
                value={entity.legal_representative_contact_id || ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  updateContact(entity.id, 'legal_representative_contact_id', value);
                }}
                disabled={isSaving}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Aucun</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
          ) : (
            <button
              onClick={() => setEditingCell({ entityId: entity.id, field: 'representative' })}
              className="text-left hover:text-blue-600 transition-colors group flex items-center space-x-2"
            >
              <span className="text-sm text-gray-700">
                {entity.legal_representative_firstname && entity.legal_representative_lastname
                  ? `${entity.legal_representative_firstname} ${entity.legal_representative_lastname}`
                  : 'Non défini'}
              </span>
              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </td>

        <td className="px-6 py-4 whitespace-nowrap">
          {isEditing && editingCell?.field === 'dpo' ? (
            <div className="flex items-center space-x-2">
              <select
                value={entity.dpo_contact_id || ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  updateContact(entity.id, 'dpo_contact_id', value);
                }}
                disabled={isSaving}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Aucun</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
          ) : (
            <button
              onClick={() => setEditingCell({ entityId: entity.id, field: 'dpo' })}
              className="text-left hover:text-blue-600 transition-colors group flex items-center space-x-2"
            >
              <span className="text-sm text-gray-700">
                {entity.dpo_firstname && entity.dpo_lastname
                  ? `${entity.dpo_firstname} ${entity.dpo_lastname}`
                  : 'Non défini'}
              </span>
              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => handleEdit(entity)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Éditer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(entity)}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  /**
   * Rendu récursif d'un pôle avec ses enfants et entités
   */
  const renderPoleWithHierarchy = (pole: Pole, depth: number = 0): React.ReactNode => {
    const hasChildren = pole.children && pole.children.length > 0;
    const hasEntities = pole.entities && pole.entities.length > 0;
    const totalCount = calculateTotalEntities(pole);
    const indentStyle = depth > 0 ? { paddingLeft: `${depth * 1.5}rem` } : {};

    return (
      <React.Fragment key={pole.id}>
        {/* Ligne du pôle parent */}
        <tr 
          className="bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors border-t-2 border-blue-200" 
          onClick={() => togglePole(pole.id)}
        >
          <td colSpan={6} className="px-6 py-3">
            <div style={indentStyle} className="flex items-center space-x-3">
              {/* Ligne de connexion pour sous-pôles */}
              {depth > 0 && (
                <div className="flex items-center mr-2">
                  <div className="w-4 h-px bg-blue-300" />
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
              )}
              
              {/* Bouton toggle */}
              <div className="flex-shrink-0">
                {pole.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-blue-600" />
                )}
              </div>
              
              {/* Icône pôle */}
              <Building className="w-5 h-5 text-blue-600 flex-shrink-0" />
              
              {/* Nom du pôle */}
              <span className="font-semibold text-gray-900">{pole.name}</span>
              
              {/* Badge sous-pôles */}
              {hasChildren && pole.children && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  {pole.children.length} sous-pôle{pole.children.length > 1 ? 's' : ''}
                </span>
              )}
              
              {/* Badge template universel */}
              {isUniversalTemplate(pole) && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 text-xs rounded-full font-medium">
                  Universel
                </span>
              )}
              
              {/* Compteur total */}
              <span className="ml-auto text-sm text-gray-600 font-medium">
                {totalCount} organisme{totalCount > 1 ? 's' : ''}
              </span>
            </div>
          </td>
        </tr>
        
        {/* Contenu déplié */}
        {pole.isExpanded && (
          <>
            {/* Sous-pôles (récursif) */}
            {hasChildren && pole.children?.map(childPole =>
              renderPoleWithHierarchy(childPole, depth + 1)
            )}
            
            {/* Entités du pôle */}
            {hasEntities ? (
              pole.entities.map(entity => renderEntityRow(entity, true, depth + 1))
            ) : (
              !hasChildren && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Building2 className="w-6 h-6 text-gray-300" />
                      <p className="text-sm text-gray-500">Aucun organisme dans ce pôle</p>
                    </div>
                  </td>
                </tr>
              )
            )}
          </>
        )}
      </React.Fragment>
    );
  };

  /**
   * Rendu récursif d'une catégorie avec ses enfants et organismes
   */
  const renderCategoryWithHierarchy = (category: Category, depth: number = 0): React.ReactNode => {
    const hasChildren = category.children && category.children.length > 0;
    const hasEntities = category.entities && category.entities.length > 0;
    const totalCount = calculateTotalEntities(category);
    const indentStyle = depth > 0 ? { paddingLeft: `${depth * 1.5}rem` } : {};

    return (
      <React.Fragment key={category.id}>
        {/* Ligne de la catégorie */}
        <tr 
          className="bg-green-50 hover:bg-green-100 cursor-pointer transition-colors border-t-2 border-green-200" 
          onClick={() => toggleCategory(category.id)}
        >
          <td colSpan={6} className="px-6 py-3">
            <div style={indentStyle} className="flex items-center space-x-3">
              {/* Ligne de connexion pour sous-catégories */}
              {depth > 0 && (
                <div className="flex items-center mr-2">
                  <div className="w-4 h-px bg-green-300" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                </div>
              )}
              
              {/* Bouton toggle */}
              <div className="flex-shrink-0">
                {category.isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-green-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-green-600" />
                )}
              </div>
              
              {/* Icône catégorie */}
              <Globe className="w-5 h-5 text-green-600 flex-shrink-0" />
              
              {/* Nom de la catégorie */}
              <span className="font-semibold text-gray-900">{category.name}</span>
              
              {/* Badge sous-catégories */}
              {hasChildren && category.children && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  {category.children.length} sous-catégorie{category.children.length > 1 ? 's' : ''}
                </span>
              )}
              
              {/* Badge template universel */}
              {isUniversalTemplate(category) && (
                <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 text-xs rounded-full font-medium">
                  Universel
                </span>
              )}
              
              {/* Compteur total */}
              <span className="ml-auto text-sm text-gray-600 font-medium">
                {totalCount} organisme{totalCount > 1 ? 's' : ''}
              </span>
            </div>
          </td>
        </tr>
        
        {/* Contenu déplié */}
        {category.isExpanded && (
          <>
            {/* Sous-catégories (récursif) */}
            {hasChildren && category.children?.map(childCategory =>
              renderCategoryWithHierarchy(childCategory, depth + 1)
            )}
            
            {/* Organismes de la catégorie */}
            {hasEntities ? (
              category.entities.map(entity => renderEntityRow(entity, false, depth + 1))
            ) : (
              !hasChildren && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Building2 className="w-6 h-6 text-gray-300" />
                      <p className="text-sm text-gray-500">Aucun organisme dans cette catégorie</p>
                    </div>
                  </td>
                </tr>
              )
            )}
          </>
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header Sticky même en cas d'erreur */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Building2 className="w-8 h-8 mr-3 text-green-600" />
              Gestion Écosystème
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez les détails de vos organismes
            </p>
          </div>
        </div>
        {/* Contenu erreur */}
        <div className="flex-1">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={loadData}
            showBack={true}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error)}
            actionName="Gestion de l'Écosystème"
          />
        </div>
      </div>
    );
  }

  const internalCount = domains.find(d => d.stakeholder_type === 'internal')?.poles?.reduce(
    (sum, p) => sum + calculateTotalEntities(p), 0
  ) || 0;

  const externalCount = domains.find(d => d.stakeholder_type === 'external')?.categories?.reduce(
    (sum, c) => sum + calculateTotalEntities(c), 0
  ) || 0;

  const totalCount = internalCount + externalCount + unassignedEntities.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader
        title="Gestion Écosystème"
        subtitle="Gérez les détails de vos organismes : représentants, DPO et statuts"
        icon={List}
        iconColor="green"
        actions={
          <>
            <button
              onClick={() => window.location.href = '/client/administration/users'}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <Users className="w-4 h-4 mr-2" />
              Utilisateurs
            </button>
            <button
              onClick={() => window.location.href = '/client/administration/poles'}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <Building className="w-4 h-4 mr-2" />
              Pôles
            </button>
            <button
              onClick={() => window.location.href = '/client/administration/categories'}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <Globe className="w-4 h-4 mr-2" />
              Catégories
            </button>
            <button
              onClick={() => window.location.href = '/client/administration/entities/new'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un organisme
            </button>
          </>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un organisme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Cards de statistiques - 4 CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Organismes Internes</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{internalCount}</p>
              </div>
              <div className="p-3 bg-blue-600 rounded-lg">
                <Building className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Organismes Externes</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{externalCount}</p>
              </div>
              <div className="p-3 bg-green-600 rounded-lg">
                <Globe className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Organismes</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{totalCount}</p>
              </div>
              <div className="p-3 bg-purple-600 rounded-lg">
                <List className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* ✨ NOUVELLE TUILE UTILISATEURS */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Utilisateurs</p>
                <p className="text-3xl font-bold text-indigo-900 mt-2">{users.length}</p>
              </div>
              <div className="p-3 bg-indigo-600 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tableaux */}
        <div className="space-y-8">
          {/* TABLEAU ORGANISMES INTERNES */}
          <div className="bg-white border-2 border-blue-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Organismes Internes</h2>
                    <p className="text-sm text-gray-600">
                      {internalCount} organisme{internalCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Pays
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Représentant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      DPO
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {domains.find(d => d.stakeholder_type === 'internal')?.poles?.map(pole => 
                    renderPoleWithHierarchy(pole, 0)
                  ) || (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center space-y-2">
                          <Building className="w-8 h-8 text-gray-300" />
                          <p className="text-sm text-gray-500">Aucun pôle configuré</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLEAU ORGANISMES EXTERNES */}
          <div className="bg-white border-2 border-green-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Organismes Externes</h2>
                    <p className="text-sm text-gray-600">
                      {externalCount} organisme{externalCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Pays
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Représentant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      DPO
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {domains.find(d => d.stakeholder_type === 'external')?.categories?.map(category => 
                    renderCategoryWithHierarchy(category, 0)
                  ) || (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center space-y-2">
                          <Globe className="w-8 h-8 text-gray-300" />
                          <p className="text-sm text-gray-500">Aucune catégorie configurée</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLEAU ENTITÉS NON ASSIGNÉES */}
          {unassignedEntities.length > 0 && (
            <div className="bg-white border-2 border-orange-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Organismes Non Assignés</h2>
                      <p className="text-sm text-gray-600">
                        {unassignedEntities.length} organisme{unassignedEntities.length > 1 ? 's' : ''} sans pôle ni catégorie
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Pays
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      Représentant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                      DPO
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unassignedEntities.map(entity => renderEntityRow(entity, false, 0))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Actions bas */}
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {totalCount} organismes au total
            {unassignedEntities.length > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                ({unassignedEntities.length} non assigné{unassignedEntities.length > 1 ? 's' : ''})
              </span>
            )}
          </div>
          
          <button 
            onClick={() => window.location.href = '/client/administration/ecosystemes'}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
          >
            Vue Hiérarchique
          </button>
        </div>
      </div>

        {/* Modal d'édition */}
        {editModalOpen && selectedOrganism && (
          <EditOrganismModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedOrganism(null);
            }}
            onSave={handleSave}
            organism={{
              ...selectedOrganism,
              stakeholder_type: selectedOrganism.pole_id ? 'internal' : 'external'
            }}
            availableRepresentatives={availableRepresentatives}
            availableDPOs={availableDPOs}
            poles={domains.find(d => d.stakeholder_type === 'internal')?.poles || []}
            categories={domains.find(d => d.stakeholder_type === 'external')?.categories || []}
          />
        )}

        {/* Modal de suppression */}
        {deleteModalOpen && selectedOrganism && (
          <DeleteOrganismModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedOrganism(null);
            }}
            onConfirm={handleConfirmDelete}
            organismName={selectedOrganism.name}
            organismType={selectedOrganism.pole_id ? 'internal' : 'external'}
          />
        )}

        {/* Modal de succès */}
        {successModalOpen && selectedOrganism && (
          <OrganismSuccessModal
            isOpen={successModalOpen}
            onClose={() => setSuccessModalOpen(false)}
            organismName={selectedOrganism.name}
            organismType={selectedOrganism.pole_id ? 'internal' : 'external'}
            autoRedirect={false}
          />
        )}
    </div>
  );
}