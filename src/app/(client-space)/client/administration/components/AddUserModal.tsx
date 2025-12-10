'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Mail,
  User as UserIcon,
  Shield,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import PhoneInput from '@/components/ui/phone-input';

interface Organism {
  id: string;
  name: string;
  stakeholder_type: 'internal' | 'external';
  entity_category?: string;
  pole_id?: string;
  category_id?: string;
  hierarchy_level: number;
  is_category?: boolean;
  has_children?: boolean;
  children?: Organism[];
  entities?: OrganismEntity[];
}

interface OrganismEntity {
  id: string;
  name: string;
  status?: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: UserFormData) => Promise<void>;
  availableRoles: Array<{ code: string; label: string; description: string }>;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role_code: string;
  default_org_id: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
  availableRoles
}: AddUserModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role_code: 'AUDITEUR',
    default_org_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation d'email
  const [emailValidation, setEmailValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    errors: string[];
    suggestion: string | null;
  }>({
    isValidating: false,
    isValid: null,
    errors: [],
    suggestion: null
  });

  // Sélecteur d'organisme
  const [organismType, setOrganismType] = useState<'internal' | 'external'>('internal');
  const [internalTree, setInternalTree] = useState<Organism[]>([]);
  const [externalTree, setExternalTree] = useState<Organism[]>([]);
  const [loadingOrganisms, setLoadingOrganisms] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<OrganismEntity | null>(null);

  // États pour les listes déroulantes en cascade
  const [selectedTopLevel, setSelectedTopLevel] = useState<string>(''); // Pôle ou Catégorie principale
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(''); // Sous-catégorie niveau 1
  const [selectedSubCategory2, setSelectedSubCategory2] = useState<string>(''); // Sous-catégorie niveau 2

  // Valider l'email en temps réel (avec debounce)
  useEffect(() => {
    if (!formData.email || formData.email.trim() === '') {
      setEmailValidation({
        isValidating: false,
        isValid: null,
        errors: [],
        suggestion: null
      });
      return;
    }

    // Validation basique du format email avant d'appeler l'API
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(formData.email.trim())) {
      setEmailValidation({
        isValidating: false,
        isValid: null,
        errors: [],
        suggestion: null
      });
      return;
    }

    const timeoutId = setTimeout(async () => {
      await validateEmail(formData.email);
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  // Charger les organismes au montage
  useEffect(() => {
    if (isOpen && step === 2) {
      loadOrganismsTree();
    }
  }, [isOpen, step]);

  // Fonction de validation d'email
  const validateEmail = async (email: string) => {
    setEmailValidation(prev => ({ ...prev, isValidating: true }));

    try {
      const response = await fetch(`${API_BASE}/api/v1/user-management/validate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() })
      });

      if (response.ok) {
        const result = await response.json();
        setEmailValidation({
          isValidating: false,
          isValid: result.valid,
          errors: result.errors || [],
          suggestion: result.suggestion || null
        });
      } else if (response.status === 422) {
        // Erreur de validation Pydantic (format email invalide)
        const errorData = await response.json().catch(() => ({ detail: [] }));
        const errorMessages = Array.isArray(errorData.detail)
          ? errorData.detail.map((err: unknown) => (err as { msg?: string }).msg || 'Format d\'email invalide')
          : ['Format d\'email invalide'];

        setEmailValidation({
          isValidating: false,
          isValid: false,
          errors: errorMessages,
          suggestion: null
        });
      } else {
        setEmailValidation({
          isValidating: false,
          isValid: false,
          errors: ['Erreur lors de la validation de l\'email'],
          suggestion: null
        });
      }
    } catch (error) {
      console.error('Erreur validation email:', error);
      setEmailValidation({
        isValidating: false,
        isValid: false,
        errors: ['Erreur de connexion au serveur'],
        suggestion: null
      });
    }
  };

  const loadOrganismsTree = async () => {
    setLoadingOrganisms(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const orgId = user.organizationId;

      console.log('🔍 [AddUserModal] Chargement organismes - orgId:', orgId);

      // Charger les pôles internes
      const polesRes = await fetch(
        `${API_BASE}/api/v1/ecosystem/poles`,
        { credentials: 'include' }
      );
      
      // Charger les catégories externes
      const categoriesRes = await fetch(
        `${API_BASE}/api/v1/ecosystem/categories?stakeholder_type=external`,
        { credentials: 'include' }
      );

      // Charger TOUTES les entités
      const entitiesRes = await fetch(
        `${API_BASE}/api/v1/ecosystem/entities?client_organization_id=${orgId}&limit=1000`,
        { credentials: 'include' }
      );

      if (polesRes.ok && categoriesRes.ok && entitiesRes.ok) {
        const polesData = await polesRes.json();
        const categoriesData = await categoriesRes.json();
        const entitiesData = await entitiesRes.json();

        const poles = polesData.items || polesData || [];
        const allCategories = categoriesData.items || categoriesData || [];
        const allEntities = entitiesData.items || entitiesData || [];

        console.log('📊 Pôles:', poles.length);
        console.log('📊 Catégories:', allCategories.length);
        console.log('📊 Entités:', allEntities.length);

        // ============================================================
        // ARBRE INTERNE : Pôles + Entités
        // ============================================================
        const internalEntities = allEntities.filter((e: unknown) => {
          const entity = e as Record<string, unknown>;
          return entity.stakeholder_type === 'internal' && !entity.is_category && !entity.is_domain;
        });

        console.log('🏢 Entités internes:', internalEntities.length);

        const internalTreeData = poles.map((pole: unknown) => {
          const p = pole as Record<string, unknown>;
          const poleEntities = internalEntities.filter((e: unknown) => (e as Record<string, unknown>).pole_id === p.id);

          return {
            id: p.id,
            name: p.name,
            stakeholder_type: 'internal' as const,
            hierarchy_level: 1,
            is_category: true,
            has_children: poleEntities.length > 0,
            entities: poleEntities.map((e: unknown) => {
              const ent = e as Record<string, unknown>;
              return {
                id: ent.id,
                name: ent.name,
                status: ent.status
              };
            })
          };
        });

        // ============================================================
        // ARBRE EXTERNE : Catégories + Sous-catégories + Entités
        // ============================================================
        const externalEntities = allEntities.filter((e: unknown) => {
          const entity = e as Record<string, unknown>;
          return entity.stakeholder_type === 'external' && !entity.is_category && !entity.is_domain;
        });

        console.log('🌍 Entités externes:', externalEntities.length);

        // Fonction récursive pour construire l'arbre de sous-catégories
        const buildCategoryTree = (parentId: string): Organism[] => {
          // Trouver toutes les sous-catégories directes de ce parent
          const subCategories = allCategories.filter((c: unknown) =>
            (c as Record<string, unknown>).parent_category_id === parentId
          );

          return subCategories.map((subCat: unknown) => {
            const sc = subCat as Record<string, unknown>;
            // Entités directement rattachées à cette sous-catégorie
            const subCatEntities = externalEntities.filter((e: unknown) =>
              (e as Record<string, unknown>).category_id === sc.id
            );

            // Sous-catégories de cette sous-catégorie (récursion)
            const children = buildCategoryTree(sc.id as string);

            return {
              id: sc.id,
              name: sc.name,
              stakeholder_type: 'external' as const,
              entity_category: sc.entity_category,
              hierarchy_level: sc.hierarchy_level || 2,
              is_category: true,
              has_children: subCatEntities.length > 0 || children.length > 0,
              children: children.length > 0 ? children : undefined,
              entities: subCatEntities.length > 0 ? subCatEntities.map((e: unknown) => {
                const ent = e as Record<string, unknown>;
                return {
                  id: ent.id,
                  name: ent.name,
                  status: ent.status
                };
              }) : []
            };
          });
        };

        // Catégories principales (sans parent)
        const mainCategories = allCategories.filter((c: unknown) =>
          !(c as Record<string, unknown>).parent_category_id
        );

        console.log('🌍 Catégories principales:', mainCategories.length);

        const externalTreeData = mainCategories.map((cat: unknown) => {
          const c = cat as Record<string, unknown>;
          // Entités directement rattachées à cette catégorie principale
          const catEntities = externalEntities.filter((e: unknown) =>
            (e as Record<string, unknown>).category_id === c.id
          );

          // Construire l'arbre des sous-catégories
          const subCategories = buildCategoryTree(c.id as string);

          console.log(`  "${c.name}": ${catEntities.length} entités, ${subCategories.length} sous-catégories`);

          return {
            id: c.id,
            name: c.name,
            stakeholder_type: 'external' as const,
            entity_category: c.entity_category,
            hierarchy_level: 1,
            is_category: true,
            has_children: catEntities.length > 0 || subCategories.length > 0,
            children: subCategories.length > 0 ? subCategories : undefined,
            entities: catEntities.length > 0 ? catEntities.map((e: unknown) => {
              const ent = e as Record<string, unknown>;
              return {
                id: ent.id,
                name: ent.name,
                status: ent.status
              };
            }) : []
          };
        });

        console.log('✅ Arbre interne:', internalTreeData.length);
        console.log('✅ Arbre externe:', externalTreeData.length);

        setInternalTree(internalTreeData);
        setExternalTree(externalTreeData);
      }
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
    } finally {
      setLoadingOrganisms(false);
    }
  };

  // Réinitialiser les sélections en cascade quand on change de type
  useEffect(() => {
    setSelectedTopLevel('');
    setSelectedSubCategory('');
    setSelectedSubCategory2('');
    setSelectedEntity(null);
  }, [organismType]);

  // Fonctions pour obtenir les options des listes déroulantes
  const getTopLevelOptions = (): Organism[] => {
    return organismType === 'internal' ? internalTree : externalTree;
  };

  const getSubCategoriesLevel1 = (): Organism[] => {
    if (!selectedTopLevel) return [];
    const tree = organismType === 'internal' ? internalTree : externalTree;
    const parent = tree.find(org => org.id === selectedTopLevel);
    return parent?.children || [];
  };

  const getSubCategoriesLevel2 = (): Organism[] => {
    if (!selectedSubCategory) return [];
    const level1 = getSubCategoriesLevel1();
    const parent = level1.find(org => org.id === selectedSubCategory);
    return parent?.children || [];
  };

  const getAvailableEntities = (): OrganismEntity[] => {
    const tree = organismType === 'internal' ? internalTree : externalTree;

    // Si on a une sous-catégorie niveau 2 sélectionnée
    if (selectedSubCategory2) {
      const level1 = getSubCategoriesLevel1();
      const level2Parent = level1.find(org => org.id === selectedSubCategory);
      const level3 = level2Parent?.children?.find(org => org.id === selectedSubCategory2);
      return level3?.entities || [];
    }

    // Si on a une sous-catégorie niveau 1 sélectionnée
    if (selectedSubCategory) {
      const level1 = getSubCategoriesLevel1();
      const level2 = level1.find(org => org.id === selectedSubCategory);
      return level2?.entities || [];
    }

    // Sinon, entités du niveau supérieur
    if (selectedTopLevel) {
      const parent = tree.find(org => org.id === selectedTopLevel);
      return parent?.entities || [];
    }

    return [];
  };

  const handleTopLevelChange = (value: string) => {
    setSelectedTopLevel(value);
    setSelectedSubCategory('');
    setSelectedSubCategory2('');
    setSelectedEntity(null);
  };

  const handleSubCategory1Change = (value: string) => {
    setSelectedSubCategory(value);
    setSelectedSubCategory2('');
    setSelectedEntity(null);
  };

  const handleSubCategory2Change = (value: string) => {
    setSelectedSubCategory2(value);
    setSelectedEntity(null);
  };

  const handleSubmit = async () => {
    // Validation étape 1
    if (step === 1) {
      if (!formData.email || !formData.first_name || !formData.last_name) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }
      setError('');
      setStep(2);
      return;
    }

    // Validation étape 2
    // Pour les contacts externes (AUDITE_RESP, AUDITE_CONTRIB), un organisme est OBLIGATOIRE
    const isExternalContact = ['AUDITE_RESP', 'AUDITE_CONTRIB'].includes(formData.role_code);

    if (isExternalContact && !selectedEntity) {
      setError('Vous devez sélectionner un organisme pour un utilisateur externe (audité)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Si un organisme est sélectionné, on l'utilise
      // Sinon, pour les utilisateurs internes, on utilise l'organisme du tenant
      let orgId = selectedEntity?.id;

      // Si pas d'organisme sélectionné ET utilisateur interne, récupérer l'organisme du tenant actuel
      if (!orgId && !isExternalContact) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        orgId = user.organizationId;
      }

      await onSubmit({
        ...formData,
        default_org_id: orgId || ''
      });
      handleClose();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      role_code: 'AUDITEUR',
      default_org_id: ''
    });
    setError('');
    setSelectedEntity(null);
    setSelectedTopLevel('');
    setSelectedSubCategory('');
    setSelectedSubCategory2('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserPlus style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Inviter un utilisateur
              </h2>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Étape {step} sur 2 - {step === 1 ? 'Informations' : 'Organisme'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X style={{ width: '20px', height: '20px', color: '#FFFFFF' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ 
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'start',
              gap: '8px'
            }}>
              <AlertCircle style={{ width: '18px', height: '18px', color: '#DC2626', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#991B1B' }}>{error}</p>
            </div>
          )}

          {/* Étape 1: Informations de base */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  <Mail style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
                  Email <span style={{ color: '#DC2626' }}>*</span>
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="utilisateur@example.com"
                    style={{
                      width: '100%',
                      padding: '12px',
                      paddingRight: '40px',
                      border: `2px solid ${
                        emailValidation.isValid === true ? '#10B981' :
                        emailValidation.isValid === false ? '#DC2626' :
                        '#E5E7EB'
                      }`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                  />

                  {/* Icône de validation */}
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    {emailValidation.isValidating && (
                      <Loader2 style={{ width: '20px', height: '20px', color: '#6366F1', animation: 'spin 1s linear infinite' }} />
                    )}
                    {!emailValidation.isValidating && emailValidation.isValid === true && (
                      <CheckCircle style={{ width: '20px', height: '20px', color: '#10B981' }} />
                    )}
                    {!emailValidation.isValidating && emailValidation.isValid === false && (
                      <AlertCircle style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                    )}
                  </div>
                </div>

                {/* Messages d'erreur */}
                {emailValidation.errors.length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px'
                  }}>
                    {emailValidation.errors.map((error, index) => (
                      <p key={index} style={{
                        margin: '0',
                        fontSize: '13px',
                        color: '#991B1B',
                        marginBottom: index < emailValidation.errors.length - 1 ? '4px' : '0'
                      }}>
                        {error}
                      </p>
                    ))}
                  </div>
                )}

                {/* Suggestion */}
                {emailValidation.suggestion && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <p style={{ margin: '0', fontSize: '13px', color: '#1E40AF' }}>
                      Suggestion : <strong>{emailValidation.suggestion}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, email: emailValidation.suggestion! })}
                      style={{
                        padding: '4px 12px',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Utiliser
                    </button>
                  </div>
                )}

                {/* Message de succès */}
                {emailValidation.isValid === true && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: '#ECFDF5',
                    border: '1px solid #86EFAC',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle style={{ width: '16px', height: '16px', color: '#059669' }} />
                    <p style={{ margin: '0', fontSize: '13px', color: '#065F46' }}>
                      Email valide et disponible
                    </p>
                  </div>
                )}
              </div>

              {/* Prénom */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  <UserIcon style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
                  Prénom <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Jean"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Nom */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  <UserIcon style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
                  Nom <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Dupont"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Téléphone */}
              <div>
                <PhoneInput
                  value={formData.phone}
                  onChange={(phone) => setFormData({ ...formData, phone })}
                  label="Numéro de téléphone"
                  placeholder="612345678"
                  required={false}
                />
              </div>

              {/* Rôle */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  <Shield style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
                  Rôle <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={formData.role_code}
                  onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#FFFFFF'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                >
                  {availableRoles.map(role => (
                    <option key={role.code} value={role.code}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                  {availableRoles.find(r => r.code === formData.role_code)?.description}
                </p>
              </div>
            </div>
          )}

          {/* Étape 2: Sélection organisme */}
          {step === 2 && (
            <div>
              {/* Message d'information selon le type d'utilisateur */}
              {['AUDITE_RESP', 'AUDITE_CONTRIB'].includes(formData.role_code) ? (
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#92400E', fontWeight: 600 }}>
                    <AlertCircle style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
                    Sélection obligatoire
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#78350F' }}>
                    Un utilisateur externe (audité) doit obligatoirement être associé à un organisme de l'écosystème.
                  </p>
                </div>
              ) : (
                <div style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1E40AF' }}>
                    <Building2 style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
                    Sélectionnez l'organisme auquel rattacher l'utilisateur (optionnel pour les utilisateurs internes)
                  </p>
                </div>
              )}

              {/* Toggle Interne/Externe */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <button
                  onClick={() => setOrganismType('internal')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid ' + (organismType === 'internal' ? '#6366F1' : '#E5E7EB'),
                    borderRadius: '8px',
                    background: organismType === 'internal' ? '#EEF2FF' : '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: organismType === 'internal' ? '#4F46E5' : '#6B7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🏢 Interne
                </button>
                <button
                  onClick={() => setOrganismType('external')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid ' + (organismType === 'external' ? '#6366F1' : '#E5E7EB'),
                    borderRadius: '8px',
                    background: organismType === 'external' ? '#EEF2FF' : '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: organismType === 'external' ? '#4F46E5' : '#6B7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🌍 Externe
                </button>
              </div>

              {/* Listes déroulantes en cascade */}
              {loadingOrganisms ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 style={{ width: '32px', height: '32px', margin: '0 auto 12px', animation: 'spin 1s linear infinite', color: '#6366F1' }} />
                  <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>Chargement...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Niveau 1 : Pôles ou Catégories principales */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      {organismType === 'internal' ? '🏢 Sélectionner un pôle' : '🌍 Sélectionner une catégorie'}
                    </label>
                    <select
                      value={selectedTopLevel}
                      onChange={(e) => handleTopLevelChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: '#FFFFFF',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                    >
                      <option value="">-- Sélectionner --</option>
                      {getTopLevelOptions().map(org => (
                        <option key={org.id} value={org.id}>
                          {org.name} {org.has_children ? '📁' : ''}
                          {org.entities && org.entities.length > 0 && ` (${org.entities.length} organisme${org.entities.length > 1 ? 's' : ''})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Niveau 2 : Sous-catégories niveau 1 (si disponible) */}
                  {selectedTopLevel && getSubCategoriesLevel1().length > 0 && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        📂 Sous-catégorie
                      </label>
                      <select
                        value={selectedSubCategory}
                        onChange={(e) => handleSubCategory1Change(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#FFFFFF',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                      >
                        <option value="">-- Sélectionner --</option>
                        {getSubCategoriesLevel1().map(org => (
                          <option key={org.id} value={org.id}>
                            {org.name} {org.has_children ? '📁' : ''}
                            {org.entities && org.entities.length > 0 && ` (${org.entities.length} organisme${org.entities.length > 1 ? 's' : ''})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Niveau 3 : Sous-catégories niveau 2 (si disponible) */}
                  {selectedSubCategory && getSubCategoriesLevel2().length > 0 && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        📂 Sous-catégorie (niveau 2)
                      </label>
                      <select
                        value={selectedSubCategory2}
                        onChange={(e) => handleSubCategory2Change(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#FFFFFF',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                      >
                        <option value="">-- Sélectionner --</option>
                        {getSubCategoriesLevel2().map(org => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                            {org.entities && org.entities.length > 0 && ` (${org.entities.length} organisme${org.entities.length > 1 ? 's' : ''})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Liste des entités (seulement si un niveau est sélectionné) */}
                  {selectedTopLevel && getAvailableEntities().length > 0 && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        🏢 Sélectionner l'organisme
                      </label>
                      <select
                        value={selectedEntity?.id || ''}
                        onChange={(e) => {
                          const entity = getAvailableEntities().find(ent => ent.id === e.target.value);
                          setSelectedEntity(entity || null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#FFFFFF',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
                      >
                        <option value="">-- Sélectionner --</option>
                        {getAvailableEntities().map(entity => (
                          <option key={entity.id} value={entity.id}>
                            {entity.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Message si pas d'entités disponibles */}
                  {selectedTopLevel && getAvailableEntities().length === 0 && !getSubCategoriesLevel1().length && (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#6B7280',
                      fontSize: '14px',
                      background: '#F9FAFB',
                      borderRadius: '8px',
                      border: '2px dashed #E5E7EB'
                    }}>
                      Aucun organisme disponible dans cette catégorie
                    </div>
                  )}
                </div>
              )}

              {/* Organisme sélectionné */}
              {selectedEntity && (
                <div style={{
                  marginTop: '16px',
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#16A34A', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#15803D', fontWeight: 600 }}>
                      Organisme sélectionné
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#166534' }}>
                      🏢 {selectedEntity.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          flexShrink: 0
        }}>
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                background: '#FFFFFF',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              Retour
            </button>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (step === 1 && (
                !formData.email ||
                !formData.first_name ||
                !formData.last_name ||
                !formData.role_code ||
                emailValidation.isValidating ||
                emailValidation.isValid === false
              )) ||
              (step === 2 && (
                ['AUDITE_RESP', 'AUDITE_CONTRIB'].includes(formData.role_code) && !selectedEntity
              ))
            }
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: (
                loading ||
                (step === 1 && (
                  !formData.email ||
                  !formData.first_name ||
                  !formData.last_name ||
                  !formData.role_code ||
                  emailValidation.isValidating ||
                  emailValidation.isValid === false
                )) ||
                (step === 2 && (
                  ['AUDITE_RESP', 'AUDITE_CONTRIB'].includes(formData.role_code) && !selectedEntity
                ))
              ) ? '#D1D5DB' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: (
                loading ||
                (step === 1 && (
                  !formData.email ||
                  !formData.first_name ||
                  !formData.last_name ||
                  !formData.role_code ||
                  emailValidation.isValidating ||
                  emailValidation.isValid === false
                )) ||
                (step === 2 && (
                  ['AUDITE_RESP', 'AUDITE_CONTRIB'].includes(formData.role_code) && !selectedEntity
                ))
              ) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: (
                loading ||
                (step === 1 && (
                  !formData.email ||
                  !formData.first_name ||
                  !formData.last_name ||
                  !formData.role_code ||
                  emailValidation.isValidating ||
                  emailValidation.isValid === false
                )) ||
                (step === 2 && (
                  ['AUDITE_RESP', 'AUDITE_CONTRIB'].includes(formData.role_code) && !selectedEntity
                ))
              ) ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.4)',
              opacity: (
                loading ||
                (step === 1 && (
                  !formData.email ||
                  !formData.first_name ||
                  !formData.last_name ||
                  !formData.role_code ||
                  emailValidation.isValidating ||
                  emailValidation.isValid === false
                ))
              ) ? 0.6 : 1
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                Création...
              </>
            ) : step === 1 ? (
              'Suivant →'
            ) : (
              <>
                <UserPlus style={{ width: '16px', height: '16px' }} />
                Créer l'utilisateur
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}