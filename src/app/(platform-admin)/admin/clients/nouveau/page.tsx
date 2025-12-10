'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Building2, Search, AlertCircle, CheckCircle, 
  ChevronRight, ChevronLeft, User, Mail, Shield, Send 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type EnterpriseCat = 'MIC' | 'PME' | 'ETI' | 'GE';

interface INSEEData {
  siret: string;
  siren: string;
  legal_name?: string;
  trade_name?: string;
  ape_code?: string;
  address_line1?: string;
  postal_code?: string;
  city?: string;
  trancheEffectifsEtablissement?: string;
  trancheEffectifsUniteLegale?: string;
  forme_juridique?: string;  // ✅ AJOUT
  raw_data?: Record<string, unknown>;
  raw_data_backend?: Record<string, unknown>;
}

interface ClientFormData {
  // Étape 1
  siret: string;
  inseeData: INSEEData | null;

  // Étape 2
  name: string;
  domain: string;
  billing_email: string;
  subscription_type: 'starter' | 'professional' | 'enterprise';
  country_code: string;
  sector: string;
  enterprise_category?: EnterpriseCat;

  // Étape 3
  phone?: string;
  max_suppliers: number;
  max_auditors: number;
  activate_immediately: boolean;
  
  // ⭐ NOUVEAU - Étape 4 : Compte Admin
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
  send_admin_invitation: boolean;
}

/** Résout le libellé NAF via la route backend validée */
async function resolveNafLabel(apeCode: string): Promise<string | undefined> {
  if (!apeCode) return undefined;
  try {
    const r = await fetch(`${API_BASE}/api/v1/naf-codes/${encodeURIComponent(apeCode)}`);
    if (!r.ok) return undefined;
    const j = await r.json().catch(() => undefined);
    const label = (j && (j.label || j.libelle || j.title))?.toString().trim();
    return label || undefined;
  } catch {
    return undefined;
  }
}

function normalizeDomain(d: string): string {
  return d ? d.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim() : d;
}

export default function NewClientPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inseeLoading, setInseeLoading] = useState(false);

  // ✨ NOUVEAU : Mode de création (avec SIRET France ou manuel Hors France)
  const [creationMode, setCreationMode] = useState<'siret' | 'manual'>('siret');

  const [formData, setFormData] = useState<ClientFormData>({
    // Étape 1
    siret: '',
    inseeData: null,

    // Étape 2
    name: '',
    domain: '',
    billing_email: '',
    subscription_type: 'professional',
    country_code: 'FR',
    sector: '',
    enterprise_category: undefined,

    // Étape 3
    phone: '',
    max_suppliers: 20,
    max_auditors: 5,
    activate_immediately: true,
    
    // ⭐ NOUVEAU - Étape 4
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    send_admin_invitation: true,
  });

  // ✅ Fonction pour nettoyer le SIRET (supprimer espaces, tirets, etc.)
  const cleanSiret = (siret: string): string => {
    return siret.replace(/[\s\-_.]/g, '');
  };

  // Étape 1 : Rechercher les données INSEE
  const handleInseeSearch = async () => {
    // ✅ Nettoyer automatiquement le SIRET avant validation
    const cleanedSiret = cleanSiret(formData.siret);
    
    if (!cleanedSiret || cleanedSiret.length !== 14) {
      setError('Le SIRET doit contenir exactement 14 chiffres.');
      return;
    }

    // ✅ Mettre à jour le SIRET nettoyé dans le formulaire
    setFormData(prev => ({ ...prev, siret: cleanedSiret }));

    setError('');
    setInseeLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities/enrich-insee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siret: cleanedSiret }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          const j = await response.json().catch(() => null);
          setError(j?.detail || 'Aucune donnée INSEE trouvée pour ce SIRET.');
          return;
        }
        const txt = await response.text().catch(() => '');
        setError(txt || `Erreur ${response.status}: échec de la récupération INSEE.`);
        return;
      }

      const data = await response.json();

      if (!data?.siret || !data?.siren) {
        setError('Réponse INSEE incomplète : SIRET ou SIREN manquant.');
        return;
      }

      const inseeType = typeof data.enterprise_category === 'string'
        ? data.enterprise_category.trim().toUpperCase()
        : undefined;

      const inseeData = {
        siret: data.siret,
        siren: data.siren,
        legal_name: data.legal_name ?? undefined,
        trade_name: data.trade_name ?? undefined,
        ape_code: data.ape_code ?? undefined,
        address_line1: data.address_line1 ?? undefined,
        postal_code: data.postal_code ?? undefined,
        city: data.city ?? undefined,
        trancheEffectifsEtablissement: data.trancheEffectifsEtablissement ?? undefined,
        trancheEffectifsUniteLegale: data.trancheEffectifsUniteLegale ?? undefined,
        raw_data: data.raw_data ?? data.raw_insee_data ?? undefined,
        raw_data_backend: data as Record<string, unknown>,
      };

      let sectorLabel: string | undefined;
      if (inseeData.ape_code) {
        sectorLabel = await resolveNafLabel(inseeData.ape_code);
      }

      setFormData(prev => ({
        ...prev,
        inseeData,
        name: inseeData.legal_name || '',
        enterprise_category: inseeType,
        sector: sectorLabel || '',
        phone: prev.phone || '', 
        domain: prev.domain || '',
        billing_email: prev.billing_email || '',
        country_code: prev.country_code || 'FR',
      }));

    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Erreur lors de la récupération des données INSEE.');
    } finally {
      setInseeLoading(false);
    }
  };

  // Navigation
  const handleNext = () => {
    setError('');

    // Étape 1 : Validation selon le mode de création
    if (currentStep === 1) {
      if (creationMode === 'siret') {
        // Mode SIRET : les données INSEE doivent être chargées
        if (!formData.inseeData) {
          setError('Veuillez d\'abord rechercher les données INSEE');
          return;
        }
      } else {
        // Mode manuel (Hors France) : le nom et le pays doivent être remplis
        if (!formData.name?.trim()) {
          setError('Veuillez saisir le nom de l\'entreprise');
          return;
        }
        if (!formData.country_code) {
          setError('Veuillez sélectionner le pays de l\'entreprise');
          return;
        }
      }
    }

    if (currentStep === 2 && (!formData.name || !formData.billing_email)) {
      setError('Veuillez remplir les champs obligatoires (nom et email de facturation)');
      return;
    }

    if (currentStep === 3) {
      // Validation du compte admin
      if (!formData.admin_email || !formData.admin_first_name || !formData.admin_last_name) {
        setError('Veuillez remplir tous les champs du compte administrateur');
        return;
      }
      // Créer l'organisation ET le compte admin
      handleCreateOrganization();
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // ⭐ CORRIGÉ : Créer l'organisation (appelé à l'étape 3)
  const handleCreateOrganization = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        domain: formData.domain ? normalizeDomain(formData.domain) : undefined,
        subscription_type: formData.subscription_type,
        email: formData.billing_email,
        phone: formData.phone || undefined,
        country_code: formData.country_code,
        sector: formData.sector || undefined,
        enterprise_category: formData.enterprise_category || undefined,
        max_suppliers: formData.max_suppliers,
        max_auditors: formData.max_auditors,
        is_active: formData.activate_immediately,
        siret: formData.inseeData?.siret,
        naf: formData.inseeData?.ape_code,
        naf_title: formData.sector || undefined,
        
        // ✅ AJOUT : Envoyer TOUTES les données INSEE
        siren: formData.inseeData?.siren,
        ape_code: formData.inseeData?.ape_code,
        denomination: formData.inseeData?.legal_name || formData.inseeData?.trade_name,
        activite_principale: formData.sector,
        code_naf: formData.inseeData?.ape_code,
        libelle_naf: formData.sector,
        forme_juridique: formData.inseeData?.forme_juridique,  // ✅ AJOUT
        adresse: formData.inseeData?.address_line1,
        address_line1: formData.inseeData?.address_line1,
        code_postal: formData.inseeData?.postal_code,
        postal_code: formData.inseeData?.postal_code,
        commune: formData.inseeData?.city,
        city: formData.inseeData?.city,
        tranche_effectif: formData.inseeData?.trancheEffectifsUniteLegale || formData.inseeData?.trancheEffectifsEtablissement,
      };

      console.log('🚀 Création de l\'organisation avec payload:', payload);
      console.log('📧 Admin email:', formData.admin_email);
      console.log('👤 Admin name:', `${formData.admin_first_name} ${formData.admin_last_name}`);

      const response = await fetch(
        `${API_BASE}/api/v1/admin/organizations?` +
        `admin_email=${encodeURIComponent(formData.admin_email)}&` +
        `admin_first_name=${encodeURIComponent(formData.admin_first_name)}&` +
        `admin_last_name=${encodeURIComponent(formData.admin_last_name)}&` +
        `admin_password=TempPass2025!`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let message = 'Erreur lors de la création du client';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            message = (errorData?.detail && typeof errorData.detail === 'string')
              ? errorData.detail
              : errorData.message || message;
          } else {
            const text = await response.text();
            message = text || message;
          }
        } catch {}
        throw new Error(message);
      }

      const createdOrg = await response.json();

      // 🔍 DEBUG: Vérifier la réponse
      console.log('✅ Organisation créée:', createdOrg);
      console.log('📝 Organization ID:', createdOrg.id);
      console.log('🏢 Tenant ID:', createdOrg.tenant_id);

      // ✅ Succès : rediriger vers la liste des clients
      router.push(`/admin/clients?success=client_and_admin_created&name=${encodeURIComponent(formData.name)}&admin_email=${encodeURIComponent(formData.admin_email)}`);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Erreur création organisation:', err);
      setError(error.message || 'Erreur lors de la création du client');
    } finally {
      setLoading(false);
    }
  };

  // Rendu des étapes
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  // Étape 1 : Choix du mode + SIRET ou Saisie manuelle - Responsive
  const renderStep1 = () => (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">Identification de l'entreprise</CardTitle>
        <CardDescription className="text-sm">
          Choisissez le mode de création selon la localisation de l'entreprise
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        {/* ✨ Sélecteur de mode de création */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Mode de création</Label>
          <div className="space-y-3">
            <label
              className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
              style={{
                borderColor: creationMode === 'siret' ? '#10b981' : '#e5e7eb',
                backgroundColor: creationMode === 'siret' ? '#f0fdf4' : 'white'
              }}
            >
              <input
                type="radio"
                name="creationMode"
                value="siret"
                checked={creationMode === 'siret'}
                onChange={() => {
                  setCreationMode('siret');
                  setFormData(prev => ({ ...prev, inseeData: null, country_code: 'FR' }));
                  setError('');
                }}
                className="w-4 h-4 text-emerald-600"
              />
              <div className="ml-3">
                <span className="font-semibold text-gray-900">🇫🇷 Entreprise française (avec SIRET)</span>
                <p className="text-sm text-gray-600 mt-1">
                  Recherche automatique via le numéro SIRET - Données INSEE
                </p>
              </div>
            </label>

            <label
              className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50"
              style={{
                borderColor: creationMode === 'manual' ? '#10b981' : '#e5e7eb',
                backgroundColor: creationMode === 'manual' ? '#f0fdf4' : 'white'
              }}
            >
              <input
                type="radio"
                name="creationMode"
                value="manual"
                checked={creationMode === 'manual'}
                onChange={() => {
                  setCreationMode('manual');
                  setFormData(prev => ({ ...prev, siret: '', inseeData: null, country_code: '' }));
                  setError('');
                }}
                className="w-4 h-4 text-emerald-600"
              />
              <div className="ml-3">
                <span className="font-semibold text-gray-900">🌍 Entreprise hors France (sans SIRET)</span>
                <p className="text-sm text-gray-600 mt-1">
                  Saisie manuelle complète des informations - Structure internationale
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Mode SIRET : Recherche INSEE */}
        {creationMode === 'siret' && (
          <div>
            <Label htmlFor="siret" className="text-sm">SIRET <span className="text-red-500">*</span></Label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Input
                id="siret"
                value={formData.siret}
                onChange={(e) => {
                  const cleaned = cleanSiret(e.target.value);
                  setFormData({...formData, siret: cleaned});
                }}
                placeholder="33131210800045"
                required
                className="text-sm"
              />
              <Button
                onClick={handleInseeSearch}
                disabled={inseeLoading || formData.siret.length !== 14}
                className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                size="sm"
              >
                {inseeLoading ? (
                  <span className="text-sm">Recherche...</span>
                ) : (
                  <>
                    <Search className="w-4 h-4 sm:mr-2" />
                    <span className="text-sm">Rechercher</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Saisissez les 14 chiffres du SIRET pour récupérer automatiquement les informations
            </p>

            {formData.inseeData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-900 text-sm sm:text-base truncate">{formData.inseeData.legal_name}</p>
                    <div className="text-xs sm:text-sm text-green-700 mt-2 space-y-1">
                      <p className="break-all">SIRET: {formData.inseeData.siret}</p>
                      <p>SIREN: {formData.inseeData.siren}</p>
                      {formData.inseeData.ape_code && <p>Code APE: {formData.inseeData.ape_code}</p>}
                      {formData.inseeData.address_line1 && <p className="break-words">Adresse: {formData.inseeData.address_line1}</p>}
                      {formData.inseeData.city && <p>Ville: {formData.inseeData.city}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode Manuel : Saisie directe (Hors France) */}
        {creationMode === 'manual' && (
          <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">Saisie manuelle - Entreprise internationale</span>
            </div>

            <div>
              <Label htmlFor="manual_name" className="text-sm font-medium">
                Nom de l'entreprise <span className="text-red-500">*</span>
              </Label>
              <Input
                id="manual_name"
                type="text"
                placeholder="Ex: Acme Corporation Ltd"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="country_code" className="text-sm font-medium">
                Pays <span className="text-red-500">*</span>
              </Label>
              <select
                id="country_code"
                value={formData.country_code}
                onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm mt-1"
              >
                <option value="">-- Sélectionner un pays --</option>
                <option value="BE">🇧🇪 Belgique</option>
                <option value="CH">🇨🇭 Suisse</option>
                <option value="DE">🇩🇪 Allemagne</option>
                <option value="ES">🇪🇸 Espagne</option>
                <option value="GB">🇬🇧 Royaume-Uni</option>
                <option value="IT">🇮🇹 Italie</option>
                <option value="LU">🇱🇺 Luxembourg</option>
                <option value="MA">🇲🇦 Maroc</option>
                <option value="NL">🇳🇱 Pays-Bas</option>
                <option value="PT">🇵🇹 Portugal</option>
                <option value="TN">🇹🇳 Tunisie</option>
                <option value="US">🇺🇸 États-Unis</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="OTHER">🌍 Autre</option>
              </select>
            </div>

            <div>
              <Label htmlFor="manual_sector" className="text-sm font-medium">
                Secteur d'activité (optionnel)
              </Label>
              <Input
                id="manual_sector"
                type="text"
                placeholder="Ex: Services IT, Conseil, Industrie..."
                value={formData.sector || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Étape 2 : Informations client - Responsive
  const renderStep2 = () => (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">Informations du Client</CardTitle>
        <CardDescription className="text-sm">
          Complétez les informations de l'organisation cliente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-sm">Nom <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="domain" className="text-sm">Domaine</Label>
            <Input
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="entreprise.fr"
              className="text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="billing_email" className="text-sm">Email de facturation <span className="text-red-500">*</span></Label>
            <Input
              id="billing_email"
              type="email"
              value={formData.billing_email}
              onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
              className="text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="subscription" className="text-sm">Type d'abonnement</Label>
            <select
              id="subscription"
              value={formData.subscription_type}
              onChange={(e) => setFormData({ ...formData, subscription_type: e.target.value as any })}
              className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm mt-1"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {formData.sector && (
            <div className="sm:col-span-2">
              <Label className="text-sm">Secteur d'activité</Label>
              <Input value={formData.sector} disabled className="bg-gray-50 text-sm mt-1" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Étape 3 : Configuration + Compte Admin - Responsive
  const renderStep3 = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Configuration</CardTitle>
          <CardDescription className="text-sm">
            Définissez les paramètres et limites de l'organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="text-sm">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+33 1 23 45 67 89"
                className="text-sm mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max_suppliers" className="text-sm">Nombre max de fournisseurs</Label>
              <Input
                id="max_suppliers"
                type="number"
                value={formData.max_suppliers}
                onChange={(e) => setFormData({ ...formData, max_suppliers: parseInt(e.target.value) || 0 })}
                className="text-sm mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max_auditors" className="text-sm">Nombre max d'auditeurs</Label>
              <Input
                id="max_auditors"
                type="number"
                value={formData.max_auditors}
                onChange={(e) => setFormData({ ...formData, max_auditors: parseInt(e.target.value) || 0 })}
                className="text-sm mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-4">
            <input
              type="checkbox"
              id="activate"
              checked={formData.activate_immediately}
              onChange={(e) => setFormData({ ...formData, activate_immediately: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="activate" className="cursor-pointer text-sm">
              Activer immédiatement le client
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Compte Admin */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate">Compte Administrateur Principal</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">
                Créez le compte admin qui aura tous les droits sur cette organisation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Formulaire compte admin */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admin_first_name" className="text-sm">
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <Input
                    id="admin_first_name"
                    value={formData.admin_first_name}
                    onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })}
                    placeholder="Jean"
                    className="pl-9 sm:pl-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="admin_last_name" className="text-sm">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <Input
                    id="admin_last_name"
                    value={formData.admin_last_name}
                    onChange={(e) => setFormData({ ...formData, admin_last_name: e.target.value })}
                    placeholder="Dupont"
                    className="pl-9 sm:pl-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="admin_email" className="text-sm">
                Email professionnel <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  id="admin_email"
                  type="email"
                  value={formData.admin_email || ''}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  placeholder="admin@entreprise.fr"
                  className="pl-9 sm:pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                L'invitation sera envoyée à cette adresse
              </p>
            </div>

            {/* Option d'invitation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <input
                  type="checkbox"
                  id="send_invitation"
                  checked={formData.send_admin_invitation}
                  onChange={(e) => setFormData({ ...formData, send_admin_invitation: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="send_invitation" className="cursor-pointer font-semibold text-blue-900 text-xs sm:text-sm">
                    Envoyer l'invitation par email
                  </Label>
                  <p className="text-[10px] sm:text-sm text-blue-700 mt-1">
                    L'administrateur recevra un email avec un lien pour activer son compte et
                    définir son mot de passe. Le lien est valide 7 jours.
                  </p>
                </div>
              </div>
            </div>

            {/* Rôle affiché */}
            <div>
              <Label className="text-sm">Rôle attribué</Label>
              <div className="flex items-center gap-2 mt-2 px-3 sm:px-4 py-2 sm:py-3 bg-purple-50 border border-purple-200 rounded-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-purple-900 text-sm sm:text-base">Super Admin</p>
                  <p className="text-[10px] sm:text-xs text-purple-700">Tous les droits sur l'organisation</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Header - Responsive */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 transition-colors group"
            title="Retour aux clients"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Retour aux clients</span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Nouveau Client</h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">Créez une nouvelle organisation cliente</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">

      {/* Progress Steps - Responsive */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold text-sm sm:text-base
                ${step === currentStep ? 'bg-emerald-600 text-white' :
                  step < currentStep ? 'bg-emerald-600 text-white' :
                  'bg-gray-200 text-gray-600'}
              `}>
                {step < currentStep ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : step}
              </div>
              {step < 3 && (
                <div className={`w-12 sm:w-16 md:w-24 h-0.5 sm:h-1 ${step < currentStep ? 'bg-emerald-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        {/* Labels - Hidden on very small screens */}
        <div className="hidden xs:flex items-center justify-center gap-2 sm:gap-4 mt-2">
          <span className="w-20 sm:w-28 md:w-32 text-center text-[10px] sm:text-xs text-gray-600">Identification</span>
          <span className="w-20 sm:w-28 md:w-32 text-center text-[10px] sm:text-xs text-gray-600">Informations</span>
          <span className="w-24 sm:w-32 md:w-40 text-center text-[10px] sm:text-xs text-gray-600">Config & Admin</span>
        </div>
      </div>

      {/* Error Alert - Responsive */}
      {error && (
        <Alert variant="destructive" className="mb-4 sm:mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content - Responsive */}
      <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons - Responsive */}
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || loading}
          className="text-sm sm:text-base"
          size="sm"
        >
          <ChevronLeft className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Précédent</span>
        </Button>

        <Button
          onClick={handleNext}
          disabled={loading}
          className={`text-sm sm:text-base ${currentStep === 3 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          size="sm"
        >
          {loading ? (
            <span className="text-xs sm:text-sm">Création...</span>
          ) : currentStep === 3 ? (
            <>
              <Send className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Créer le client et le compte admin</span>
              <span className="sm:hidden">Créer</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Suivant</span>
              <span className="sm:hidden">Suiv.</span>
              <ChevronRight className="w-4 h-4 sm:ml-2" />
            </>
          )}
        </Button>
      </div>
        </div>
      </main>
    </div>
  );
}