'use client';

import React from 'react';
import { CheckCircle, AlertCircle, X, ArrowRight, Folder, FileText } from 'lucide-react';

interface ImportResultModalProps {
  isOpen: boolean;
  success: boolean;
  onClose: () => void;
  onNavigateToList: () => void;
  frameworkCode: string;
  frameworkName: string;
  stats?: {
    domains_created: number;
    requirements_created: number;
    warnings?: string[];
    errors?: string[];
  };
}

const ImportResultModal: React.FC<ImportResultModalProps> = ({
  isOpen,
  success,
  onClose,
  onNavigateToList,
  frameworkCode,
  frameworkName,
  stats
}) => {
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
          background: success 
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
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
              {success ? (
                <CheckCircle className="w-6 h-6" style={{ color: '#FFFFFF' }} />
              ) : (
                <AlertCircle className="w-6 h-6" style={{ color: '#FFFFFF' }} />
              )}
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                {success ? 'Import réussi !' : 'Erreur d\'import'}
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                {success ? 'Référentiel importé avec succès' : 'L\'import a échoué'}
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
          {success ? (
            <>
              {/* Message de succès */}
              <div style={{
                background: '#D1FAE5',
                border: '1px solid #10B981',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <p style={{
                  fontSize: '15px',
                  color: '#065F46',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  Le référentiel <strong>{frameworkCode}</strong> ({frameworkName}) a été importé avec succès dans la base de données.
                </p>
              </div>

              {/* Statistiques */}
              {stats && (
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
                    marginBottom: '12px'
                  }}>
                    Éléments créés :
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px'
                  }}>
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Folder className="w-8 h-8" style={{ color: '#3B82F6' }} />
                      <div>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          color: '#3B82F6',
                          lineHeight: 1
                        }}>
                          {stats.domains_created}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280',
                          marginTop: '4px'
                        }}>
                          Domaine{stats.domains_created > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <FileText className="w-8 h-8" style={{ color: '#10B981' }} />
                      <div>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          color: '#10B981',
                          lineHeight: 1
                        }}>
                          {stats.requirements_created}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280',
                          marginTop: '4px'
                        }}>
                          Exigence{stats.requirements_created > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Avertissements */}
              {stats?.warnings && stats.warnings.length > 0 && (
                <div style={{
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#92400E',
                    marginBottom: '8px'
                  }}>
                    Avertissements :
                  </div>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '20px',
                    fontSize: '12px',
                    color: '#92400E'
                  }}>
                    {stats.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Message d'erreur */}
              <div style={{
                background: '#FEE2E2',
                border: '1px solid #DC2626',
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
                  L'import du référentiel <strong>{frameworkCode}</strong> a échoué. Veuillez vérifier le fichier et réessayer.
                </p>
              </div>

              {/* Liste des erreurs */}
              {stats?.errors && stats.errors.length > 0 && (
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
                    marginBottom: '12px'
                  }}>
                    Erreurs détectées :
                  </h3>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '20px',
                    fontSize: '13px',
                    color: '#DC2626',
                    lineHeight: '1.6'
                  }}>
                    {stats.errors.map((error, i) => (
                      <li key={i} style={{ marginBottom: '8px' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          gap: '12px',
          justifyContent: success ? 'space-between' : 'flex-end'
        }}>
          {success ? (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Fermer
              </button>
              
              <button
                onClick={onNavigateToList}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                Voir les référentiels
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                background: '#FFFFFF',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          )}
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

export default ImportResultModal;