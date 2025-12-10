'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Download,
  Trash2,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  attachment_type: string;
  virus_scan_status: string;
  uploaded_at: string;
  uploaded_by_email?: string;
  uploaded_by_name?: string;
  description?: string;
}

interface AttachmentListProps {
  answerId: string;
  userId: string;
  onDelete?: (attachmentId: string) => void;
}

export default function AttachmentList({
  answerId,
  userId,
  onDelete
}: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/attachments/answer/${answerId}`);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des pièces jointes');
      }

      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch (error: unknown) {
      console.error('Erreur fetch attachments:', error);
      const err = error as Error;
      toast.error('Erreur', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  }, [answerId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleDownload = async (attachment: Attachment) => {
    // Vérifier le statut antivirus
    if (attachment.virus_scan_status === 'infected') {
      toast.error('Téléchargement interdit', {
        description: 'Ce fichier est infecté par un virus'
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/attachments/${attachment.id}/download?current_user_id=${userId}`
      );

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      // Créer un blob et télécharger
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Téléchargement démarré', {
        description: attachment.original_filename
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Erreur', {
        description: err.message
      });
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      const response = await fetch(
        `/api/v1/attachments/${attachmentId}?current_user_id=${userId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      // Retirer de la liste
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));

      toast.success('Fichier supprimé');

      if (onDelete) {
        onDelete(attachmentId);
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('Erreur', {
        description: err.message
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-purple-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel')
    ) {
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const getVirusBadge = (status: string) => {
    switch (status) {
      case 'clean':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Sécurisé
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Scan en cours
          </Badge>
        );
      case 'infected':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Infecté
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Erreur scan
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      evidence: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      screenshot: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      policy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      report: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      certificate: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      log: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };

    return (
      <Badge variant="outline" className={colors[type] || colors.other}>
        {type}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed">
        <File className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-500">
          Aucune pièce jointe pour cette réponse
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          {/* Icône fichier */}
          <div className="flex-shrink-0">
            {getFileIcon(attachment.mime_type)}
          </div>

          {/* Informations */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {attachment.original_filename}
              </p>
              {getTypeBadge(attachment.attachment_type)}
              {getVirusBadge(attachment.virus_scan_status)}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{formatFileSize(attachment.file_size)}</span>
              <span>•</span>
              <span>{formatDate(attachment.uploaded_at)}</span>
              {attachment.uploaded_by_name && (
                <>
                  <span>•</span>
                  <span>par {attachment.uploaded_by_name}</span>
                </>
              )}
            </div>

            {attachment.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {attachment.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(attachment)}
              disabled={attachment.virus_scan_status === 'infected'}
            >
              <Download className="w-4 h-4 mr-1" />
              Télécharger
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le fichier &quot;{attachment.original_filename}&quot; sera définitivement supprimé.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(attachment.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
