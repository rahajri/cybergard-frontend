'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessToastProps {
  title: string;
  message?: string;
  details?: Array<{ label: string; value: string | number }>;
}

/**
 * Composant SuccessToast partagé pour toutes les notifications de succès
 * Utilisé avec toast.custom(() => <SuccessToast ... />)
 * 
 * @example
 * toast.custom(() => (
 *   <SuccessToast
 *     title="Action réussie!"
 *     message="L'opération s'est terminée avec succès"
 *     details={[
 *       { label: 'Items créés', value: 5 },
 *       { label: 'Code', value: 'ABC123' }
 *     ]}
 *   />
 * ));
 */
export default function SuccessToast({ title, message, details }: SuccessToastProps) {
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
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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
          <CheckCircle2 className="w-6 h-6" style={{ color: '#FFFFFF' }} />
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
          background: '#F9FAFB',
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
              <span style={{ color: '#6B7280' }}>{detail.label} :</span>
              <span style={{
                fontWeight: 600,
                color: '#111827',
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
