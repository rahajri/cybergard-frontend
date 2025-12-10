'use client';

import React, { useState } from 'react';
import { Paperclip, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import FileUpload from './FileUpload';
import AttachmentList from './AttachmentList';

interface AttachmentManagerProps {
  answerId: string;
  auditId: string;
  userId: string;
  attachmentType?: 'evidence' | 'screenshot' | 'policy' | 'report' | 'certificate' | 'log' | 'other';
  showUpload?: boolean;
  initiallyExpanded?: boolean;
}

export default function AttachmentManager({
  answerId,
  auditId,
  userId,
  attachmentType = 'evidence',
  showUpload = true,
  initiallyExpanded = false
}: AttachmentManagerProps) {
  const [isOpen, setIsOpen] = useState(initiallyExpanded);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);

  const handleUploadComplete = (attachments: unknown[]) => {
    // Rafraîchir la liste
    setAttachmentCount(prev => prev + attachments.length);
    setShowUploadForm(false);
  };

  const handleDelete = () => {
    setAttachmentCount(prev => Math.max(0, prev - 1));
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Paperclip className="w-5 h-5 text-gray-500" />
            <CardTitle className="text-base">
              Pièces jointes
            </CardTitle>
            {attachmentCount > 0 && (
              <Badge variant="secondary">
                {attachmentCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showUpload && !showUploadForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {(isOpen || showUploadForm) && (
        <CardContent className="space-y-4">
          {/* Formulaire d'upload */}
          {showUploadForm && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nouveau fichier
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadForm(false)}
                >
                  Annuler
                </Button>
              </div>

              <FileUpload
                answerId={answerId}
                auditId={auditId}
                userId={userId}
                attachmentType={attachmentType}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          )}

          {/* Séparateur si les deux sont visibles */}
          {showUploadForm && isOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
          )}

          {/* Liste des fichiers existants */}
          {isOpen && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Fichiers attachés
              </p>
              <AttachmentList
                answerId={answerId}
                userId={userId}
                onDelete={handleDelete}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
