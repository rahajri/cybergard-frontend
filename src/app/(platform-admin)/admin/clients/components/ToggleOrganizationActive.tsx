'use client';

import React, { useState } from 'react';
import { Power, PowerOff, X, Loader2, Users, ShieldOff, ShieldCheck } from 'lucide-react';

interface ToggleOrganizationActiveProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  currentStatus: boolean;
  organizationName: string;
  organizationDomain?: string;
  userCount?: number;
}

export default function ToggleOrganizationActive({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  organizationName,
  organizationDomain,
  userCount = 0
}: ToggleOrganizationActiveProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Erreur changement statut:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const newStatus = !currentStatus;
  const actionText = newStatus ? 'activer' : 'désactiver';
  const actionColor = newStatus ? '#10B981' : '#F97316';
  const Icon = newStatus ? Power : PowerOff;

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
          maxWidth: '520px',
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
          background: `linear-gradient(135deg, ${actionColor} 0%, ${actionColor}dd 100%)`,
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
              <Icon className="w-6 h-6" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0,
                textTransform: 'capitalize'
              }}>
                {actionText} le client
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Modification du statut
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
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
          {/* Info organisation */}
          <div style={{
            background: newStatus ? '#ECFDF5' : '#FFF7ED',
            border: `1px solid ${newStatus ? '#A7F3D0' : '#FED7AA'}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '15px',
              color: newStatus ? '#065F46' : '#9A3412',
              lineHeight: '1.6',
              margin: 0
            }}>
              <p style={{ margin: 0, marginBottom: '8px' }}>
                Vous êtes sur le point de <strong style={{ textTransform: 'lowercase' }}>{actionText}</strong> le client :
              </p>
              <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>
                  {organizationName}
                </div>
                {organizationDomain && (
                  <div style={{ fontSize: '13px', opacity: 0.8 }}>
                    🌐 {organizationDomain}
                  </div>
                )}
                {userCount > 0 && (
                  <div style={{ 
                    fontSize: '13px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginTop: '4px'
                  }}>
                    <Users className="w-4 h-4" />
                    {userCount} utilisateur{userCount > 1 ? 's' : ''} impacté{userCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conséquences */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '16px'
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
              {newStatus ? (
                <>
                  <ShieldCheck className="w-4 h-4" style={{ color: '#10B981' }} />
                  Conséquences de l'activation :
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4" style={{ color: '#F97316' }} />
                  Conséquences de la désactivation :
                </>
              )}
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '14px',
              color: '#6B7280'
            }}>
              {newStatus ? (
                <>
                  <li style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#10B981' }}>✓</span>
                    <span>L'organisation sera de nouveau accessible</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#10B981' }}>✓</span>
                    <span>Tous les utilisateurs ({userCount}) pourront se connecter</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#10B981' }}>✓</span>
                    <span>Les fonctionnalités seront réactivées</span>
                  </li>
                </>
              ) : (
                <>
                  <li style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#F97316' }}>⚠</span>
                    <span>L'organisation sera inaccessible</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#F97316' }}>⚠</span>
                    <span>Tous les utilisateurs ({userCount}) seront déconnectés</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#F97316' }}>⚠</span>
                    <span>Aucun utilisateur ne pourra se connecter</span>
                  </li>
                  <li style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                    <span style={{ color: '#6B7280' }}>ℹ</span>
                    <span style={{ fontSize: '13px' }}>Les données restent sauvegardées et pourront être réactivées</span>
                  </li>
                </>
              )}
            </ul>
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
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            Annuler
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: isLoading ? '#D1D5DB' : `linear-gradient(135deg, ${actionColor} 0%, ${actionColor}dd 100%)`,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: isLoading ? 'none' : `0 4px 12px ${actionColor}40`,
              textTransform: 'capitalize'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <Icon className="w-4 h-4" />
                {actionText}
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
