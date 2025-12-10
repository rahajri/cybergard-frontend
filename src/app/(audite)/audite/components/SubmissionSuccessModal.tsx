'use client';

import { CheckCircle, Mail, ArrowRight, X } from 'lucide-react';

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  campaignName: string;
}

export function SubmissionSuccessModal({
  isOpen,
  onClose,
  onConfirm,
  campaignName,
}: SubmissionSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header avec icone de succes */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Campagne soumise avec succes
          </h2>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 text-center leading-relaxed">
            Merci d'avoir complete et soumis votre campagne d'audit{' '}
            <strong className="text-gray-900">"{campaignName}"</strong>.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-blue-800 text-sm leading-relaxed">
              Votre evaluation a bien ete transmise a l'equipe d'audit.
              Un auditeur va desormais analyser vos reponses et prendre le relais
              pour la phase de verification.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-indigo-600 text-xs font-bold">1</span>
              </div>
              <p className="text-gray-600 text-sm">
                Il pourra revenir vers vous si des precisions ou complements sont necessaires.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-3 h-3 text-indigo-600" />
              </div>
              <p className="text-gray-600 text-sm">
                Vous serez notifie par e-mail en cas de demande ou de validation finale.
              </p>
            </div>
          </div>
        </div>

        {/* Footer avec bouton */}
        <div className="p-6 bg-gray-50 border-t">
          <button
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            Compris, retourner a l'accueil
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
