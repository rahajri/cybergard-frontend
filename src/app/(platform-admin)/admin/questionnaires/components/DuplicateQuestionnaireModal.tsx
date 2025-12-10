'use client';

import React, { useState } from 'react';
import { Copy, X, Loader2, Globe, CheckCircle2, Languages } from 'lucide-react';

interface DuplicateQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (translateToLanguage?: string) => Promise<void>;
  questionnaireName: string;
  questionsCount: number;
}

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', description: 'Langue originale' },
  { code: 'en', name: 'English', flag: '🇬🇧', description: 'Anglais' },
  { code: 'es', name: 'Español', flag: '🇪🇸', description: 'Espagnol' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', description: 'Allemand' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', description: 'Italien' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', description: 'Portugais' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', description: 'Arabe' },
];

export default function DuplicateQuestionnaireModal({
  isOpen,
  onClose,
  onConfirm,
  questionnaireName,
  questionsCount
}: DuplicateQuestionnaireModalProps) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState(`${questionnaireName} (copie)`);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDuplicating(true);
    try {
      await onConfirm(selectedLanguage || undefined);
      setSelectedLanguage(null);
      setDuplicateName(`${questionnaireName} (copie)`);
    } catch (error) {
      console.error('Erreur duplication:', error);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleClose = () => {
    if (!isDuplicating) {
      setSelectedLanguage(null);
      setDuplicateName(`${questionnaireName} (copie)`);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Copy className="w-6 h-6" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Dupliquer le questionnaire
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Avec traduction automatique (optionnelle)
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isDuplicating}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: isDuplicating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X className="w-5 h-5" style={{ color: '#FFFFFF' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Info du questionnaire source */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#1E40AF',
              lineHeight: '1.6',
              margin: 0
            }}>
              📋 Questionnaire source : <strong>{questionnaireName}</strong>
              <br />
              📊 {questionsCount} question{questionsCount > 1 ? 's' : ''} et leurs options seront copiées
            </p>
          </div>

          {/* Nom du duplicata */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>
              Nom du nouveau questionnaire
            </label>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              disabled={isDuplicating}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                background: isDuplicating ? '#F9FAFB' : '#FFFFFF'
              }}
              placeholder="Mon questionnaire (copie)"
            />
          </div>

          {/* Sélection de la langue */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <Languages className="w-5 h-5" style={{ color: '#6366F1' }} />
              <label style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151'
              }}>
                Traduire automatiquement en :
              </label>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              maxHeight: '280px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {languages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                const isOriginal = lang.code === 'fr';

                return (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code === 'fr' ? null : lang.code)}
                    disabled={isDuplicating}
                    style={{
                      position: 'relative',
                      padding: '12px',
                      background: isSelected
                        ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                        : isOriginal
                        ? '#F9FAFB'
                        : '#FFFFFF',
                      border: isSelected
                        ? '2px solid #6366F1'
                        : '2px solid #E5E7EB',
                      borderRadius: '12px',
                      cursor: isOriginal || isDuplicating ? 'default' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      opacity: isDuplicating ? 0.5 : 1,
                      boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontSize: '24px',
                        lineHeight: 1
                      }}>
                        {lang.flag}
                      </span>
                      {isSelected && (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: '#FFFFFF' }}
                        />
                      )}
                      {isOriginal && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#6B7280',
                          background: '#E5E7EB',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Original
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: isSelected ? '#FFFFFF' : '#374151',
                      marginBottom: '2px'
                    }}>
                      {lang.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: isSelected ? 'rgba(255, 255, 255, 0.8)' : '#9CA3AF'
                    }}>
                      {lang.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedLanguage && selectedLanguage !== 'fr' && (
              <div style={{
                marginTop: '16px',
                background: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Globe className="w-5 h-5" style={{ color: '#16A34A', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#166534',
                    margin: '0 0 4px 0'
                  }}>
                    Traduction automatique activée
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#15803D',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    Les {questionsCount} questions et leurs options seront traduites via IA.
                    La traduction prendra quelques minutes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            disabled={isDuplicating}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: isDuplicating ? 'not-allowed' : 'pointer',
              opacity: isDuplicating ? 0.5 : 1
            }}
          >
            Annuler
          </button>

          <button
            onClick={handleConfirm}
            disabled={isDuplicating || !duplicateName.trim()}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: !isDuplicating && duplicateName.trim()
                ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                : '#D1D5DB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: !isDuplicating && duplicateName.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: !isDuplicating && duplicateName.trim()
                ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                : 'none'
            }}
          >
            {isDuplicating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {selectedLanguage && selectedLanguage !== 'fr' ? 'Duplication et traduction...' : 'Duplication...'}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {selectedLanguage && selectedLanguage !== 'fr' ? 'Dupliquer et traduire' : 'Dupliquer'}
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
