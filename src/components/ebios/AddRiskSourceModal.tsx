'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface RiskSourceObjective {
  id?: string;
  label: string;
  description: string;
}

interface AddRiskSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: RiskSourceFormData) => Promise<void>;
  projectId: string;
  existingSourcesCount: number;
}

export interface RiskSourceFormData {
  reference: string;
  label: string;
  description: string;
  justification: string;
  relevance: number;
  objectives: RiskSourceObjective[];
  is_selected: boolean;
}

// Objectifs suggérés par défaut
const SUGGESTED_OBJECTIVES = [
  { label: 'Gain financier', description: 'Rançon, vol de données monnayables' },
  { label: 'Revente de données', description: 'Commercialisation d\'accès ou de données volées' },
  { label: 'Espionnage industriel', description: 'Vol de secrets commerciaux, propriété intellectuelle' },
  { label: 'Espionnage étatique', description: 'Collecte de renseignements stratégiques' },
  { label: 'Déstabilisation', description: 'Atteinte à l\'image, perturbation des activités' },
  { label: 'Sabotage', description: 'Destruction ou altération de systèmes critiques' },
  { label: 'Hacktivisme', description: 'Actions idéologiques ou politiques' },
  { label: 'Vengeance', description: 'Représailles d\'anciens employés ou partenaires' },
];

const RELEVANCE_OPTIONS = [
  { value: 1, label: 'Faible', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 2, label: 'Modéré', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 3, label: 'Élevé', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 4, label: 'Très élevé', color: 'bg-red-100 text-red-800 border-red-200' },
];

export default function AddRiskSourceModal({
  isOpen,
  onClose,
  onSave,
  projectId,
  existingSourcesCount
}: AddRiskSourceModalProps) {
  // Form state
  const [reference, setReference] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [relevance, setRelevance] = useState(3);
  const [objectives, setObjectives] = useState<RiskSourceObjective[]>([]);
  const [isSelected, setIsSelected] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showObjectiveSuggestions, setShowObjectiveSuggestions] = useState(false);
  const [customObjectiveLabel, setCustomObjectiveLabel] = useState('');
  const [customObjectiveDescription, setCustomObjectiveDescription] = useState('');
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [showAiHelper, setShowAiHelper] = useState(false);

  // Generate reference automatically
  useEffect(() => {
    if (isOpen) {
      const nextNumber = existingSourcesCount + 1;
      setReference(`SR${String(nextNumber).padStart(2, '0')}`);
    }
  }, [isOpen, existingSourcesCount]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel('');
      setDescription('');
      setJustification('');
      setRelevance(3);
      setObjectives([]);
      setIsSelected(true);
      setErrors({});
      setShowAiHelper(false);
      setAiContext('');
    }
  }, [isOpen]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!reference.trim()) {
      newErrors.reference = 'La référence est obligatoire';
    }

    if (!label.trim()) {
      newErrors.label = 'Le titre est obligatoire';
    } else if (label.length > 200) {
      newErrors.label = 'Le titre ne peut pas dépasser 200 caractères';
    }

    if (!justification.trim()) {
      newErrors.justification = 'La justification est obligatoire';
    }

    if (objectives.length === 0) {
      newErrors.objectives = 'Ajoutez au moins un objectif visé';
    } else if (objectives.length > 5) {
      newErrors.objectives = 'Maximum 5 objectifs visés';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        reference,
        label,
        description,
        justification,
        relevance,
        objectives,
        is_selected: isSelected
      });
      onClose();
    } catch (error) {
      console.error('Error saving risk source:', error);
      setErrors({ submit: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  // Add objective from suggestions
  const addSuggestedObjective = (objective: { label: string; description: string }) => {
    if (objectives.length >= 5) return;
    if (objectives.some(o => o.label === objective.label)) return;

    setObjectives([...objectives, { ...objective }]);
    setShowObjectiveSuggestions(false);
  };

  // Add custom objective
  const addCustomObjective = () => {
    if (!customObjectiveLabel.trim()) return;
    if (objectives.length >= 5) return;

    setObjectives([
      ...objectives,
      { label: customObjectiveLabel, description: customObjectiveDescription }
    ]);
    setCustomObjectiveLabel('');
    setCustomObjectiveDescription('');
  };

  // Remove objective
  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  // Generate with AI - Appel au vrai endpoint
  const handleGenerateWithAI = async () => {
    if (!aiContext.trim()) return;

    setGeneratingWithAI(true);
    setErrors({});

    try {
      const response = await fetchWithAuth(`${API_BASE}/api/v1/risk/ai/suggest-risk-source`, {
        method: 'POST',
        body: JSON.stringify({
          context: aiContext,
          project_context: null  // Pourrait être enrichi avec le contexte du projet
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.detail || 'Erreur lors de la génération');
      }

      const suggestion = data.suggestion;

      // Remplir le formulaire avec les suggestions de l'IA
      setLabel(suggestion.label || '');
      setDescription(suggestion.description || '');
      setJustification(suggestion.justification || '');
      setRelevance(suggestion.relevance || 3);

      // Convertir les objectifs
      if (suggestion.objectives && Array.isArray(suggestion.objectives)) {
        setObjectives(
          suggestion.objectives.map((obj: { label: string; description?: string }) => ({
            label: obj.label,
            description: obj.description || ''
          }))
        );
      }

      setShowAiHelper(false);
      setAiContext('');

    } catch (error) {
      console.error('Error generating with AI:', error);
      setErrors({
        ai: error instanceof Error ? error.message : 'Erreur lors de la génération IA'
      });
    } finally {
      setGeneratingWithAI(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Ajouter une source de risque
                </h2>
                <p className="text-sm text-gray-500">
                  Définissez manuellement une nouvelle source de risque
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* AI Helper Toggle */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">
                    Besoin d&apos;aide ? L&apos;IA peut pré-remplir le formulaire
                  </span>
                </div>
                <button
                  onClick={() => setShowAiHelper(!showAiHelper)}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {showAiHelper ? 'Masquer' : 'Proposer avec IA'}
                </button>
              </div>

              {showAiHelper && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-red-900 mb-1">
                      Décrivez brièvement la menace
                    </label>
                    <input
                      type="text"
                      value={aiContext}
                      onChange={(e) => setAiContext(e.target.value)}
                      placeholder="Ex: employé mécontent, cybercriminels, prestataire négligent, attaque par phishing..."
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="mt-1 text-xs text-red-600">
                      L&apos;IA générera un titre, une description, une justification et des objectifs adaptés
                    </p>
                  </div>
                  {errors.ai && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{errors.ai}</p>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateWithAI}
                    disabled={!aiContext.trim() || generatingWithAI}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {generatingWithAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer les suggestions
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Référence <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="SR01"
                className={`w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.reference ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.reference && (
                <p className="mt-1 text-sm text-red-500">{errors.reference}</p>
              )}
            </div>

            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre de la source <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Cybercriminels opportunistes"
                maxLength={200}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.label ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.label ? (
                  <p className="text-sm text-red-500">{errors.label}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-400">{label.length}/200</span>
              </div>
            </div>

            {/* Description (optionnel) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description courte <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Attaquants motivés par le gain financier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Justification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Expliquez pourquoi cette source de risque est pertinente pour votre organisation..."
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none ${
                  errors.justification ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.justification && (
                <p className="mt-1 text-sm text-red-500">{errors.justification}</p>
              )}
            </div>

            {/* Pertinence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau de pertinence <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {RELEVANCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRelevance(option.value)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      relevance === option.value
                        ? `${option.color} ring-2 ring-offset-1 ${
                            option.value === 1 ? 'ring-green-400' :
                            option.value === 2 ? 'ring-yellow-400' :
                            option.value === 3 ? 'ring-orange-400' : 'ring-red-400'
                          }`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Objectifs visés */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Objectifs visés <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">
                    ({objectives.length}/5)
                  </span>
                </label>
                {objectives.length < 5 && (
                  <button
                    onClick={() => setShowObjectiveSuggestions(!showObjectiveSuggestions)}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un objectif
                  </button>
                )}
              </div>

              {errors.objectives && (
                <div className="mb-2 flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {errors.objectives}
                </div>
              )}

              {/* Liste des objectifs sélectionnés */}
              {objectives.length > 0 && (
                <div className="space-y-2 mb-3">
                  {objectives.map((obj, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{obj.label}</p>
                        {obj.description && (
                          <p className="text-sm text-gray-500">{obj.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeObjective(index)}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Panel de suggestions */}
              {showObjectiveSuggestions && objectives.length < 5 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Objectifs suggérés
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {SUGGESTED_OBJECTIVES.filter(
                      s => !objectives.some(o => o.label === s.label)
                    ).map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => addSuggestedObjective(suggestion)}
                        className="text-left p-2 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {suggestion.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {suggestion.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Objectif personnalisé */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Ou ajouter un objectif personnalisé
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={customObjectiveLabel}
                          onChange={(e) => setCustomObjectiveLabel(e.target.value)}
                          placeholder="Libellé"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={customObjectiveDescription}
                          onChange={(e) => setCustomObjectiveDescription(e.target.value)}
                          placeholder="Description (optionnel)"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <button
                        onClick={addCustomObjective}
                        disabled={!customObjectiveLabel.trim()}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Retenue par défaut */}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <input
                type="checkbox"
                id="isSelected"
                checked={isSelected}
                onChange={(e) => setIsSelected(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="isSelected" className="text-sm text-green-800">
                Marquer cette source comme <strong>retenue</strong> pour l&apos;analyse
              </label>
            </div>

            {/* Erreur générale */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter la source
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
