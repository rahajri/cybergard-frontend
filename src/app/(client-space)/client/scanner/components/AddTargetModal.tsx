'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Server,
  Mail,
  AlertCircle,
  Info,
  Building2,
  Search
} from 'lucide-react';

interface EcosystemEntity {
  id: string;
  name: string;
  short_name?: string;
  stakeholder_type: string;
}

interface AddTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: string;
    value: string;
    label?: string;
    description?: string;
    scan_frequency: string;
    entity_id?: string;
  }) => Promise<void>;
}

const TARGET_TYPES = [
  { value: 'DOMAIN', label: 'Domaine', icon: Globe, example: 'example.com', description: 'Nom de domaine principal' },
  { value: 'SUBDOMAIN', label: 'Sous-domaine', icon: Globe, example: 'api.example.com', description: 'Sous-domaine spécifique' },
  { value: 'IP', label: 'Adresse IP', icon: Server, example: '192.168.1.1', description: 'Adresse IP unique' },
  { value: 'IP_RANGE', label: 'Plage IP', icon: Server, example: '192.168.1.0/24', description: 'Plage d\'adresses IP (CIDR)' },
  { value: 'EMAIL_DOMAIN', label: 'Domaine Email', icon: Mail, example: '@example.com', description: 'Domaine pour recherche OSINT emails' }
];

const SCAN_FREQUENCIES = [
  { value: 'MANUAL', label: 'Manuel', description: 'Scan uniquement sur demande' },
  { value: 'DAILY', label: 'Quotidien', description: 'Scan automatique chaque jour' },
  { value: 'WEEKLY', label: 'Hebdomadaire', description: 'Scan automatique chaque semaine' },
  { value: 'MONTHLY', label: 'Mensuel', description: 'Scan automatique chaque mois' }
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AddTargetModal({ isOpen, onClose, onSubmit }: AddTargetModalProps) {
  const [type, setType] = useState('DOMAIN');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [scanFrequency, setScanFrequency] = useState('MANUAL');
  const [entityId, setEntityId] = useState<string>('');
  const [entities, setEntities] = useState<EcosystemEntity[]>([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = TARGET_TYPES.find(t => t.value === type);

  // Charger les entités de l'écosystème
  useEffect(() => {
    if (isOpen) {
      loadEntities();
    }
  }, [isOpen]);

  const loadEntities = async () => {
    setLoadingEntities(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ecosystem/entities?limit=100&is_active=true`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setEntities(data.items || []);
      }
    } catch (err) {
      console.error('Error loading entities:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const filteredEntities = entities.filter(e =>
    e.name.toLowerCase().includes(entitySearch.toLowerCase()) ||
    (e.short_name && e.short_name.toLowerCase().includes(entitySearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!value.trim()) {
      setError('La valeur de la cible est requise');
      return;
    }

    // Validation basique selon le type
    if (type === 'DOMAIN' || type === 'SUBDOMAIN') {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(value.trim())) {
        setError('Format de domaine invalide. Exemple: example.com ou api.example.com');
        return;
      }
    }

    if (type === 'IP') {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(value.trim())) {
        setError('Format d\'adresse IP invalide. Exemple: 192.168.1.1');
        return;
      }
    }

    if (type === 'IP_RANGE') {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(value.trim())) {
        setError('Format CIDR invalide. Exemple: 192.168.1.0/24');
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({
        type,
        value: value.trim().toLowerCase(),
        label: label.trim() || undefined,
        description: description.trim() || undefined,
        scan_frequency: scanFrequency,
        entity_id: entityId || undefined
      });

      // Reset form
      setType('DOMAIN');
      setValue('');
      setLabel('');
      setDescription('');
      setScanFrequency('MANUAL');
      setEntityId('');
      setEntitySearch('');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Ajouter une cible
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Configurez une nouvelle cible à scanner
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de cible
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TARGET_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        type === t.value
                          ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <Icon className={`w-4 h-4 mr-2 ${type === t.value ? 'text-cyan-600' : 'text-gray-500'}`} />
                        <span className={`font-medium ${type === t.value ? 'text-cyan-700' : 'text-gray-700'}`}>
                          {t.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Value Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valeur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={selectedType?.example || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Exemple: {selectedType?.example}
              </p>
            </div>

            {/* Label (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Libellé <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Production, Staging, API principale..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-gray-400">(optionnel)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes ou informations complémentaires..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Entity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Organisme associé <span className="text-gray-400">(optionnel)</span>
              </label>
              <div className="space-y-2">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un organisme..."
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
                {/* Entity select */}
                <select
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                  disabled={loadingEntities}
                >
                  <option value="">-- Aucun organisme --</option>
                  {filteredEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} {entity.short_name ? `(${entity.short_name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Associer cette cible à un organisme permet de regrouper les vulnérabilités par entité dans la vue Écosystème.
                </p>
              </div>
            </div>

            {/* Scan Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fréquence de scan
              </label>
              <select
                value={scanFrequency}
                onChange={(e) => setScanFrequency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
              >
                {SCAN_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label} - {freq.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
              <Info className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">À propos du scan</p>
                <p>Le scan analysera les ports ouverts, les services exposés, les certificats TLS et recherchera les vulnérabilités connues (CVE).</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Création...
                  </>
                ) : (
                  'Ajouter la cible'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
