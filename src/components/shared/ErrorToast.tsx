'use client';

import React from 'react';
import { XCircle } from 'lucide-react';

interface ErrorToastProps {
  title: string;
  message?: string;
  details?: Array<{ label: string; value: string | number }>;
}

/**
 * Composant ErrorToast partagé pour toutes les notifications d'erreur
 * Utilisé avec toast.custom(() => <ErrorToast ... />)
 * Variante rouge de SuccessToast
 * 
 * @example
 * toast.custom(() => (
 *   <ErrorToast
 *     title="Erreur!"
 *     message="L'opération a échoué"
 *     details={[
 *       { label: 'Code erreur', value: 'ERR_500' }
 *     ]}
 *   />
 * ));
 */
export default function ErrorToast({ title, message, details }: ErrorToastProps) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      overflow: 'hidden',
      minWidth: '320px',
      maxWidth: '420px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <XCircle className="w-6 h-6" style={{ color: '#FFFFFF' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#FFFFFF'
          }}>
            {title}
          </div>
          {message && (
            <div style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
              marginTop: '4px'
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
      
      {details && details.length > 0 && (
        <div style={{
          padding: '12px 16px',
          background: '#FEF2F2',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {details.map((detail, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px'
            }}>
              <span style={{ color: '#991B1B' }}>{detail.label} :</span>
              <span style={{
                fontWeight: 600,
                color: '#7F1D1D',
                fontFamily: detail.label.includes('Code') ? 'monospace' : 'inherit'
              }}>
                {detail.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
