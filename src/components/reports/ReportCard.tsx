'use client';

import { useState } from 'react';
import { FileText, Download, RefreshCw, Eye, Trash2, AlertCircle, CheckCircle, Clock, Loader2, Globe2, Building2, Radar } from 'lucide-react';
import { GeneratedReport, reportsApi } from '@/lib/api/reports';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import ReportPreviewModal from '@/components/modals/ReportPreviewModal';

interface ReportCardProps {
  report: GeneratedReport;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onRefresh?: () => void;
  mode?: 'campaign' | 'scanner';
}

export default function ReportCard({ report, onDelete, onRegenerate, onRefresh, mode = 'campaign' }: ReportCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: ModalType; message: string } | null>(null);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Status badge configuration
  const statusConfig = {
    pending: {
      label: 'En attente',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: Clock,
    },
    generating: {
      label: 'Génération...',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: Loader2,
      animate: true,
    },
    draft: {
      label: 'DRAFT',
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      icon: FileText,
    },
    final: {
      label: 'FINAL',
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: CheckCircle,
    },
    error: {
      label: 'Erreur',
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: AlertCircle,
    },
    archived: {
      label: 'Archivé',
      color: 'bg-gray-100 text-gray-600 border-gray-300',
      icon: FileText,
    },
  };

  const status = statusConfig[report.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  // Handle download
  const handleDownload = async () => {
    try {
      setDownloading(true);
      await reportsApi.download(report.id, report.file_name || undefined);
      setActionResult({
        type: 'success',
        message: 'Rapport téléchargé avec succès',
      });
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      setActionResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erreur lors du téléchargement',
      });
    } finally {
      setDownloading(false);
    }
  };

  // Handle regenerate
  const handleRegenerateConfirm = async () => {
    try {
      setShowRegenerateConfirm(false);
      await reportsApi.regenerate(report.id);
      setActionResult({
        type: 'success',
        message: 'Régénération lancée avec succès',
      });
      onRegenerate?.();
      onRefresh?.();
    } catch (error) {
      console.error('❌ Erreur régénération:', error);
      setActionResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erreur lors de la régénération',
      });
    }
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    try {
      setShowDeleteConfirm(false);
      await reportsApi.delete(report.id);
      setActionResult({
        type: 'success',
        message: 'Rapport supprimé avec succès',
      });
      onDelete?.();
      onRefresh?.();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      setActionResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression',
      });
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Header */}
        <div className={`p-4 border-b border-gray-200 ${
          mode === 'scanner'
            ? 'bg-gradient-to-r from-cyan-50 to-blue-50'
            : 'bg-gradient-to-r from-purple-50 to-blue-50'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                {report.report_scope === 'consolidated' ? (
                  <Globe2 className="text-purple-600" size={20} />
                ) : report.report_scope === 'scan_ecosystem' ? (
                  <Globe2 className="text-cyan-600" size={20} />
                ) : report.report_scope === 'scan_individual' ? (
                  <Radar className="text-cyan-600" size={20} />
                ) : (
                  <Building2 className="text-blue-600" size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* Report Scope Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      report.report_scope === 'consolidated'
                        ? 'bg-purple-100 text-purple-700'
                        : report.report_scope === 'scan_ecosystem'
                        ? 'bg-cyan-100 text-cyan-700'
                        : report.report_scope === 'scan_individual'
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {report.report_scope === 'consolidated' ? (
                      <>
                        <Globe2 size={12} />
                        Consolidé
                      </>
                    ) : report.report_scope === 'scan_ecosystem' ? (
                      <>
                        <Globe2 size={12} />
                        Écosystème
                      </>
                    ) : report.report_scope === 'scan_individual' ? (
                      <>
                        <Radar size={12} />
                        Scan Individuel
                      </>
                    ) : (
                      <>
                        <Building2 size={12} />
                        Individuel
                      </>
                    )}
                  </span>
                  {/* Entity Name for individual reports */}
                  {report.report_scope === 'entity' && report.entity_name && (
                    <span className="text-xs text-gray-600 truncate">
                      • {report.entity_name}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {report.title}
                </h3>
                {report.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {report.description}
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium flex-shrink-0 ml-3 ${status.color}`}
            >
              <StatusIcon size={14} className={'animate' in status && status.animate ? 'animate-spin' : ''} />
              {status.label}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Version</p>
              <p className="font-medium text-gray-900">
                v{report.version}
                {report.is_latest && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Dernière
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="text-gray-600 mb-1">Généré le</p>
              <p className="font-medium text-gray-900">
                {formatDate(report.generated_at)}
              </p>
            </div>

            <div>
              <p className="text-gray-600 mb-1">Pages</p>
              <p className="font-medium text-gray-900">
                {report.page_count || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-gray-600 mb-1">Taille</p>
              <p className="font-medium text-gray-900">
                {formatFileSize(report.file_size_bytes)}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          {report.generation_time_ms && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Temps de génération : <span className="font-medium text-gray-900">{(report.generation_time_ms / 1000).toFixed(1)}s</span>
              </p>
            </div>
          )}

          {/* Error Message */}
          {report.status === 'error' && report.error_message && (
            <div className="mt-3 pt-3 border-t border-red-200 bg-red-50 -m-4 mt-3 p-3 rounded-b-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{report.error_message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 flex gap-2">
          {/* Download */}
          {(report.status === 'draft' || report.status === 'final') && report.file_path && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'scanner'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              }`}
              title="Télécharger le PDF"
            >
              {downloading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Télécharger
                </>
              )}
            </button>
          )}

          {/* Regenerate */}
          {report.is_latest && (
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={report.status === 'generating'}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Régénérer le rapport"
            >
              <RefreshCw size={16} />
              <span className="hidden md:inline">Régénérer</span>
            </button>
          )}

          {/* Preview */}
          {(report.status === 'draft' || report.status === 'final') && report.file_path && (
            <button
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              title="Aperçu du rapport"
            >
              <Eye size={16} />
              <span className="hidden md:inline">Aperçu</span>
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={report.status === 'generating'}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Supprimer le rapport"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Download Count */}
        {report.downloaded_count > 0 && (
          <div className="px-4 pb-3 text-xs text-gray-500">
            Téléchargé {report.downloaded_count} fois
            {report.last_downloaded_at && ` • Dernier : ${formatDate(report.last_downloaded_at)}`}
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le rapport"
        message={`Êtes-vous sûr de vouloir supprimer le rapport "${report.title}" ?`}
        type="confirm"
        confirmText="Oui, supprimer"
        cancelText="Annuler"
        confirmButtonColor="red"
      />

      <ConfirmModal
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerateConfirm}
        title="Régénérer le rapport"
        message="Cela créera une nouvelle version du rapport. La version actuelle sera conservée."
        type="confirm"
        confirmText="Oui, régénérer"
        cancelText="Annuler"
        confirmButtonColor="purple"
      />

      {/* Action Result Modal */}
      {actionResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setActionResult(null)}
          title={actionResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={actionResult.message}
          type={actionResult.type}
        />
      )}

      {/* Preview Modal */}
      <ReportPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        reportId={report.id}
        reportTitle={report.title}
        fileName={report.file_name || undefined}
      />
    </>
  );
}
