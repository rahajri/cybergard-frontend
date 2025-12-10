'use client';

import React, { useState } from 'react';
import { Rocket, X, Send, Loader2, Users, Mail, Target, AlertCircle } from 'lucide-react';

interface LaunchCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  campaignTitle: string;
  contactsCount: number;
  questionnaireName?: string;
}

export default function LaunchCampaignModal({
  isOpen,
  onClose,
  onConfirm,
  campaignTitle,
  contactsCount,
  questionnaireName
}: LaunchCampaignModalProps) {
  const [isLaunching, setIsLaunching] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLaunching(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Erreur lancement:', error);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleClose = () => {
    if (!isLaunching) {
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
        {/* Header avec gradient bleu */}
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
              background: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'scaleIn 0.4s ease-out'
            }}>
              <Rocket className="w-7 h-7" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Lancer la campagne
              </h2>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Envoi des invitations par email
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isLaunching}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: isLaunching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isLaunching) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }
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
          {/* Nom de la campagne */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Target className="w-6 h-6" style={{ color: '#2563EB', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '15px',
                color: '#1E40AF',
                fontWeight: 600,
                margin: 0
              }}>
                {campaignTitle}
              </p>
              {questionnaireName && (
                <p style={{
                  fontSize: '13px',
                  color: '#3B82F6',
                  margin: '4px 0 0 0'
                }}>
                  Questionnaire : {questionnaireName}
                </p>
              )}
            </div>
          </div>

          {/* Informations sur l'envoi */}
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
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Mail className="w-4 h-4" />
              Ce qui va se passer
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '12px'
              }}>
                <div style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#2563EB'
                }}>
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#111827',
                    margin: '0 0 4px 0'
                  }}>
                    Changement de statut
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    La campagne passera de <strong>Brouillon</strong> à <strong>En cours</strong>
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '12px'
              }}>
                <div style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#2563EB'
                }}>
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#111827',
                    margin: '0 0 4px 0'
                  }}>
                    Envoi des invitations
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    {contactsCount} email{contactsCount > 1 ? 's' : ''} d'invitation avec lien d'accès sécurisé
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '12px'
              }}>
                <div style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#2563EB'
                }}>
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#111827',
                    margin: '0 0 4px 0'
                  }}>
                    Date de lancement
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    La date du jour sera enregistrée comme date de lancement
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Compteur de contacts */}
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
            <Users className="w-6 h-6" style={{ color: '#16A34A', flexShrink: 0 }} />
            <div>
              <p style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#15803D',
                margin: 0
              }}>
                {contactsCount} contact{contactsCount > 1 ? 's' : ''}
              </p>
              <p style={{
                fontSize: '13px',
                color: '#16A34A',
                margin: '2px 0 0 0'
              }}>
                {contactsCount > 1 ? 'seront invités' : 'sera invité'} à participer
              </p>
            </div>
          </div>

          {/* Avertissement */}
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'start',
            gap: '12px'
          }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
            <p style={{
              fontSize: '13px',
              color: '#92400E',
              margin: 0,
              lineHeight: '1.5'
            }}>
              <strong>Important :</strong> Une fois lancée, la campagne ne pourra plus être modifiée. Les emails seront envoyés immédiatement.
            </p>
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
            disabled={isLaunching}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: isLaunching ? 'not-allowed' : 'pointer',
              opacity: isLaunching ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isLaunching) {
                e.currentTarget.style.background = '#F9FAFB';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            Annuler
          </button>

          <button
            onClick={handleConfirm}
            disabled={isLaunching}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: isLaunching
                ? '#9CA3AF'
                : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: isLaunching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: isLaunching
                ? 'none'
                : '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}
            onMouseEnter={(e) => {
              if (!isLaunching) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLaunching) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
              }
            }}
          >
            {isLaunching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Lancement en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Lancer la campagne
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
