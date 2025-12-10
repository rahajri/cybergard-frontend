'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Search, AlertCircle, CheckCircle, Users, Package, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import OrganismSuccessModal from '../../components/OrganismSuccessModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface INSEEData {
  siret: string;
  siren: string;
  legal_name?: string;
  trade_name?: string;
  ape_code?: string;
  address_line1?: string;
  postal_code?: string;
  city?: string;
  employee_count?: number;
}

interface Category {
  id: string;
  name: string;
  entity_category: string;
  description?: string;
  parent_category_id?: string | null;
  hierarchy_level?: number;
  children_count?: number;
}

interface Pole {
  id: string;
  name: string;
  description?: string;
  short_code?: string;
}

interface OrganismFormData {
  stakeholder_type: 'internal' | 'external';
  
  // Commun
  name?: string;
  description?: string;
  activate_immediately: boolean;
  
  // Pour EXTERNE
  siret?: string;
  inseeData?: INSEEData | null;
  entity_category?: string;
  category_id?: string;
  
  // Pour INTERNE
  pole_id?: string;
  short_code?: string;
}

// ============================================================================
// COMPOSANT : CategoryTreeItem - Affichage hiérarchique des catégories
// ============================================================================
interface CategoryTreeItemProps {
  category: Category;
  selectedCategoryId: string | null;
  onSelect: (category: Category) => void;
  level?: number;
}

const CategoryTreeItem = ({ 
  category, 
  selectedCategoryId, 
  onSelect, 
  level = 0 
}: CategoryTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  
  const hasChildren = category.children_count && category.children_count > 0;
  const isSelected = selectedCategoryId === category.id;

  const loadSubCategories = async () => {
    if (subCategories.length > 0) {
      setIsExpanded(!isExpanded);
      return;
    }

    setLoading(true);
    try {
      // ✅ SÉCURITÉ: Récupérer l'organization_id pour isolation multi-tenant
      const userStr = localStorage.getItem('user');
      const orgId = userStr ? JSON.parse(userStr).organizationId : null;

      const url = orgId
        ? `${API_BASE}/api/v1/hierarchy/categories/${category.id}/children?client_organization_id=${orgId}`
        : `${API_BASE}/api/v1/hierarchy/categories/${category.id}/children`;

      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSubCategories(data || []);
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('❌ Erreur chargement sous-catégories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = () => {
    switch (category.entity_category) {
      case 'client': return <Users className="w-5 h-5 text-blue-600" />;
      case 'supplier': return <Package className="w-5 h-5 text-green-600" />;
      case 'partner': return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'subcontractor': return <Users className="w-5 h-5 text-orange-600" />;
      default: return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryLabel = () => {
    switch (category.entity_category) {
      case 'client': return 'Client externe';
      case 'supplier': return 'Fournisseur externe';
      case 'partner': return 'Partenaire externe';
      case 'subcontractor': return 'Sous-traitant externe';
      default: return 'Externe';
    }
  };

  return (
    <div className={`${level > 0 ? 'ml-6 mt-2' : 'mt-3'}`}>
      {/* Ligne principale de la catégorie */}
      <div
        className={`
          flex items-center gap-3 p-4 rounded-lg border-2 transition-all
          ${isSelected 
            ? 'border-green-500 bg-green-50 shadow-md' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
          }
        `}
      >
        {/* Radio button */}
        <button
          type="button"
          onClick={() => onSelect(category)}
          className="flex-shrink-0"
        >
          <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
            ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'}
          `}>
            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </button>

        {/* Icône de catégorie */}
        <div className="flex-shrink-0">
          {getCategoryIcon()}
        </div>

        {/* Nom et description */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(category)}>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">
              {/* Nettoyer le nom : retirer " 0" ou " 0 " à la fin */}
              {category.name.replace(/\s+0\s*$/, '').trim() || category.name}
            </p>
            {hasChildren && (category.children_count ?? 0) > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {category.children_count} sous-catégorie{(category.children_count ?? 0) > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{getCategoryLabel()}</p>
        </div>

        {/* Bouton déroulant si sous-catégories */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadSubCategories();
            }}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 rotate-180 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600 transition-transform duration-200" />
            )}
          </button>
        )}
      </div>

      {/* Sous-catégories dépliées avec ligne de hiérarchie */}
      {isExpanded && subCategories.length > 0 && (
        <div className="ml-4 mt-2 border-l-2 border-blue-200 pl-2">
          {subCategories.map((subCat) => (
            <CategoryTreeItem
              key={subCat.id}
              category={subCat}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function NewOrganismPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inseeLoading, setInseeLoading] = useState(false);
  
  // ✨ NOUVEAU : Mode de création (avec ou sans SIRET)
  const [creationMode, setCreationMode] = useState<'siret' | 'manual'>('siret');
  
  // État pour le modal de succès
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrganism, setCreatedOrganism] = useState<any>(null);
  
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availablePoles, setAvailablePoles] = useState<Pole[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');

  const [formData, setFormData] = useState<OrganismFormData>({
    stakeholder_type: 'external',
    activate_immediately: false,
  });

  // Charger les catégories EXTERNES
  const fetchCategories = async () => {
    try {
      console.log('📂 Chargement des catégories externes...');

      // ✅ SÉCURITÉ: Récupérer l'organization_id pour isolation cache multi-tenant
      const userStr = localStorage.getItem('user');
      const orgId = userStr ? JSON.parse(userStr).organizationId : null;

      const url = orgId
        ? `${API_BASE}/api/v1/ecosystem/categories?stakeholder_type=external&client_organization_id=${orgId}`
        : `${API_BASE}/api/v1/ecosystem/categories?stakeholder_type=external`;

      console.log('🔒 Requête catégories avec organization:', orgId);

      const response = await fetch(url, {
        credentials: 'include'  // ✅ Inclure les cookies pour l'authentification
      });
      if (!response.ok) return;
      const data = await response.json();
      const allCategories = data.items || data || [];
      
      // Séparer catégories principales (sans parent) et sous-catégories
      const mainCategories = allCategories.filter((c: Category) => 
        !c.parent_category_id
      );
      
      // Compter les enfants pour chaque catégorie principale
      const categoriesWithCount = mainCategories.map((mainCat: Category) => ({
        ...mainCat,
        children_count: allCategories.filter((c: Category) => 
          c.parent_category_id === mainCat.id
        ).length
      }));
      
      setAvailableCategories(categoriesWithCount);
      console.log(`✅ ${categoriesWithCount.length} catégories principales chargées`);
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
    }
  };

  // Charger les PÔLES INTERNES
  const fetchPoles = async () => {
    try {
      console.log('📂 Chargement des pôles internes...');
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/poles`, {
        credentials: 'include'  // ✅ Inclure les cookies pour l'authentification
      });
      if (!response.ok) return;
      const data = await response.json();
      setAvailablePoles(data.items || data || []);
    } catch (error) {
      console.error('❌ Erreur chargement pôles:', error);
    }
  };

  // Rechercher les données INSEE (pour EXTERNE uniquement)
  const handleInseeSearch = async () => {
    if (!formData.siret || formData.siret.length !== 14) {
      setError('Le SIRET doit contenir exactement 14 chiffres');
      return;
    }

    setError('');
    setInseeLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities/enrich-insee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ✅ Inclure les cookies
        body: JSON.stringify({ siret: formData.siret }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Aucune donnée INSEE trouvée pour ce SIRET');
          return;
        }
        throw new Error('Erreur lors de la récupération des données INSEE');
      }

      const inseeData = await response.json();
      setFormData(prev => ({ 
        ...prev, 
        inseeData,
        name: inseeData.legal_name || inseeData.trade_name 
      }));
      
      setCurrentStep(3); // Aller à la classification
      fetchCategories();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Erreur lors de la récupération des données INSEE');
    } finally {
      setInseeLoading(false);
    }
  };

  // Navigation
  const handleNext = () => {
    setError('');
    
    // Étape 1 : Choix du type
    if (currentStep === 1) {
      if (formData.stakeholder_type === 'internal') {
        setCurrentStep(2); // Sélection du pôle
        fetchPoles();
      } else {
        setCurrentStep(2); // Choix mode + Recherche SIRET ou saisie manuelle
        fetchCategories();
      }
      return;
    }
    
    // ✨ NOUVEAU : Étape 2 EXTERNE - Validation du mode
    if (currentStep === 2 && formData.stakeholder_type === 'external') {
      if (creationMode === 'siret') {
        // Mode SIRET : Vérifier que les données INSEE sont chargées
        if (!formData.inseeData) {
          setError('Veuillez rechercher un SIRET valide avant de continuer');
          return;
        }
      } else {
        // Mode manuel : Vérifier que le nom est rempli
        if (!formData.name?.trim()) {
          setError('Veuillez saisir le nom de l\'organisme');
          return;
        }
      }
      setCurrentStep(3); // Classification (catégorie)
      return;
    }
    
    // Étape 2 INTERNE : Sélection du pôle
    if (currentStep === 2 && formData.stakeholder_type === 'internal') {
      if (!formData.pole_id) {
        setError('Veuillez sélectionner un pôle');
        return;
      }
      setCurrentStep(3); // Formulaire manuel
      return;
    }
    
    // Étape 3 INTERNE : Formulaire manuel
    if (currentStep === 3 && formData.stakeholder_type === 'internal') {
      if (!formData.name?.trim()) {
        setError('Veuillez saisir le nom de l\'organisme');
        return;
      }
      setCurrentStep(4); // Confirmation
      return;
    }
    
    // Étape 3 EXTERNE : Classification
    if (currentStep === 3 && formData.stakeholder_type === 'external') {
      if (!formData.category_id) {
        setError('Veuillez sélectionner une catégorie');
        return;
      }
      setCurrentStep(4); // Confirmation
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Soumission finale
  const handleSubmit = async () => {
    console.log('🚀 Début de la soumission');
    console.log('📋 FormData complet:', formData);
    
    setError('');
    setLoading(true);

    try {
      // Validation finale avant envoi
      if (formData.stakeholder_type === 'internal' && !formData.pole_id) {
        setError('Erreur : Le pôle n\'est pas sélectionné');
        setLoading(false);
        return;
      }
      
      if (formData.stakeholder_type === 'external' && !formData.category_id) {
        setError('Erreur : La catégorie n\'est pas sélectionnée');
        setLoading(false);
        return;
      }

      // Récupérer l'organization_id de l'utilisateur connecté
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setError('Utilisateur non connecté');
        setLoading(false);
        return;
      }
      const user = JSON.parse(userStr);
      const organizationId = user.organizationId;

      if (!organizationId) {
        setError('Organization ID manquant');
        setLoading(false);
        return;
      }

      const payload: Record<string, unknown> = {
        name: formData.name,
        stakeholder_type: formData.stakeholder_type,
        description: formData.description,
        client_organization_id: organizationId,
        status: formData.activate_immediately ? 'active' : 'pending',
        is_active: formData.activate_immediately,
        country_code: 'FR',
      };

      if (formData.stakeholder_type === 'external') {
        Object.assign(payload, {
          siret: formData.siret,
          siren: formData.inseeData?.siren,
          legal_name: formData.inseeData?.legal_name,
          trade_name: formData.inseeData?.trade_name,
          ape_code: formData.inseeData?.ape_code,
          address_line1: formData.inseeData?.address_line1,
          postal_code: formData.inseeData?.postal_code,
          city: formData.inseeData?.city,
          employee_count: formData.inseeData?.employee_count,
          entity_category: formData.entity_category,
          category_id: formData.category_id,
        });
      } else {
        Object.assign(payload, {
          pole_id: formData.pole_id,
          short_code: formData.short_code,
        });
        console.log('📦 Payload INTERNE construit:', {
          pole_id: formData.pole_id,
          short_code: formData.short_code,
          name: formData.name
        });
      }

      console.log('📤 Payload complet envoyé:', payload);
      console.log('🔍 pole_id dans payload:', payload.pole_id);

      const response = await fetch(
        `${API_BASE}/api/v1/ecosystem/entities${formData.stakeholder_type === 'external' ? '?enrich_with_insee=true' : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',  // ✅ Inclure les cookies
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la création');
      }

      const result = await response.json();
      console.log('✅ Organisme créé:', result);

      // Stocker les infos de l'organisme créé
      setCreatedOrganism(result);
      
      // Afficher le modal de succès
      setShowSuccessModal(true);
      
      // La redirection se fera automatiquement après 3 secondes via le modal
    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur:', err);
      setError(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // Calculer le titre selon l'étape et le type
  const getStepInfo = () => {
    if (currentStep === 1) {
      return { title: 'Type d\'organisme', description: 'Choisissez le type d\'organisme à créer' };
    }
    
    if (formData.stakeholder_type === 'internal') {
      if (currentStep === 2) return { title: 'Sélection du pôle', description: 'Choisissez le pôle de rattachement' };
      if (currentStep === 3) return { title: 'Informations', description: 'Saisissez les informations de l\'organisme' };
      if (currentStep === 4) return { title: 'Confirmation', description: 'Vérifiez les informations avant de créer' };
    } else {
      if (currentStep === 2) return { title: 'Recherche SIRET', description: 'Recherchez l\'organisme via son numéro SIRET' };
      if (currentStep === 3) return { title: 'Classification', description: 'Sélectionnez la catégorie de l\'organisme' };
      if (currentStep === 4) return { title: 'Confirmation', description: 'Vérifiez les informations avant de créer' };
    }
    
    return { title: '', description: '' };
  };

  const stepInfo = getStepInfo();

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'écosystème
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nouvel Organisme</h1>
            <p className="text-gray-600 mt-1">Ajoutez une nouvelle entité à votre écosystème</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step, idx) => {
            // Labels dynamiques selon le type
            let label = '';
            if (step === 1) label = 'Type';
            else if (formData.stakeholder_type === 'internal') {
              if (step === 2) label = 'Pôle';
              if (step === 3) label = 'Informations';
              if (step === 4) label = 'Confirmation';
            } else {
              if (step === 2) label = 'SIRET';
              if (step === 3) label = 'Classification';
              if (step === 4) label = 'Confirmation';
            }
            
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step === currentStep
                        ? 'bg-blue-600 text-white'
                        : step < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${step === currentStep ? 'text-blue-600' : 'text-gray-600'}`}>
                      {label}
                    </p>
                  </div>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${step < currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{stepInfo.title}</CardTitle>
            <CardDescription>{stepInfo.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Erreur */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ÉTAPE 1 : CHOIX DU TYPE */}
            {currentStep === 1 && (
              <div className="grid grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ 
                      ...prev, 
                      stakeholder_type: 'internal',
                      siret: undefined,
                      inseeData: undefined,
                      category_id: undefined,
                    }));
                  }}
                  className={`p-8 border-2 rounded-xl text-center transition-all ${
                    formData.stakeholder_type === 'internal'
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="font-bold text-lg mb-2">Interne</h3>
                  <p className="text-sm text-gray-600">
                    Subdivisions internes
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ 
                      ...prev, 
                      stakeholder_type: 'external',
                      pole_id: undefined,
                    }));
                  }}
                  className={`p-8 border-2 rounded-xl text-center transition-all ${
                    formData.stakeholder_type === 'external'
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="font-bold text-lg mb-2">Externe</h3>
                  <p className="text-sm text-gray-600">
                    Clients, fournisseurs...
                  </p>
                </button>
              </div>
            )}

            {/* ÉTAPE 2 INTERNE : SÉLECTION DU PÔLE */}
            {currentStep === 2 && formData.stakeholder_type === 'internal' && (
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Sélectionnez un pôle *
                </Label>
                <div className="space-y-3">
                  {availablePoles.map((pole) => (
                    <button
                      key={pole.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pole_id: pole.id }))}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        formData.pole_id === pole.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold">{pole.name}</p>
                          {pole.description && (
                            <p className="text-sm text-gray-600">{pole.description}</p>
                          )}
                        </div>
                        {formData.pole_id === pole.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {availablePoles.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Aucun pôle disponible. Veuillez créer des pôles d'abord.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* ÉTAPE 2 EXTERNE : CHOIX DU MODE + RECHERCHE/SAISIE */}
            {currentStep === 2 && formData.stakeholder_type === 'external' && (
              <div className="space-y-6">
                {/* ✨ NOUVEAU : Sélecteur de mode de création */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Mode de création *
                  </Label>
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                      style={{
                        borderColor: creationMode === 'siret' ? '#3b82f6' : '#e5e7eb',
                        backgroundColor: creationMode === 'siret' ? '#eff6ff' : 'white'
                      }}>
                      <input
                        type="radio"
                        name="creationMode"
                        value="siret"
                        checked={creationMode === 'siret'}
                        onChange={() => {
                          setCreationMode('siret');
                          setFormData(prev => ({ ...prev, inseeData: null }));
                          setError('');
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="ml-3">
                        <span className="font-semibold text-gray-900">🇫🇷 Avec SIRET (France uniquement)</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Recherche automatique via le numéro SIRET - Données INSEE
                        </p>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
                      style={{
                        borderColor: creationMode === 'manual' ? '#10b981' : '#e5e7eb',
                        backgroundColor: creationMode === 'manual' ? '#f0fdf4' : 'white'
                      }}>
                      <input
                        type="radio"
                        name="creationMode"
                        value="manual"
                        checked={creationMode === 'manual'}
                        onChange={() => {
                          setCreationMode('manual');
                          setFormData(prev => ({ ...prev, siret: undefined, inseeData: null }));
                          setError('');
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="ml-3">
                        <span className="font-semibold text-gray-900">🌍 Sans SIRET (International ou saisie manuelle)</span>
                        <p className="text-sm text-gray-600 mt-1">
                          Saisie manuelle complète des informations - Structure hors France
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Champ SIRET (si mode SIRET) */}
                {creationMode === 'siret' && (
                  <div>
                    <Label htmlFor="siret" className="text-base font-semibold">
                      Numéro SIRET *
                    </Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="siret"
                        type="text"
                        placeholder="Ex: 33825323009267"
                        value={formData.siret || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                          setFormData(prev => ({ ...prev, siret: value }));
                        }}
                        maxLength={14}
                        className="flex-1 font-mono"
                      />
                      <Button
                        onClick={handleInseeSearch}
                        disabled={inseeLoading || (formData.siret?.length !== 14)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {inseeLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Rechercher
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Saisissez les 14 chiffres du SIRET pour rechercher automatiquement les informations de l'entreprise
                    </p>
                  </div>
                )}

                {/* Formulaire manuel (si mode manuel) */}
                {creationMode === 'manual' && (
                  <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">Saisie manuelle des informations</span>
                    </div>
                    
                    <div>
                      <Label htmlFor="manual_name" className="text-sm font-medium">
                        Nom de l'organisme *
                      </Label>
                      <Input
                        id="manual_name"
                        type="text"
                        placeholder="Ex: Acme Corporation"
                        value={formData.name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual_description" className="text-sm font-medium">
                        Description (optionnel)
                      </Label>
                      <Input
                        id="manual_description"
                        type="text"
                        placeholder="Ex: Fournisseur de services IT en Espagne"
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 3 INTERNE : FORMULAIRE MANUEL */}
            {currentStep === 3 && formData.stakeholder_type === 'internal' && (
              <div className="space-y-6">
                {/* Afficher le pôle sélectionné */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Pôle sélectionné :</strong> {availablePoles.find(p => p.id === formData.pole_id)?.name}
                  </p>
                </div>

                <div>
                  <Label htmlFor="name" className="text-base font-semibold">
                    Nom de l'organisme *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: Service Comptabilité"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  />
                </div>

                <div>
                  <Label htmlFor="short_code" className="text-base font-semibold">
                    Code court (optionnel)
                  </Label>
                  <Input
                    id="short_code"
                    type="text"
                    placeholder="Ex: COMPTA"
                    value={formData.short_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_code: e.target.value.toUpperCase() }))}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    maxLength={10}
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-semibold">
                    Description (optionnel)
                  </Label>
                  <textarea
                    id="description"
                    placeholder="Description de l'organisme..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* ÉTAPE 3 EXTERNE : CLASSIFICATION */}
            {currentStep === 3 && formData.stakeholder_type === 'external' && (
              <div className="space-y-6">
                {formData.inseeData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                      <CheckCircle className="w-5 h-5" />
                      Organisme identifié
                    </div>
                    <p className="font-medium text-lg">{formData.inseeData.legal_name}</p>
                    <p className="text-sm text-gray-600">
                      {formData.inseeData.address_line1}, {formData.inseeData.postal_code} {formData.inseeData.city}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Catégorie *
                  </Label>
                  <p className="text-sm text-gray-600 mb-4">
                    Sélectionnez la catégorie de l'organisme. Cliquez sur <ChevronDown className="inline w-3 h-3" /> pour voir les sous-catégories.
                  </p>

                  {/* Arbre hiérarchique des catégories */}
                  <div className="space-y-2">
                    {availableCategories.map((category) => (
                      <CategoryTreeItem
                        key={category.id}
                        category={category}
                        selectedCategoryId={formData.category_id || null}
                        onSelect={(cat) => {
                          setFormData(prev => ({
                            ...prev,
                            category_id: cat.id,
                            entity_category: cat.entity_category
                          }));
                          // ✅ Stocker le nom de la catégorie sélectionnée
                          setSelectedCategoryName(cat.name.replace(/\s+0\s*$/, '').trim());
                        }}
                      />
                    ))}
                  </div>

                  {/* Breadcrumb de sélection */}
                  {formData.category_id && selectedCategoryName && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          Sélection : {selectedCategoryName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-semibold">
                    Description (optionnel)
                  </Label>
                  <textarea
                    id="description"
                    placeholder="Description de l'organisme..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : CONFIRMATION */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-lg mb-4">Récapitulatif</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Nom :</span>
                      <p className="font-medium">{formData.name || formData.inseeData?.legal_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Type :</span>
                      <p className="font-medium">
                        {formData.stakeholder_type === 'internal' ? 'Interne' : 'Externe'}
                      </p>
                    </div>
                    {formData.siret && (
                      <div>
                        <span className="text-gray-600">SIRET :</span>
                        <p className="font-medium font-mono">{formData.siret}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">
                        {formData.stakeholder_type === 'internal' ? 'Pôle :' : 'Catégorie :'}
                      </span>
                      <p className="font-medium">
                        {formData.stakeholder_type === 'internal'
                          ? availablePoles.find(p => p.id === formData.pole_id)?.name
                          : availableCategories.find(c => c.id === formData.category_id)?.name
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activate"
                    checked={formData.activate_immediately}
                    onChange={(e) => setFormData(prev => ({ ...prev, activate_immediately: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="activate" className="text-sm cursor-pointer">
                    Activer immédiatement l'organisme
                  </Label>
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-between pt-4 border-t">
              {currentStep > 1 && (
                <Button
                  type="button"
                  onClick={handlePrevious}
                  variant="outline"
                  disabled={loading}
                >
                  Précédent
                </Button>
              )}
              
              <div className="ml-auto">
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Suivant
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Création...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Créer l'organisme
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de succès */}
      <OrganismSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/client/administration');
        }}
        organismName={formData.name || createdOrganism?.name || 'Organisme'}
        organismType={formData.stakeholder_type}
        details={[
          { 
            label: 'Type', 
            value: formData.stakeholder_type === 'internal' ? 'Interne' : 'Externe' 
          },
          ...(formData.stakeholder_type === 'internal' 
            ? [
                { 
                  label: 'Pôle', 
                  value: availablePoles.find(p => p.id === formData.pole_id)?.name || 'N/A' 
                },
                ...(formData.short_code ? [{ label: 'Code', value: formData.short_code }] : [])
              ]
            : [
                { 
                  label: 'Catégorie', 
                  value: availableCategories.find(c => c.id === formData.category_id)?.name || 'N/A' 
                },
                ...(formData.siret ? [{ label: 'SIRET', value: formData.siret }] : [])
              ]
          ),
          { 
            label: 'Statut', 
            value: formData.activate_immediately ? 'Actif' : 'En attente' 
          }
        ]}
        autoRedirect={true}
        redirectDelay={3000}
      />
    </div>
  );
}