'use client';

import React from 'react';
import { Power, PowerOff, X, AlertCircle, CheckCircle } from 'lucide-react';

interface ToggleActiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  frameworkCode: string;
  frameworkName: string;
  currentStatus: boolean; // true = actif, false = inactif
  isProcessing: boolean;
}

const ToggleActiveModal: React.FC<ToggleActiveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  frameworkCode,
  frameworkName,
  currentStatus,
  isProcessing
}) => {
  if (!isOpen) return null;

  const willBeActive = !currentStatus;

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
        {/* Header */}
        <div style={{
          padding: '24px',
          background: willBeActive 
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
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
              {willBeActive ? (
                <Power className="w-6 h-6" style={{ color: '#FFFFFF' }} />
              ) : (
                <PowerOff className="w-6 h-6" style={{ color: '#FFFFFF' }} />
              )}
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                {willBeActive ? 'Activer le référentiel' : 'Désactiver le référentiel'}
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Confirmation nécessaire
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
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
          <div style={{
            background: willBeActive ? '#D1FAE5' : '#FEF3C7',
            border: `1px solid ${willBeActive ? '#10B981' : '#F59E0B'}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '15px',
              color: willBeActive ? '#065F46' : '#92400E',
              lineHeight: '1.6',
              margin: 0
            }}>
              {willBeActive ? (
                <>
                  Vous êtes sur le point d'<strong>activer</strong> le référentiel <strong>{frameworkCode}</strong> ({frameworkName}).
                </>
              ) : (
                <>
                  Vous êtes sur le point de <strong>désactiver</strong> le référentiel <strong>{frameworkCode}</strong> ({frameworkName}).
                </>
              )}
            </p>
          </div>

          {/* Info sur les conséquences */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              {willBeActive ? (
                <CheckCircle className="w-5 h-5" style={{ color: '#10B981', flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  margin: '0 0 8px 0'
                }}>
                  {willBeActive ? 'Ce référentiel sera :' : 'Conséquences :'}
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: '#6B7280',
                  lineHeight: '1.8'
                }}>
                  {willBeActive ? (
                    <>
                      <li>Disponible pour la génération de questionnaires</li>
                      <li>Visible dans les sélections de référentiels</li>
                      <li>Utilisable pour les audits et évaluations</li>
                    </>
                  ) : (
                    <>
                      <li>Non disponible pour la génération de questionnaires</li>
                      <li>Caché des sélections de référentiels</li>
                      <li>Les données restent conservées en base</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
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
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.5 : 1
            }}
          >
            Annuler
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: willBeActive 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isProcessing ? 0.5 : 1,
              transition: 'all 0.2s',
              boxShadow: willBeActive 
                ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                : '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            {willBeActive ? (
              <>
                <Power className="w-4 h-4" />
                Activer
              </>
            ) : (
              <>
                <PowerOff className="w-4 h-4" />
                Désactiver
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
};

export default ToggleActiveModal;