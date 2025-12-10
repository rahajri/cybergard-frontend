'use client';
import '@/app/styles/client-header.css';
import '@/app/styles/ecosystem.css';
import React, { useState, useEffect } from 'react';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import {
  Building2,
  Users,
  MapPin,
  Plus,
  Search,
  Filter,
  BarChart3,
  Globe,
  List,
  Eye,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Building,
  Network,
  Briefcase,
  ShoppingCart
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  logo?: string;
}

// ✨ AJOUT : Support hiérarchie récursive
interface Pole {
  id: string;
  name: string;
  code: string;
  description?: string;
  entity_count: number;
  member_count: number;
  entities: EcosystemEntity[];
  isExpanded: boolean;
  children?: Pole[];  // ✨ NOUVEAU : Sous-pôles
  parent_pole_id?: string; // ✨ NOUVEAU
  hierarchy_level?: number; // ✨ NOUVEAU
}

// ✨ AJOUT : Support hiérarchie récursive
interface Category {
  id: string;
  name: string;
  code: string;
  entity_category: string;
  entity_count: number;
  member_count: number;
  entities: EcosystemEntity[];
  isExpanded: boolean;
  children?: Category[];  // ✨ NOUVEAU : Sous-catégories
  parent_category_id?: string; // ✨ NOUVEAU
  hierarchy_level?: number; // ✨ NOUVEAU
}

interface EcosystemDomain {
  id: string;
  name: string;
  code: string;
  stakeholder_type: 'internal' | 'external';
  entity_count: number;
  member_count: number;
  poles?: Pole[];
  categories?: Category[];
  isExpanded: boolean;
}

interface EcosystemEntity {
  id: string;
  name: string;
  entity_category: string;
  member_count: number;
  status: 'active' | 'pending' | 'inactive';
  hierarchy_level: number;
  pole_id?: string;
  category_id?: string;
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  total_members: number;
  internal_count: number;
  external_count: number;
}

export default function EcosystemPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [domains, setDomains] = useState<EcosystemDomain[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    total_members: 0,
    internal_count: 0,
    external_count: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEcosystemData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✨ NOUVELLE FONCTION : Construction arbre récursif de pôles
  const buildPoleTree = (poles: unknown[], entities: unknown[]): Pole[] => {
    console.log('🌳 Construction arbre pôles - Total pôles:', poles.length);
    
    // 1. Créer une map des pôles par ID
    const poleMap = new Map<string, Pole>();

    poles.forEach((pole: unknown) => {
      const p = pole as Record<string, unknown>;
      poleMap.set(p.id as string, {
        id: p.id as string,
        name: p.name as string,
        code: (p.short_code as string) || 'POLE',
        description: p.description as string | undefined,
        entity_count: 0,
        member_count: 0,
        entities: [],
        isExpanded: false,
        children: [],
        parent_pole_id: p.parent_pole_id as string | undefined,
        hierarchy_level: (p.hierarchy_level as number) || 2
      });
    });

    // 2. Assigner les entités à leurs pôles
    entities
      .filter((e: unknown) => {
        const entity = e as Record<string, unknown>;
        return entity.stakeholder_type === 'internal' && entity.pole_id;
      })
      .forEach((entity: unknown) => {
        const ent = entity as Record<string, unknown>;
        const pole = poleMap.get(ent.pole_id as string);
        if (pole) {
          pole.entities.push({
            id: ent.id as string,
            name: ent.name as string,
            entity_category: (ent.entity_category as string) || 'autre',
            member_count: (ent.member_count as number) || 0,
            status: ent.status as 'active' | 'pending' | 'inactive',
            hierarchy_level: (ent.hierarchy_level as number) || 0,
            pole_id: ent.pole_id as string
          });
          pole.entity_count++;
          pole.member_count += (ent.member_count as number) || 0;
        }
      });

    // 3. Construire l'arbre hiérarchique
    const rootPoles: Pole[] = [];
    
    poleMap.forEach((pole) => {
      if (!pole.parent_pole_id) {
        // Pôle racine (niveau 2)
        rootPoles.push(pole);
      } else {
        // Sous-pôle : l'attacher à son parent
        const parent = poleMap.get(pole.parent_pole_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(pole);
        } else {
          // Parent introuvable, traiter comme racine
          console.warn(`⚠️ Parent pole_id ${pole.parent_pole_id} introuvable pour ${pole.name}`);
          rootPoles.push(pole);
        }
      }
    });

    // 4. Propager les compteurs vers le haut (récursif)
    const propagateCountsUp = (pole: Pole): void => {
      if (pole.children && pole.children.length > 0) {
        pole.children.forEach(child => {
          propagateCountsUp(child);
          pole.entity_count += child.entity_count;
          pole.member_count += child.member_count;
        });
      }
    };

    rootPoles.forEach(pole => propagateCountsUp(pole));

    console.log('✅ Arbre pôles construit - Racines:', rootPoles.length);
    return rootPoles;
  };

  // ✨ NOUVELLE FONCTION : Construction arbre récursif de catégories
  const buildCategoryTree = (categories: unknown[], entities: unknown[]): Category[] => {
    console.log('🌳 Construction arbre catégories - Total catégories:', categories.length);
    
    // 1. Créer une map des catégories par ID
    const categoryMap = new Map<string, Category>();
    
    categories.forEach((category: unknown) => {
      const cat = category as Record<string, unknown>;
      categoryMap.set(cat.id as string, {
        id: cat.id as string,
        name: cat.name as string,
        code: (cat.short_code as string) || (cat.entity_category as string) || 'OTHER',
        entity_category: (cat.entity_category as string) || 'autre',
        entity_count: 0,
        member_count: 0,
        entities: [],
        isExpanded: false,
        children: [],
        parent_category_id: cat.parent_category_id as string | undefined,
        hierarchy_level: (cat.hierarchy_level as number) || 2
      });
    });

    // 2. Assigner les entités à leurs catégories
    entities
      .filter((e: unknown) => {
        const entity = e as Record<string, unknown>;
        return entity.stakeholder_type === 'external' && entity.category_id;
      })
      .forEach((entity: unknown) => {
        const ent = entity as Record<string, unknown>;
        const category = categoryMap.get(ent.category_id as string);
        if (category) {
          category.entities.push({
            id: ent.id as string,
            name: ent.name as string,
            entity_category: (ent.entity_category as string) || 'autre',
            member_count: (ent.member_count as number) || 0,
            status: ent.status as 'active' | 'pending' | 'inactive',
            hierarchy_level: (ent.hierarchy_level as number) || 0,
            category_id: ent.category_id as string
          });
          category.entity_count++;
          category.member_count += (ent.member_count as number) || 0;
        } else {
          // ❌ SÉCURITÉ: Entité avec category_id invalide (autre tenant?)
          console.warn(`🚨 Entité "${ent.name}" (${ent.id}) a category_id invalide: ${ent.category_id} - IGNORÉE`);
        }
      });

    // 3. Construire l'arbre hiérarchique
    const rootCategories: Category[] = [];
    
    categoryMap.forEach((category) => {
      if (!category.parent_category_id) {
        // Catégorie racine (niveau 2)
        rootCategories.push(category);
      } else {
        // Sous-catégorie : l'attacher à son parent
        const parent = categoryMap.get(category.parent_category_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(category);
        } else {
          // Parent introuvable, traiter comme racine
          console.warn(`⚠️ Parent category_id ${category.parent_category_id} introuvable pour ${category.name}`);
          rootCategories.push(category);
        }
      }
    });

    // 4. Propager les compteurs vers le haut (récursif)
    const propagateCountsUp = (category: Category): void => {
      if (category.children && category.children.length > 0) {
        category.children.forEach(child => {
          propagateCountsUp(child);
          category.entity_count += child.entity_count;
          category.member_count += child.member_count;
        });
      }
    };

    rootCategories.forEach(category => propagateCountsUp(category));

    console.log('✅ Arbre catégories construit - Racines:', rootCategories.length);
    return rootCategories;
  };

  const loadEcosystemData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Utilisateur non connecté');
      }

      const user = JSON.parse(userStr);
      const orgId = user.organizationId;
      const orgName = user.organizationName || 'Mon Organisation';

      if (!orgId) {
        throw new Error('Organization ID manquant');
      }

      console.log('🔍 Chargement écosystème pour:', orgName, '(', orgId, ')');

      setOrganization({
        id: orgId,
        name: orgName
      });

      // Charger toutes les entités
      const entitiesResponse = await fetch(
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
      console.log('✅ Entités reçues:', entitiesData.total);
      // DEBUG désactivé - member_count maintenant corrigé côté backend

      const allEntities = entitiesData.items.filter(
        (e: unknown) => {const entity = e as Record<string, unknown>; return !entity.is_domain && !entity.is_base_template}
      );

      console.log('📊 Entités filtrées:', allEntities.length);

      // Charger TOUS les pôles disponibles (universels + personnalisés)
      let allPoles: unknown[] = [];
      try {
        // Essayer de charger les pôles avec is_base_template=true (templates universels)
        const polesResponse = await fetch(
          `/api/v1/ecosystem/poles?is_base_template=true&limit=100`,
          {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          }
        );

        if (polesResponse.ok) {
          const polesData = await polesResponse.json();
          allPoles = polesData.items || polesData || [];
          console.log('✅ Pôles chargés (templates):', allPoles.length);
        } else {
          console.warn('⚠️ Impossible de charger les pôles templates');
        }

        // Si on a un client_organization_id, charger aussi ses pôles personnalisés
        if (orgId) {
          try {
            const customPolesResponse = await fetch(
              `/api/v1/ecosystem/poles?client_organization_id=${orgId}&limit=100`,
              {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
              }
            );

            if (customPolesResponse.ok) {
              const customPolesData = await customPolesResponse.json();
              const customPoles = customPolesData.items || [];
              allPoles = [...allPoles, ...customPoles];
              console.log('✅ Pôles personnalisés chargés:', customPoles.length);
            }
          } catch (error) {
            console.warn('⚠️ Erreur chargement pôles personnalisés:', error);
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur chargement pôles:', error);
      }

      console.log('✅ Total pôles disponibles:', allPoles.length);

      // ✨ NOUVEAU : Construction arbre de pôles avec hiérarchie
      const polesWithEntities = buildPoleTree(allPoles, allEntities);

      console.log('✅ Pôles construits:', polesWithEntities.length);

      // Charger TOUTES les catégories réelles depuis l'API (table `categories`)
      let allCategories: unknown[] = [];
      try {
        // ✅ UN SEUL APPEL: L'API retourne déjà templates (tenant_id=NULL) + catégories du tenant
        const categoriesResponse = await fetch(
          `/api/v1/ecosystem/categories?stakeholder_type=external&client_organization_id=${orgId}`,
          { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
        );
        if (categoriesResponse.ok) {
          const data = await categoriesResponse.json();
          allCategories = Array.isArray(data) ? data : (data.items || []);
          console.log('✅ Catégories chargées:', allCategories.length);
        } else {
          console.warn('⚠️ Impossible de charger les catégories');
        }
      } catch (error) {
        console.warn('⚠️ Erreur chargement catégories:', error);
      }

      // 🔎 Lookup O(1) pour les catégories
      const categoryById = new Map(allCategories.map((c: unknown) => {
        const cat = c as Record<string, unknown>;
        return [cat.id, c];
      }));
      console.log('✅ Total catégories disponibles:', allCategories.length);
      console.log('🔍 DEBUG Toutes catégories après fusion:', allCategories.map((c: unknown) => {
        const cat = c as Record<string, unknown>;
        return {
          name: cat.name,
          entity_category: cat.entity_category,
          tenant_id: cat.tenant_id
        };
      }));

      // ✨ NOUVEAU : Construction arbre de catégories avec hiérarchie
      const categoriesWithEntities = buildCategoryTree(allCategories, allEntities);

      console.log('✅ Catégories construites:', categoriesWithEntities.length);

      // Calculer les totaux
      const internalTotalEntities = polesWithEntities.reduce((sum, p) => sum + p.entity_count, 0);
      const internalTotalMembers = polesWithEntities.reduce((sum, p) => sum + p.member_count, 0);
      const externalTotalEntities = categoriesWithEntities.reduce((sum, c) => sum + c.entity_count, 0);
      const externalTotalMembers = categoriesWithEntities.reduce((sum, c) => sum + c.member_count, 0);

      const ecosystemDomains: EcosystemDomain[] = [
        {
          id: 'internal',
          name: 'Interne',
          code: 'INTERNAL',
          stakeholder_type: 'internal',
          entity_count: internalTotalEntities,
          member_count: internalTotalMembers,
          poles: polesWithEntities,
          isExpanded: false
        },
        {
          id: 'external',
          name: 'Externe',
          code: 'EXTERNAL',
          stakeholder_type: 'external',
          entity_count: externalTotalEntities,
          member_count: externalTotalMembers,
          categories: categoriesWithEntities,
          isExpanded: false
        }
      ];

      setDomains(ecosystemDomains);

      // Charger les statistiques
      const statsResponse = await fetch(
        `/api/v1/ecosystem/stats?client_organization_id=${orgId}`,
        {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!statsResponse.ok) {
        // Les erreurs de stats ne sont pas bloquantes, mais on log pour debug
        console.warn('⚠️ Erreur chargement stats:', statsResponse.status);
      } else {
        const statsData = await statsResponse.json();
        setStats({
          total: statsData.total,
          active: statsData.active,
          pending: statsData.pending,
          inactive: statsData.inactive || 0,
          total_members: statsData.total_members,
          internal_count: statsData.internal_count || 0,
          external_count: statsData.external_count || 0
        });
      }

      setLoading(false);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur chargement écosystème:', err);
      setError(error.message);
      setLoading(false);
    }
  };

  const toggleDomain = (domainId: string) => {
    console.log('🔄 Toggle domain:', domainId);
    setDomains(prevDomains => {
      const updated = prevDomains.map(d => 
        d.id === domainId ? { ...d, isExpanded: !d.isExpanded } : d
      );
      console.log('📊 Domains après toggle:', updated.map(d => ({ id: d.id, isExpanded: d.isExpanded })));
      return updated;
    });
  };

  // ✨ MODIFIÉ : Toggle récursif pour pôles
  const togglePole = (domainId: string, poleId: string) => {
    console.log('🔄 Toggle pole:', poleId, 'in domain:', domainId);
    setDomains(prevDomains => {
      const updated = prevDomains.map(d => {
        if (d.id === domainId && d.poles) {
          const toggleRecursive = (poles: Pole[]): Pole[] => {
            return poles.map(p => {
              if (p.id === poleId) {
                return { ...p, isExpanded: !p.isExpanded };
              }
              if (p.children && p.children.length > 0) {
                return { ...p, children: toggleRecursive(p.children) };
              }
              return p;
            });
          };
          return {
            ...d,
            poles: toggleRecursive(d.poles)
          };
        }
        return d;
      });
      console.log('📊 Poles après toggle');
      return updated;
    });
  };

  // ✨ MODIFIÉ : Toggle récursif pour catégories
  const toggleCategory = (domainId: string, categoryId: string) => {
    console.log('🔄 Toggle category:', categoryId, 'in domain:', domainId);
    setDomains(prevDomains => {
      const updated = prevDomains.map(d => {
        if (d.id === domainId && d.categories) {
          const toggleRecursive = (categories: Category[]): Category[] => {
            return categories.map(c => {
              if (c.id === categoryId) {
                return { ...c, isExpanded: !c.isExpanded };
              }
              if (c.children && c.children.length > 0) {
                return { ...c, children: toggleRecursive(c.children) };
              }
              return c;
            });
          };
          return {
            ...d,
            categories: toggleRecursive(d.categories)
          };
        }
        return d;
      });
      console.log('📊 Categories après toggle');
      return updated;
    });
  };

  const navigateToEntity = (entityId: string) => {
    window.location.href = `/client/administration/entities/${entityId}`;
    
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Actif', color: 'bg-green-50 text-green-700 border-green-200' },
      pending: { label: 'En attente', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      inactive: { label: 'Inactif', color: 'bg-gray-50 text-gray-700 border-gray-200' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getEntityCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'pole': 'Pôle',
      'department': 'Département',
      'service': 'Service',
      'team': 'Équipe',
      'client': 'Client',
      'fournisseur': 'Fournisseur',
      'sous_traitant': 'Sous-traitant',
      'partenaire': 'Partenaire',
      'autre': 'Autre'
    };
    return labels[category] || category;
  };

  const getEntityCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'pole': 'bg-blue-50 text-blue-700 border-blue-200',
      'department': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'service': 'bg-purple-50 text-purple-700 border-purple-200',
      'team': 'bg-pink-50 text-pink-700 border-pink-200',
      'client': 'bg-green-50 text-green-700 border-green-200',
      'fournisseur': 'bg-orange-50 text-orange-700 border-orange-200',
      'sous_traitant': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'partenaire': 'bg-teal-50 text-teal-700 border-teal-200',
      'autre': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[category] || colors['autre'];
  };

  // ✨ NOUVEAU : Composant récursif pour afficher un pôle et ses sous-pôles
  const renderPoleRecursive = (pole: Pole, domainId: string, depth: number = 0) => {
    const hasChildren = pole.children && pole.children.length > 0;
    const indentClass = depth > 0 ? 'ml-8 border-l-2 border-blue-200 pl-4' : '';

    return (
      <div key={pole.id} className={`space-y-2 ${indentClass}`}>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900">{pole.name}</h4>
                  {hasChildren && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {pole.children!.length} sous-pôle{pole.children!.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {pole.description && (
                  <p className="text-sm text-gray-600 mt-1">{pole.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span>{pole.entity_count} organismes</span>
                  <span>•</span>
                  <span>{pole.member_count} membres</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => togglePole(domainId, pole.id)}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              {pole.isExpanded ? (
                <ChevronDown className="w-5 h-5 text-blue-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-blue-600" />
              )}
            </button>
          </div>
        </div>

        {pole.isExpanded && (
          <div className="space-y-2">
            {/* Sous-pôles */}
            {hasChildren && pole.children!.map(childPole => 
              renderPoleRecursive(childPole, domainId, depth + 1)
            )}

            {/* Entités du pôle actuel */}
            {pole.entities.length > 0 && (
              <div className={depth > 0 ? 'ml-8' : 'pl-8'}>
                <div className="space-y-2">
                  {pole.entities.map((entity) => (
                    <div
                      key={entity.id}
                      onClick={() => navigateToEntity(entity.id)}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Building2 className="w-4 h-4 text-gray-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{entity.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getEntityCategoryColor(entity.entity_category)}`}>
                                {getEntityCategoryLabel(entity.entity_category)}
                              </span>
                              {getStatusBadge(entity.status)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-1" />
                            {entity.member_count}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasChildren && pole.entities.length === 0 && (
              <div className="pl-8 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <Building2 className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Aucun organisme dans ce pôle</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ✨ NOUVEAU : Composant récursif pour afficher une catégorie et ses sous-catégories
  const renderCategoryRecursive = (category: Category, domainId: string, depth: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const indentClass = depth > 0 ? 'ml-8 border-l-2 border-green-200 pl-4' : '';

    return (
      <div key={category.id} className={`space-y-2 ${indentClass}`}>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900">{category.name}</h4>
                  {hasChildren && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      {category.children!.length} sous-catégorie{category.children!.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getEntityCategoryColor(category.entity_category)}`}>
                    {getEntityCategoryLabel(category.entity_category)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span>{category.entity_count} organismes</span>
                  <span>•</span>
                  <span>{category.member_count} membres</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleCategory(domainId, category.id)}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
            >
              {category.isExpanded ? (
                <ChevronDown className="w-5 h-5 text-green-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-green-600" />
              )}
            </button>
          </div>
        </div>

        {category.isExpanded && (
          <div className="space-y-2">
            {/* Sous-catégories */}
            {hasChildren && category.children!.map(childCategory => 
              renderCategoryRecursive(childCategory, domainId, depth + 1)
            )}

            {/* Entités de la catégorie actuelle */}
            {category.entities.length > 0 && (
              <div className={depth > 0 ? 'ml-8' : 'pl-8'}>
                <div className="space-y-2">
                  {category.entities.map((entity) => (
                    <div
                      key={entity.id}
                      onClick={() => navigateToEntity(entity.id)}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Building2 className="w-4 h-4 text-gray-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{entity.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getEntityCategoryColor(entity.entity_category)}`}>
                                {getEntityCategoryLabel(entity.entity_category)}
                              </span>
                              {getStatusBadge(entity.status)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-1" />
                            {entity.member_count}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasChildren && category.entities.length === 0 && (
              <div className="pl-8 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <Building2 className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Aucun organisme dans cette catégorie</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'écosystème...</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Network className="w-8 h-8 mr-3 text-green-600" />
                  Administration Écosystème
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Gérez votre écosystème organisationnel
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu erreur */}
        <div className="flex-1">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={loadEcosystemData}
            showBack={false}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error)}
            actionName="Administration - Écosystème"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 HEADER STICKY - Conforme au guide */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Network className="w-8 h-8 mr-3 text-green-600" />
                Administration Écosystème
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gérez votre écosystème organisationnel : organismes internes et partenaires externes
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.location.href = '/client/administration/ecosystemes/gestion'}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <List className="w-4 h-4 mr-2" />
                Gestion Écosystème
              </button>
              <button
                onClick={() => window.location.href = '/client/administration/entities/new'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un organisme
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu qui défile */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Organismes Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" style={{ borderLeft: '4px solid #16a34a' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Organismes Actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" style={{ borderLeft: '4px solid #ea580c' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Organismes En Attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Membres</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_members}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" style={{ borderLeft: '4px solid #06b6d4' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Audités</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </div>
        </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-8 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Vue Écosystème Hiérarchique
        </h2>

        <div className="flex flex-col items-center space-y-8">
          
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer min-w-[280px]">
              <div className="flex items-center justify-center mb-4">
                <Building className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">
                {organization?.name}
              </h3>
              <p className="text-blue-100 text-center text-sm">
                Organisation principale
              </p>
              <div className="mt-4 pt-4 border-t border-blue-400 flex items-center justify-center space-x-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.internal_count}</p>
                  <p className="text-xs text-blue-100">Internes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.external_count}</p>
                  <p className="text-xs text-blue-100">Externes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-1 h-12 bg-gradient-to-b from-blue-600 to-gray-300"></div>

          <div className="grid grid-cols-2 gap-12 w-full max-w-6xl">
            
            {domains.map((domain) => (
              <div key={domain.id} className="flex flex-col items-center space-y-4">
                
                <div 
                  className={`w-full rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                    domain.stakeholder_type === 'internal' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-br from-green-500 to-green-600'
                  } text-white`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {domain.stakeholder_type === 'internal' ? (
                        <Building2 className="w-8 h-8" />
                      ) : (
                        <MapPin className="w-8 h-8" />
                      )}
                      <h3 className="text-xl font-bold">{domain.name}</h3>
                    </div>
                    
                    <button
                      onClick={() => toggleDomain(domain.id)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {domain.isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-lg">{domain.entity_count}</p>
                      <p className="opacity-90">organisations</p>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{domain.member_count}</p>
                      <p className="opacity-90">membres</p>
                    </div>
                  </div>
                </div>

                {domain.isExpanded && (
                  <div className="w-full space-y-4 animate-in slide-in-from-top pl-8">
                    
                    {domain.stakeholder_type === 'internal' && domain.poles && domain.poles.length > 0 && (
                      <>
                        {domain.poles.map((pole) => renderPoleRecursive(pole, domain.id))}
                      </>
                    )}

                    {domain.stakeholder_type === 'external' && domain.categories && domain.categories.length > 0 && (
                      <>
                        {domain.categories.map((category) => renderCategoryRecursive(category, domain.id))}
                      </>
                    )}

                    {domain.stakeholder_type === 'internal' && (!domain.poles || domain.poles.length === 0) && (
                      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <Briefcase className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Aucun pôle configuré</p>
                        <p className="text-xs text-gray-500 mt-1">Créez d'abord des pôles pour organiser vos organismes internes</p>
                      </div>
                    )}

                    {domain.stakeholder_type === 'external' && (!domain.categories || domain.categories.length === 0) && (
                      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Aucune catégorie configurée</p>
                        <p className="text-xs text-gray-500 mt-1">Créez d'abord des catégories pour organiser vos partenaires externes</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}

          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {stats.active} sur {stats.total} organismes actifs
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.href = '/client/administration/hierarchy'}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Vue Hiérarchique
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}