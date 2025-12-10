'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Loader2, Package, Settings, Layout, Palette, FileType, Calendar } from 'lucide-react';
import { templatesApi, ReportTemplate, WidgetConfig } from '@/lib/api/reports';

interface TemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
  onUpdate?: () => void;
}

export default function TemplateDetailModal({
  isOpen,
  onClose,
  templateId,
  onUpdate,
}: TemplateDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);

  // Charger le template
  useEffect(() => {
    if (isOpen && templateId) {
      loadTemplate();
    }
  }, [isOpen, templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await templatesApi.get(templateId);
      setTemplate(data);
    } catch (err) {
      console.error('❌ Erreur chargement template:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTemplate(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex-shrink-0">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText className="text-white" size={28} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {template?.name || 'Chargement...'}
                </h2>
                <div className="flex items-center gap-3 text-white/90 text-sm">
                  {template?.code && (
                    <span className="px-2 py-1 bg-white/20 rounded-md font-mono">
                      {template.code}
                    </span>
                  )}
                  {template?.is_system && (
                    <span className="px-2 py-1 bg-white/20 rounded-md flex items-center gap-1">
                      <Settings size={14} />
                      Système
                    </span>
                  )}
                  {template?.is_default && (
                    <span className="px-2 py-1 bg-emerald-500/30 rounded-md">
                      Par défaut
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <span className="ml-3 text-gray-600">Chargement...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            ) : template ? (
              <div className="space-y-6">
                {/* Description */}
                {template.description && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                    <p className="text-blue-900 text-sm leading-relaxed">{template.description}</p>
                  </div>
                )}

                {/* Informations générales - Grid moderne */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Palette size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Type de template</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize">{template.template_type}</p>
                      </div>
                    </div>
                  </div>

                  {/* Format */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileType size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Format de page</p>
                        <p className="text-lg font-semibold text-gray-900">{template.page_size}</p>
                      </div>
                    </div>
                  </div>

                  {/* Orientation */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Layout size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Orientation</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize">{template.orientation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Nombre de widgets */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Package size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Widgets</p>
                        <p className="text-lg font-semibold text-gray-900">{template.structure?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structure (widgets) */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Structure du rapport
                  </h3>

                  {template.structure && template.structure.length > 0 ? (
                    <div className="space-y-3">
                      {template.structure.map((widget: WidgetConfig, idx: number) => {
                        const widgetIcons: Record<string, any> = {
                          cover: FileText,
                          title: FileType,
                          text: FileText,
                          table: Layout,
                          chart: Package,
                          image: FileText,
                          list: Layout,
                          summary: FileText,
                          page_break: Layout,
                        };
                        const WidgetIcon = widgetIcons[widget.widget_type] || Package;

                        const widgetColors: Record<string, string> = {
                          cover: 'bg-purple-50 border-purple-200 text-purple-700',
                          title: 'bg-blue-50 border-blue-200 text-blue-700',
                          text: 'bg-gray-50 border-gray-200 text-gray-700',
                          table: 'bg-green-50 border-green-200 text-green-700',
                          chart: 'bg-orange-50 border-orange-200 text-orange-700',
                          image: 'bg-pink-50 border-pink-200 text-pink-700',
                          list: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                          summary: 'bg-teal-50 border-teal-200 text-teal-700',
                          page_break: 'bg-red-50 border-red-200 text-red-700',
                        };
                        const colorClass = widgetColors[widget.widget_type] || 'bg-gray-50 border-gray-200 text-gray-700';

                        return (
                          <div
                            key={widget.id || idx}
                            className={`relative border-2 rounded-lg p-4 transition-all hover:shadow-md ${colorClass}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                <WidgetIcon size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium capitalize">
                                    {widget.widget_type.replace('_', ' ')}
                                  </span>
                                  <span className="px-2 py-0.5 bg-white/60 rounded text-xs font-mono">
                                    #{widget.position + 1}
                                  </span>
                                </div>
                                <p className="text-xs opacity-75">
                                  {Object.keys(widget.config || {}).length} configuration{Object.keys(widget.config || {}).length > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Package className="mx-auto mb-3 text-gray-400" size={40} />
                      <p className="text-gray-600 font-medium">Aucun widget configuré</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Ce template ne contient pas encore de widgets
                      </p>
                    </div>
                  )}
                </div>

                {/* Métadonnées - Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={14} />
                    <span>
                      Créé le {new Date(template.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={14} />
                    <span>
                      Modifié le {new Date(template.updated_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
