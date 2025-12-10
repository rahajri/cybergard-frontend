'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Loader2, FileText, AlertCircle, Maximize2, Minimize2, Printer, FileDown } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
  fileName?: string;
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  reportId,
  reportTitle,
  fileName
}: ReportPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && reportId) {
      loadHtmlPreview();
    }

    return () => {
      setHtmlContent(null);
    };
  }, [isOpen, reportId]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  const loadHtmlPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger l'aperçu HTML
      const response = await authenticatedFetch(
        `/api/v1/reports/reports/${reportId}/preview-html`
      );

      if (!response.ok) {
        throw new Error('Impossible de charger le rapport');
      }

      const html = await response.text();
      setHtmlContent(html);
    } catch (err) {
      console.error('Erreur chargement preview:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Ouvrir le HTML dans une nouvelle fenêtre pour impression
    if (htmlContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  const handleDownloadHtml = () => {
    if (htmlContent) {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName?.replace('.pdf', '.html') || `rapport_${reportId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfGenerating(true);
    try {
      // Télécharger le vrai PDF généré sur le serveur (pas de re-génération côté client)
      const response = await authenticatedFetch(
        `/api/v1/reports/reports/${reportId}/download`
      );

      if (!response.ok) {
        throw new Error('Impossible de télécharger le PDF');
      }

      // Créer un blob et déclencher le téléchargement
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `rapport_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement PDF:', err);
      alert('Erreur lors du téléchargement du PDF. Veuillez réessayer.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-lg shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'max-w-6xl w-full max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {reportTitle}
              </h3>
              <p className="text-xs text-gray-500">
                Aperçu du rapport
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? 'Réduire' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={handlePrint}
              disabled={!htmlContent}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
              title="Imprimer"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={!htmlContent || isPdfGenerating}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
              title="Télécharger en PDF"
            >
              {isPdfGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF
                </>
              )}
            </button>

            <button
              onClick={handleDownloadHtml}
              disabled={!htmlContent}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
              title="Télécharger en HTML"
            >
              <Download className="w-4 h-4 mr-2" />
              HTML
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-gray-600">Chargement du rapport...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadHtmlPreview}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : htmlContent ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              className="w-full h-full min-h-[600px]"
              title={reportTitle}
              style={{ border: 'none' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun aperçu disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
