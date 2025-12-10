'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, File, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';

interface UploadedFile {
  id: string;
  filename: string;
  original_filename: string;
  size: number;
  content_type: string;
  uploaded_at: string;
  download_url?: string;
}

interface FileUploadProps {
  questionId: string;
  auditId: string;
  answerId?: string;
  existingFiles?: UploadedFile[];
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

export function FileUpload({
  questionId,
  auditId,
  answerId,
  existingFiles = [],
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ['*/*'],
  onFilesChange,
  disabled = false
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format taille fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Valider un fichier
  const validateFile = (file: File): string | null => {
    // Vérifier la taille
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `Le fichier "${file.name}" dépasse la taille maximale de ${maxSizeMB} MB`;
    }

    // Vérifier le type (si spécifié)
    if (!acceptedTypes.includes('*/*')) {
      const fileType = file.type;
      const fileExt = `.${file.name.split('.').pop()}`;
      const isAccepted = acceptedTypes.some(type =>
        type === fileType || type === fileExt || type === '*/*'
      );
      if (!isAccepted) {
        return `Le type de fichier "${file.name}" n'est pas accepté`;
      }
    }

    // Vérifier le nombre max de fichiers
    if (files.length >= maxFiles) {
      return `Nombre maximum de fichiers atteint (${maxFiles})`;
    }

    return null;
  };

  // Upload un fichier
  const uploadFile = async (file: File) => {
    const tempId = `temp-${Date.now()}-${file.name}`;
    setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('question_id', questionId);
      formData.append('audit_id', auditId);
      if (answerId) {
        formData.append('answer_id', answerId);
      }

      const response = await authenticatedFetch('/api/v1/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de l\'upload');
      }

      const uploadedFile: UploadedFile = await response.json();

      // Ajouter à la liste des fichiers
      const newFiles = [...files, uploadedFile];
      setFiles(newFiles);
      onFilesChange(newFiles);

      // Retirer de la progression
      setUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });

      return uploadedFile;
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      setUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });
      throw err;
    }
  };

  // Gérer les fichiers sélectionnés
  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    setError(null);
    setUploading(true);

    try {
      const filesToUpload = Array.from(selectedFiles);

      // Valider tous les fichiers
      for (const file of filesToUpload) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          setUploading(false);
          return;
        }
      }

      // Upload tous les fichiers en parallèle
      await Promise.all(filesToUpload.map(file => uploadFile(file)));

    } catch (err: unknown) {
      console.error('Erreur upload:', err);
    } finally {
      setUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Supprimer un fichier
  const handleDelete = async (fileId: string) => {
    if (disabled) return;

    try {
      const response = await authenticatedFetch(`/api/v1/attachments/${fileId}`, {
        method: 'DELETE',
      });

      // Si 404, le fichier n'existe plus en BDD - supprimer de l'UI quand même
      if (response.status === 404) {
        console.log(`⚠️ Fichier ${fileId} déjà supprimé de la BDD, nettoyage de l'UI`);
        const newFiles = files.filter(f => f.id !== fileId);
        setFiles(newFiles);
        onFilesChange(newFiles);
        return;
      }

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      const newFiles = files.filter(f => f.id !== fileId);
      setFiles(newFiles);
      onFilesChange(newFiles);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    }
  };

  // Télécharger un fichier
  const handleDownload = async (file: UploadedFile) => {
    try {
      const response = await authenticatedFetch(`/api/v1/attachments/${file.id}/download`);

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    }
  };

  // Pas d'answerId = pas encore de réponse
  const canUpload = !!answerId;

  return (
    <div className="w-full space-y-4">
      {/* Message si pas encore de réponse */}
      {!canUpload && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            ℹ️ Veuillez d'abord répondre à la question avant d'ajouter des documents.
          </p>
        </div>
      )}

      {/* Zone de drop */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'}
          ${(disabled || !canUpload) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400'}
        `}
        onDragEnter={canUpload ? handleDrag : undefined}
        onDragLeave={canUpload ? handleDrag : undefined}
        onDragOver={canUpload ? handleDrag : undefined}
        onDrop={canUpload ? handleDrop : undefined}
        onClick={() => canUpload && !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
          accept={acceptedTypes.join(',')}
        />

        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <Upload className={`w-10 h-10 ${dragActive ? 'text-indigo-600' : 'text-gray-400'}`} />

          <div>
            <p className="text-sm font-medium text-gray-700">
              {dragActive ? 'Déposez vos fichiers ici' : 'Cliquez ou glissez vos fichiers'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maximum {maxFiles} fichiers • {maxSizeMB} MB par fichier
            </p>
          </div>

          {uploading && (
            <div className="text-sm text-indigo-600">
              Upload en cours...
            </div>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Liste des fichiers uploadés */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Fichiers joints ({files.length}/{maxFiles})
          </p>

          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
            >
              <File className="w-5 h-5 text-gray-400 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)} • {new Date(file.uploaded_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Télécharger"
                >
                  <Download className="w-4 h-4" />
                </button>

                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progression des uploads en cours */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-indigo-600 mb-1">
                  <span>Upload en cours...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
