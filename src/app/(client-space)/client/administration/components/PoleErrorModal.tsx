'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface PoleErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
  poleName?: string;
}

export default function PoleErrorModal({
  isOpen,
  onClose,
  errorMessage,
  poleName
}: PoleErrorModalProps) {
  if (!isOpen) return null;

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
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec gradient rouge */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'scaleIn 0.4s ease-out'
            }}>
              <AlertCircle className="w-7 h-7" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Erreur de création
              </h2>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Le pôle n'a pas pu être créé
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <X className="w-5 h-5" style={{ color: '#FFFFFF' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Message d'erreur */}
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{
              fontSize: '15px',
              color: '#991B1B',
              fontWeight: 600,
              margin: '0 0 8px 0'
            }}>
              {poleName ? `Le pôle "${poleName}" existe déjà` : 'Pôle déjà existant'}
            </p>
            <p style={{
              fontSize: '14px',
              color: '#B91C1C',
              margin: 0,
              lineHeight: '1.5'
            }}>
              {errorMessage}
            </p>
          </div>

          {/* Suggestions */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 12px 0'
            }}>
              Suggestions
            </h3>
            <ul style={{
              fontSize: '14px',
              color: '#374151',
              margin: 0,
              paddingLeft: '20px',
              lineHeight: '1.8'
            }}>
              <li>Vérifiez si le pôle existe déjà dans votre organisation</li>
              <li>Utilisez un nom différent pour ce pôle</li>
              <li>Modifiez le pôle existant si nécessaire</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.25)';
            }}
          >
            Compris
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

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
