'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Eye, Copy, Trash2, Filter, Loader2, Package, CheckCircle, Clock, Edit, Building2 } from 'lucide-react';
import { templatesApi, ReportTemplate, TemplateType } from '@/lib/api/reports';
import CreateTemplateModal from '@/components/modals/CreateTemplateModal';
import TemplateDetailModal from '@/components/modals/TemplateDetailModal';
import DuplicateTemplateModal from '@/components/modals/DuplicateTemplateModal';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { fetchWithAuth } from '@/lib/auth';

// Type pour les tenants
interface Tenant {
  id: string;
  name: string;
}

export default function AdminReportTemplatesPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<ReportTemplate | null>(null);

  // Filtres
  const [filterType, setFilterType] = useState<TemplateType | 'all'>('all');
  const [filterSystem, setFilterSystem] = useState<'all' | 'system' | 'custom'>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<'all' | 'campaign' | 'scanner'>('all');

  // KPI calculés
  const totalTemplates = templates.length;
  const systemTemplates = templates.filter(t => t.is_system).length;
  const customTemplates = templates.filter(t => !t.is_system).length;
  const campaignTemplates = templates.filter(t =>
    !t.report_scope || ['consolidated', 'entity', 'both'].includes(t.report_scope)
  ).length;
  const scannerTemplates = templates.filter(t =>
    t.report_scope && ['scan_individual', 'scan_ecosystem', 'scan_both'].includes(t.report_scope)
  ).length;

  // Charger les tenants (clients)
  const loadTenants = async () => {
    try {
      const response = await fetchWithAuth('/api/v1/admin/organizations?limit=100');
      if (response.ok) {
        const data = await response.json();
        // Extraire les tenants uniques des organisations
        const uniqueTenants = new Map<string, Tenant>();
        (data.items || []).forEach((org: any) => {
          if (org.tenant_id && org.name) {
            uniqueTenants.set(org.tenant_id, { id: org.tenant_id, name: org.name });
          }
        });
        setTenants(Array.from(uniqueTenants.values()));
      }
    } catch (err) {
      console.error('❌ Erreur chargement tenants:', err);
    }
  };

  // Charger les templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterSystem === 'system') params.is_system = true;
      if (filterSystem === 'custom') params.is_system = false;
      if (filterTenant !== 'all') params.tenant_id = filterTenant;

      const response = await templatesApi.list(params);
      setTemplates(response.items || []);
    } catch (err: any) {
      console.error('❌ Erreur chargement templates:', err);

      // Si c'est une erreur 404, cela signifie qu'il n'y a pas de templates
      // On affiche alors la liste vide au lieu d'une erreur
      if (err?.message?.includes('Not Found') || err?.message?.includes('404')) {
        setTemplates([]);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  // Charger les tenants au démarrage
  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [filterType, filterSystem, filterTenant, filterModule]);

  // Filtrer les templates par module (campaign/scanner)
  const filteredTemplates = templates.filter((t) => {
    if (filterModule === 'all') return true;
    if (filterModule === 'campaign') {
      return !t.report_scope || ['consolidated', 'entity', 'both'].includes(t.report_scope);
    }
    if (filterModule === 'scanner') {
      return t.report_scope && ['scan_individual', 'scan_ecosystem', 'scan_both'].includes(t.report_scope);
    }
    return true;
  });

  // Dupliquer un template
  const handleDuplicate = (template: ReportTemplate) => {
    setTemplateToDuplicate(template);
    setShowDuplicateModal(true);
  };

  // Supprimer un template (Note: Should use ConfirmModal instead of alert/confirm)
  const handleDelete = async (template: ReportTemplate) => {
    if (template.is_system) {
      alert('Impossible de supprimer un template système');
      return;
    }

    if (!confirm(`Supprimer le template "${template.name}" ?`)) {
      return;
    }

    try {
      await templatesApi.delete(template.id);
      await loadTemplates();
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4" style={{ maxWidth: '1600px' }}>
          {/* Title & Action - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  Templates de Rapports
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate hidden sm:block">
                  Gérez les templates de génération de rapports
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              title="Créer un template"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Créer un template</span>
              <span className="sm:hidden text-sm">Créer</span>
            </button>
          </div>

          {/* KPI Cards - Grid responsive 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-800">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{totalTemplates}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-200 rounded-full flex items-center justify-center">
                  <Package className="text-blue-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-purple-800">Système</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">{systemTemplates}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-200 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-purple-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 sm:p-4 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-emerald-800">Campagnes</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-900 mt-1">{campaignTemplates}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-200 rounded-full flex items-center justify-center">
                  <Clock className="text-emerald-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 sm:p-4 border border-red-200 col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-red-800">Scanner</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-900 mt-1">{scannerTemplates}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-200 rounded-full flex items-center justify-center">
                  <FileText className="text-red-700" size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Filtres - Responsive avec flex-wrap */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <Filter size={16} className="text-gray-500 hidden sm:block" />

            {/* Filtre par type - Responsive */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TemplateType | 'all')}
              className="flex-1 sm:flex-initial min-w-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">Tous les types</option>
              <option value="executive">Exécutif</option>
              <option value="technical">Technique</option>
              <option value="detailed">Détaillé</option>
              <option value="custom">Personnalisé</option>
            </select>

            {/* Filtre système/custom - Responsive */}
            <select
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value as 'all' | 'system' | 'custom')}
              className="flex-1 sm:flex-initial min-w-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">Tous</option>
              <option value="system">Système</option>
              <option value="custom">Custom</option>
            </select>

            {/* Filtre par module (Campagne/Scanner) - Responsive */}
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value as 'all' | 'campaign' | 'scanner')}
              className="flex-1 sm:flex-initial min-w-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">Tous les modules</option>
              <option value="campaign">🎯 Campagnes</option>
              <option value="scanner">🔍 Scanner</option>
            </select>

            {/* Filtre par client - Responsive */}
            {tenants.length > 0 && (
              <select
                value={filterTenant}
                onChange={(e) => setFilterTenant(e.target.value)}
                className="flex-1 sm:flex-initial min-w-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="all">Tous les clients</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            )}

            {/* Compteur - Responsive */}
            <div className="w-full sm:w-auto text-xs sm:text-sm text-gray-600 font-medium sm:ml-auto text-center sm:text-left mt-2 sm:mt-0">
              {filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT SCROLLABLE */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6" style={{ maxWidth: '1600px' }}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium">❌ {error}</p>
          <button
            onClick={loadTemplates}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-6">
            <FileText size={40} className="text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {filterType !== 'all' || filterSystem !== 'all' || filterModule !== 'all'
              ? 'Aucun template trouvé'
              : 'Aucun template de rapport'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {filterType !== 'all' || filterSystem !== 'all' || filterModule !== 'all'
              ? 'Aucun template ne correspond à vos critères de recherche. Modifiez les filtres ou créez un nouveau template.'
              : 'Commencez par créer votre premier template de rapport pour générer des documents personnalisés.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={20} />
            Créer un template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={(id) => {
                console.log('🔍 Opening preview modal for template:', id);
                setSelectedTemplateId(id);
                setShowDetailModal(true);
              }}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
        </div>
      </main>

      {/* Modal de création */}
      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadTemplates}
      />

      {/* Modal de détail */}
      <TemplateDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTemplateId(null);
        }}
        templateId={selectedTemplateId}
        onUpdate={loadTemplates}
      />

      {/* Modal de duplication */}
      <DuplicateTemplateModal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setTemplateToDuplicate(null);
        }}
        template={templateToDuplicate}
        onSuccess={loadTemplates}
      />
    </div>
  );
}

// Composant TemplateCard
function TemplateCard({
  template,
  onView,
  onDuplicate,
  onDelete,
}: {
  template: ReportTemplate;
  onView: (id: string) => void;
  onDuplicate: (template: ReportTemplate) => void;
  onDelete: (template: ReportTemplate) => void;
}) {
  const typeLabels: Record<string, string> = {
    system: 'Système',
    executive: 'Exécutif',
    technical: 'Technique',
    detailed: 'Détaillé',
    custom: 'Personnalisé',
  };

  const typeColors: Record<string, string> = {
    system: 'bg-gray-100 text-gray-800',
    executive: 'bg-purple-100 text-purple-800',
    technical: 'bg-blue-100 text-blue-800',
    detailed: 'bg-green-100 text-green-800',
    custom: 'bg-orange-100 text-orange-800',
  };

  const scopeLabels: Record<string, string> = {
    consolidated: 'Consolidé',
    entity: 'Individuel',
    both: 'Multi-scope',
    scan_individual: 'Scan Individuel',
    scan_ecosystem: 'Scan Écosystème',
    scan_both: 'Scanner Multi-scope',
  };

  const scopeColors: Record<string, string> = {
    consolidated: 'bg-emerald-100 text-emerald-800',
    entity: 'bg-cyan-100 text-cyan-800',
    both: 'bg-indigo-100 text-indigo-800',
    scan_individual: 'bg-red-100 text-red-800',
    scan_ecosystem: 'bg-orange-100 text-orange-800',
    scan_both: 'bg-amber-100 text-amber-800',
  };

  // Détermine si c'est un template scanner
  const isScannerTemplate = template.report_scope && ['scan_individual', 'scan_ecosystem', 'scan_both'].includes(template.report_scope);

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate min-w-0 flex-1">{template.name}</h3>
          <div className="flex gap-1 flex-shrink-0">
            {template.is_system && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                Système
              </span>
            )}
            {template.is_default && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded whitespace-nowrap">
                Défaut
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {template.description || 'Aucune description'}
        </p>

        {/* Type et scope badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${typeColors[template.template_type] || typeColors.custom}`}>
            {typeLabels[template.template_type] || template.template_type}
          </span>
          {template.report_scope && (
            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${scopeColors[template.report_scope] || 'bg-gray-100 text-gray-700'}`}>
              {isScannerTemplate ? '🔍 ' : '🎯 '}{scopeLabels[template.report_scope] || template.report_scope}
            </span>
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Format</span>
          <span className="font-medium text-gray-900 text-right truncate ml-2">
            {template.page_size} ({template.orientation})
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Widgets</span>
          <span className="font-medium text-gray-900">
            {template.structure?.length || 0}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 sm:p-4 flex gap-2 border-t">
        <button
          onClick={() => onView(template.id)}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 transition-colors group relative"
          title="Aperçu du template"
        >
          <Eye size={16} />
          <span className="hidden md:inline">Aperçu</span>
          <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap md:hidden z-10">
            Aperçu
          </span>
        </button>
        <button
          onClick={() => window.location.href = `/admin/reports/templates/${template.id}`}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors group relative"
          title="Éditer le template"
        >
          <Edit size={16} />
          <span className="hidden md:inline">Éditer</span>
          <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap md:hidden z-10">
            Éditer
          </span>
        </button>
        <button
          onClick={() => onDuplicate(template)}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors group relative"
          title="Dupliquer"
        >
          <Copy size={16} />
          <span className="hidden md:inline">Dupliquer</span>
          <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap md:hidden z-10">
            Dupliquer
          </span>
        </button>
        {!template.is_system && (
          <button
            onClick={() => onDelete(template)}
            className="px-2 sm:px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors group relative"
            title="Supprimer"
          >
            <Trash2 size={16} />
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Supprimer
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
