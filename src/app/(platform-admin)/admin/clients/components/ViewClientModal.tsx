'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Building2,
  Mail,
  Globe,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  PowerOff,
  Crown,
  Briefcase,
  Hash,
  Shield,
  User,
  Phone
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  domain?: string;
  subscription_type: string;
  billing_email?: string;
  country_code: string;
  sector?: string;
  size_category?: string;
  employee_count?: number;
  is_active: boolean;
  max_suppliers: number;
  max_auditors: number;
  created_at: string;
  updated_at: string;
  tenant_id?: string;
  insee_data?: {
    siret?: string;
    siren?: string;
    denomination?: string;
    activite_principale?: string;
    code_naf?: string;
    libelle_naf?: string;
    forme_juridique?: string;
    adresse?: string;
    code_postal?: string;
    commune?: string;
    date_creation?: string;
    tranche_effectif?: string;
    etat_administratif?: string;
  };
}

// Interface pour les infos admin
interface AdminInfo {
  has_admin: boolean;
  message?: string;
  admin?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    created_at?: string;
    last_login_at?: string;
  };
}

interface ViewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Organization;
  userCount?: number;
}

export default function ViewClientModal({
  isOpen,
  onClose,
  client,
  userCount = 0
}: ViewClientModalProps) {
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Charger les infos admin quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && client?.id) {
      fetchAdminInfo();
    }
  }, [isOpen, client?.id]);

  const fetchAdminInfo = async () => {
    setLoadingAdmin(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await authenticatedFetch(
        `${API_BASE}/api/v1/organizations/${client.id}/admin-info`
      );
      if (response.ok) {
        const data = await response.json();
        setAdminInfo(data);
      } else {
        // Ne pas rediriger sur 401, juste logger l'erreur
        console.error('Erreur API admin-info:', response.status);
        setAdminInfo({ has_admin: false, message: 'Erreur de chargement' });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des infos admin:', error);
      setAdminInfo({ has_admin: false, message: 'Erreur de connexion' });
    } finally {
      setLoadingAdmin(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubscriptionLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      free: 'Gratuit',
      professional: 'Professionnel',
      enterprise: 'Enterprise'
    };
    return labels[type] || type;
  };

  const getSizeLabel = (category?: string, count?: number) => {
    if (count) return `${count} employés`;
    if (category) {
      const labels: { [key: string]: string } = {
        micro: 'Micro (1-10)',
        small: 'Petite (11-50)',
        medium: 'Moyenne (51-250)',
        large: 'Grande (251+)'
      };
      return labels[category] || category;
    }
    return 'Non renseigné';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <h2 className="modal-title" style={{ marginBottom: '4px' }}>
                {client.name}
              </h2>
              {client.domain && (
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  {client.domain}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Statut et Abonnement */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Statut */}
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: client.is_active ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${client.is_active ? '#6ee7b7' : '#fca5a5'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {client.is_active ? (
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
                ) : (
                  <PowerOff style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                )}
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Statut</span>
              </div>
              <p style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: client.is_active ? '#059669' : '#dc2626'
              }}>
                {client.is_active ? 'Actif' : 'Inactif'}
              </p>
            </div>

            {/* Abonnement */}
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: '#fef3c7',
              border: '1px solid #fcd34d'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Crown style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Abonnement</span>
              </div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#d97706' }}>
                {getSubscriptionLabel(client.subscription_type)}
              </p>
            </div>

            {/* Utilisateurs */}
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: '#dbeafe',
              border: '1px solid #93c5fd'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Users style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Utilisateurs</span>
              </div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#2563eb' }}>
                {userCount}
              </p>
            </div>
          </div>

          {/* Administrateur du compte */}
          <div style={{
            background: '#faf5ff',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid #e9d5ff'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#7c3aed'
            }}>
              <User style={{ width: '18px', height: '18px', color: '#7c3aed' }} />
              Administrateur du compte
            </h3>

            {loadingAdmin ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                color: '#6b7280'
              }}>
                Chargement...
              </div>
            ) : adminInfo?.has_admin && adminInfo.admin ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {/* Nom complet */}
                {(adminInfo.admin.first_name || adminInfo.admin.last_name) && (
                  <InfoRow
                    icon={<User style={{ width: '16px', height: '16px', color: '#7c3aed' }} />}
                    label="Nom complet"
                    value={`${adminInfo.admin.first_name || ''} ${adminInfo.admin.last_name || ''}`.trim() || 'Non renseigne'}
                  />
                )}

                {/* Email */}
                <InfoRow
                  icon={<Mail style={{ width: '16px', height: '16px', color: '#7c3aed' }} />}
                  label="Email"
                  value={adminInfo.admin.email}
                />

                {/* Telephone */}
                {adminInfo.admin.phone && (
                  <InfoRow
                    icon={<Phone style={{ width: '16px', height: '16px', color: '#7c3aed' }} />}
                    label="Telephone"
                    value={adminInfo.admin.phone}
                  />
                )}

                {/* Derniere connexion */}
                {adminInfo.admin.last_login_at && (
                  <InfoRow
                    icon={<Calendar style={{ width: '16px', height: '16px', color: '#7c3aed' }} />}
                    label="Derniere connexion"
                    value={formatDate(adminInfo.admin.last_login_at)}
                  />
                )}
              </div>
            ) : (
              <div style={{
                padding: '16px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {adminInfo?.message || 'Aucun administrateur trouve pour ce compte'}
              </div>
            )}
          </div>

          {/* Informations détaillées */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Briefcase style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              Informations générales
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {client.billing_email && (
                <InfoRow
                  icon={<Mail style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                  label="Email de facturation"
                  value={client.billing_email}
                />
              )}

              {client.domain && (
                <InfoRow
                  icon={<Globe style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                  label="Domaine"
                  value={client.domain}
                />
              )}

              <InfoRow
                icon={<MapPin style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                label="Pays"
                value={client.country_code || 'Non renseigné'}
              />

              {client.sector && (
                <InfoRow
                  icon={<Briefcase style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                  label="Secteur"
                  value={client.sector}
                />
              )}

              <InfoRow
                icon={<Users style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                label="Taille"
                value={getSizeLabel(client.size_category, client.employee_count)}
              />
            </div>
          </div>

          {/* Données INSEE (si disponibles) */}
          {(client as any).insee_data && (
            <div style={{
              background: '#f0f9ff',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid #bae6fd'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#0369a1'
              }}>
                <Building2 style={{ width: '18px', height: '18px', color: '#0369a1' }} />
                Données INSEE (SIRET)
              </h3>

              <div style={{ display: 'grid', gap: '12px' }}>
                {(client as any).insee_data.siret && (
                  <InfoRow
                    icon={<Hash style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="SIRET"
                    value={(client as any).insee_data.siret}
                    monospace
                  />
                )}

                {(client as any).insee_data.siren && (
                  <InfoRow
                    icon={<Hash style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="SIREN"
                    value={(client as any).insee_data.siren}
                    monospace
                  />
                )}

                {(client as any).insee_data.denomination && (
                  <InfoRow
                    icon={<Building2 style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Dénomination"
                    value={(client as any).insee_data.denomination}
                  />
                )}

                {(client as any).insee_data.activite_principale && (
                  <InfoRow
                    icon={<Briefcase style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Activité principale"
                    value={(client as any).insee_data.activite_principale}
                  />
                )}

                {(client as any).insee_data.code_naf && (
                  <InfoRow
                    icon={<Hash style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Code NAF"
                    value={(client as any).insee_data.code_naf}
                  />
                )}

                {(client as any).insee_data.libelle_naf && (
                  <InfoRow
                    icon={<Briefcase style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Libellé NAF"
                    value={(client as any).insee_data.libelle_naf}
                  />
                )}

                {(client as any).insee_data.forme_juridique && (
                  <InfoRow
                    icon={<Shield style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Forme juridique"
                    value={(client as any).insee_data.forme_juridique}
                  />
                )}

                {(client as any).insee_data.adresse && (
                  <InfoRow
                    icon={<MapPin style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Adresse"
                    value={(client as any).insee_data.adresse}
                  />
                )}

                {(client as any).insee_data.code_postal && (
                  <InfoRow
                    icon={<MapPin style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Code postal"
                    value={(client as any).insee_data.code_postal}
                  />
                )}

                {(client as any).insee_data.commune && (
                  <InfoRow
                    icon={<MapPin style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Commune"
                    value={(client as any).insee_data.commune}
                  />
                )}

                {(client as any).insee_data.date_creation && (
                  <InfoRow
                    icon={<Calendar style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Date de création"
                    value={formatDate((client as any).insee_data.date_creation)}
                  />
                )}

                {(client as any).insee_data.tranche_effectif && (
                  <InfoRow
                    icon={<Users style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="Tranche d'effectif"
                    value={(client as any).insee_data.tranche_effectif}
                  />
                )}

                {(client as any).insee_data.etat_administratif && (
                  <InfoRow
                    icon={<CheckCircle style={{ width: '16px', height: '16px', color: '#0369a1' }} />}
                    label="État administratif"
                    value={(client as any).insee_data.etat_administratif}
                  />
                )}
              </div>
            </div>
          )}

          {/* Limites et Quotas */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Shield style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              Limites et quotas
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              <InfoRow
                icon={<Hash style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                label="Fournisseurs max"
                value={client.max_suppliers.toString()}
              />

              <InfoRow
                icon={<Hash style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                label="Auditeurs max"
                value={client.max_auditors.toString()}
              />
            </div>
          </div>

          {/* Dates */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Calendar style={{ width: '18px', height: '18px', color: '#6b7280' }} />
              Historique
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              <InfoRow
                icon={<Calendar style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                label="Créé le"
                value={formatDate(client.created_at)}
              />

              <InfoRow
                icon={<Calendar style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                label="Mis à jour le"
                value={formatDate(client.updated_at)}
              />

              {client.tenant_id && (
                <InfoRow
                  icon={<Hash style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                  label="Tenant ID"
                  value={client.tenant_id}
                  monospace
                />
              )}

              <InfoRow
                icon={<Hash style={{ width: '16px', height: '16px', color: '#6b7280' }} />}
                label="Organisation ID"
                value={client.id}
                monospace
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant InfoRow pour afficher une ligne d'information
function InfoRow({
  icon,
  label,
  value,
  monospace = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ marginTop: '2px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '4px'
        }}>
          {label}
        </p>
        <p style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 500,
          color: '#111827',
          fontFamily: monospace ? 'monospace' : 'inherit',
          wordBreak: 'break-all'
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}