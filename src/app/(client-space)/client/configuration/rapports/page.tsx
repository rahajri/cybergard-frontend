'use client';

import { useState, useEffect, useRef } from 'react';
import { FileBarChart, Palette, Image as ImageIcon, Loader2, Save, Check, Upload, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { templatesApi, ReportTemplate } from '@/lib/api/reports';
import { authenticatedFetch } from '@/lib/api';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  text: string;
  background: string;
  header_bg: string;
  title_color?: string;  // Couleur du titre de couverture
}

// Interface pour un widget IA dans la structure du template
interface AIWidget {
  id: string;
  widget_type: string;
  position: number;
  config: {
    title?: string;
    tone?: 'executive' | 'technical' | 'detailed';
    use_ai?: boolean;
    manual_content?: string;
  };
}

export default function ClientReportsConfigPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);

  // État pour l'édition
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editedColors, setEditedColors] = useState<ColorScheme | null>(null);
  const [editedLogo, setEditedLogo] = useState<string>('');
  const [editedAIWidgets, setEditedAIWidgets] = useState<AIWidget[]>([]);

  // État pour la section IA dépliable
  const [aiSectionExpanded, setAiSectionExpanded] = useState<Record<string, boolean>>({});

  // Ref pour l'input file
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadTemplateId, setCurrentUploadTemplateId] = useState<string | null>(null);

  // États pour les modals
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  // État pour la confirmation de suppression
  const [deleteLogoConfirm, setDeleteLogoConfirm] = useState<{
    isOpen: boolean;
    templateId: string | null;
  }>({
    isOpen: false,
    templateId: null,
  });

  // Helper pour afficher un message modal
  const showModal = (type: ModalType, title: string, message: string) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  // Charger les templates du client
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger uniquement les templates custom (pas système)
      const response = await templatesApi.list({ is_system: false });
      setTemplates(response.items || []);
    } catch (err: any) {
      console.error('Erreur chargement templates:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Commencer l'édition d'un template
  const startEditing = (template: ReportTemplate) => {
    setEditingTemplate(template.id);
    // Ajouter title_color par défaut si absent
    const colors = template.color_scheme as unknown as ColorScheme;
    setEditedColors({
      ...colors,
      title_color: colors.title_color || '#FFFFFF',  // Blanc par défaut
    });
    setEditedLogo(template.default_logo || 'TENANT');

    // Extraire les widgets IA de la structure
    // IMPORTANT: Utiliser l'ID existant de la base de données (ajouté par migration)
    const structure = template.structure as any[] || [];
    const aiWidgets = structure
      .filter((w: any) => w.widget_type === 'ai_summary' || w.widget_type === 'summary')
      .map((w: any, index: number) => ({
        id: w.id || `widget-fallback-${index}`,  // Utiliser l'ID de la DB
        widget_type: w.widget_type,
        position: w.position || 0,
        config: {
          title: w.config?.title || 'Résumé IA',
          tone: w.config?.tone || 'executive',
          use_ai: w.config?.use_ai !== false,
          manual_content: w.config?.manual_content || '',
        },
      }));
    console.log('🔧 AI Widgets pour édition:', aiWidgets.map(w => ({id: w.id, title: w.config.title})));
    setEditedAIWidgets(aiWidgets);
  };

  // Annuler l'édition
  const cancelEditing = () => {
    setEditingTemplate(null);
    setEditedColors(null);
    setEditedLogo('');
    setEditedAIWidgets([]);
  };

  // Sauvegarder les modifications
  const saveTemplate = async (templateId: string) => {
    if (!editedColors) return;

    try {
      setSaving(templateId);

      // Trouver le template actuel pour récupérer sa structure
      const currentTemplate = templates.find(t => t.id === templateId);
      let updatedStructure = currentTemplate?.structure as any[] || [];

      // Mettre à jour les widgets IA dans la structure
      if (editedAIWidgets.length > 0) {
        updatedStructure = updatedStructure.map((widget: any) => {
          const editedWidget = editedAIWidgets.find(w => w.id === widget.id);
          if (editedWidget) {
            return {
              ...widget,
              config: {
                ...widget.config,
                ...editedWidget.config,
              },
            };
          }
          return widget;
        });
      }

      await templatesApi.update(templateId, {
        color_scheme: editedColors as unknown as Record<string, string>,
        default_logo: editedLogo,
        structure: updatedStructure,
      });

      setSavedId(templateId);
      setTimeout(() => setSavedId(null), 2000);

      setEditingTemplate(null);
      setEditedColors(null);
      setEditedLogo('');
      setEditedAIWidgets([]);

      await loadTemplates();

      showModal('success', 'Succès', 'Template sauvegardé avec succès !');
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      showModal('error', 'Erreur', `Erreur lors de la sauvegarde: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  // Mettre à jour une couleur
  const updateColor = (key: keyof ColorScheme, value: string) => {
    if (editedColors) {
      setEditedColors({ ...editedColors, [key]: value });
    }
  };

  // Mettre à jour un widget IA
  const updateAIWidget = (widgetId: string, updates: Partial<AIWidget['config']>) => {
    setEditedAIWidgets(prev => prev.map(w =>
      w.id === widgetId
        ? { ...w, config: { ...w.config, ...updates } }
        : w
    ));
  };

  // Extraire les widgets IA d'un template (pour affichage en mode lecture)
  const getTemplateAIWidgets = (template: ReportTemplate): AIWidget[] => {
    const structure = template.structure as any[] || [];
    return structure
      .filter((w: any) => w.widget_type === 'ai_summary' || w.widget_type === 'summary')
      .map((w: any, index: number) => ({
        id: w.id || `widget-fallback-${index}`,  // Utiliser l'ID de la DB
        widget_type: w.widget_type,
        position: w.position || 0,
        config: {
          title: w.config?.title || 'Résumé IA',
          tone: w.config?.tone || 'executive',
          use_ai: w.config?.use_ai !== false,
          manual_content: w.config?.manual_content || '',
        },
      }));
  };

  // Toggle section IA
  const toggleAISection = (templateId: string) => {
    setAiSectionExpanded(prev => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

  // Upload du logo
  const handleLogoUpload = async (templateId: string, file: File) => {
    // Vérifier le type de fichier
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showModal('error', 'Format non supporté', 'Utilisez un fichier PNG, JPG ou SVG.');
      return;
    }

    // Vérifier la taille (2 MB max)
    if (file.size > 2 * 1024 * 1024) {
      showModal('error', 'Fichier trop volumineux', 'La taille maximum est de 2 MB.');
      return;
    }

    try {
      setUploadingLogo(templateId);

      const formData = new FormData();
      formData.append('file', file);

      const response = await authenticatedFetch(`/api/v1/reports/templates/${templateId}/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur lors de l\'upload');
      }

      // Recharger les templates
      await loadTemplates();

      // Mettre à jour l'état d'édition si on était en train d'éditer ce template
      if (editingTemplate === templateId) {
        setEditedLogo('CUSTOM');
      }

      showModal('success', 'Logo uploadé', 'Le logo a été uploadé avec succès !');
    } catch (err: any) {
      console.error('Erreur upload logo:', err);
      showModal('error', 'Erreur d\'upload', `Erreur lors de l'upload du logo: ${err.message}`);
    } finally {
      setUploadingLogo(null);
      setCurrentUploadTemplateId(null);
    }
  };

  // Supprimer le logo personnalisé
  const handleDeleteLogo = async (templateId: string) => {
    try {
      setUploadingLogo(templateId);

      const response = await authenticatedFetch(`/api/v1/reports/templates/${templateId}/logo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur lors de la suppression');
      }

      // Recharger les templates
      await loadTemplates();

      // Mettre à jour l'état d'édition
      if (editingTemplate === templateId) {
        setEditedLogo('TENANT');
      }

      showModal('success', 'Logo supprimé', 'Le logo personnalisé a été supprimé.');
    } catch (err: any) {
      console.error('Erreur suppression logo:', err);
      showModal('error', 'Erreur', `Erreur lors de la suppression: ${err.message}`);
    } finally {
      setUploadingLogo(null);
      setDeleteLogoConfirm({ isOpen: false, templateId: null });
    }
  };

  // Déclencher le sélecteur de fichier
  const triggerFileUpload = (templateId: string) => {
    setCurrentUploadTemplateId(templateId);
    fileInputRef.current?.click();
  };

  // Gérer la sélection de fichier
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUploadTemplateId) {
      handleLogoUpload(currentUploadTemplateId, file);
    }
    // Reset l'input
    e.target.value = '';
  };

  // Demander confirmation pour supprimer le logo
  const confirmDeleteLogo = (templateId: string) => {
    setDeleteLogoConfirm({ isOpen: true, templateId });
  };

  const colorLabels: Record<string, string> = {
    primary: 'Couleur principale',
    secondary: 'Couleur secondaire',
    accent: 'Accent',
    danger: 'Danger',
    warning: 'Avertissement',
    success: 'Succès',
    text: 'Texte',
    background: 'Fond',
    header_bg: 'En-tête',
    title_color: 'Titre couverture',
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Modal de feedback */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />

      {/* Modal de confirmation suppression logo */}
      <ConfirmModal
        isOpen={deleteLogoConfirm.isOpen}
        onClose={() => setDeleteLogoConfirm({ isOpen: false, templateId: null })}
        onConfirm={() => deleteLogoConfirm.templateId && handleDeleteLogo(deleteLogoConfirm.templateId)}
        title="Supprimer le logo"
        message="Êtes-vous sûr de vouloir supprimer le logo personnalisé ? Le logo de l'organisation sera utilisé par défaut."
        type="confirm"
        confirmText="Oui, supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4" style={{ maxWidth: '1600px' }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileBarChart className="text-violet-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Configuration des Rapports
              </h1>
              <p className="text-sm text-gray-600">
                Personnalisez le logo et les couleurs de vos templates de rapports
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '1600px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-violet-600" size={40} />
              <span className="ml-3 text-gray-600">Chargement...</span>
            </div>
          ) : error ? (
            <ErrorDisplay
              type={getErrorTypeFromMessage(error)}
              customMessage={error}
              onRetry={loadTemplates}
              showBack={true}
              showHome={true}
              permissionCode={extractPermissionCodeFromMessage(error)}
              actionName="Configuration des Rapports"
            />
          ) : templates.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-violet-50 rounded-full mb-6">
                <FileBarChart size={40} className="text-violet-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Aucun template personnalisable
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Vos templates de rapports personnalisables apparaîtront ici une fois qu'ils auront été créés par l'administrateur.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {templates.map((template) => {
                const isEditing = editingTemplate === template.id;
                const isSaving = saving === template.id;
                const isSaved = savedId === template.id;
                const isUploadingLogo = uploadingLogo === template.id;
                const colors = isEditing ? editedColors : (template.color_scheme as unknown as ColorScheme);
                const currentLogo = isEditing ? editedLogo : template.default_logo;
                const hasCustomLogo = template.default_logo === 'CUSTOM' && (template as any).custom_logo;

                return (
                  <div
                    key={template.id}
                    className="bg-white rounded-xl border shadow-sm overflow-hidden"
                  >
                    {/* Header du template */}
                    <div className="p-6 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {template.name}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            {template.description || 'Aucune description'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded">
                              {template.report_scope === 'consolidated' ? 'Consolidé' : 'Individuel'}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {template.page_size} - {template.orientation}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={cancelEditing}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                disabled={isSaving}
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => saveTemplate(template.id)}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Save size={16} />
                                )}
                                Sauvegarder
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditing(template)}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100"
                            >
                              <Palette size={16} />
                              Personnaliser
                            </button>
                          )}

                          {isSaved && (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <Check size={16} />
                              Sauvegardé
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contenu éditable */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Section Logo */}
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                            <ImageIcon size={18} />
                            Logo du rapport
                          </h3>

                          <div className="space-y-3">
                            {/* Option: Logo personnalisé (upload) */}
                            <div className={`p-3 border rounded-lg ${currentLogo === 'CUSTOM' ? 'border-violet-500 bg-violet-50' : ''}`}>
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name={`logo-${template.id}`}
                                  value="CUSTOM"
                                  checked={currentLogo === 'CUSTOM'}
                                  onChange={() => isEditing && setEditedLogo('CUSTOM')}
                                  disabled={!isEditing && !hasCustomLogo}
                                  className="w-4 h-4 text-violet-600"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">Logo personnalisé</p>
                                  <p className="text-sm text-gray-500">Télécharger votre propre logo</p>
                                </div>
                              </div>

                              {/* Zone d'upload / Aperçu */}
                              <div className="mt-3 ml-7">
                                {hasCustomLogo ? (
                                  <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-white border rounded-lg p-2 flex items-center justify-center">
                                      <img
                                        src={(template as any).custom_logo}
                                        alt="Logo personnalisé"
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => triggerFileUpload(template.id)}
                                        disabled={isUploadingLogo}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-100 rounded hover:bg-violet-200 disabled:opacity-50"
                                      >
                                        {isUploadingLogo ? (
                                          <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                          <Upload size={14} />
                                        )}
                                        Changer
                                      </button>
                                      <button
                                        onClick={() => confirmDeleteLogo(template.id)}
                                        disabled={isUploadingLogo}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                                      >
                                        <Trash2 size={14} />
                                        Supprimer
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => triggerFileUpload(template.id)}
                                    disabled={isUploadingLogo}
                                    className="flex items-center gap-2 px-4 py-3 w-full border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
                                  >
                                    {isUploadingLogo ? (
                                      <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                      <Upload size={20} />
                                    )}
                                    <span className="text-sm">
                                      {isUploadingLogo ? 'Upload en cours...' : 'Cliquez pour télécharger (PNG, JPG, SVG - max 2MB)'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Option: Logo organisation */}
                            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${currentLogo === 'TENANT' ? 'border-violet-500 bg-violet-50' : ''}`}>
                              <input
                                type="radio"
                                name={`logo-${template.id}`}
                                value="TENANT"
                                checked={currentLogo === 'TENANT'}
                                onChange={(e) => isEditing && setEditedLogo(e.target.value)}
                                disabled={!isEditing}
                                className="w-4 h-4 text-violet-600"
                              />
                              <div>
                                <p className="font-medium text-gray-900">Logo de l'organisation</p>
                                <p className="text-sm text-gray-500">Utiliser le logo de votre organisation</p>
                              </div>
                            </label>

                            {/* Option: Logo plateforme */}
                            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${currentLogo === 'PLATFORM' ? 'border-violet-500 bg-violet-50' : ''}`}>
                              <input
                                type="radio"
                                name={`logo-${template.id}`}
                                value="PLATFORM"
                                checked={currentLogo === 'PLATFORM'}
                                onChange={(e) => isEditing && setEditedLogo(e.target.value)}
                                disabled={!isEditing}
                                className="w-4 h-4 text-violet-600"
                              />
                              <div>
                                <p className="font-medium text-gray-900">Logo Cybergard AI</p>
                                <p className="text-sm text-gray-500">Utiliser le logo de la plateforme</p>
                              </div>
                            </label>

                            {/* Option: Aucun logo */}
                            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${currentLogo === 'NONE' ? 'border-violet-500 bg-violet-50' : ''}`}>
                              <input
                                type="radio"
                                name={`logo-${template.id}`}
                                value="NONE"
                                checked={currentLogo === 'NONE'}
                                onChange={(e) => isEditing && setEditedLogo(e.target.value)}
                                disabled={!isEditing}
                                className="w-4 h-4 text-violet-600"
                              />
                              <div>
                                <p className="font-medium text-gray-900">Aucun logo</p>
                                <p className="text-sm text-gray-500">Ne pas afficher de logo</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Section Couleurs */}
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                            <Palette size={18} />
                            Palette de couleurs
                          </h3>

                          {colors && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {Object.entries(colors).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                  <label className="text-xs text-gray-600">
                                    {colorLabels[key as keyof ColorScheme] || key}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={value}
                                      onChange={(e) =>
                                        isEditing && updateColor(key as keyof ColorScheme, e.target.value)
                                      }
                                      disabled={!isEditing}
                                      className="w-10 h-10 rounded border cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) =>
                                        isEditing && updateColor(key as keyof ColorScheme, e.target.value)
                                      }
                                      disabled={!isEditing}
                                      className="flex-1 px-2 py-1 text-xs font-mono border rounded disabled:bg-gray-50"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Aperçu des couleurs */}
                      {colors && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Aperçu des couleurs</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(colors).map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                                style={{ borderColor: value }}
                              >
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: value }}
                                />
                                <span className="text-xs text-gray-600">
                                  {colorLabels[key as keyof ColorScheme] || key}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section Widgets IA */}
                      {(() => {
                        const aiWidgets = isEditing ? editedAIWidgets : getTemplateAIWidgets(template);
                        if (aiWidgets.length === 0) return null;

                        const isExpanded = aiSectionExpanded[template.id] ?? true;

                        const toneLabels: Record<string, string> = {
                          executive: 'Exécutif - Synthétique pour décideurs',
                          technical: 'Technique - Détails pour experts',
                          detailed: 'Détaillé - Analyse complète',
                        };

                        return (
                          <div className="mt-6 pt-6 border-t">
                            {/* Header de la section IA */}
                            <button
                              type="button"
                              onClick={() => toggleAISection(template.id)}
                              className="w-full flex items-center justify-between mb-4 group"
                            >
                              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                  <Sparkles size={16} className="text-white" />
                                </div>
                                <span>Widgets Génération IA</span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                  {aiWidgets.length} widget{aiWidgets.length > 1 ? 's' : ''}
                                </span>
                              </h3>
                              <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                            </button>

                            {/* Contenu de la section IA */}
                            {isExpanded && (
                              <div className="space-y-4">
                                <p className="text-xs text-gray-500 bg-purple-50 p-3 rounded-lg border border-purple-100">
                                  💡 Ces widgets génèrent automatiquement du contenu via l'IA lors de la création du rapport.
                                  Vous pouvez configurer le ton par défaut et pré-remplir du contenu manuel.
                                </p>

                                {aiWidgets.map((widget, index) => (
                                  <div
                                    key={widget.id}
                                    className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg overflow-hidden"
                                  >
                                    {/* Header du widget */}
                                    <div className="px-4 py-3 bg-white/50 border-b border-purple-100 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                                          #{index + 1}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                          {widget.config.title}
                                        </span>
                                      </div>
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        widget.config.use_ai
                                          ? 'bg-purple-600 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {widget.config.use_ai ? '🤖 IA activée' : '✏️ Manuel'}
                                      </span>
                                    </div>

                                    {/* Contenu du widget */}
                                    <div className="p-4 space-y-4">
                                      {/* Sélecteur de ton */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                          Ton par défaut
                                        </label>
                                        <select
                                          value={widget.config.tone || 'executive'}
                                          onChange={(e) => isEditing && updateAIWidget(widget.id, {
                                            tone: e.target.value as 'executive' | 'technical' | 'detailed'
                                          })}
                                          disabled={!isEditing}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                          <option value="executive">Exécutif - Synthétique pour décideurs</option>
                                          <option value="technical">Technique - Détails pour experts</option>
                                          <option value="detailed">Détaillé - Analyse complète</option>
                                        </select>
                                        {!isEditing && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Actuellement : {toneLabels[widget.config.tone || 'executive']}
                                          </p>
                                        )}
                                      </div>

                                      {/* Toggle IA */}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                          Mode de génération par défaut
                                        </label>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => isEditing && updateAIWidget(widget.id, { use_ai: true })}
                                            disabled={!isEditing}
                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed ${
                                              widget.config.use_ai
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                          >
                                            <Sparkles size={14} />
                                            Génération IA
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => isEditing && updateAIWidget(widget.id, { use_ai: false })}
                                            disabled={!isEditing}
                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed ${
                                              !widget.config.use_ai
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                          >
                                            ✏️ Contenu manuel
                                          </button>
                                        </div>
                                      </div>

                                      {/* Contenu manuel (si mode manuel) */}
                                      {!widget.config.use_ai && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Contenu manuel par défaut
                                          </label>
                                          <textarea
                                            value={widget.config.manual_content || ''}
                                            onChange={(e) => isEditing && updateAIWidget(widget.id, {
                                              manual_content: e.target.value
                                            })}
                                            disabled={!isEditing}
                                            placeholder={isEditing ? "Saisissez le contenu par défaut qui apparaîtra dans le rapport..." : "Aucun contenu par défaut défini"}
                                            rows={4}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
                                          />
                                          {widget.config.manual_content && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              {widget.config.manual_content.length} caractères
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
