'use client';

import { CheckCircle, LogOut } from 'lucide-react';

interface AuditSubmittedMessageProps {
  campaignName: string;
  onReturnToLogin: () => void;
}

/**
 * Composant affiché lorsque l'utilisateur revient sur un audit déjà soumis
 * via un Magic Link
 */
export function AuditSubmittedMessage({
  campaignName,
  onReturnToLogin
}: AuditSubmittedMessageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg mx-auto text-center">
        {/* Icône de succès */}
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Audit déjà soumis
        </h1>

        {/* Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-lg font-medium mb-2">
            Merci pour votre participation !
          </p>
          <p className="text-green-700">
            Vos réponses pour la campagne <strong>&quot;{campaignName}&quot;</strong> ont été
            soumises avec succès et sont en cours d'analyse par l'équipe d'audit.
          </p>
        </div>

        {/* Information supplémentaire */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Prochaines étapes
          </h3>
          <ul className="text-sm text-gray-600 text-left space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Vos réponses seront analysées par l'équipe d'audit interne</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Vous recevrez un email si des clarifications sont nécessaires</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Un rapport de conformité sera généré après la validation</span>
            </li>
          </ul>
        </div>

        {/* Bouton de déconnexion */}
        <button
          onClick={onReturnToLogin}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>

        {/* Note */}
        <p className="mt-6 text-xs text-gray-500">
          Vous pouvez fermer cette page en toute sécurité.
        </p>
      </div>
    </div>
  );
}
