import Image from 'next/image';
import { CheckCircle, RefreshCw } from 'lucide-react';

/**
 * Message de succès affiché après l'activation du compte
 * Affiche une animation de succès et un message de redirection
 */
export default function SuccessMessage() {
  return (
    <div className="keycloak-container">
      <div className="keycloak-card">
        <div className="keycloak-header">
          <div className="keycloak-logo">
            <Image 
              src="/logo.png"
              alt="CYBERGARD AI Logo"
              width={80}
              height={80}
              priority
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h1 className="keycloak-brand">CYBERGARD AI</h1>
        </div>
        
        <div className="keycloak-content" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ 
            width: '5rem', 
            height: '5rem', 
            margin: '0 auto 2rem',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 40px rgba(22, 163, 74, 0.3)'
          }}>
            <CheckCircle style={{ width: '3rem', height: '3rem', color: 'white' }} />
          </div>
          
          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            🎉 Compte activé avec succès !
          </h2>
          
          <p style={{ 
            fontSize: '1rem', 
            color: '#6b7280',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Votre compte a été activé. Vous allez être redirigé vers la page de connexion...
          </p>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.75rem',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            <RefreshCw style={{ 
              width: '1.25rem', 
              height: '1.25rem',
              animation: 'spin 1s linear infinite'
            }} />
            <span>Redirection en cours...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
