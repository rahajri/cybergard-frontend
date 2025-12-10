'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Trash2, Loader2, User } from 'lucide-react';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName: string;
  userEmail: string;
}

export default function DeleteUserModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail
}: DeleteUserModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const expectedText = 'DESACTIVER';
  const isConfirmValid = confirmText === expectedText;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmText('');
    } catch (error) {
      console.error('Erreur désactivation:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
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
          maxWidth: '540px',
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
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Désactiver l'utilisateur
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Désactivation du compte
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={isDeleting}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
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
          {/* Warning principale */}
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '15px',
              color: '#991B1B',
              lineHeight: '1.6',
              margin: 0
            }}>
              ⚠️ Vous êtes sur le point de désactiver le compte utilisateur de{' '}
              <strong>{userName}</strong>.
              <br /><br />
              Le compte sera désactivé mais conservé pour la traçabilité. L'utilisateur ne pourra plus se connecter mais ses actions et évaluations resteront visibles.
            </p>
          </div>

          {/* Info utilisateur */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <User className="w-6 h-6" style={{ color: '#6B7280' }} />
            </div>
            <div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: '#111827'
              }}>
                {userName}
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: '#6B7280',
                fontFamily: 'monospace'
              }}>
                {userEmail}
              </p>
            </div>
          </div>

          {/* Champ de confirmation */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>
              Pour confirmer, tapez{' '}
              <span style={{
                fontFamily: 'monospace',
                background: '#F3F4F6',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#DC2626'
              }}>
                {expectedText}
              </span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Tapez DESACTIVER"
              disabled={isDeleting}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid ' + (isConfirmValid ? '#10B981' : '#E5E7EB'),
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                transition: 'all 0.2s',
                background: isDeleting ? '#F9FAFB' : '#FFFFFF'
              }}
              autoFocus
            />
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
            disabled={isDeleting}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1
            }}
          >
            Annuler
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: isConfirmValid && !isDeleting
                ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                : '#D1D5DB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: isConfirmValid && !isDeleting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: isConfirmValid && !isDeleting
                ? '0 4px 12px rgba(220, 38, 38, 0.3)'
                : 'none'
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Désactivation...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Désactiver le compte
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