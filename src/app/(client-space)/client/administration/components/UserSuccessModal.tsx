'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, X, ArrowRight, UserPlus } from 'lucide-react';

interface UserSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userRole: string;
  autoRedirect?: boolean;
  redirectDelay?: number;
}

export default function UserSuccessModal({
  isOpen,
  onClose,
  userName,
  userEmail,
  userRole,
  autoRedirect = false,
  redirectDelay = 3000
}: UserSuccessModalProps) {
  useEffect(() => {
    if (isOpen && autoRedirect) {
      const timer = setTimeout(() => {
        onClose();
      }, redirectDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoRedirect, redirectDelay, onClose]);

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
        {/* Header avec gradient indigo */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
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
              <CheckCircle2 className="w-7 h-7" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Utilisateur créé !
              </h2>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Invitation envoyée
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
          {/* Nom de l'utilisateur */}
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <UserPlus className="w-6 h-6" style={{ color: '#16A34A', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '15px',
                color: '#15803D',
                fontWeight: 600,
                margin: 0
              }}>
                {userName}
              </p>
              <p style={{
                fontSize: '13px',
                color: '#16A34A',
                margin: '4px 0 0 0'
              }}>
                a été invité avec succès
              </p>
            </div>
          </div>

          {/* Détails */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 12px 0'
            }}>
              Informations
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px'
              }}>
                <span style={{ color: '#6B7280' }}>Email</span>
                <span style={{
                  fontWeight: 600,
                  color: '#111827',
                  fontFamily: 'monospace'
                }}>
                  {userEmail}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px'
              }}>
                <span style={{ color: '#6B7280' }}>Rôle</span>
                <span style={{
                  fontWeight: 600,
                  color: '#111827'
                }}>
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Message email d'activation */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'start',
            gap: '12px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#3B82F6',
              marginTop: '6px',
              flexShrink: 0
            }} />
            <div>
              <p style={{
                fontSize: '14px',
                color: '#1E40AF',
                fontWeight: 600,
                margin: '0 0 4px 0'
              }}>
                📧 Email d'activation envoyé
              </p>
              <p style={{
                fontSize: '13px',
                color: '#1E40AF',
                margin: 0,
                lineHeight: '1.5'
              }}>
                L'utilisateur recevra un email à <strong>{userEmail}</strong> pour activer son compte et créer son mot de passe.
              </p>
            </div>
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
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
            }}
          >
            Retour aux utilisateurs
            <ArrowRight className="w-4 h-4" />
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