'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { usePasswordValidation } from '../hooks/usePasswordValidation';
import { useActivation } from '../hooks/useActivation';
import ValidationItem from './ValidationItem';

interface ActivationFormProps {
  token: string | null;
}

/**
 * Formulaire d'activation de compte
 * Permet à l'utilisateur de définir son mot de passe lors de l'activation
 */
export default function ActivationForm({ token }: ActivationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const { validation, isFormValid, getPasswordStrength } = usePasswordValidation(
    formData.password,
    formData.confirmPassword
  );

  const { loading, error, handleActivation } = useActivation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      return;
    }

    if (!isFormValid()) {
      return;
    }

    await handleActivation(token, formData.password);
  };

  const strength = getPasswordStrength();

  return (
    <div className="keycloak-container">
      <div className="keycloak-card">
        {/* Header avec logo */}
        <div className="keycloak-header">
          <div className="keycloak-logo">
            <Image
              src="/logo.png"
              alt="CyberGard AI Logo"
              width={80}
              height={80}
              priority
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h1 className="keycloak-brand">CYBERGARD AI</h1>
        </div>

        {/* Titre de la page */}
        <div className="keycloak-title-section">
          <h2 className="keycloak-page-title">Activation de votre compte</h2>
          <p className="keycloak-page-subtitle">
            Définissez votre mot de passe pour accéder à la plateforme
          </p>
        </div>

        <div className="keycloak-content">
          {/* Message d'erreur */}
          {error && (
            <div className="keycloak-alert-error">
              <AlertCircle style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {!token && (
            <div className="keycloak-alert-error">
              <AlertCircle style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
              <span>Token d'activation invalide ou manquant</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="keycloak-form">
            {/* Mot de passe */}
            <div className="keycloak-form-group">
              <label htmlFor="password" className="keycloak-label">
                Mot de passe <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div className="keycloak-input-wrapper">
                <Lock className="keycloak-input-icon" style={{ width: '1.25rem', height: '1.25rem' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({
                    ...formData,
                    password: e.target.value
                  })}
                  className="keycloak-input"
                  placeholder="Entrez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="keycloak-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} />
                  ) : (
                    <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                  )}
                </button>
              </div>

              {/* Indicateur de force */}
              {formData.password.length > 0 && (
                <div className="password-strength-container">
                  <div className="password-strength-header">
                    <span className="password-strength-label">Force :</span>
                    <span
                      className="password-strength-value"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </span>
                  </div>
                  <div className="password-strength-bars">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="password-strength-bar"
                        style={{
                          backgroundColor: level <= strength.level ? strength.color : '#4b5563'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation mot de passe */}
            <div className="keycloak-form-group">
              <label htmlFor="confirmPassword" className="keycloak-label">
                Confirmer le mot de passe <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div className="keycloak-input-wrapper">
                <Lock className="keycloak-input-icon" style={{ width: '1.25rem', height: '1.25rem' }} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({
                    ...formData,
                    confirmPassword: e.target.value
                  })}
                  className="keycloak-input"
                  placeholder="Confirmez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="keycloak-toggle-password"
                >
                  {showConfirmPassword ? (
                    <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} />
                  ) : (
                    <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Critères de validation */}
            <div className="password-requirements">
              <p className="password-requirements-title">
                Le mot de passe doit contenir :
              </p>
              <div className="password-requirements-list">
                <ValidationItem
                  valid={validation.minLength}
                  text="Minimum 12 caractères"
                />
                <ValidationItem
                  valid={validation.hasUppercase}
                  text="Au moins une lettre majuscule (A-Z)"
                />
                <ValidationItem
                  valid={validation.hasLowercase}
                  text="Au moins une lettre minuscule (a-z)"
                />
                <ValidationItem
                  valid={validation.hasNumber}
                  text="Au moins un chiffre (0-9)"
                />
                <ValidationItem
                  valid={validation.hasSpecial}
                  text="Au moins un caractère spécial (!@#$%^&*)"
                />
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #4b5563' }}>
                  <ValidationItem
                    valid={validation.match}
                    text="Les mots de passe correspondent"
                  />
                </div>
              </div>
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="keycloak-submit-button"
            >
              {loading ? (
                <>
                  <RefreshCw style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Activation en cours...
                </>
              ) : (
                <>
                  Activer mon compte
                  <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
                </>
              )}
            </button>

            {/* Conseil de sécurité */}
            <div className="security-tip">
              <AlertCircle style={{ width: '1.125rem', height: '1.125rem', flexShrink: 0 }} />
              <div>
                <p className="security-tip-title">Conseil de sécurité</p>
                <p className="security-tip-text">
                  Utilisez un mot de passe unique que vous n'utilisez nulle part ailleurs.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
