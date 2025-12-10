'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Lock, Check, AlertCircle, RefreshCw, Copy, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PasswordRequirement {
  label: string;
  regex: RegExp;
  met: boolean;
  icon: string;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Validation des exigences du mot de passe
  const passwordRequirements: PasswordRequirement[] = [
    {
      label: 'Au moins 12 caractères',
      regex: /.{12,}/,
      met: newPassword.length >= 12,
      icon: '🔢',
    },
    {
      label: 'Une lettre majuscule (A-Z)',
      regex: /[A-Z]/,
      met: /[A-Z]/.test(newPassword),
      icon: '🔠',
    },
    {
      label: 'Une lettre minuscule (a-z)',
      regex: /[a-z]/,
      met: /[a-z]/.test(newPassword),
      icon: '🔡',
    },
    {
      label: 'Un chiffre (0-9)',
      regex: /[0-9]/,
      met: /[0-9]/.test(newPassword),
      icon: '🔢',
    },
    {
      label: 'Un caractère spécial (!@#$%^&*)',
      regex: /[!@#$%^&*(),.?":{}|<>]/,
      met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      icon: '✨',
    },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

  // Calculer la force du mot de passe
  const getPasswordStrength = () => {
    const validCount = passwordRequirements.filter((req) => req.met).length;

    if (validCount <= 2) return { level: 1, label: 'Faible', color: '#ef4444' };
    if (validCount <= 3) return { level: 2, label: 'Moyen', color: '#f59e0b' };
    if (validCount === 4) return { level: 3, label: 'Bon', color: '#eab308' };
    return { level: 4, label: 'Excellent', color: '#22c55e' };
  };

  // Générer un mot de passe sécurisé
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // Assurer au moins un caractère de chaque type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Compléter avec des caractères aléatoires pour atteindre 16 caractères
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < 16; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mélanger le mot de passe
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    setNewPassword(password);
    setConfirmPassword(password);
  };

  // Copier le mot de passe dans le presse-papier
  const copyPassword = async () => {
    if (newPassword) {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!currentPassword) {
      setError('Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (!allRequirementsMet) {
      setError('Le nouveau mot de passe ne respecte pas toutes les exigences');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/keycloak/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Erreur lors du changement de mot de passe');
      }

      // Succès!
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Attendre 2 secondes puis fermer
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/30 rounded-lg">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Changer le mot de passe</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm">
              Mot de passe changé avec succès !
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                placeholder="Entrez votre mot de passe actuel"
                disabled={isLoading || success}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                disabled={isLoading || success}
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                placeholder="Entrez votre nouveau mot de passe"
                disabled={isLoading || success}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                disabled={isLoading || success}
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Force du mot de passe :</span>
                  <span
                    className="font-semibold"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="h-2 flex-1 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          level <= strength.level ? strength.color : '#334155',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Password Generator */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={generateSecurePassword}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                disabled={isLoading || success}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Générer un mot de passe
              </button>
              {newPassword && (
                <button
                  type="button"
                  onClick={copyPassword}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                  disabled={isLoading || success}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copié!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Password Requirements - Toujours visible */}
            <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="font-medium">Le mot de passe doit contenir :</span>
              </div>
              <div className="space-y-2.5">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-3 transition-all duration-300">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        req.met
                          ? 'bg-green-500 shadow-lg shadow-green-200'
                          : 'bg-gray-200'
                      }`}
                    >
                      {req.met ? (
                        <Check className="w-4 h-4 text-white font-bold" strokeWidth={3} />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span className="text-sm mr-2">{req.icon}</span>
                    <span
                      className={`text-sm transition-all duration-300 ${
                        req.met
                          ? 'text-green-400 font-semibold'
                          : 'text-gray-400'
                      }`}
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12 ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-500'
                    : 'border-slate-700'
                }`}
                placeholder="Confirmez votre nouveau mot de passe"
                disabled={isLoading || success}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                disabled={isLoading || success}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {/* Indicateur de correspondance avec séparateur */}
            {confirmPassword && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="flex items-center gap-3 transition-all duration-300">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      passwordsMatch
                        ? 'bg-green-500 shadow-lg shadow-green-200'
                        : 'bg-gray-200'
                    }`}
                  >
                    {passwordsMatch ? (
                      <Check className="w-4 h-4 text-white font-bold" strokeWidth={3} />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-sm mr-2">🔐</span>
                  <span
                    className={`text-sm transition-all duration-300 ${
                      passwordsMatch
                        ? 'text-green-400 font-semibold'
                        : 'text-gray-400'
                    }`}
                  >
                    Les mots de passe correspondent
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Security Tip */}
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300 mb-1">
                  Conseil de sécurité
                </p>
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  Utilisez un mot de passe unique que vous n'utilisez nulle part ailleurs.
                  Évitez d'utiliser des informations personnelles facilement devinables comme
                  votre nom, date de naissance ou le nom de votre entreprise.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isLoading || success}
              variant="outline"
              className="flex-1 border-slate-600 text-white hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                success ||
                !allRequirementsMet ||
                !passwordsMatch ||
                !currentPassword
              }
              className="flex-1 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Changement...
                </span>
              ) : (
                'Changer le mot de passe'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
