import { useState, useEffect } from 'react';

export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  match: boolean;
}

export interface PasswordStrength {
  level: number;
  label: string;
  color: string;
}

/**
 * Hook pour gérer la validation du mot de passe
 * Valide les critères de sécurité et vérifie la correspondance avec la confirmation
 */
export function usePasswordValidation(password: string, confirmPassword: string) {
  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    match: false
  });

  useEffect(() => {
    setValidation({
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(password),
      match: password === confirmPassword && password.length > 0
    });
  }, [password, confirmPassword]);

  const isFormValid = (): boolean => {
    return (
      validation.minLength &&
      validation.hasUppercase &&
      validation.hasLowercase &&
      validation.hasNumber &&
      validation.hasSpecial &&
      validation.match
    );
  };

  const getPasswordStrength = (): PasswordStrength => {
    const validCount = Object.values(validation).filter(Boolean).length;
    
    if (validCount <= 2) return { level: 1, label: 'Faible', color: '#dc2626' };
    if (validCount <= 4) return { level: 2, label: 'Moyen', color: '#ea580c' };
    if (validCount === 5) return { level: 3, label: 'Bon', color: '#ca8a04' };
    return { level: 4, label: 'Excellent', color: '#16a34a' };
  };

  return {
    validation,
    isFormValid,
    getPasswordStrength
  };
}
