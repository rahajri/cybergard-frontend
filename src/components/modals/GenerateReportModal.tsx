'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Loader2, Settings, AlertCircle, CheckCircle, Building2, Globe2, ChevronDown, ChevronUp, Sparkles, PenLine, ToggleLeft, ToggleRight, FileCheck, Radar, Network } from 'lucide-react';
import {
  templatesApi,
  reportsApi,
  scanReportsApi,
  ReportTemplate,
  TemplateType,
  TemplateScope,
  ReportScope,
  GenerationMode,
  GenerateReportRequest,
  GenerateScanReportRequest,
} from '@/lib/api/reports';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { authenticatedFetch } from '@/lib/api';

// Interface pour la configuration IA d'un widget
interface AIWidgetConfig {
  widgetId: string;
  widgetType: string;
  title: string;
  useAI: boolean;  // true = générer via IA, false = utiliser le texte manuel
  manualContent: string;  // Contenu saisi manuellement
  tone: 'executive' | 'technical' | 'detailed';  // Ton du résumé IA
}

// Interface pour les entités de la campagne
interface CampaignEntity {
  id: string;
  name: string;
  code?: string;
  entity_type?: string;
}

// Interface pour les informations de scan (mode scanner)
interface ScanInfo {
  id: string;
  targetValue: string;
  targetLabel?: string;
  exposureScore?: number;
}

/**
 * Mode du modal:
 * - 'campaign': Génération de rapport pour une campagne d'audit
 * - 'scanner': Génération de rapport pour un scan externe
 */
type ModalMode = 'campaign' | 'scanner';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Mode campaign
  campaignId?: string;
  // Mode scanner
  mode?: ModalMode;
  scanId?: string;
  scanInfo?: ScanInfo;
  // Commun
  onSuccess?: () => void;
  initialScope?: ReportScope; // Scope initial optionnel (pour pré-sélection depuis dropdown)
}

export default function GenerateReportModal({
  isOpen,
  onClose,
  campaignId,
  mode = 'campaign',
  scanId,
  scanInfo,
  onSuccess,
  initialScope,
}: GenerateReportModalProps) {
  // Déterminer le mode effectif
  const effectiveMode: ModalMode = scanId ? 'scanner' : mode;
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entités de la campagne (pour rapports individuels)
  const [entities, setEntities] = useState<CampaignEntity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Form state - utilise initialScope si fourni, ou 'scan_individual' en mode scanner
  const getDefaultScope = (): ReportScope => {
    if (initialScope) return initialScope;
    if (effectiveMode === 'scanner') return 'scan_individual';
    return 'consolidated';
  };
  const [reportScope, setReportScope] = useState<ReportScope>(getDefaultScope());
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [generateAllEntities, setGenerateAllEntities] = useState<boolean>(true); // Par défaut, générer pour toutes les entités
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [forceMode, setForceMode] = useState<GenerationMode | null>(null);
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const [includeAISummary, setIncludeAISummary] = useState(true);
  const [includeBenchmarking, setIncludeBenchmarking] = useState(true);
  const [language, setLanguage] = useState('fr');

  // État pour les widgets IA du template
  const [aiWidgets, setAIWidgets] = useState<AIWidgetConfig[]>([]);
  const [showAISection, setShowAISection] = useState(false);

  // Result modal
  const [result, setResult] = useState<{ type: ModalType; message: string } | null>(null);

  // SSE Progress state (pour génération bulk)
  const [sseProgress, setSSEProgress] = useState<{
    isActive: boolean;
    totalEntities: number;
    currentEntity: number;
    currentEntityName: string;
    successCount: number;
    failedCount: number;
    completedEntities: { name: string; success: boolean; error?: string }[];
  }>({
    isActive: false,
    totalEntities: 0,
    currentEntity: 0,
    currentEntityName: '',
    successCount: 0,
    failedCount: 0,
    completedEntities: [],
  });

  // Mettre à jour le scope quand initialScope change (ouverture avec scope pré-sélectionné)
  useEffect(() => {
    if (isOpen) {
      if (initialScope) {
        setReportScope(initialScope);
      } else if (effectiveMode === 'scanner') {
        setReportScope('scan_individual');
      }
      // Initialiser le titre pour le mode scanner
      if (effectiveMode === 'scanner' && scanInfo) {
        setTitle(`Rapport Scan - ${scanInfo.targetValue}`);
      }
    }
  }, [isOpen, initialScope, effectiveMode, scanInfo]);

  // Charger les templates et entités
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Ne charger les entités que pour le mode campagne
      if (effectiveMode === 'campaign' && campaignId) {
        loadEntities();
      }
    }
  }, [isOpen, effectiveMode]);

  // Recharger les templates quand le scope change
  useEffect(() => {
    if (isOpen) {
      // IMPORTANT: Réinitialiser le template sélectionné IMMÉDIATEMENT
      // pour éviter d'utiliser un template incompatible pendant le rechargement
      setSelectedTemplateId('');
      loadTemplates();
    }
  }, [reportScope]);

  // Extraire les widgets IA quand un template est sélectionné
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template?.structure) {
        // Trouver les widgets de type ai_summary ou summary dans la structure
        const structure = Array.isArray(template.structure) ? template.structure : [];

        // Filtrer les widgets AI et utiliser leur ID existant de la base de données
        const aiWidgetConfigs: AIWidgetConfig[] = structure
          .filter((w: any) => w.widget_type === 'ai_summary' || w.widget_type === 'summary')
          .map((w: any, index: number) => ({
            // IMPORTANT: Utiliser l'ID de la base de données (ajouté par migration)
            // Fallback sur un ID basé sur position si absent
            widgetId: w.id || `widget-fallback-${index}`,
            widgetType: w.widget_type,
            title: w.config?.title || 'Résumé IA',
            useAI: w.config?.use_ai !== false, // Par défaut activé
            manualContent: w.config?.manual_content || '',
            tone: w.config?.tone || 'executive',
          }));

        console.log('🔧 AI Widgets extraits:', aiWidgetConfigs.map(w => ({id: w.widgetId, title: w.title})));

        setAIWidgets(aiWidgetConfigs);
        // Afficher la section si des widgets IA existent
        if (aiWidgetConfigs.length > 0) {
          setShowAISection(true);
        }
      } else {
        setAIWidgets([]);
      }
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      setError(null);

      // Déterminer le scope filter et la catégorie selon le mode
      let scopeFilter: TemplateScope;
      let categoryFilter: string | undefined;

      if (effectiveMode === 'scanner') {
        // Mode scanner: utiliser scan_individual ou scan_ecosystem
        scopeFilter = reportScope === 'scan_ecosystem' ? 'scan_ecosystem' : 'scan_individual';
        categoryFilter = 'scan';
      } else {
        // Mode campagne: utiliser consolidated ou entity
        scopeFilter = reportScope === 'consolidated' ? 'consolidated' : 'entity';
        categoryFilter = 'audit';  // IMPORTANT: Filtrer pour exclure les templates EBIOS
      }

      const response = await templatesApi.list({
        limit: 100,
        report_scope: scopeFilter,
        template_category: categoryFilter  // Catégorie pour filtrer audit vs ebios vs scan
      });

      const allTemplates = response.items || [];

      // Séparer les templates TENANT (personnalisés) des templates SYSTEM
      const tenantTemplates = allTemplates.filter(t => !t.is_system);
      const systemTemplates = allTemplates.filter(t => t.is_system);

      // Si le client a des templates personnalisés, n'afficher que ceux-là
      // (ils ont été dupliqués depuis les templates système avec leurs personnalisations)
      let templatesToShow: typeof allTemplates;

      if (tenantTemplates.length > 0) {
        // Le client a des templates personnalisés - utiliser uniquement ceux-là
        templatesToShow = tenantTemplates;
      } else {
        // Pas de templates personnalisés - afficher les templates système
        templatesToShow = systemTemplates;
      }

      setTemplates(templatesToShow);

      // Sélectionner le template par défaut compatible
      const compatibleScope = effectiveMode === 'scanner' ? 'scan_both' : 'both';
      const compatibleTemplates = templatesToShow.filter(t =>
        t.report_scope === scopeFilter || t.report_scope === compatibleScope
      );

      // Prioriser: 1. Template par défaut, 2. Premier template TENANT, 3. Premier template
      const defaultTemplate = compatibleTemplates.find((t) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      } else if (compatibleTemplates.length > 0) {
        setSelectedTemplateId(compatibleTemplates[0].id);
      } else {
        setSelectedTemplateId('');
      }
    } catch (err) {
      console.error('❌ Erreur chargement templates:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';

      // Détecter si c'est une erreur de permission (403)
      const isPermissionError = errorMessage.includes('403') ||
                                 errorMessage.includes('Permission') ||
                                 errorMessage.includes('permission') ||
                                 errorMessage.includes('Forbidden');

      setError(isPermissionError
        ? "Oups... Vous n'avez pas le droit nécessaire pour accéder aux templates !"
        : errorMessage);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadEntities = async () => {
    try {
      setLoadingEntities(true);

      // Récupérer les entités de la campagne via l'API
      const response = await authenticatedFetch(
        `/api/v1/campaigns/${campaignId}/entities`
      );

      if (response.ok) {
        const data = await response.json();
        setEntities(data.items || data || []);

        // Pré-sélectionner la première entité
        if ((data.items || data).length > 0) {
          setSelectedEntityId((data.items || data)[0].id);
        }
      }
    } catch (err) {
      console.error('❌ Erreur chargement entités:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  // Mettre à jour la configuration d'un widget IA
  const updateAIWidget = (widgetId: string, updates: Partial<AIWidgetConfig>) => {
    setAIWidgets(prev => prev.map(w =>
      w.widgetId === widgetId ? { ...w, ...updates } : w
    ));
  };

  // Toggle IA activé/désactivé pour un widget
  const toggleWidgetAI = (widgetId: string) => {
    setAIWidgets(prev => prev.map(w =>
      w.widgetId === widgetId ? { ...w, useAI: !w.useAI } : w
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplateId) {
      setResult({
        type: 'error',
        message: 'Veuillez sélectionner un template',
      });
      return;
    }

    // Validation du template sélectionné
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      setResult({
        type: 'error',
        message: 'Template sélectionné introuvable. Veuillez en choisir un autre.',
      });
      return;
    }

    // Validation de compatibilité template/scope
    const templateScope = selectedTemplate.report_scope;

    if (effectiveMode === 'scanner') {
      // Validations spécifiques au mode scanner
      if (reportScope === 'scan_individual' && !['scan_individual', 'scan_both'].includes(templateScope)) {
        setResult({
          type: 'error',
          message: `Le template "${selectedTemplate.name}" n'est pas compatible avec les rapports de scan individuel.`,
        });
        return;
      }
      if (reportScope === 'scan_ecosystem' && !['scan_ecosystem', 'scan_both'].includes(templateScope)) {
        setResult({
          type: 'error',
          message: `Le template "${selectedTemplate.name}" n'est pas compatible avec les rapports écosystème scanner.`,
        });
        return;
      }
      // Pour scan_individual, il faut un scanId
      if (reportScope === 'scan_individual' && !scanId) {
        setResult({
          type: 'error',
          message: 'ID du scan manquant pour un rapport individuel',
        });
        return;
      }
    } else {
      // Validations mode campagne (existantes)
      if (templateScope !== 'both') {
        // Pour génération bulk (tous organismes), il faut un template "entity" ou "both"
        if (reportScope === 'entity' && generateAllEntities && templateScope !== 'entity') {
          setResult({
            type: 'error',
            message: `Le template "${selectedTemplate.name}" est un template ${templateScope === 'consolidated' ? 'consolidé' : 'individuel'} et ne peut pas être utilisé pour générer des rapports individuels pour tous les organismes. Veuillez sélectionner un template compatible.`,
          });
          return;
        }
        // Pour rapport consolidé, il faut un template "consolidated" ou "both"
        if (reportScope === 'consolidated' && templateScope !== 'consolidated') {
          setResult({
            type: 'error',
            message: `Le template "${selectedTemplate.name}" est un template individuel et ne peut pas être utilisé pour un rapport consolidé. Veuillez sélectionner un template consolidé.`,
          });
          return;
        }
        // Pour rapport individuel unique, il faut un template "entity" ou "both"
        if (reportScope === 'entity' && !generateAllEntities && templateScope !== 'entity') {
          setResult({
            type: 'error',
            message: `Le template "${selectedTemplate.name}" est un template consolidé et ne peut pas être utilisé pour un rapport individuel. Veuillez sélectionner un template individuel.`,
          });
          return;
        }
      }

      // Validation scope/entity (mode campagne uniquement)
      if (reportScope === 'entity' && !generateAllEntities && !selectedEntityId) {
        setResult({
          type: 'error',
          message: 'Veuillez sélectionner une entité pour le rapport individuel',
        });
        return;
      }
    }

    try {
      setLoading(true);

      // Préparer les configurations IA des widgets
      const aiWidgetConfigs = aiWidgets.map(w => ({
        widget_id: w.widgetId,
        use_ai: w.useAI,
        manual_content: w.manualContent,
        tone: w.tone,
      }));

      // Si génération pour toutes les entités - Utiliser SSE
      if (reportScope === 'entity' && generateAllEntities) {
        // Utiliser SSE (Server-Sent Events) pour la génération bulk
        // Cela évite le timeout du proxy Next.js car la connexion reste ouverte
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');

        // Construire l'URL SSE avec les paramètres
        const sseUrl = `${backendUrl}/api/v1/reports/campaigns/${campaignId}/generate-bulk/stream?template_id=${selectedTemplateId}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

        console.log('🔌 Connexion SSE démarrée:', sseUrl);

        // Réinitialiser l'état de progression
        setSSEProgress({
          isActive: true,
          totalEntities: entities.length,
          currentEntity: 0,
          currentEntityName: '',
          successCount: 0,
          failedCount: 0,
          completedEntities: [],
        });

        // Créer la connexion SSE
        const eventSource = new EventSource(sseUrl, { withCredentials: true });

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 SSE Event:', data);

            switch (data.status) {
              case 'started':
                setSSEProgress(prev => ({
                  ...prev,
                  isActive: true,
                  totalEntities: data.total_entities,
                }));
                break;

              case 'entity_started':
                setSSEProgress(prev => ({
                  ...prev,
                  currentEntity: data.entity_index,
                  currentEntityName: data.entity_name,
                }));
                break;

              case 'entity_progress':
                // Mise à jour optionnelle de l'étape en cours
                console.log(`📊 ${data.entity_name}: ${data.step_label}`);
                break;

              case 'entity_completed':
                setSSEProgress(prev => ({
                  ...prev,
                  successCount: data.success_count,
                  failedCount: data.failed_count,
                  completedEntities: [
                    ...prev.completedEntities,
                    { name: data.entity_name, success: true },
                  ],
                }));
                break;

              case 'entity_failed':
                setSSEProgress(prev => ({
                  ...prev,
                  successCount: data.success_count,
                  failedCount: data.failed_count,
                  completedEntities: [
                    ...prev.completedEntities,
                    { name: data.entity_name, success: false, error: data.error },
                  ],
                }));
                break;

              case 'completed':
                console.log('✅ SSE completed - Fermeture de la connexion');
                eventSource.close();

                setSSEProgress(prev => ({ ...prev, isActive: false }));
                setLoading(false);

                setResult({
                  type: data.failed_count === 0 ? 'success' : 'info',
                  message: data.message,
                });

                // Attendre un peu avant de fermer et notifier
                setTimeout(() => {
                  setResult(null);
                  setSSEProgress({
                    isActive: false,
                    totalEntities: 0,
                    currentEntity: 0,
                    currentEntityName: '',
                    successCount: 0,
                    failedCount: 0,
                    completedEntities: [],
                  });
                  onClose();
                  onSuccess?.();
                }, 2000);
                break;

              case 'error':
                console.error('❌ SSE Error:', data.message);
                eventSource.close();
                setSSEProgress(prev => ({ ...prev, isActive: false }));
                setLoading(false);
                throw new Error(data.message);
            }
          } catch (parseError) {
            console.error('❌ Erreur parsing SSE:', parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ Erreur SSE:', error);
          eventSource.close();
          setSSEProgress(prev => ({ ...prev, isActive: false }));
          setLoading(false);
          setResult({
            type: 'error',
            message: 'La connexion au serveur a été perdue. Veuillez réessayer.',
          });
        };

        // Note: On ne fait pas setLoading(false) ici car SSE gère ça
        return;
      } else if (effectiveMode === 'scanner') {
        // ========================================
        // MODE SCANNER - Génération rapport scan
        // ========================================
        const defaultTitle = reportScope === 'scan_ecosystem'
          ? `Rapport Écosystème Scanner - ${new Date().toLocaleDateString('fr-FR')}`
          : `Rapport Scan - ${scanInfo?.targetValue || ''} - ${new Date().toLocaleDateString('fr-FR')}`;

        const scanRequest: GenerateScanReportRequest = {
          template_id: selectedTemplateId,
          title: title.trim() || defaultTitle,
          report_scope: reportScope as 'scan_individual' | 'scan_ecosystem',
          options: {
            include_ai_summary: includeAISummary,
            include_positioning_chart: true,
            language,
          },
        };

        if (reportScope === 'scan_individual' && scanId) {
          await scanReportsApi.generateIndividual(scanId, scanRequest);
          setResult({
            type: 'success',
            message: `Génération du rapport de scan lancée avec succès !`,
          });
        } else if (reportScope === 'scan_ecosystem') {
          await scanReportsApi.generateEcosystem(scanRequest);
          setResult({
            type: 'success',
            message: `Génération du rapport écosystème scanner lancée avec succès !`,
          });
        }
      } else {
        // ========================================
        // MODE CAMPAGNE - Génération rapport audit
        // ========================================
        const entityName = reportScope === 'entity'
          ? entities.find(e => e.id === selectedEntityId)?.name
          : null;
        const defaultTitle = reportScope === 'consolidated'
          ? `Rapport consolidé - ${new Date().toLocaleDateString('fr-FR')}`
          : `Rapport ${entityName || 'individuel'} - ${new Date().toLocaleDateString('fr-FR')}`;

        const request: GenerateReportRequest = {
          campaign_id: campaignId!,
          template_id: selectedTemplateId,
          report_scope: reportScope,
          entity_id: reportScope === 'entity' ? selectedEntityId : undefined,
          title: title.trim() || defaultTitle,
          options: {
            force_mode: forceMode,
            include_appendix: includeAppendix,
            include_ai_summary: includeAISummary,
            include_benchmarking: includeBenchmarking,
            language,
            ai_widget_configs: aiWidgetConfigs,
          },
        };

        await reportsApi.generate(request);

        const scopeLabel = reportScope === 'consolidated'
          ? 'consolidé'
          : `individuel (${entities.find(e => e.id === selectedEntityId)?.name || ''})`;

        setResult({
          type: 'success',
          message: `Génération du rapport ${scopeLabel} lancée avec succès !`,
        });
      }

      // Attendre un peu avant de fermer et notifier
      setTimeout(() => {
        setResult(null);
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error('❌ Erreur génération:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la génération';

      // Détecter si c'est une erreur de permission (403)
      const isPermissionError = errorMessage.includes('403') ||
                                 errorMessage.includes('Permission') ||
                                 errorMessage.includes('permission') ||
                                 errorMessage.includes('Forbidden');

      setResult({
        type: 'error',
        message: isPermissionError
          ? "Oups... Vous n'avez pas le droit nécessaire pour générer un rapport !"
          : errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Ne pas fermer pendant la génération (loading ou SSE actif)
    if (!loading && !sseProgress.isActive) {
      setReportScope('consolidated');
      setSelectedEntityId('');
      setGenerateAllEntities(true);
      setSelectedTemplateId('');
      setTitle('');
      setForceMode(null);
      setIncludeAppendix(true);
      setIncludeAISummary(true);
      setIncludeBenchmarking(true);
      setLanguage('fr');
      setAIWidgets([]);
      setShowAISection(false);
      setError(null);
      setResult(null);
      setSSEProgress({
        isActive: false,
        totalEntities: 0,
        currentEntity: 0,
        currentEntityName: '',
        successCount: 0,
        failedCount: 0,
        completedEntities: [],
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Type labels
  const typeLabels: Record<TemplateType, string> = {
    system: 'Système',
    executive: 'Exécutif',
    technical: 'Technique',
    detailed: 'Détaillé',
    custom: 'Personnalisé',
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-purple-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Générer un rapport</h2>
                  <p className="text-sm text-gray-600">Sélectionnez un template et configurez les options</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading || sseProgress.isActive}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-purple-600" size={40} />
                  <span className="ml-3 text-gray-600">Chargement des templates...</span>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              ) : templates.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Aucun template disponible</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Veuillez créer au moins un template avant de générer un rapport.
                    </p>
                  </div>
                </div>
              ) : sseProgress.isActive ? (
                /* ========================================== */
                /* INTERFACE DE PROGRESSION SSE              */
                /* ========================================== */
                <div className="space-y-6">
                  {/* Header de progression */}
                  <div className="text-center">
                    <div className="inline-flex p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mb-4 animate-pulse">
                      <Loader2 className="w-12 h-12 text-white animate-spin" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Génération en cours...
                    </h3>
                    <p className="text-gray-600">
                      {sseProgress.currentEntityName
                        ? `Génération du rapport pour ${sseProgress.currentEntityName}`
                        : 'Initialisation...'}
                    </p>
                  </div>

                  {/* Barre de progression globale */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progression globale</span>
                      <span>{sseProgress.currentEntity} / {sseProgress.totalEntities}</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 rounded-full"
                        style={{
                          width: `${sseProgress.totalEntities > 0 ? (sseProgress.currentEntity / sseProgress.totalEntities) * 100 : 0}%`
                        }}
                      >
                        <div className="h-full bg-white/30 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Compteurs succès/échecs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {sseProgress.successCount}
                      </div>
                      <div className="text-sm text-green-700">Réussis</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {sseProgress.failedCount}
                      </div>
                      <div className="text-sm text-red-700">Échoués</div>
                    </div>
                  </div>

                  {/* Liste des entités traitées */}
                  {sseProgress.completedEntities.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      <div className="p-3 bg-gray-50 border-b border-gray-200 sticky top-0">
                        <h4 className="text-sm font-medium text-gray-700">
                          Rapports générés
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {sseProgress.completedEntities.map((entity, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 px-4 py-2 ${
                              entity.success ? 'bg-green-50' : 'bg-red-50'
                            }`}
                          >
                            {entity.success ? (
                              <FileCheck className="text-green-600 flex-shrink-0" size={16} />
                            ) : (
                              <AlertCircle className="text-red-600 flex-shrink-0" size={16} />
                            )}
                            <span className={`text-sm ${entity.success ? 'text-green-800' : 'text-red-800'}`}>
                              {entity.name}
                            </span>
                            {entity.error && (
                              <span className="text-xs text-red-600 ml-auto">
                                {entity.error}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info temps estimé */}
                  <div className="text-center text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <span className="text-lg mr-2">⏱️</span>
                    La génération avec IA peut prendre 30 à 60 secondes par rapport
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ========================================== */}
                  {/* 1. TYPE DE RAPPORT - SELON LE MODE */}
                  {/* ========================================== */}

                  {effectiveMode === 'scanner' ? (
                    /* ===== MODE SCANNER ===== */
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Type de rapport Scanner <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Rapport Scan Individuel */}
                        <button
                          type="button"
                          onClick={() => setReportScope('scan_individual')}
                          className={`
                            relative p-5 rounded-xl border-2 text-left transition-all
                            ${reportScope === 'scan_individual'
                              ? 'border-cyan-600 bg-gradient-to-br from-cyan-50 to-blue-50'
                              : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                              ${reportScope === 'scan_individual'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                              }
                            `}>
                              <Radar size={24} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Rapport Scan Individuel</p>
                              <p className="text-sm text-gray-600">
                                Détails d'un scan spécifique
                              </p>
                              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                                <li>• Score d'exposition détaillé</li>
                                <li>• Vulnérabilités détectées</li>
                                <li>• Recommandations de sécurité</li>
                              </ul>
                            </div>
                          </div>
                          {reportScope === 'scan_individual' && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle className="text-cyan-600" size={20} />
                            </div>
                          )}
                        </button>

                        {/* Rapport Écosystème Scanner */}
                        <button
                          type="button"
                          onClick={() => setReportScope('scan_ecosystem')}
                          className={`
                            relative p-5 rounded-xl border-2 text-left transition-all
                            ${reportScope === 'scan_ecosystem'
                              ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-indigo-50'
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                              ${reportScope === 'scan_ecosystem'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                              }
                            `}>
                              <Network size={24} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Rapport Écosystème</p>
                              <p className="text-sm text-gray-600">
                                Vue consolidée de tous les scans
                              </p>
                              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                                <li>• Comparaison des organismes</li>
                                <li>• Top vulnérabilités globales</li>
                                <li>• Positionnement sécurité</li>
                              </ul>
                            </div>
                          </div>
                          {reportScope === 'scan_ecosystem' && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle className="text-purple-600" size={20} />
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Info cible du scan si mode individuel */}
                      {reportScope === 'scan_individual' && scanInfo && (
                        <div className="mt-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Radar className="text-cyan-600" size={20} />
                            <div>
                              <p className="text-sm font-medium text-cyan-800">Cible du scan</p>
                              <p className="text-cyan-700">{scanInfo.targetLabel || scanInfo.targetValue}</p>
                              {scanInfo.exposureScore !== undefined && (
                                <p className="text-xs text-cyan-600 mt-1">
                                  Score d'exposition: {scanInfo.exposureScore}/100
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ===== MODE CAMPAGNE ===== */
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Type de rapport <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Rapport Consolidé */}
                        <button
                          type="button"
                          onClick={() => setReportScope('consolidated')}
                          className={`
                            relative p-5 rounded-xl border-2 text-left transition-all
                            ${reportScope === 'consolidated'
                              ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-blue-50'
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                              ${reportScope === 'consolidated'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                              }
                            `}>
                              <Globe2 size={24} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Rapport Consolidé</p>
                              <p className="text-sm text-gray-600">
                                Vue écosystème multi-organismes
                              </p>
                              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                                <li>• Stats comparatives entre organismes</li>
                                <li>• NC critiques globales</li>
                                <li>• Plan d'action consolidé</li>
                              </ul>
                            </div>
                          </div>
                          {reportScope === 'consolidated' && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle className="text-purple-600" size={20} />
                            </div>
                          )}
                        </button>

                        {/* Rapport Individuel */}
                        <button
                          type="button"
                          onClick={() => setReportScope('entity')}
                          disabled={entities.length === 0}
                          className={`
                            relative p-5 rounded-xl border-2 text-left transition-all
                            ${reportScope === 'entity'
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-cyan-50'
                              : entities.length === 0
                                ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                              ${reportScope === 'entity'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                              }
                            `}>
                              <Building2 size={24} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Rapport Individuel</p>
                              <p className="text-sm text-gray-600">
                                Vue mono-organisme personnalisée
                              </p>
                            <ul className="mt-2 text-xs text-gray-500 space-y-1">
                              <li>• Score personnalisé de l'entité</li>
                              <li>• Analyse par domaine</li>
                              <li>• Benchmarking vs pairs</li>
                            </ul>
                          </div>
                        </div>
                        {reportScope === 'entity' && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle className="text-blue-600" size={20} />
                          </div>
                        )}
                        {entities.length === 0 && (
                          <p className="text-xs text-orange-600 mt-3">
                            Aucune entité dans cette campagne
                          </p>
                        )}
                      </button>
                      </div>
                    </div>
                  )}

                  {/* ========================================== */}
                  {/* 2. SÉLECTION D'ENTITÉ (si rapport individuel - MODE CAMPAGNE UNIQUEMENT) */}
                  {/* ========================================== */}
                  {effectiveMode === 'campaign' && reportScope === 'entity' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                      <label className="block text-sm font-medium text-blue-800">
                        <Building2 size={16} className="inline mr-2" />
                        Générer pour quels organismes ?
                      </label>

                      {/* Option: Toutes les entités */}
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200 cursor-pointer hover:border-blue-400 transition-colors">
                          <input
                            type="radio"
                            name="entitySelection"
                            checked={generateAllEntities}
                            onChange={() => setGenerateAllEntities(true)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div>
                            <span className="font-medium text-gray-900">Tous les organismes ({entities.length})</span>
                            <p className="text-xs text-gray-600 mt-1">
                              Génère {entities.length} rapport(s) individuel(s), un par organisme de la campagne
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200 cursor-pointer hover:border-blue-400 transition-colors">
                          <input
                            type="radio"
                            name="entitySelection"
                            checked={!generateAllEntities}
                            onChange={() => setGenerateAllEntities(false)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">Un organisme spécifique</span>
                            <p className="text-xs text-gray-600 mt-1">
                              Génère un seul rapport pour l'organisme sélectionné
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Sélecteur d'entité (visible uniquement si "Un organisme spécifique" est sélectionné) */}
                      {!generateAllEntities && (
                        <div className="mt-3">
                          {loadingEntities ? (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Loader2 size={16} className="animate-spin" />
                              <span className="text-sm">Chargement des entités...</span>
                            </div>
                          ) : (
                            <select
                              value={selectedEntityId}
                              onChange={(e) => setSelectedEntityId(e.target.value)}
                              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                              <option value="">-- Choisir un organisme --</option>
                              {entities.map((entity) => (
                                <option key={entity.id} value={entity.id}>
                                  {entity.name} {entity.code ? `(${entity.code})` : ''}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      {generateAllEntities && entities.length > 0 && (
                        <div className="bg-blue-100 rounded-lg p-3 mt-2">
                          <p className="text-xs text-blue-800 font-medium">
                            📋 Entités incluses :
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            {entities.map(e => e.name).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ========================================== */}
                  {/* 3. SÉLECTION DU TEMPLATE */}
                  {/* ========================================== */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Template de rapport <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        (filtré pour {reportScope === 'consolidated' ? 'rapports consolidés' : 'rapports individuels'})
                      </span>
                    </label>
                    {templates.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          Aucun template compatible avec ce type de rapport.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(template.id)}
                            className={`
                              relative p-4 rounded-lg border-2 text-left transition-all
                              ${
                                selectedTemplateId === template.id
                                  ? 'border-purple-600 bg-purple-50'
                                  : 'border-gray-200 bg-white hover:border-purple-300'
                              }
                            `}
                          >
                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-2">
                              {template.is_system && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                  Système
                                </span>
                              )}
                              {template.is_default && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                  Défaut
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                template.report_scope === 'both'
                                  ? 'bg-purple-100 text-purple-700'
                                  : template.report_scope === 'consolidated'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-cyan-100 text-cyan-700'
                              }`}>
                                {template.report_scope === 'both'
                                  ? 'Universel'
                                  : template.report_scope === 'consolidated'
                                    ? 'Consolidé'
                                    : 'Individuel'}
                              </span>
                            </div>

                            {/* Nom */}
                            <p className="font-semibold text-gray-900 mb-1">{template.name}</p>

                            {/* Type */}
                            <p className="text-sm text-gray-600">
                              Type: {typeLabels[template.template_type] || template.template_type}
                            </p>

                            {/* Checkmark */}
                            {selectedTemplateId === template.id && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle className="text-purple-600" size={20} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Aperçu du template sélectionné */}
                    {selectedTemplate && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Settings size={16} />
                          Détails du template
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Format:</span>{' '}
                            <span className="font-medium text-gray-900">{selectedTemplate.page_size}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Orientation:</span>{' '}
                            <span className="font-medium text-gray-900">{selectedTemplate.orientation}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Widgets:</span>{' '}
                            <span className="font-medium text-gray-900">
                              {selectedTemplate.structure?.length || 0}
                            </span>
                          </div>
                        </div>
                        {selectedTemplate.description && (
                          <p className="text-sm text-gray-600 mt-2">{selectedTemplate.description}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Titre personnalisé */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Titre du rapport (optionnel)
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Laissez vide pour utiliser le titre par défaut"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* ========================================== */}
                  {/* SECTION WIDGETS IA - Configuration par widget */}
                  {/* ========================================== */}
                  {aiWidgets.length > 0 && (
                    <div className="border border-purple-200 rounded-xl overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50">
                      {/* Header de la section */}
                      <button
                        type="button"
                        onClick={() => setShowAISection(!showAISection)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-purple-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="text-white" size={20} />
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900">
                              Contenus Génération IA
                            </h4>
                            <p className="text-sm text-gray-600">
                              {aiWidgets.length} widget{aiWidgets.length > 1 ? 's' : ''} avec génération IA
                            </p>
                          </div>
                        </div>
                        {showAISection ? (
                          <ChevronUp className="text-gray-500" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-500" size={20} />
                        )}
                      </button>

                      {/* Contenu de la section */}
                      {showAISection && (
                        <div className="px-5 pb-5 space-y-4">
                          <p className="text-xs text-gray-600 bg-white/70 p-3 rounded-lg border border-purple-100">
                            💡 Pour chaque widget ci-dessous, choisissez de générer le contenu automatiquement via l'IA
                            ou saisissez votre propre constat manuellement.
                          </p>

                          {aiWidgets.map((widget, index) => (
                            <div
                              key={widget.widgetId}
                              className="bg-white rounded-lg border border-purple-200 overflow-hidden"
                            >
                              {/* Header du widget */}
                              <div className="px-4 py-3 bg-gray-50 border-b border-purple-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                                    #{index + 1}
                                  </span>
                                  <span className="font-medium text-gray-900">{widget.title}</span>
                                </div>

                                {/* Toggle IA */}
                                <button
                                  type="button"
                                  onClick={() => toggleWidgetAI(widget.widgetId)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    widget.useAI
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {widget.useAI ? (
                                    <>
                                      <Sparkles size={14} />
                                      IA activée
                                    </>
                                  ) : (
                                    <>
                                      <PenLine size={14} />
                                      Manuel
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Contenu du widget */}
                              <div className="p-4">
                                {widget.useAI ? (
                                  /* Mode IA activé */
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                      <Sparkles className="text-purple-600 flex-shrink-0" size={18} />
                                      <p className="text-sm text-purple-800">
                                        Le contenu sera généré automatiquement par l'IA lors de la création du rapport.
                                      </p>
                                    </div>

                                    {/* Sélecteur de ton */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Ton du contenu
                                      </label>
                                      <select
                                        value={widget.tone}
                                        onChange={(e) => updateAIWidget(widget.widgetId, {
                                          tone: e.target.value as 'executive' | 'technical' | 'detailed'
                                        })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                      >
                                        <option value="executive">Exécutif - Synthétique pour décideurs</option>
                                        <option value="technical">Technique - Détails pour experts</option>
                                        <option value="detailed">Détaillé - Analyse complète</option>
                                      </select>
                                    </div>
                                  </div>
                                ) : (
                                  /* Mode Manuel */
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                      <PenLine className="text-amber-600 flex-shrink-0" size={18} />
                                      <p className="text-sm text-amber-800">
                                        Saisissez votre propre constat ci-dessous. Il remplacera la génération IA.
                                      </p>
                                    </div>

                                    {/* Zone de texte manuel */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Votre constat
                                      </label>
                                      <textarea
                                        value={widget.manualContent}
                                        onChange={(e) => updateAIWidget(widget.widgetId, {
                                          manualContent: e.target.value
                                        })}
                                        placeholder="Saisissez ici votre analyse, constat ou résumé personnalisé..."
                                        rows={5}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-y"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        {widget.manualContent.length} caractères
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Options avancées */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Settings size={16} />
                      Options avancées
                    </h4>

                    {/* Mode forcé */}
                    <div>
                      <label htmlFor="force-mode" className="block text-sm font-medium text-gray-700 mb-2">
                        Mode de génération
                      </label>
                      <select
                        id="force-mode"
                        value={forceMode || ''}
                        onChange={(e) => setForceMode((e.target.value as GenerationMode) || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      >
                        <option value="">Automatique (selon règles métier)</option>
                        <option value="draft">Forcer DRAFT</option>
                        <option value="final">Forcer FINAL</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Mode automatique: DRAFT si audit incomplet, FINAL si audit complet
                      </p>
                    </div>

                    {/* Inclure annexes */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="include-appendix"
                        checked={includeAppendix}
                        onChange={(e) => setIncludeAppendix(e.target.checked)}
                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="include-appendix" className="text-sm">
                        <span className="font-medium text-gray-900">Inclure les annexes</span>
                        <p className="text-gray-600 mt-1">
                          Ajoute les pièces jointes et preuves en annexe du rapport
                        </p>
                      </label>
                    </div>

                    {/* Résumé IA */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="include-ai-summary"
                        checked={includeAISummary}
                        onChange={(e) => setIncludeAISummary(e.target.checked)}
                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="include-ai-summary" className="text-sm">
                        <span className="font-medium text-gray-900">Inclure le résumé exécutif IA</span>
                        <p className="text-gray-600 mt-1">
                          Génère automatiquement une synthèse des résultats via l'intelligence artificielle
                        </p>
                      </label>
                    </div>

                    {/* Benchmarking */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="include-benchmarking"
                        checked={includeBenchmarking}
                        onChange={(e) => setIncludeBenchmarking(e.target.checked)}
                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="include-benchmarking" className="text-sm">
                        <span className="font-medium text-gray-900">Inclure le benchmarking</span>
                        <p className="text-gray-600 mt-1">
                          {reportScope === 'consolidated'
                            ? 'Compare les organismes entre eux et avec la moyenne sectorielle'
                            : 'Compare l\'organisme avec ses pairs de la campagne'}
                        </p>
                      </label>
                    </div>

                    {/* Langue */}
                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                        Langue du rapport
                      </label>
                      <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer - Caché pendant la génération SSE */}
            {!loadingTemplates && !error && templates.length > 0 && !sseProgress.isActive && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !selectedTemplateId || (effectiveMode === 'campaign' && reportScope === 'entity' && !generateAllEntities && !selectedEntityId)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      {/* Icône selon le mode et le scope */}
                      {effectiveMode === 'scanner' ? (
                        reportScope === 'scan_ecosystem' ? <Network size={16} /> : <Radar size={16} />
                      ) : (
                        reportScope === 'consolidated' ? <Globe2 size={16} /> : <Building2 size={16} />
                      )}
                      {/* Texte du bouton selon le mode */}
                      {effectiveMode === 'scanner' ? (
                        reportScope === 'scan_ecosystem'
                          ? 'Générer rapport écosystème'
                          : 'Générer rapport scan'
                      ) : (
                        reportScope === 'consolidated'
                          ? 'Générer rapport consolidé'
                          : generateAllEntities
                            ? `Générer ${entities.length} rapport(s)`
                            : 'Générer rapport individuel'
                      )}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {result && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setResult(null)}
          title={result.type === 'success' ? 'Succès' : 'Erreur'}
          message={result.message}
          type={result.type}
        />
      )}
    </>
  );
}
