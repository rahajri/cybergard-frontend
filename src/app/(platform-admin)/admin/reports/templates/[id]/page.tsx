'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Loader2,
  Settings,
  Package,
  Plus,
  Trash2,
  Eye,
  Copy,
  AlertCircle,
  FileText,
  Type,
  Table,
  BarChart3,
  Image as ImageIcon,
  Minus,
  List,
  Hash,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wand2
} from 'lucide-react';
import { templatesApi, ReportTemplate, WidgetConfig, TemplateType } from '@/lib/api/reports';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import TemplateDetailModal from '@/components/modals/TemplateDetailModal';

// Types de widgets disponibles - Groupés par catégorie
const WIDGET_CATEGORIES = [
  {
    name: 'Structure',
    widgets: [
      { type: 'cover', label: 'Page de couverture', icon: FileText, color: 'bg-purple-100 text-purple-700' },
      { type: 'header', label: 'En-tête', icon: Type, color: 'bg-purple-100 text-purple-700' },
      { type: 'title', label: 'Titre', icon: Type, color: 'bg-blue-100 text-blue-700' },
      { type: 'text', label: 'Paragraphe', icon: FileText, color: 'bg-gray-100 text-gray-700' },
      { type: 'page_break', label: 'Saut de page', icon: Minus, color: 'bg-red-100 text-red-700' },
    ]
  },
  {
    name: 'Données Audit',
    widgets: [
      { type: 'kpi', label: 'KPI Cards', icon: Hash, color: 'bg-emerald-100 text-emerald-700' },
      { type: 'gauge', label: 'Jauge Conformité', icon: BarChart3, color: 'bg-cyan-100 text-cyan-700' },
      { type: 'radar_chart', label: 'Radar Domaines', icon: BarChart3, color: 'bg-indigo-100 text-indigo-700' },
      { type: 'domain_scores', label: 'Scores Domaines', icon: Table, color: 'bg-violet-100 text-violet-700' },
      { type: 'nc_table', label: 'Non-Conformités', icon: Table, color: 'bg-red-100 text-red-700' },
      { type: 'action_plan', label: 'Plan d\'Action', icon: List, color: 'bg-amber-100 text-amber-700' },
    ]
  },
  {
    name: 'Contenu',
    widgets: [
      { type: 'ai_summary', label: 'Résumé IA', icon: Sparkles, color: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700' },
      { type: 'summary', label: 'Résumé manuel', icon: Hash, color: 'bg-teal-100 text-teal-700' },
      { type: 'table', label: 'Tableau', icon: Table, color: 'bg-green-100 text-green-700' },
      { type: 'chart', label: 'Graphique', icon: BarChart3, color: 'bg-orange-100 text-orange-700' },
      { type: 'image', label: 'Image', icon: ImageIcon, color: 'bg-pink-100 text-pink-700' },
      { type: 'list', label: 'Liste', icon: List, color: 'bg-indigo-100 text-indigo-700' },
    ]
  }
];

// Flatten pour compatibilité
const WIDGET_TYPES = WIDGET_CATEGORIES.flatMap(cat => cat.widgets);

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [saveResult, setSaveResult] = useState<{ type: ModalType; message: string } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('custom');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);

  // UI State
  const [selectedWidgetIndex, setSelectedWidgetIndex] = useState<number | null>(null);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await templatesApi.get(templateId);
      setTemplate(data);

      setName(data.name);
      setDescription(data.description || '');
      setTemplateType(data.template_type);
      setPageSize(data.page_size);
      setOrientation(data.orientation as 'portrait' | 'landscape');
      setWidgets(data.structure || []);
    } catch (err) {
      console.error('❌ Erreur chargement template:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;

    try {
      setSaving(true);
      setError(null);

      await templatesApi.update(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        template_type: templateType,
        page_size: pageSize,
        orientation,
        structure: widgets,
      });

      // Afficher modal de succès
      setSaveResult({
        type: 'success',
        message: 'Template enregistré avec succès !'
      });

      // Rediriger après 1.5 secondes
      setTimeout(() => {
        router.push('/admin/reports/templates');
      }, 1500);
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      setSaveResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur de sauvegarde'
      });
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = (widgetType: string) => {
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      widget_type: widgetType,
      position: widgets.length,
      config: getDefaultConfig(widgetType),
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidgetIndex(widgets.length);
    setShowWidgetLibrary(false);
  };

  const handleRemoveWidget = (index: number) => {
    const newWidgets = widgets.filter((_, i) => i !== index);
    const reindexed = newWidgets.map((w, i) => ({ ...w, position: i }));
    setWidgets(reindexed);
    setSelectedWidgetIndex(null);
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === widgets.length - 1)
    ) {
      return;
    }

    const newWidgets = [...widgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];

    const reindexed = newWidgets.map((w, i) => ({ ...w, position: i }));
    setWidgets(reindexed);
    setSelectedWidgetIndex(targetIndex);
  };

  const handleDuplicateWidget = (index: number) => {
    const widget = widgets[index];
    const duplicated: WidgetConfig = {
      ...widget,
      id: `widget-${Date.now()}`,
      position: index + 1,
    };
    const newWidgets = [
      ...widgets.slice(0, index + 1),
      duplicated,
      ...widgets.slice(index + 1),
    ];
    const reindexed = newWidgets.map((w, i) => ({ ...w, position: i }));
    setWidgets(reindexed);
  };

  const handleUpdateWidgetConfig = (index: number, config: Record<string, any>) => {
    const newWidgets = [...widgets];
    newWidgets[index] = { ...newWidgets[index], config };
    setWidgets(newWidgets);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Chargement du template...</p>
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="text-red-600 mx-auto mb-3" size={48} />
          <p className="text-red-800 font-medium text-center mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/reports/templates')}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4" style={{ maxWidth: '1800px' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/admin/reports/templates')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Retour"
              >
                <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Éditeur de Template</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{template?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 justify-end">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors group relative"
                title="Aperçu"
              >
                <Eye size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden md:inline">Aperçu</span>
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap md:hidden z-10">
                  Aperçu
                </span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || template?.is_system}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                title="Enregistrer"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span className="hidden sm:inline">Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {template?.is_system && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <p className="text-sm text-amber-800">
                ⚠️ Ce template système ne peut pas être modifié. Dupliquez-le pour créer votre version personnalisée.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 h-full" style={{ maxWidth: '1800px' }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 h-full">
            {/* Sidebar gauche : Paramètres - Sticky */}
            <div className="lg:col-span-3 bg-white rounded-lg border shadow-sm lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)] lg:overflow-y-auto">
              <div className="p-4 sm:p-6 border-b bg-white sticky top-0 z-10">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings size={18} className="sm:w-5 sm:h-5" />
                  Paramètres
                </h2>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={template?.is_system}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    disabled={template?.is_system}
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-4">Format</h3>

                  {/* Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                      className="w-full px-3 py-2 border rounded-lg outline-none"
                      disabled={template?.is_system}
                    >
                      <option value="custom">Personnalisé</option>
                      <option value="executive">Exécutif</option>
                      <option value="technical">Technique</option>
                      <option value="detailed">Détaillé</option>
                    </select>
                  </div>

                  {/* Page Size */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format de page</label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg outline-none"
                      disabled={template?.is_system}
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="Letter">Letter (216 × 279 mm)</option>
                      <option value="Legal">Legal (216 × 356 mm)</option>
                    </select>
                  </div>

                  {/* Orientation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOrientation('portrait')}
                        disabled={template?.is_system}
                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                          orientation === 'portrait'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        Portrait
                      </button>
                      <button
                        onClick={() => setOrientation('landscape')}
                        disabled={template?.is_system}
                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                          orientation === 'landscape'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        Paysage
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Centre : Canvas - Structure avec header sticky et liste scrollable */}
            <div className="lg:col-span-6 bg-white rounded-lg border shadow-sm lg:h-[calc(100vh-100px)] flex flex-col">
              {/* Header sticky de la section Structure */}
              <div className="p-4 sm:p-6 border-b bg-white sticky top-0 z-10 flex-shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package size={18} className="sm:w-5 sm:h-5" />
                    <span className="truncate">Structure ({widgets.length} widgets)</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAIGeneratorModal(true)}
                      disabled={template?.is_system}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-md"
                      title="Générer avec l'IA"
                    >
                      <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span className="text-sm sm:text-base hidden sm:inline">Générer IA</span>
                    </button>
                    <button
                      onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
                      disabled={template?.is_system}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span className="text-sm sm:text-base">Ajouter</span>
                    </button>
                  </div>
                </div>

                {/* Widget Library Dropdown - Groupé par catégories */}
                {showWidgetLibrary && (
                  <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border space-y-4">
                    {WIDGET_CATEGORIES.map((category) => (
                      <div key={category.name}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {category.name}
                        </h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {category.widgets.map((widget) => (
                            <button
                              key={widget.type}
                              onClick={() => handleAddWidget(widget.type)}
                              className={`flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-lg hover:scale-105 transition-transform ${widget.color}`}
                            >
                              <widget.icon size={18} className="sm:w-5 sm:h-5" />
                              <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">{widget.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Liste des widgets - Zone scrollable */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                {widgets.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <Package className="mx-auto mb-4 text-gray-400" size={64} />
                    <p className="text-lg font-medium mb-2">Aucun widget</p>
                    <p className="text-sm">Cliquez sur "Ajouter" pour commencer à construire votre template</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {widgets.map((widget, index) => {
                      const widgetInfo = WIDGET_TYPES.find((w) => w.type === widget.widget_type);
                      const Icon = widgetInfo?.icon || FileText;

                      return (
                        <div
                          key={widget.id || index}
                          onClick={() => setSelectedWidgetIndex(index)}
                          className={`group relative rounded-lg border-2 p-3 sm:p-4 cursor-pointer transition-all ${
                            selectedWidgetIndex === index
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${widgetInfo?.color || 'bg-gray-100'}`}>
                              <Icon size={18} className="sm:w-5 sm:h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1 sm:mb-2">
                                <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                  {widgetInfo?.label || widget.widget_type}
                                </h3>
                                <span className="text-[10px] sm:text-xs text-gray-500 ml-2 flex-shrink-0">#{widget.position + 1}</span>
                              </div>

                              {/* Configuration details - Hidden on mobile */}
                              <div className="hidden md:block text-sm text-gray-600 space-y-1">
                                {Object.entries(widget.config).slice(0, 2).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="font-medium">{key}:</span>
                                    <span className="truncate">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Actions - Responsive sizing */}
                            {!template?.is_system && (
                              <div className="flex flex-col gap-0.5 sm:gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveWidget(index, 'up');
                                  }}
                                  disabled={index === 0}
                                  className="p-0.5 sm:p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                                  title="Monter"
                                >
                                  <ChevronUp size={14} className="sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateWidget(index);
                                  }}
                                  className="p-0.5 sm:p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="Dupliquer"
                                >
                                  <Copy size={14} className="sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveWidget(index, 'down');
                                  }}
                                  disabled={index === widgets.length - 1}
                                  className="p-0.5 sm:p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                                  title="Descendre"
                                >
                                  <ChevronDown size={14} className="sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveWidget(index);
                                  }}
                                  className="p-0.5 sm:p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar droite : Configuration widget - Sticky */}
            <div className="lg:col-span-3 bg-white rounded-lg border shadow-sm lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)] lg:overflow-y-auto">
              <div className="p-4 sm:p-6 border-b bg-white sticky top-0 z-10">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Configuration</h2>
              </div>

              <div className="p-4 sm:p-6">
                {selectedWidgetIndex === null ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500">
                    <Settings className="mx-auto mb-3 text-gray-400" size={40} />
                    <p className="text-xs sm:text-sm">Sélectionnez un widget pour le configurer</p>
                  </div>
                ) : (
                  <WidgetConfigPanel
                    widget={widgets[selectedWidgetIndex]}
                    onChange={(config) => handleUpdateWidgetConfig(selectedWidgetIndex, config)}
                    disabled={template?.is_system}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success/Error Modal */}
      {saveResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setSaveResult(null)}
          title={saveResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={saveResult.message}
          type={saveResult.type}
        />
      )}

      {/* Preview Modal */}
      <TemplateDetailModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        templateId={templateId}
        onUpdate={loadTemplate}
      />

      {/* AI Generator Modal */}
      <AITemplateGeneratorModal
        isOpen={showAIGeneratorModal}
        onClose={() => setShowAIGeneratorModal(false)}
        onGenerate={(generatedWidgets) => {
          // Ajouter les widgets générés
          const newWidgets = generatedWidgets.map((w, i) => ({
            ...w,
            id: `widget-${Date.now()}-${i}`,
            position: widgets.length + i,
          }));
          setWidgets([...widgets, ...newWidgets]);
          setShowAIGeneratorModal(false);
        }}
        templateType={templateType}
      />
    </div>
  );
}

// Composant de configuration de widget
function WidgetConfigPanel({
  widget,
  onChange,
  disabled,
}: {
  widget: WidgetConfig;
  onChange: (config: Record<string, any>) => void;
  disabled?: boolean;
}) {
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleChange = (key: string, value: any) => {
    onChange({ ...widget.config, [key]: value });
  };

  // Fonction pour régénérer le contenu IA
  const handleRegenerateAI = async () => {
    setGeneratingAI(true);
    try {
      // Simuler un appel API - Dans une vraie implémentation, appeler l'API de génération
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Placeholder pour le contenu généré
      const generatedContent = `[Contenu généré par l'IA - ${widget.config.tone || 'executive'}]\n\nCe contenu sera généré automatiquement lors de la création du rapport, basé sur les données réelles de l'audit.`;

      onChange({
        ...widget.config,
        manual_content: generatedContent,
      });
    } catch (error) {
      console.error('Erreur génération IA:', error);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Configuration spécifique pour le widget ai_summary
  if (widget.widget_type === 'ai_summary' || widget.widget_type === 'summary') {
    return (
      <div className="space-y-4">
        {/* Header info */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-purple-600" />
            <p className="text-sm font-medium text-purple-900">Résumé IA</p>
          </div>
          <p className="text-xs text-purple-700">Position: #{widget.position + 1}</p>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre de la section
          </label>
          <input
            type="text"
            value={widget.config.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Résumé Exécutif"
          />
        </div>

        {/* Ton */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ton du résumé
          </label>
          <select
            value={widget.config.tone || 'executive'}
            onChange={(e) => handleChange('tone', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="executive">Exécutif (Direction)</option>
            <option value="technical">Technique (RSSI/DSI)</option>
            <option value="detailed">Détaillé (Auditeurs)</option>
          </select>
        </div>

        {/* Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Périmètre
          </label>
          <select
            value={widget.config.report_scope || 'consolidated'}
            onChange={(e) => handleChange('report_scope', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="consolidated">Consolidé (multi-entités)</option>
            <option value="individual">Individuel (par entité)</option>
          </select>
        </div>

        {/* Limite de mots */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Longueur max (mots)
          </label>
          <input
            type="number"
            value={widget.config.max_words || 400}
            onChange={(e) => handleChange('max_words', parseInt(e.target.value) || 400)}
            disabled={disabled}
            min={100}
            max={2000}
            step={50}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {/* Toggle utilisation IA */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span className="font-medium text-gray-900 text-sm">Utiliser l'IA</span>
            <p className="text-xs text-gray-500">Génération automatique du contenu</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={widget.config.use_ai !== false}
              onChange={(e) => handleChange('use_ai', e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* Zone d'édition manuelle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Contenu personnalisé (optionnel)
            </label>
            <button
              onClick={handleRegenerateAI}
              disabled={disabled || generatingAI}
              className="flex items-center gap-1 px-2 py-1 text-xs text-purple-700 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50"
            >
              {generatingAI ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Wand2 size={12} />
                  Régénérer
                </>
              )}
            </button>
          </div>
          <textarea
            value={widget.config.manual_content || ''}
            onChange={(e) => handleChange('manual_content', e.target.value)}
            disabled={disabled}
            rows={8}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-y text-sm"
            placeholder="Laissez vide pour utiliser la génération IA automatique, ou saisissez votre propre texte ici..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Si renseigné, ce texte remplacera la génération automatique.
          </p>
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-medium mb-1">À savoir</p>
              <p>Le contenu sera généré lors de la création du rapport avec les données réelles de l'audit. Vous pourrez le personnaliser à ce moment-là.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Obtenir le rendu spécifique pour ce type de widget
  const specificConfig = renderWidgetSpecificConfig(widget, handleChange, disabled);

  // Trouver le label du widget
  const widgetInfo = WIDGET_TYPES.find((w) => w.type === widget.widget_type);

  // Configuration standard pour les autres widgets
  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          {widgetInfo && <widgetInfo.icon size={16} className="text-blue-600" />}
          <p className="text-sm font-medium text-blue-900">{widgetInfo?.label || widget.widget_type}</p>
        </div>
        <p className="text-xs text-blue-700">Position: #{widget.position + 1}</p>
      </div>

      {/* Configuration spécifique selon le type */}
      {specificConfig}

      {/* Configuration JSON editor (fallback) - Seulement si pas de config spécifique */}
      {!specificConfig && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Configuration avancée (JSON)
            </label>
            <textarea
              value={JSON.stringify(widget.config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange(parsed);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              rows={10}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            💡 Modifiez le JSON pour une configuration avancée
          </div>
        </>
      )}

      {/* Bouton pour voir/modifier le JSON avancé (collapsible) */}
      {specificConfig && (
        <details className="border-t pt-3">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
            <Settings size={12} />
            Configuration avancée (JSON)
          </summary>
          <div className="mt-2">
            <textarea
              value={JSON.stringify(widget.config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange(parsed);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              rows={8}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </details>
      )}
    </div>
  );
}

// Helper pour les configurations spécifiques par type de widget
function renderWidgetSpecificConfig(
  widget: WidgetConfig,
  handleChange: (key: string, value: any) => void,
  disabled?: boolean
) {
  switch (widget.widget_type) {
    // === STRUCTURE ===
    case 'cover':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre principal</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="%campaign.name% ou %entity.name%"
            />
            <p className="mt-1 text-xs text-gray-500">Variables: %campaign.name%, %entity.name%, %framework.name%</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
            <input
              type="text"
              value={widget.config.subtitle || ''}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Rapport d'Audit de Cybersécurité"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="text"
              value={widget.config.date || '%report.date%'}
              onChange={(e) => handleChange('date', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="%report.date%"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source du logo</label>
            <select
              value={widget.config.logo_source || 'organization'}
              onChange={(e) => handleChange('logo_source', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="organization">Organisation (tenant)</option>
              <option value="entity">Entité auditée</option>
              <option value="none">Aucun logo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mention de confidentialité</label>
            <input
              type="text"
              value={widget.config.confidentiality || ''}
              onChange={(e) => handleChange('confidentiality', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Document confidentiel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Couleur du titre</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={widget.config.title_color || '#FFFFFF'}
                onChange={(e) => handleChange('title_color', e.target.value)}
                disabled={disabled}
                className="w-12 h-10 border rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={widget.config.title_color || '#FFFFFF'}
                onChange={(e) => handleChange('title_color', e.target.value)}
                disabled={disabled}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="#FFFFFF"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Couleur du titre et sous-titre (par défaut: blanc)</p>
          </div>
        </div>
      );

    case 'header':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="%entity.name%"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
            <input
              type="text"
              value={widget.config.subtitle || ''}
              onChange={(e) => handleChange('subtitle', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="%framework.name%"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={widget.config.show_logo !== false}
                onChange={(e) => handleChange('show_logo', e.target.checked)}
                disabled={disabled}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Afficher le logo</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={widget.config.show_date !== false}
                onChange={(e) => handleChange('show_date', e.target.checked)}
                disabled={disabled}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Afficher la date</span>
            </label>
          </div>
        </div>
      );

    case 'title':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte du titre</label>
            <input
              type="text"
              value={widget.config.content || widget.config.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Titre de section"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau de titre</label>
            <select
              value={widget.config.level || 1}
              onChange={(e) => handleChange('level', parseInt(e.target.value))}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value={1}>H1 - Titre principal</option>
              <option value={2}>H2 - Sous-titre</option>
              <option value={3}>H3 - Section</option>
              <option value={4}>H4 - Sous-section</option>
            </select>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
            <textarea
              value={widget.config.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              disabled={disabled}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Texte du paragraphe..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alignement</label>
            <select
              value={widget.config.alignment || 'left'}
              onChange={(e) => handleChange('alignment', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="left">Gauche</option>
              <option value="center">Centré</option>
              <option value="right">Droite</option>
              <option value="justify">Justifié</option>
            </select>
          </div>
        </div>
      );

    case 'toc':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du sommaire</label>
            <input
              type="text"
              value={widget.config.title || 'Sommaire'}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profondeur</label>
            <select
              value={widget.config.depth || 2}
              onChange={(e) => handleChange('depth', parseInt(e.target.value))}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value={1}>Niveau 1 uniquement</option>
              <option value={2}>Niveaux 1 et 2</option>
              <option value={3}>Niveaux 1, 2 et 3</option>
            </select>
          </div>
        </div>
      );

    case 'page_break':
      return (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Minus className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-sm text-gray-600">Saut de page</p>
          <p className="text-xs text-gray-500 mt-1">Force un saut de page dans le document PDF</p>
        </div>
      );

    // === DONNÉES AUDIT ===
    case 'kpi':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la section</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Indicateurs Clés"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disposition</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('layout', 'grid')}
                disabled={disabled}
                className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                  widget.config.layout === 'grid' || !widget.config.layout
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                Grille
              </button>
              <button
                type="button"
                onClick={() => handleChange('layout', 'inline')}
                disabled={disabled}
                className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                  widget.config.layout === 'inline'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                En ligne
              </button>
            </div>
          </div>
          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Indicateurs à afficher</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_global_score !== false}
                  onChange={(e) => handleChange('show_global_score', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Score global de conformité</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_domains_count !== false}
                  onChange={(e) => handleChange('show_domains_count', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Nombre de domaines</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_questions_count !== false}
                  onChange={(e) => handleChange('show_questions_count', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Nombre de questions</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_nc_count !== false}
                  onChange={(e) => handleChange('show_nc_count', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Nombre de non-conformités</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_entities_count || false}
                  onChange={(e) => handleChange('show_entities_count', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Nombre d'entités (consolidé)</span>
              </label>
            </div>
          </div>
        </div>
      );

    case 'gauge':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Score de Maturité Global"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source de la valeur</label>
            <select
              value={widget.config.value_source || widget.config.value || 'scores.global'}
              onChange={(e) => handleChange('value', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="%scores.global%">Score global</option>
              <option value="%scores.average%">Score moyen</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur min</label>
              <input
                type="number"
                value={widget.config.min || 0}
                onChange={(e) => handleChange('min', parseInt(e.target.value))}
                disabled={disabled}
                className="w-full px-3 py-2 border rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur max</label>
              <input
                type="number"
                value={widget.config.max || 100}
                onChange={(e) => handleChange('max', parseInt(e.target.value))}
                disabled={disabled}
                className="w-full px-3 py-2 border rounded-lg outline-none"
              />
            </div>
          </div>
          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seuils de couleur</label>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>0-40% : Faible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500"></div>
                <span>40-70% : Moyen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>70-100% : Bon</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'benchmark':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Comparaison avec les pairs"
            />
          </div>
          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Éléments à afficher</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_position !== false}
                  onChange={(e) => handleChange('show_position', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Position dans le classement</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_average !== false}
                  onChange={(e) => handleChange('show_average', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Moyenne du groupe</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_delta !== false}
                  onChange={(e) => handleChange('show_delta', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Écart par rapport à la moyenne</span>
              </label>
            </div>
          </div>
        </div>
      );

    case 'radar_chart':
    case 'radar_domains':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du graphique</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Vue Radar des Domaines"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
            <select
              value={widget.config.size || 'large'}
              onChange={(e) => handleChange('size', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="small">Petit</option>
              <option value="medium">Moyen</option>
              <option value="large">Grand</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={widget.config.show_legend !== false}
                onChange={(e) => handleChange('show_legend', e.target.checked)}
                disabled={disabled}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Afficher la légende</span>
            </label>
          </div>
        </div>
      );

    case 'domain_scores':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Scores Détaillés par Domaine"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
            <select
              value={widget.config.sort_by || 'score'}
              onChange={(e) => handleChange('sort_by', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="score">Score</option>
              <option value="name">Nom du domaine</option>
              <option value="questions">Nombre de questions</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('order', 'asc')}
                disabled={disabled}
                className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                  widget.config.order === 'asc'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                Croissant ↑
              </button>
              <button
                type="button"
                onClick={() => handleChange('order', 'desc')}
                disabled={disabled}
                className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                  widget.config.order === 'desc'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                Décroissant ↓
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={widget.config.show_progress_bar !== false}
                onChange={(e) => handleChange('show_progress_bar', e.target.checked)}
                disabled={disabled}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Afficher les barres de progression</span>
            </label>
          </div>
        </div>
      );

    case 'nc_table':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Non-Conformités Majeures"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sévérité</label>
            <select
              value={widget.config.severity || 'all'}
              onChange={(e) => handleChange('severity', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="all">Toutes les sévérités</option>
              <option value="major">Majeures uniquement</option>
              <option value="minor">Mineures uniquement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limite d'affichage</label>
            <input
              type="number"
              value={widget.config.limit || ''}
              onChange={(e) => handleChange('limit', e.target.value ? parseInt(e.target.value) : null)}
              disabled={disabled}
              min={1}
              className="w-full px-3 py-2 border rounded-lg outline-none"
              placeholder="Illimité"
            />
            <p className="mt-1 text-xs text-gray-500">Laisser vide pour afficher toutes les NC</p>
          </div>
          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Colonnes à afficher</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.columns?.includes('domain') !== false}
                  onChange={(e) => {
                    const cols = widget.config.columns || ['domain', 'question', 'risk_level', 'comment'];
                    if (e.target.checked) {
                      handleChange('columns', [...cols, 'domain']);
                    } else {
                      handleChange('columns', cols.filter((c: string) => c !== 'domain'));
                    }
                  }}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Domaine</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.columns?.includes('question') !== false}
                  onChange={(e) => {
                    const cols = widget.config.columns || ['domain', 'question', 'risk_level', 'comment'];
                    if (e.target.checked) {
                      handleChange('columns', [...cols, 'question']);
                    } else {
                      handleChange('columns', cols.filter((c: string) => c !== 'question'));
                    }
                  }}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Question</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.columns?.includes('risk_level') !== false}
                  onChange={(e) => {
                    const cols = widget.config.columns || ['domain', 'question', 'risk_level', 'comment'];
                    if (e.target.checked) {
                      handleChange('columns', [...cols, 'risk_level']);
                    } else {
                      handleChange('columns', cols.filter((c: string) => c !== 'risk_level'));
                    }
                  }}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Niveau de risque</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.columns?.includes('comment') !== false}
                  onChange={(e) => {
                    const cols = widget.config.columns || ['domain', 'question', 'risk_level', 'comment'];
                    if (e.target.checked) {
                      handleChange('columns', [...cols, 'comment']);
                    } else {
                      handleChange('columns', cols.filter((c: string) => c !== 'comment'));
                    }
                  }}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Commentaire</span>
              </label>
            </div>
          </div>
        </div>
      );

    case 'action_plan':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Actions Prioritaires"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'actions max</label>
            <input
              type="number"
              value={widget.config.limit || 10}
              onChange={(e) => handleChange('limit', parseInt(e.target.value) || 10)}
              disabled={disabled}
              min={1}
              max={50}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            />
          </div>
          <div className="border-t pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Informations à afficher</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_priority !== false}
                  onChange={(e) => handleChange('show_priority', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Priorité (P1, P2, P3)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_deadline !== false}
                  onChange={(e) => handleChange('show_deadline', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Échéance</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={widget.config.show_responsible || false}
                  onChange={(e) => handleChange('show_responsible', e.target.checked)}
                  disabled={disabled}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Responsable</span>
              </label>
            </div>
          </div>
        </div>
      );

    // === CONTENU ===
    case 'image':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={widget.config.source || 'url'}
              onChange={(e) => handleChange('source', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="url">URL externe</option>
              <option value="upload">Fichier téléchargé</option>
            </select>
          </div>
          {widget.config.source === 'url' || !widget.config.source ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'image</label>
              <input
                type="url"
                value={widget.config.url || ''}
                onChange={(e) => handleChange('url', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://..."
              />
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Largeur</label>
            <select
              value={widget.config.width || '100%'}
              onChange={(e) => handleChange('width', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="25%">25%</option>
              <option value="50%">50%</option>
              <option value="75%">75%</option>
              <option value="100%">100%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alignement</label>
            <div className="grid grid-cols-3 gap-2">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => handleChange('alignment', align)}
                  disabled={disabled}
                  className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                    widget.config.alignment === align
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case 'list':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Style de liste</label>
            <select
              value={widget.config.style || 'bullet'}
              onChange={(e) => handleChange('style', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="bullet">Puces (•)</option>
              <option value="number">Numérotée (1, 2, 3)</option>
              <option value="check">Coches (✓)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Éléments (un par ligne)</label>
            <textarea
              value={(widget.config.items || []).join('\n')}
              onChange={(e) => handleChange('items', e.target.value.split('\n').filter(Boolean))}
              disabled={disabled}
              rows={5}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Premier élément&#10;Deuxième élément&#10;Troisième élément"
            />
          </div>
        </div>
      );

    case 'table':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du tableau</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source des données</label>
            <select
              value={widget.config.data_source || 'manual'}
              onChange={(e) => handleChange('data_source', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="manual">Saisie manuelle</option>
              <option value="domain_scores">Scores par domaine</option>
              <option value="entities">Liste des entités</option>
            </select>
          </div>
        </div>
      );

    case 'chart':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du graphique</label>
            <input
              type="text"
              value={widget.config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de graphique</label>
            <select
              value={widget.config.chart_type || 'bar'}
              onChange={(e) => handleChange('chart_type', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="bar">Barres</option>
              <option value="line">Lignes</option>
              <option value="pie">Camembert</option>
              <option value="doughnut">Anneau</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source des données</label>
            <select
              value={widget.config.data_source || 'domain_scores'}
              onChange={(e) => handleChange('data_source', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded-lg outline-none"
            >
              <option value="domain_scores">Scores par domaine</option>
              <option value="nc_distribution">Répartition des NC</option>
              <option value="progress">Progression</option>
            </select>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Helper pour la config par défaut
function getDefaultConfig(widgetType: string): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    // === Structure ===
    cover: {
      title: '%campaign.name%',
      subtitle: '%framework.name%',
      date: '%report.date%',
      logo_source: 'organization',
      confidentiality: 'Document confidentiel',
    },
    header: {
      title: '%entity.name%',
      subtitle: '%framework.name%',
      show_logo: true,
      show_date: true,
    },
    title: {
      content: 'Titre de section',
      level: 1,
      style: 'bold',
    },
    text: {
      content: 'Contenu du paragraphe...',
      alignment: 'left',
    },
    page_break: {},

    // === Données Audit ===
    kpi: {
      title: 'Indicateurs Clés',
      show_global_score: true,
      show_domains_count: true,
      show_questions_count: true,
      show_nc_count: true,
      layout: 'grid',  // grid ou inline
    },
    gauge: {
      title: 'Taux de Conformité Global',
      value_source: 'scores.global',
      size: 'medium',  // small, medium, large
      show_percentage: true,
    },
    radar_chart: {
      title: 'Conformité par Domaine',
      data_source: 'domain_scores',
      show_legend: true,
      size: 'large',
    },
    domain_scores: {
      title: 'Scores par Domaine',
      show_progress_bar: true,
      sort_by: 'score',  // score, name, questions
      order: 'asc',
    },
    nc_table: {
      title: 'Non-Conformités',
      severity: 'all',  // all, major, minor
      limit: null,
      show_domain: true,
      show_question: true,
      show_severity: true,
      show_comment: true,
    },
    action_plan: {
      title: 'Plan d\'Action',
      show_priority: true,
      show_deadline: true,
      show_responsible: true,
      limit: 10,
    },

    // === Contenu ===
    ai_summary: {
      title: 'Résumé Exécutif',
      report_scope: 'consolidated',
      tone: 'executive',
      use_ai: true,
      editable: true,
      max_words: 400,
      manual_content: '',
    },
    summary: {
      title: 'Résumé',
      content: '',
      use_ai: false,
      include_kpis: true,
      include_recommendations: true,
      max_words: 400,
    },
    table: {
      title: 'Tableau',
      columns: ['Colonne 1', 'Colonne 2', 'Colonne 3'],
      data_source: 'manual',
    },
    chart: {
      title: 'Graphique',
      chart_type: 'bar',
      data_source: 'domain_scores',
    },
    image: {
      source: 'url',
      url: '',
      width: '100%',
      alignment: 'center',
    },
    list: {
      items: ['Item 1', 'Item 2', 'Item 3'],
      style: 'bullet',
    },
  };

  return defaults[widgetType] || {};
}

// ============================================================================
// MODAL DE GÉNÉRATION IA DE TEMPLATE
// ============================================================================
interface AITemplateGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (widgets: WidgetConfig[]) => void;
  templateType: TemplateType;
}

function AITemplateGeneratorModal({ isOpen, onClose, onGenerate, templateType }: AITemplateGeneratorModalProps) {
  const [reportScope, setReportScope] = useState<'consolidated' | 'individual'>('consolidated');
  const [tone, setTone] = useState<'executive' | 'technical' | 'detailed'>('executive');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeNC, setIncludeNC] = useState(true);
  const [includeActionPlan, setIncludeActionPlan] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeBenchmark, setIncludeBenchmark] = useState(true);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setGenerating(true);

    // Simuler un délai de génération (dans la vraie implémentation, appeler l'API)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Générer la structure selon le type et les options
    const widgets: WidgetConfig[] = [];
    let position = 0;

    // 1. Page de couverture
    widgets.push({
      id: `ai-cover-${Date.now()}`,
      widget_type: 'cover',
      position: position++,
      config: {
        title: '%campaign.name%',
        subtitle: '%framework.name%',
        date: '%report.date%',
        logo_source: 'organization',
        confidentiality: 'Document confidentiel',
      },
    });

    // 2. En-tête (adapté selon scope)
    widgets.push({
      id: `ai-header-${Date.now()}`,
      widget_type: 'header',
      position: position++,
      config: {
        title: reportScope === 'individual' ? '%entity.name%' : '%campaign.name%',
        subtitle: '%framework.name%',
        show_logo: true,
        show_date: true,
      },
    });

    // 3. Résumé exécutif IA (si demandé)
    if (includeSummary) {
      widgets.push({
        id: `ai-summary-${Date.now()}`,
        widget_type: 'ai_summary',
        position: position++,
        config: {
          title: tone === 'executive'
            ? (reportScope === 'consolidated' ? 'Vue d\'Ensemble' : 'Positionnement')
            : tone === 'technical'
            ? (reportScope === 'consolidated' ? 'Synthèse Technique' : 'État des Lieux Technique')
            : (reportScope === 'consolidated' ? 'Contexte d\'Audit' : 'Analyse de Maturité'),
          report_scope: reportScope,
          tone: tone,
          use_ai: true,
          editable: true,
          max_words: tone === 'executive' ? 300 : tone === 'technical' ? 500 : 800,
        },
      });
    }

    // 4. KPI Cards
    widgets.push({
      id: `ai-kpi-${Date.now()}`,
      widget_type: 'kpi',
      position: position++,
      config: {
        title: 'Indicateurs Clés',
        show_global_score: true,
        show_domains_count: true,
        show_questions_count: true,
        show_nc_count: true,
        show_entities_count: reportScope === 'consolidated',
        layout: 'grid',
      },
    });

    // 5. Jauge de conformité
    widgets.push({
      id: `ai-gauge-${Date.now()}`,
      widget_type: 'gauge',
      position: position++,
      config: {
        title: 'Taux de Conformité Global',
        value_source: 'scores.global',
        size: 'large',
        show_percentage: true,
      },
    });

    // 5b. Benchmarking (pour rapports individuels uniquement)
    if (reportScope === 'individual' && includeBenchmark) {
      widgets.push({
        id: `ai-benchmark-${Date.now()}`,
        widget_type: 'benchmark',
        position: position++,
        config: {
          title: 'Positionnement vs Pairs',
          show_position: true,
          show_average: true,
          show_delta: true,
        },
      });
    }

    // Saut de page
    widgets.push({
      id: `ai-break1-${Date.now()}`,
      widget_type: 'page_break',
      position: position++,
      config: {},
    });

    // 6. Charts (si demandé)
    if (includeCharts) {
      // Radar chart
      widgets.push({
        id: `ai-radar-${Date.now()}`,
        widget_type: 'radar_chart',
        position: position++,
        config: {
          title: 'Conformité par Domaine',
          data_source: 'domain_scores',
          show_legend: true,
          size: 'large',
        },
      });

      // Tableau des scores par domaine
      widgets.push({
        id: `ai-domains-${Date.now()}`,
        widget_type: 'domain_scores',
        position: position++,
        config: {
          title: tone === 'detailed' ? 'Cartographie Conformité' : 'Détail par Domaine',
          show_progress_bar: true,
          sort_by: 'score',
          order: 'asc',
          // Pour le ton detailed, afficher plus de détails
          show_variance: reportScope === 'consolidated' && tone === 'detailed',
        },
      });

      // Saut de page
      widgets.push({
        id: `ai-break2-${Date.now()}`,
        widget_type: 'page_break',
        position: position++,
        config: {},
      });
    }

    // 7. Non-conformités (si demandé)
    if (includeNC) {
      // Titre section adapté au ton
      const ncSectionTitle = tone === 'executive'
        ? (reportScope === 'consolidated' ? 'Risques Stratégiques' : 'Axes d\'Amélioration')
        : tone === 'technical'
        ? 'Écarts Techniques à Corriger'
        : 'Registre des Écarts';

      widgets.push({
        id: `ai-nc-title-${Date.now()}`,
        widget_type: 'title',
        position: position++,
        config: {
          content: ncSectionTitle,
          level: 1,
          style: 'bold',
        },
      });

      // NC majeures / critiques
      widgets.push({
        id: `ai-nc-major-${Date.now()}`,
        widget_type: 'nc_table',
        position: position++,
        config: {
          title: tone === 'technical' ? 'Non-Conformités Techniques Critiques' : 'Non-Conformités Majeures',
          severity: 'major',
          limit: tone === 'executive' ? 5 : (tone === 'technical' ? 10 : null),
          show_domain: true,
          show_question: true,
          show_severity: true,
          show_comment: tone !== 'executive',
          // Pour detailed, ajouter référence normative
          show_iso_reference: tone === 'detailed',
        },
      });

      // NC mineures (sauf pour executive)
      if (tone !== 'executive') {
        widgets.push({
          id: `ai-nc-minor-${Date.now()}`,
          widget_type: 'nc_table',
          position: position++,
          config: {
            title: tone === 'technical' ? 'Écarts Techniques Mineurs' : 'Non-Conformités Mineures',
            severity: 'minor',
            limit: tone === 'technical' ? 15 : null,
            show_domain: true,
            show_question: true,
            show_severity: true,
            show_comment: true,
            show_iso_reference: tone === 'detailed',
          },
        });
      }

      // Saut de page
      widgets.push({
        id: `ai-break3-${Date.now()}`,
        widget_type: 'page_break',
        position: position++,
        config: {},
      });
    }

    // 8. Plan d'action (si demandé)
    if (includeActionPlan) {
      // Titre adapté au ton
      const actionTitle = tone === 'executive'
        ? (reportScope === 'consolidated' ? 'Recommandations Prioritaires' : 'Feuille de Route')
        : tone === 'technical'
        ? 'Plan de Remédiation Technique'
        : 'Trajectoire de Certification';

      widgets.push({
        id: `ai-action-${Date.now()}`,
        widget_type: 'action_plan',
        position: position++,
        config: {
          title: actionTitle,
          show_priority: true,
          show_deadline: tone !== 'executive',
          show_responsible: tone === 'detailed',
          show_budget: tone === 'executive',
          show_effort: tone === 'technical',
          limit: tone === 'executive' ? 3 : (tone === 'technical' ? 5 : 10),
          // Pour detailed, grouper par horizon temporel
          group_by_timeline: tone === 'detailed',
        },
      });

      // Pour ton executive, ajouter estimation budget
      if (tone === 'executive' && reportScope === 'individual') {
        widgets.push({
          id: `ai-budget-${Date.now()}`,
          widget_type: 'budget_summary',
          position: position++,
          config: {
            title: 'Investissement Recommandé',
            show_breakdown: true,
            show_roi: true,
          },
        });
      }

      // Pour ton detailed, ajouter métriques à suivre
      if (tone === 'detailed' || tone === 'technical') {
        widgets.push({
          id: `ai-metrics-${Date.now()}`,
          widget_type: 'metrics',
          position: position++,
          config: {
            title: tone === 'technical' ? 'Indicateurs Clés à Suivre' : 'Métriques de Suivi',
            metrics: tone === 'technical'
              ? ['MTTR', 'Couverture chiffrement', 'Taux patch critique']
              : ['Évolution score global', 'Taux de remédiation', 'Délai moyen correction'],
          },
        });
      }
    }

    setGenerating(false);
    onGenerate(widgets);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Génération IA</h2>
              <p className="text-purple-100 text-sm">Créer une structure de rapport automatiquement</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Type de rapport */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de rapport
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReportScope('consolidated')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  reportScope === 'consolidated'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-900">Consolidé</span>
                <p className="text-xs text-gray-500 mt-1">Multi-entités, vue globale</p>
              </button>
              <button
                onClick={() => setReportScope('individual')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  reportScope === 'individual'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-900">Individuel</span>
                <p className="text-xs text-gray-500 mt-1">Par entité, benchmarking</p>
              </button>
            </div>
          </div>

          {/* Ton du rapport */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ton du rapport
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="executive">Exécutif (Direction / CODIR)</option>
              <option value="technical">Technique (RSSI / DSI)</option>
              <option value="detailed">Détaillé (Auditeurs / GRC)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {tone === 'executive' && (reportScope === 'consolidated'
                ? 'Vue stratégique, risques business, ROI, décisions à prendre'
                : 'Positionnement, atouts, axes d\'amélioration, feuille de route')}
              {tone === 'technical' && (reportScope === 'consolidated'
                ? 'Détails techniques, mesures concrètes, plan d\'action opérationnel'
                : 'État des lieux technique, contrôles, plan de remédiation')}
              {tone === 'detailed' && (reportScope === 'consolidated'
                ? 'Analyse méthodologique, clauses ISO, recommandations normatives'
                : 'Maturité, cartographie conformité, trajectoire certification')}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Sections à inclure
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div>
                <span className="font-medium text-gray-900">Résumé exécutif IA</span>
                <p className="text-xs text-gray-500">Synthèse générée par l'IA</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div>
                <span className="font-medium text-gray-900">Graphiques</span>
                <p className="text-xs text-gray-500">Radar et scores par domaine</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNC}
                onChange={(e) => setIncludeNC(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div>
                <span className="font-medium text-gray-900">Non-conformités</span>
                <p className="text-xs text-gray-500">Tableau des NC majeures/mineures</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={includeActionPlan}
                onChange={(e) => setIncludeActionPlan(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div>
                <span className="font-medium text-gray-900">Plan d'action</span>
                <p className="text-xs text-gray-500">Recommandations priorisées</p>
              </div>
            </label>

            {/* Option benchmarking pour rapports individuels */}
            {reportScope === 'individual' && (
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBenchmark}
                  onChange={(e) => setIncludeBenchmark(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Benchmarking</span>
                  <p className="text-xs text-gray-500">Comparaison vs pairs et secteur</p>
                </div>
              </label>
            )}
          </div>

          {/* Info box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Wand2 className="text-purple-600 flex-shrink-0" size={20} />
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-1">Comment ça marche ?</p>
                <p className="text-purple-600">
                  L'IA génère une structure de rapport optimisée selon le ton choisi.
                  Vous pourrez ensuite personnaliser chaque widget individuellement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 shadow-md"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Génération...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Générer le template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
