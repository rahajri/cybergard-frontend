'use client';

import React from 'react';
import { 
  X, 
  User, 
  Mail, 
  Building2, 
  Shield, 
  Calendar, 
  Clock,
  BarChart3,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    organization_name?: string;
    created_at: string;
    created_by?: string;
    last_login_at: string | null;
    is_active: boolean;
    actions_count?: number;
    evaluations_count?: number;
  };
  roleLabel: string;
}

export default function UserDetailsModal({
  isOpen,
  onClose,
  user,
  roleLabel
}: UserDetailsModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      onClick={onClose}
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
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'scaleIn 0.4s ease-out'
            }}>
              <User className="w-8 h-8" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Détails de l'Utilisateur
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                Informations complètes
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
          
          {/* Section Identité */}
          <div style={{
            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            border: '2px solid #C7D2FE',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <User className="w-8 h-8" style={{ color: '#FFFFFF' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#1E1B4B',
                  margin: 0
                }}>
                  {user.first_name} {user.last_name}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#4F46E5',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
              </div>
              {/* Badge Statut */}
              <div>
                {user.is_active ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: '#D1FAE5',
                    border: '2px solid #6EE7B7',
                    borderRadius: '8px'
                  }}>
                    <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#065F46'
                    }}>
                      Actif
                    </span>
                  </div>
                ) : (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: '#F3F4F6',
                    border: '2px solid #D1D5DB',
                    borderRadius: '8px'
                  }}>
                    <XCircle className="w-5 h-5" style={{ color: '#6B7280' }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#374151'
                    }}>
                      Inactif
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Informations */}
          <div style={{
            background: '#F9FAFB',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 16px 0'
            }}>
              📋 Informations
            </h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Société */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#6B7280',
                  fontSize: '14px'
                }}>
                  <Building2 className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <span>Société</span>
                </div>
                <span style={{
                  fontWeight: 600,
                  color: '#111827',
                  fontSize: '14px'
                }}>
                  {user.organization_name || 'N/A'}
                </span>
              </div>

              {/* Rôle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#6B7280',
                  fontSize: '14px'
                }}>
                  <Shield className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <span>Rôle</span>
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  fontWeight: 600,
                  fontSize: '13px',
                  borderRadius: '6px'
                }}>
                  {roleLabel}
                </span>
              </div>

              {/* Date de création */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#6B7280',
                  fontSize: '14px'
                }}>
                  <Calendar className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <span>Créé le</span>
                </div>
                <span style={{
                  fontWeight: 600,
                  color: '#111827',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}>
                  {formatDate(user.created_at)}
                </span>
              </div>

              {/* Créé par */}
              {user.created_by && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#6B7280',
                    fontSize: '14px'
                  }}>
                    <User className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <span>Créé par</span>
                  </div>
                  <span style={{
                    fontWeight: 600,
                    color: '#111827',
                    fontSize: '14px'
                  }}>
                    {user.created_by}
                  </span>
                </div>
              )}

              {/* Dernière connexion */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#6B7280',
                  fontSize: '14px'
                }}>
                  <Clock className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <span>Dernière connexion</span>
                </div>
                <span style={{
                  fontWeight: 600,
                  color: '#111827',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}>
                  {formatDate(user.last_login_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Section Activité */}
          <div style={{
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            border: '2px solid #BAE6FD',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#0C4A6E',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BarChart3 className="w-5 h-5" style={{ color: '#0284C7' }} />
              Activité
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              {/* Actions en cours */}
              <div style={{
                background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                border: '2px solid #93C5FD',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#1E3A8A',
                  margin: '0 0 8px 0'
                }}>
                  {user.actions_count || 0}
                </p>
                <p style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1E40AF',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Actions en cours
                </p>
              </div>

              {/* Évaluations en cours */}
              <div style={{
                background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
                border: '2px solid #D8B4FE',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#581C87',
                  margin: '0 0 8px 0'
                }}>
                  {user.evaluations_count || 0}
                </p>
                <p style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#7C3AED',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Évaluations en cours
                </p>
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
            Fermer
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