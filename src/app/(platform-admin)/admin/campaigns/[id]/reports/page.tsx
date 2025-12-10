'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileBarChart,
  Clock,
  CheckCircle,
  ArrowLeft,
  Filter,
  Package,
  Globe2,
  Building2,
} from 'lucide-react';
import { reportsApi, GeneratedReport, ReportStatus, ReportScope } from '@/lib/api/reports';
import ReportCard from '@/components/reports/ReportCard';
import GenerateReportModal from '@/components/modals/GenerateReportModal';

export default function CampaignReportsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  // State
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ReportScope | null>(null);

  // Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Charger les rapports
  const loadReports = useCallback(async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await reportsApi.listByCampaign(campaignId, {
        version: showAllVersions ? 'all' : 'latest',
        status: statusFilter || undefined,
        report_scope: scopeFilter || undefined,
      });

      setReports(response.items || []);
    } catch (err) {
      console.error('❌ Erreur chargement rapports:', err);

      // Si 404, afficher liste vide au lieu d'erreur
      if (err instanceof Error && (err.message.includes('Not Found') || err.message.includes('404'))) {
        setReports([]);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId, showAllVersions, statusFilter, scopeFilter]);

  // Charger au montage et quand les filtres changent
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handlers
  const handleGenerateSuccess = () => {
    loadReports();
  };

  const handleReportDeleted = () => {
    loadReports();
  };

  const handleReportRegenerated = () => {
    loadReports();
  };

  // Stats rapides
  const stats = {
    total: reports.length,
    draft: reports.filter((r) => r.status === 'draft').length,
    final: reports.filter((r) => r.status === 'final').length,
    pending: reports.filter((r) => r.status === 'pending' || r.status === 'generating').length,
    error: reports.filter((r) => r.status === 'error').length,
    consolidated: reports.filter((r) => r.report_scope === 'consolidated').length,
    entity: reports.filter((r) => r.report_scope === 'entity').length,
  };

  // Rapports groupés par type
  const consolidatedReports = reports.filter((r) => r.report_scope === 'consolidated');
  const entityReports = reports.filter((r) => r.report_scope === 'entity');

  return (
    <div className="min-h-screen flex flex-col">
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto px-6 py-4" style={{ maxWidth: '1600px' }}>
          {/* Back + Title + Action */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.push('/admin/campaigns')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft size={16} />
                Retour
              </button>

              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                  <FileBarChart className="text-purple-600" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Rapports de Campagne</h1>
                  <p className="text-sm text-gray-600">
                    Générez et gérez les rapports d'audit de cette campagne
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-200"
            >
              <Plus size={18} />
              Générer un rapport
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                  <Package className="text-blue-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Finaux</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.final}</p>
                </div>
                <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-green-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Brouillons</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">{stats.draft}</p>
                </div>
                <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                  <FileText className="text-orange-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">En cours</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.pending}</p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                  <Clock className="text-blue-700" size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <Filter size={18} className="text-gray-500" />

            {/* Scope Filter */}
            <select
              value={scopeFilter || ''}
              onChange={(e) => setScopeFilter((e.target.value as ReportScope) || null)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
            >
              <option value="">Tous les types</option>
              <option value="consolidated">Consolidés ({stats.consolidated})</option>
              <option value="entity">Individuels ({stats.entity})</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter((e.target.value as ReportStatus) || null)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="final">Final</option>
              <option value="pending">En attente</option>
              <option value="generating">En génération</option>
              <option value="error">Erreur</option>
            </select>

            {/* Version Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllVersions}
                onChange={(e) => setShowAllVersions(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Afficher toutes les versions</span>
            </label>

            {/* Refresh */}
            <button
              onClick={loadReports}
              disabled={loading}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>

            {/* Compteurs */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600 font-medium">
                {reports.length} rapport{reports.length > 1 ? 's' : ''}
              </span>
              <span className="text-purple-600 flex items-center gap-1">
                <Globe2 size={14} /> {stats.consolidated}
              </span>
              <span className="text-blue-600 flex items-center gap-1">
                <Building2 size={14} /> {stats.entity}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT SCROLLABLE */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-6" style={{ maxWidth: '1600px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-purple-600" size={40} />
              <span className="ml-3 text-gray-600">Chargement des rapports...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Erreur de chargement</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={loadReports}
                  className="mt-3 px-4 py-2 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-50 rounded-full mb-6">
                <FileBarChart size={40} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {statusFilter || showAllVersions ? 'Aucun rapport trouvé' : 'Aucun rapport généré'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {statusFilter || showAllVersions
                  ? 'Aucun rapport ne correspond à vos critères. Modifiez les filtres ou générez un nouveau rapport.'
                  : 'Commencez par générer votre premier rapport d\'audit en cliquant sur le bouton ci-dessous.'}
              </p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-200"
              >
                <Plus size={20} />
                Générer un rapport
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDelete={handleReportDeleted}
                  onRegenerate={handleReportRegenerated}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Generate Modal */}
      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        campaignId={campaignId}
        onSuccess={handleGenerateSuccess}
      />
    </div>
  );
}
