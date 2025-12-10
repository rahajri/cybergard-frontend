'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface FileUploadProps {
  answerId: string;
  auditId: string;
  userId: string;
  attachmentType?: 'evidence' | 'screenshot' | 'policy' | 'report' | 'certificate' | 'log' | 'other';
  maxSize?: number; // en MB
  accept?: string; // Types MIME acceptés
  multiple?: boolean;
  onUploadComplete?: (attachments: UploadedFile[]) => void;
}

interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  downloadUrl?: string;
  virusScanStatus: string;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  response?: UploadedFile;
}

export default function FileUpload({
  answerId,
  auditId,
  userId,
  attachmentType = 'evidence',
  maxSize = 50,
  accept,
  multiple = true,
  onUploadComplete
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAccept = {
    evidence: '.pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv',
    screenshot: '.jpg,.jpeg,.png,.gif,.webp',
    policy: '.pdf,.docx,.doc',
    report: '.pdf,.docx,.xlsx,.html',
    certificate: '.pdf,.cer,.pem',
    log: '.txt,.log,.json,.csv',
    other: '.pdf,.jpg,.png,.txt,.zip'
  };

  const acceptedTypes = accept || defaultAccept[attachmentType];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Vérifier la taille
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `Le fichier est trop volumineux (max: ${maxSize} MB)`
      };
    }

    // Vérifier l'extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedExts = acceptedTypes.split(',').map(e => e.trim());

    if (!acceptedExts.includes(ext)) {
      return {
        valid: false,
        error: `Type de fichier non autorisé. Acceptés: ${acceptedTypes}`
      };
    }

    // Vérifier les extensions interdites
    const forbiddenExts = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.vbs', '.js'];
    if (forbiddenExts.includes(ext)) {
      return {
        valid: false,
        error: 'Type de fichier interdit pour des raisons de sécurité'
      };
    }

    return { valid: true };
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: FileWithProgress[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateFile(file);

      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      newFiles.push({
        file,
        progress: 0,
        status: 'pending'
      });
    }

    if (newFiles.length > 0) {
      if (multiple) {
        setFiles(prev => [...prev, ...newFiles]);
      } else {
        setFiles(newFiles);
      }

      // Démarrer l'upload automatiquement
      setTimeout(() => uploadFiles(newFiles), 100);
    }
  };

  const uploadFile = async (fileWithProgress: FileWithProgress): Promise<void> => {
    const { file } = fileWithProgress;

    // Mettre à jour le statut
    setFiles(prev =>
      prev.map(f =>
        f.file === file ? { ...f, status: 'uploading' as const } : f
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('answer_id', answerId);
      formData.append('audit_id', auditId);
      formData.append('attachment_type', attachmentType);
      formData.append('current_user_id', userId);

      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev =>
            prev.map(f =>
              f.file === file ? { ...f, progress } : f
            )
          );
        }
      });

      const uploadPromise = new Promise<UploadedFile>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.detail || 'Erreur lors de l\'upload'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Erreur réseau lors de l\'upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload annulé'));
        });

        xhr.open('POST', '/api/v1/attachments/upload');
        xhr.send(formData);
      });

      const response = await uploadPromise;

      // Succès
      setFiles(prev =>
        prev.map(f =>
          f.file === file
            ? {
                ...f,
                status: 'success' as const,
                progress: 100,
                response
              }
            : f
        )
      );

      toast.success(`${file.name} uploadé avec succès`, {
        description: response.virusScanStatus === 'clean'
          ? '✓ Aucun virus détecté'
          : 'Scan antivirus en cours...'
      });

    } catch (error: unknown) {
      const err = error as Error;
      // Erreur
      setFiles(prev =>
        prev.map(f =>
          f.file === file
            ? {
                ...f,
                status: 'error' as const,
                error: err.message
              }
            : f
        )
      );

      toast.error(`Erreur: ${file.name}`, {
        description: err.message
      });
    }
  };

  const uploadFiles = async (filesToUpload: FileWithProgress[]) => {
    // Upload en parallèle (max 3 simultanés)
    const batchSize = 3;
    for (let i = 0; i < filesToUpload.length; i += batchSize) {
      const batch = filesToUpload.slice(i, i + batchSize);
      await Promise.all(batch.map(f => uploadFile(f)));
    }

    // Notifier le parent
    const uploaded = files
      .filter(f => f.status === 'success' && f.response)
      .map(f => f.response!);

    if (onUploadComplete && uploaded.length > 0) {
      onUploadComplete(uploaded);
    }
  };

  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: FileWithProgress['status']) => {
    switch (status) {
      case 'pending':
        return <File className="w-5 h-5 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: FileWithProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'uploading':
        return <Badge className="bg-blue-500">Upload...</Badge>;
      case 'success':
        return <Badge className="bg-green-500">✓ Envoyé</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-700'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Glissez-déposez vos fichiers ici
        </p>
        <p className="text-xs text-gray-500 mb-3">
          ou cliquez pour sélectionner
        </p>
        <p className="text-xs text-gray-400">
          Formats acceptés: {acceptedTypes}
        </p>
        <p className="text-xs text-gray-400">
          Taille max: {maxSize} MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Icône statut */}
              <div className="flex-shrink-0">
                {getStatusIcon(fileWithProgress.status)}
              </div>

              {/* Info fichier */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {fileWithProgress.file.name}
                  </p>
                  {getStatusBadge(fileWithProgress.status)}
                </div>

                <p className="text-xs text-gray-500">
                  {formatFileSize(fileWithProgress.file.size)}
                </p>

                {/* Progress bar */}
                {fileWithProgress.status === 'uploading' && (
                  <Progress value={fileWithProgress.progress} className="h-1 mt-2" />
                )}

                {/* Erreur */}
                {fileWithProgress.status === 'error' && fileWithProgress.error && (
                  <p className="text-xs text-red-500 mt-1">
                    {fileWithProgress.error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                {fileWithProgress.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileWithProgress.file)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {files.filter(f => f.status === 'success').length} / {files.length} fichiers uploadés
          </span>
          <span>
            Total: {formatFileSize(files.reduce((sum, f) => sum + f.file.size, 0))}
          </span>
        </div>
      )}
    </div>
  );
}
