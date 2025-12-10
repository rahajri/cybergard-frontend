'use client';

import { Save, Send } from 'lucide-react';

interface ActionButtonsProps {
  canSubmit: boolean;
  onSave: () => void;
  onSubmit: () => void;
  saving: boolean;
  submitting: boolean;
  userRole?: 'audite_resp' | 'audite_contrib';
}

export function ActionButtons({
  canSubmit,
  onSave,
  onSubmit,
  saving,
  submitting,
  userRole,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-600">
        {canSubmit ? (
          <span className="text-green-600 font-medium">
            ✓ Toutes les questions obligatoires sont remplies
          </span>
        ) : (
          <span className="text-amber-600 font-medium">
            ⚠ Veuillez répondre à toutes les questions obligatoires
          </span>
        )}
      </p>

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="
            px-6 py-2 rounded-md
            bg-gray-600 text-white text-sm font-medium
            hover:bg-gray-700
            disabled:bg-gray-400 disabled:cursor-not-allowed
            transition-colors
            flex items-center gap-2
          "
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>

        {/* Le bouton Soumettre n'est visible que pour AUDITE_RESP */}
        {userRole === 'audite_resp' && (
          <button
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            className="
              px-6 py-2 rounded-md
              bg-indigo-600 text-white text-sm font-medium
              hover:bg-indigo-700
              disabled:bg-gray-400 disabled:cursor-not-allowed
              transition-colors
              flex items-center gap-2
            "
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Soumission...' : 'Soumettre l\'audit'}
          </button>
        )}
      </div>
    </div>
  );
}
