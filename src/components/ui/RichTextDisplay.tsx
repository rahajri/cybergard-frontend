'use client';

import React from 'react';
import 'react-quill/dist/quill.snow.css';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

/**
 * Composant pour afficher le contenu HTML formaté (créé avec RichTextEditor)
 * Utilise dangerouslySetInnerHTML mais le contenu est considéré sûr car créé en interne
 */
export function RichTextDisplay({ content, className = '' }: RichTextDisplayProps) {
  // Si le contenu est vide ou contient uniquement des balises vides
  const isEmpty = !content || content.trim() === '' || content.trim() === '<p><br></p>';

  if (isEmpty) {
    return (
      <div className={`text-gray-400 italic ${className}`}>
        Aucune description
      </div>
    );
  }

  return (
    <div
      className={`rich-text-display prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
