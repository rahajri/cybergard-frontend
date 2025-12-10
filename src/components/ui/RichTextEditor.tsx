'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Import dynamique pour éviter les problèmes SSR avec Next.js
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-40 border border-gray-300 rounded-lg animate-pulse bg-gray-50" />
  ),
});

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Entrez votre texte...',
  className = '',
}: RichTextEditorProps) {
  // Configuration des modules Quill
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ color: [] }, { background: [] }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'color',
    'background',
    'link',
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-white"
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          min-height: 200px;
          font-size: 16px;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }

        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background-color: #f9fafb;
        }

        .rich-text-editor .ql-editor {
          min-height: 200px;
        }

        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }

        /* Personnalisation des boutons de la toolbar */
        .rich-text-editor .ql-toolbar button {
          transition: all 0.2s;
        }

        .rich-text-editor .ql-toolbar button:hover {
          color: #667eea;
        }

        .rich-text-editor .ql-toolbar button.ql-active {
          color: #667eea;
        }

        /* Bordures personnalisées */
        .rich-text-editor .ql-container,
        .rich-text-editor .ql-toolbar {
          border-color: #d1d5db;
        }

        .rich-text-editor:focus-within .ql-container,
        .rich-text-editor:focus-within .ql-toolbar {
          border-color: #667eea;
        }
      `}</style>
    </div>
  );
}
