'use client';

import { useState } from 'react';
import { X, Copy, Loader2, FileText } from 'lucide-react';
import { templatesApi, ReportTemplate } from '@/lib/api/reports';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';

interface DuplicateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ReportTemplate | null;
  onSuccess?: () => void;
}

export default function DuplicateTemplateModal({
  isOpen,
  onClose,
  template,
  onSuccess,
}: DuplicateTemplateModalProps) {
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [result, setResult] = useState<{ type: ModalType; message: string } | null>(null);

  // Initialiser le nom avec "(Copie)" quand le modal s'ouvre
  useState(() => {
    if (isOpen && template) {
      setNewName(`${template.name} (Copie)`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template) {
      setResult({
        type: 'error',
        message: 'Template non trouvé',
      });
      return;
    }

    if (!newName.trim()) {
      setResult({
        type: 'error',
        message: 'Veuillez saisir un nom pour le template dupliqué',
      });
      return;
    }

    try {
      setLoading(true);
      await templatesApi.duplicate(template.id, newName.trim());

      setResult({
        type: 'success',
        message: `Template "${newName}" créé avec succès !`,
      });

      // Attendre un peu avant de fermer et notifier
      setTimeout(() => {
        setResult(null);
        handleClose();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error('❌ Erreur duplication:', err);
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur lors de la duplication',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNewName('');
      setResult(null);
      onClose();
    }
  };

  if (!isOpen || !template) return null;

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
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Copy className="text-blue-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dupliquer le template</h2>
                  <p className="text-sm text-gray-600">Créer une copie modifiable</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Template original */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="text-gray-600" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Template original</p>
                    <p className="text-sm text-gray-700 mt-1 truncate">{template.name}</p>
                    <div className="flex gap-2 mt-2">
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
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded capitalize">
                        {template.template_type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nouveau nom */}
              <div>
                <label htmlFor="new-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du nouveau template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Template ISO 27001 - Version 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Le template sera créé avec toutes les propriétés du template original
                </p>
              </div>

              {/* Info duplication */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Duplication :</strong> Le nouveau template contiendra :
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-6 list-disc">
                  <li>Tous les widgets et leur configuration</li>
                  <li>Les options de mise en page (format, orientation)</li>
                  <li>Le schéma de couleurs et les polices</li>
                  <li>Les styles CSS personnalisés</li>
                </ul>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
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
                disabled={loading || !newName.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Duplication...
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Dupliquer
                  </>
                )}
              </button>
            </div>
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
