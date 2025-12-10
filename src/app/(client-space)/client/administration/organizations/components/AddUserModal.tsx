// frontend/app/client/organizations/components/AddUserModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  User,
  Shield,
  X,
  Send,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AddUserModalProps {
  organizationId: string;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Role {
  code: string;
  name: string;
  description: string;
}

export default function AddUserModal({
  organizationId,
  tenantId,
  onClose,
  onSuccess
}: AddUserModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertLimitReached, setAlertLimitReached] = useState(false);
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role_code: 'SUPER_ADMIN',
    send_invitation: true
  });
  
  const [invitationInfo, setInvitationInfo] = useState<{
    email: string;
    invitation_link?: string;
  } | null>(null);

  // Charger les rôles disponibles
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/users/roles`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des rôles:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/user-management/admin/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organization_id: organizationId,
          tenant_id: tenantId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la création de l\'utilisateur');
      }

      const result = await response.json();
      
      // Vérifier si la limite est atteinte
      if (result.alert_limit_reached) {
        setAlertLimitReached(true);
      }
      
      // Stocker les infos d'invitation
      if (result.invitation_token) {
        setInvitationInfo({
          email: result.email,
          invitation_link: `${window.location.origin}/activate-account?token=${result.invitation_token}`
        });
      }
      
      setStep('success');
      
      // Fermer automatiquement après 3 secondes
      setTimeout(() => {
        onSuccess();
      }, 3000);
      
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const isFormValid = (): boolean => {
    return (
      formData.email.trim() !== '' &&
      validateEmail(formData.email) &&
      formData.first_name.trim().length >= 2 &&
      formData.last_name.trim().length >= 2 &&
      formData.role_code !== ''
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Ajouter un utilisateur administrateur
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Un email d'invitation sera envoyé à l'utilisateur
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Alerte limite */}
              {alertLimitReached && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ Attention: La limite d'utilisateurs de votre abonnement est atteinte.
                    Vous pouvez toujours ajouter cet utilisateur, mais une alerte a été envoyée
                    à votre administrateur.
                  </AlertDescription>
                </Alert>
              )}

              {/* Erreur */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Informations personnelles */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Informations personnelles
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">
                      Prénom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({
                        ...formData,
                        first_name: e.target.value
                      })}
                      placeholder="Jean"
                      required
                      minLength={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name">
                      Nom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({
                        ...formData,
                        last_name: e.target.value
                      })}
                      placeholder="Dupont"
                      required
                      minLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">
                    Email professionnel <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        email: e.target.value
                      })}
                      placeholder="jean.dupont@entreprise.fr"
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    L'invitation sera envoyée à cette adresse
                  </p>
                </div>
              </div>

              {/* Rôle */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Rôle et permissions
                </h3>

                <div>
                  <Label htmlFor="role_code">
                    Rôle <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="role_code"
                    value={formData.role_code}
                    onChange={(e) => setFormData({
                      ...formData,
                      role_code: e.target.value
                    })}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {roles.map((role) => (
                      <option key={role.code} value={role.code}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Description du rôle sélectionné */}
                  {roles.find(r => r.code === formData.role_code)?.description && (
                    <p className="text-xs text-gray-600 mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                      {roles.find(r => r.code === formData.role_code)?.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Options d'invitation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-green-600" />
                  Invitation
                </h3>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="send_invitation"
                    checked={formData.send_invitation}
                    onChange={(e) => setFormData({
                      ...formData,
                      send_invitation: e.target.checked
                    })}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <Label htmlFor="send_invitation" className="cursor-pointer">
                      Envoyer l'invitation par email
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      L'utilisateur recevra un email avec un lien pour activer son compte et
                      définir son mot de passe. Le lien est valide 7 jours.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Annuler
                </Button>
                
                <Button
                  type="submit"
                  disabled={!isFormValid() || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Créer et inviter
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Succès */}
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Utilisateur créé avec succès !
              </h2>
              
              <p className="text-gray-600 mb-6">
                {formData.send_invitation ? (
                  <>
                    Un email d'invitation a été envoyé à <strong>{invitationInfo?.email}</strong>
                  </>
                ) : (
                  <>
                    L'utilisateur <strong>{formData.first_name} {formData.last_name}</strong> a été créé
                  </>
                )}
              </p>

              {invitationInfo?.invitation_link && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    Lien d'invitation :
                  </p>
                  <code className="text-xs bg-white px-3 py-2 rounded border border-blue-300 block break-all">
                    {invitationInfo.invitation_link}
                  </code>
                  <p className="text-xs text-blue-700 mt-2">
                    Vous pouvez copier ce lien pour l'envoyer manuellement
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={onSuccess}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}