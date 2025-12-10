'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Loader2, 
  Building2, 
  MapPin, 
  User, 
  Shield,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Mail,
  Phone as PhoneIcon,
  Briefcase
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
}

export interface OrganismFormData {
  id: string;
  name: string;
  legal_name?: string | null;
  trade_name?: string | null;
  short_name?: string | null;
  siret?: string | null;
  siren?: string | null;
  ape_code?: string | null;
  stakeholder_type: 'internal' | 'external';
  entity_category?: string | null;
  pole_id?: string | null;
  category_id?: string | null;
  status: string;
  address_line1?: string | null;
  address_line2?: string | null;
  address_line3?: string | null;
  postal_code?: string | null;
  city?: string | null;
  main_email?: string | null;
  main_phone?: string | null;
  website?: string | null;
  sector?: string | null;
  size_category?: string | null;
  employee_count?: number | null;
  description?: string | null;
  legal_representative_contact_id?: string | null;
  dpo_contact_id?: string | null;
}

interface EditOrganismModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OrganismFormData) => Promise<void>;
  organism: OrganismFormData & {
    legal_representative?: User;
    dpo?: User;
  };
  availableRepresentatives: User[];
  availableDPOs: User[];
  poles?: Array<{ id: string; name: string; children?: unknown[] }>;
  categories?: Array<{ id: string; name: string; children?: unknown[] }>;
}

// ============================================================================
// UTILITAIRE: Aplatir la hiérarchie avec chemin complet
// ============================================================================

interface FlatCategory {
  id: string;
  name: string;
  fullPath: string;  // Ex: "FOURNISSEURS → MAROC"
  level: number;
}

/**
 * Aplatit récursivement une hiérarchie de catégories/pôles en incluant le chemin complet
 */
function flattenHierarchyWithPath(
  items: Array<{ id: string; name: string; children?: unknown[] }>,
  parentPath: string = '',
  level: number = 0
): FlatCategory[] {
  const result: FlatCategory[] = [];

  for (const item of items) {
    const currentPath = parentPath ? `${parentPath} → ${item.name}` : item.name;

    // Ajouter l'élément courant
    result.push({
      id: item.id,
      name: item.name,
      fullPath: currentPath,
      level
    });

    // Si l'élément a des enfants, les aplatir récursivement
    if (item.children && item.children.length > 0) {
      const childrenFlat = flattenHierarchyWithPath(item.children as Array<{ id: string; name: string; children?: unknown[] }>, currentPath, level + 1);
      result.push(...childrenFlat);
    }
  }

  return result;
}

// ============================================================================
// COMPOSANT: UserSelector (Dropdown avec recherche)
// ============================================================================

interface UserSelectorProps {
  users: User[];
  selectedUserId?: string | null;
  onSelect: (userId: string) => void;
  placeholder?: string;
  label: string;
  roleColor: string;
}

function UserSelector({ 
  users, 
  selectedUserId, 
  onSelect, 
  placeholder = "Rechercher...",
  label,
  roleColor 
}: UserSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(search) ||
      user.last_name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        background: '#FFFFFF',
        border: `2px solid ${roleColor}`,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        maxHeight: '320px',
        overflowY: 'auto' as const,
        zIndex: 10000
      });
    }
  }, [isOpen, roleColor]);

  const handleSelect = (userId: string) => {
    onSelect(userId);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={inputRef} style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Search 
          className="w-4 h-4" 
          style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: '#9CA3AF' 
          }} 
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            paddingLeft: '40px',
            borderColor: isOpen ? roleColor : '#D1D5DB'
          }}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Results */}
          <div style={dropdownStyle}>
            {filteredUsers.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#9CA3AF',
                fontSize: '14px'
              }}>
                Aucun utilisateur trouvé
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F3F4F6',
                    transition: 'all 0.2s',
                    background: selectedUserId === user.id ? `${roleColor}10` : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${roleColor}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = selectedUserId === user.id ? `${roleColor}10` : 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: roleColor,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#111827',
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {user.first_name} {user.last_name}
                        {selectedUserId === user.id && (
                          <CheckCircle2 className="w-4 h-4" style={{ color: roleColor }} />
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '2px'
                        }}>
                          <PhoneIcon className="w-3 h-3" />
                          {user.phone}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: user.is_active ? '#D1FAE5' : '#FEE2E2',
                      color: user.is_active ? '#065F46' : '#991B1B'
                    }}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT: UserCard (Affichage READ-ONLY)
// ============================================================================

interface UserCardProps {
  user: User;
  role: 'representative' | 'dpo';
  onEdit: () => void;
  onRemove: () => void;
  roleColor: string;
}

function UserCard({ user, role, onEdit, onRemove, roleColor }: UserCardProps) {
  const roleLabel = role === 'representative' ? 'Représentant Légal' : 'DPO';

  return (
    <div style={{
      background: '#F9FAFB',
      border: `2px solid ${roleColor}20`,
      borderRadius: '12px',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Header avec actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Avatar */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: roleColor,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700
          }}>
            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
          </div>

          {/* Nom */}
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '4px'
            }}>
              {user.first_name} {user.last_name}
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              background: `${roleColor}20`,
              color: roleColor
            }}>
              <CheckCircle2 className="w-3 h-3" />
              {roleLabel} assigné
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onEdit}
            style={{
              padding: '8px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
              e.currentTarget.style.borderColor = roleColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
            title="Modifier la sélection"
          >
            <Edit2 className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>

          <button
            onClick={onRemove}
            style={{
              padding: '8px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FEE2E2';
              e.currentTarget.style.borderColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
            title="Retirer"
          >
            <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
          </button>
        </div>
      </div>

      {/* Informations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid #E5E7EB'
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            Email
          </div>
          <div style={{
            fontSize: '14px',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            {user.email}
          </div>
        </div>

        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            Téléphone
          </div>
          <div style={{
            fontSize: '14px',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <PhoneIcon className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            {user.phone || 'Non renseigné'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL: EditOrganismModal
// ============================================================================

export default function EditOrganismModal({
  isOpen,
  onClose,
  onSave,
  organism,
  availableRepresentatives,
  availableDPOs,
  poles = [],
  categories = []
}: EditOrganismModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<OrganismFormData>(organism);
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'legal' | 'dpo'>('general');
  const [editingRepresentative, setEditingRepresentative] = useState(false);
  const [editingDPO, setEditingDPO] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(organism);
      setActiveTab('general');
      setEditingRepresentative(false);
      setEditingDPO(false);
    }
  }, [isOpen, organism]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof OrganismFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRemoveRepresentative = () => {
    if (confirm('Êtes-vous sûr de vouloir retirer le représentant légal ?')) {
      handleChange('legal_representative_contact_id', null);
      setEditingRepresentative(false);
    }
  };

  const handleRemoveDPO = () => {
    if (confirm('Êtes-vous sûr de vouloir retirer le DPO ?')) {
      handleChange('dpo_contact_id', null);
      setEditingDPO(false);
    }
  };

  const typeColor = formData.stakeholder_type === 'internal' ? '#3B82F6' : '#10B981';
  const representativeColor = '#3B82F6';
  const dpoColor = '#8B5CF6';

  // Aplatir les hiérarchies pour affichage avec chemin complet
  const flatPoles = flattenHierarchyWithPath(poles);
  const flatCategories = flattenHierarchyWithPath(categories);

  const tabs = [
    { id: 'general' as const, label: 'Informations générales', icon: Building2 },
    { id: 'contact' as const, label: 'Contact & Adresse', icon: MapPin },
    { id: 'legal' as const, label: 'Représentant légal', icon: User },
    { id: 'dpo' as const, label: 'DPO', icon: Shield }
  ];

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
        animation: 'fadeIn 0.2s ease-out',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}dd 100%)`,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 className="w-6 h-6" style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}>
                Modifier l'organisme
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '4px 0 0 0'
              }}>
                {formData.name}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X className="w-5 h-5" style={{ color: '#FFFFFF' }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E5E7EB',
          background: '#F9FAFB',
          padding: '0 24px',
          overflowX: 'auto'
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const hasData = tab.id === 'legal' 
              ? !!formData.legal_representative_contact_id
              : tab.id === 'dpo'
              ? !!formData.dpo_contact_id
              : false;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '16px 20px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: activeTab === tab.id ? `3px solid ${typeColor}` : '3px solid transparent',
                  color: activeTab === tab.id ? typeColor : '#6B7280',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  marginBottom: '-1px',
                  position: 'relative',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {hasData && (
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10B981',
                    position: 'absolute',
                    top: '12px',
                    right: '12px'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '24px'
        }}>
          {/* Tab: Informations générales */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Type, Statut, Pôle/Catégorie */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Type d'organisme *</label>
                  <select
                    value={formData.stakeholder_type}
                    onChange={(e) => handleChange('stakeholder_type', e.target.value as 'internal' | 'external')}
                    style={inputStyle}
                    required
                  >
                    <option value="internal">Interne</option>
                    <option value="external">Externe</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Statut *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="pending">En attente</option>
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>

                {formData.stakeholder_type === 'internal' ? (
                  <div>
                    <label style={labelStyle}>Pôle *</label>
                    <select
                      value={formData.pole_id || ''}
                      onChange={(e) => {
                        handleChange('pole_id', e.target.value || null);
                        handleChange('category_id', null);
                      }}
                      style={inputStyle}
                      required
                    >
                      <option value="">Sélectionner un pôle</option>
                      {flatPoles.map(pole => (
                        <option key={pole.id} value={pole.id}>
                          {'  '.repeat(pole.level)}{pole.fullPath}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Catégorie *</label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => {
                        handleChange('category_id', e.target.value || null);
                        handleChange('pole_id', null);
                      }}
                      style={inputStyle}
                      required
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {flatCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {'  '.repeat(cat.level)}{cat.fullPath}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Noms */}
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  <Building2 className="w-5 h-5" />
                  Identification
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Nom de l'organisme *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Nom légal</label>
                    <input
                      type="text"
                      value={formData.legal_name || ''}
                      onChange={(e) => handleChange('legal_name', e.target.value || null)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Nom commercial</label>
                    <input
                      type="text"
                      value={formData.trade_name || ''}
                      onChange={(e) => handleChange('trade_name', e.target.value || null)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Nom court</label>
                    <input
                      type="text"
                      value={formData.short_name || ''}
                      onChange={(e) => handleChange('short_name', e.target.value || null)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* SIRET/SIREN */}
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  <Briefcase className="w-5 h-5" />
                  Informations légales
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>SIRET</label>
                    <input
                      type="text"
                      value={formData.siret || ''}
                      onChange={(e) => handleChange('siret', e.target.value || null)}
                      style={inputStyle}
                      maxLength={14}
                      placeholder="12345678901234"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>SIREN</label>
                    <input
                      type="text"
                      value={formData.siren || ''}
                      onChange={(e) => handleChange('siren', e.target.value || null)}
                      style={inputStyle}
                      maxLength={9}
                      placeholder="123456789"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Code APE</label>
                    <input
                      type="text"
                      value={formData.ape_code || ''}
                      onChange={(e) => handleChange('ape_code', e.target.value || null)}
                      style={inputStyle}
                      placeholder="6201Z"
                    />
                  </div>
                </div>
              </div>

              {/* Secteur et taille */}
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  Secteur d'activité & Taille
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Secteur</label>
                    <input
                      type="text"
                      value={formData.sector || ''}
                      onChange={(e) => handleChange('sector', e.target.value || null)}
                      style={inputStyle}
                      placeholder="Ex: Technologie"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Catégorie de taille</label>
                    <select
                      value={formData.size_category || ''}
                      onChange={(e) => handleChange('size_category', e.target.value || null)}
                      style={inputStyle}
                    >
                      <option value="">Non spécifié</option>
                      <option value="micro">Micro (&lt; 10)</option>
                      <option value="small">Petite (10-49)</option>
                      <option value="medium">Moyenne (50-249)</option>
                      <option value="large">Grande (≥ 250)</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Nombre d'employés</label>
                    <input
                      type="number"
                      value={formData.employee_count || ''}
                      onChange={(e) => handleChange('employee_count', e.target.value ? parseInt(e.target.value) : null)}
                      style={inputStyle}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value || null)}
                  style={{
                    ...inputStyle,
                    minHeight: '100px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Description de l'organisme..."
                />
              </div>
            </div>
          )}

          {/* Tab: Contact & Adresse */}
          {activeTab === 'contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  <MapPin className="w-5 h-5" />
                  Adresse
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Adresse ligne 1</label>
                    <input
                      type="text"
                      value={formData.address_line1 || ''}
                      onChange={(e) => handleChange('address_line1', e.target.value || null)}
                      style={inputStyle}
                      placeholder="Numéro et rue"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Adresse ligne 2</label>
                    <input
                      type="text"
                      value={formData.address_line2 || ''}
                      onChange={(e) => handleChange('address_line2', e.target.value || null)}
                      style={inputStyle}
                      placeholder="Complément d'adresse"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Adresse ligne 3</label>
                    <input
                      type="text"
                      value={formData.address_line3 || ''}
                      onChange={(e) => handleChange('address_line3', e.target.value || null)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Code postal</label>
                      <input
                        type="text"
                        value={formData.postal_code || ''}
                        onChange={(e) => handleChange('postal_code', e.target.value || null)}
                        style={inputStyle}
                        placeholder="75001"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Ville</label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value || null)}
                        style={inputStyle}
                        placeholder="Paris"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  Contact
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Email principal</label>
                    <input
                      type="email"
                      value={formData.main_email || ''}
                      onChange={(e) => handleChange('main_email', e.target.value || null)}
                      style={inputStyle}
                      placeholder="contact@example.com"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Téléphone principal</label>
                    <input
                      type="tel"
                      value={formData.main_phone || ''}
                      onChange={(e) => handleChange('main_phone', e.target.value || null)}
                      style={inputStyle}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Site web</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => handleChange('website', e.target.value || null)}
                      style={inputStyle}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Représentant légal */}
          {activeTab === 'legal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <User className="w-5 h-5" style={{ color: representativeColor }} />
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1E40AF'
                  }}>
                    Représentant Légal
                  </p>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: '#3B82F6'
                  }}>
                    Sélectionnez un utilisateur avec le rôle &quot;Représentant&quot;
                  </p>
                </div>
              </div>

              {!formData.legal_representative_contact_id || editingRepresentative ? (
                // CAS 1: Mode sélection
                <div>
                  <UserSelector
                    users={availableRepresentatives}
                    selectedUserId={formData.legal_representative_contact_id}
                    onSelect={(userId) => {
                      handleChange('legal_representative_contact_id', userId);
                      setEditingRepresentative(false);
                    }}
                    placeholder="Rechercher un représentant par nom ou email..."
                    label="Sélectionner un représentant"
                    roleColor={representativeColor}
                  />

                  {editingRepresentative && (
                    <button
                      type="button"
                      onClick={() => setEditingRepresentative(false)}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        color: '#6B7280',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Annuler
                    </button>
                  )}

                  {availableRepresentatives.length === 0 && (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#991B1B'
                    }}>
                      ⚠️ Aucun utilisateur avec le rôle &quot;Représentant&quot; n'est disponible.
                    </div>
                  )}
                </div>
              ) : (
                // CAS 2: Affichage READ-ONLY
                organism.legal_representative && (
                  <UserCard
                    user={organism.legal_representative}
                    role="representative"
                    onEdit={() => setEditingRepresentative(true)}
                    onRemove={handleRemoveRepresentative}
                    roleColor={representativeColor}
                  />
                )
              )}
            </div>
          )}

          {/* Tab: DPO */}
          {activeTab === 'dpo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: '#F5F3FF',
                border: '1px solid #DDD6FE',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Shield className="w-5 h-5" style={{ color: dpoColor }} />
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#5B21B6'
                  }}>
                    Délégué à la Protection des Données
                  </p>
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: '#7C3AED'
                  }}>
                    Sélectionnez un utilisateur avec le rôle &quot;DPO&quot;
                  </p>
                </div>
              </div>

              {!formData.dpo_contact_id || editingDPO ? (
                // CAS 1: Mode sélection
                <div>
                  <UserSelector
                    users={availableDPOs}
                    selectedUserId={formData.dpo_contact_id}
                    onSelect={(userId) => {
                      handleChange('dpo_contact_id', userId);
                      setEditingDPO(false);
                    }}
                    placeholder="Rechercher un DPO par nom ou email..."
                    label="Sélectionner un DPO"
                    roleColor={dpoColor}
                  />

                  {editingDPO && (
                    <button
                      type="button"
                      onClick={() => setEditingDPO(false)}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        color: '#6B7280',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Annuler
                    </button>
                  )}

                  {availableDPOs.length === 0 && (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#991B1B'
                    }}>
                      ⚠️ Aucun utilisateur avec le rôle &quot;DPO&quot; n'est disponible.
                    </div>
                  )}
                </div>
              ) : (
                // CAS 2: Affichage READ-ONLY
                organism.dpo && (
                  <UserCard
                    user={organism.dpo}
                    role="dpo"
                    onEdit={() => setEditingDPO(true)}
                    onRemove={handleRemoveDPO}
                    roleColor={dpoColor}
                  />
                )
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            type="button"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1
            }}
          >
            Annuler
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            type="submit"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}dd 100%)`,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: `0 4px 12px ${typeColor}40`,
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
              </>
            )}
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
      `}</style>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: '8px',
  fontSize: '14px',
  transition: 'all 0.2s',
  fontFamily: 'inherit'
};

const sectionStyle: React.CSSProperties = {
  background: '#F9FAFB',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #E5E7EB'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#111827',
  marginTop: 0,
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};