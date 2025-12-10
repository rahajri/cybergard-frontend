'use client';

import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useEffect } from 'react';

export type ModalType = 'confirm' | 'alert' | 'success' | 'error' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'red' | 'purple' | 'green' | 'blue';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmButtonColor = 'purple'
}: ConfirmModalProps) {

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Bloquer le scroll du body quand modal ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'confirm':
        return <AlertTriangle className="w-12 h-12 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'info':
        return <Info className="w-12 h-12 text-blue-500" />;
      case 'alert':
        return <AlertTriangle className="w-12 h-12 text-red-500" />;
      default:
        return <Info className="w-12 h-12 text-gray-500" />;
    }
  };

  const getConfirmButtonClass = () => {
    const baseClass = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

    switch (confirmButtonColor) {
      case 'red':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
      case 'green':
        return `${baseClass} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`;
      case 'blue':
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
      case 'purple':
      default:
        return `${baseClass} bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500`;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              <div className="flex-1">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{message}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
            {type === 'confirm' && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={getConfirmButtonClass()}
              autoFocus
            >
              {type === 'confirm' ? confirmText : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
