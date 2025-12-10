'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Trash2, Loader2, Users, Building2, Database } from 'lucide-react';

interface DeleteOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  organizationName: string;
  organizationDomain?: string;
  userCount?: number;
  tenantId?: string;
}

const colorMap = {
  blue: { bg: '#DBEAFE', text: '#1E40AF' },
  green: { bg: '#D1FAE5', text: '#059669' },
  yellow: { bg: '#FEF3C7', text: '#D97706' },
  red: { bg: '#FEE2E2', text: '#DC2626' }
};

export default function DeleteOrganizationModal({
  isOpen,
  onClose,
  onConfirm,
  organizationName,
  organizationDomain,
  userCount = 0,
  tenantId
}: DeleteOrganizationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const expectedText = 'SUPPRIMER';
  const isConfirmValid = confirmText === expectedText;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);
    try {
      await onConfirm();
      setConfirmText('');
    } catch (error) {
      console.error('Erreur suppression:', error);
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

  // Calculer les éléments à supprimer
  const elements = [
    { count: userCount || 0, label: `Utilisateur${userCount > 1 ? 's' : ''}`, color: 'blue' as const },
    { count: userCount || 0, label: `Rôle${userCount > 1 ? 's' : ''} attribué${userCount > 1 ? 's' : ''}`, color: 'green' as const },
    { count: 1, label: 'Organisation', color: 'yellow' as const },
  ];

  if (tenantId) {
    elements.push({ count: 1, label: 'Tenant (si non partagé)', color: 'yellow' as const });
  }

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
                Supprimer le client
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Action irréversible
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
              ⚠️ Vous êtes sur le point de supprimer définitivement l'organisation{' '}
              <strong>{organizationName}</strong>
              {organizationDomain && <> ({organizationDomain})</>}.
              <br /><br />
              Cette action supprimera <strong>tous les utilisateurs</strong>, leurs rôles, et toutes les données associées.
            </p>
          </div>

          {/* Éléments à supprimer */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginTop: 0,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Database className="w-4 h-4" />
              Éléments qui seront supprimés :
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {elements.map((el, idx) => {
                const colors = colorMap[el.color];
                return (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      minWidth: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: colors.bg,
                      color: colors.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '0 8px'
                    }}>
                      {el.count}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>
                      {el.label}
                    </span>
                  </li>
                );
              })}
            </ul>
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
              placeholder="Tapez SUPPRIMER"
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
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Supprimer définitivement
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
