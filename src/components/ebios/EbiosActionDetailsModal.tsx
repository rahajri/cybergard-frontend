'use client';

import { X, Target, AlertCircle, Calendar, User, CheckCircle, FileText, Shield, Building2, Users, Clock, TrendingDown, Bookmark, Zap } from 'lucide-react';

interface EbiosActionItem {
  id: number;
  code_action: string;
  titre: string;
  description: string;
  categorie: string;
  priorite: 'P1' | 'P2' | 'P3';
  objectif: string;
  justification: string;
  effort: string;
  cout_estime: string;
  sources_couvertes: string[];
  biens_supports: string[];
  scenarios_couverts: string[];
  risque_initial: number | null;
  risque_cible: number | null;
  responsable_suggere: string;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  delai_recommande: string;
  due_date?: string;
  statut: 'pending' | 'in_progress' | 'completed' | 'blocked';
  references_normatives: string[];
  source: 'AI' | 'MANUAL';
}

interface EbiosActionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: EbiosActionItem;
}

export function EbiosActionDetailsModal({ isOpen, onClose, action }: EbiosActionDetailsModalProps) {
  if (!isOpen || !action) return null;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'P1':
        return { label: 'Critique', className: 'bg-red-100 text-red-700 border-red-300', dotColor: 'bg-red-500' };
      case 'P2':
        return { label: 'Important', className: 'bg-orange-100 text-orange-700 border-orange-300', dotColor: 'bg-orange-500' };
      case 'P3':
      default:
        return { label: 'Normal', className: 'bg-blue-100 text-blue-700 border-blue-300', dotColor: 'bg-blue-500' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', className: 'bg-gray-100 text-gray-700', icon: Clock, dotColor: 'bg-gray-400' };
      case 'in_progress':
        return { label: 'En cours', className: 'bg-blue-100 text-blue-700', icon: Zap, dotColor: 'bg-blue-500' };
      case 'completed':
        return { label: 'Terminé', className: 'bg-green-100 text-green-700', icon: CheckCircle, dotColor: 'bg-green-500' };
      case 'blocked':
        return { label: 'Bloqué', className: 'bg-red-100 text-red-700', icon: AlertCircle, dotColor: 'bg-red-500' };
      default:
        return { label: 'En attente', className: 'bg-gray-100 text-gray-700', icon: Clock, dotColor: 'bg-gray-400' };
    }
  };

  const getCategoryConfig = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('préventive') || c.includes('prevention')) {
      return { label: category, className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Shield };
    }
    if (c.includes('détection') || c.includes('detection') || c.includes('détective')) {
      return { label: category, className: 'bg-purple-100 text-purple-700 border-purple-200', icon: Target };
    }
    if (c.includes('corrective')) {
      return { label: category, className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Zap };
    }
    if (c.includes('organisation') || c.includes('pilotage')) {
      return { label: category, className: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Users };
    }
    return { label: category, className: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText };
  };

  const priorityConfig = getPriorityConfig(action.priorite);
  const statusConfig = getStatusConfig(action.statut);
  const categoryConfig = getCategoryConfig(action.categorie);
  const StatusIcon = statusConfig.icon;
  const CategoryIcon = categoryConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Gradient Rouge EBIOS */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Détails de l'action EBIOS</h3>
              <p className="text-red-100 text-sm">{action.code_action}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Titre et badges */}
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <h4 className="text-xl font-semibold text-gray-900 leading-tight mb-3">
                  {action.titre}
                </h4>
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {/* Statut */}
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.className}`}>
                    <StatusIcon className="w-4 h-4 mr-1.5" />
                    {statusConfig.label}
                  </span>
                  {/* Priorité */}
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${priorityConfig.className}`}>
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${priorityConfig.dotColor}`}></span>
                    {action.priorite} - {priorityConfig.label}
                  </span>
                  {/* Catégorie */}
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${categoryConfig.className}`}>
                    <CategoryIcon className="w-4 h-4 mr-1.5" />
                    {action.categorie}
                  </span>
                  {/* Source */}
                  {action.source === 'AI' ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700 border border-purple-200">
                      <Zap className="w-4 h-4 mr-1.5" />
                      Générée par IA
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-teal-100 text-teal-700 border border-teal-200">
                      <User className="w-4 h-4 mr-1.5" />
                      Ajoutée manuellement
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Objectif */}
          {action.objectif && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-blue-600" />
                Objectif
              </h5>
              <p className="text-blue-800">{action.objectif}</p>
            </div>
          )}

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-gray-500" />
              Description
            </h5>
            <p className="text-gray-800 whitespace-pre-wrap">{action.description}</p>
          </div>

          {/* Justification */}
          {action.justification && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h5 className="text-sm font-semibold text-amber-900 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                Justification
              </h5>
              <p className="text-amber-800">{action.justification}</p>
            </div>
          )}

          {/* Risques couverts avec réduction de score */}
          {action.scenarios_couverts && action.scenarios_couverts.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h5 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
                <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
                Scénarios de risque couverts
              </h5>
              <div className="flex flex-wrap gap-2">
                {action.scenarios_couverts.map((scenario, idx) => (
                  <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-lg">
                    <span className="font-mono font-semibold text-red-700">{scenario}</span>
                    {action.risque_initial !== null && action.risque_cible !== null && (
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <span className="text-red-600 font-medium">{action.risque_initial}</span>
                        <TrendingDown className="w-3 h-3 text-green-600" />
                        <span className="text-green-600 font-medium">{action.risque_cible}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informations complémentaires - 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Responsable */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Responsable</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {action.assigned_user_name || action.responsable_suggere || 'Non assigné'}
                  </p>
                  {!action.assigned_user_id && action.responsable_suggere && (
                    <p className="text-xs text-orange-600">Suggéré par l'IA</p>
                  )}
                </div>
              </div>
            </div>

            {/* Échéance */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Échéance</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {action.due_date
                      ? new Date(action.due_date).toLocaleDateString('fr-FR')
                      : action.delai_recommande || 'Non définie'}
                  </p>
                </div>
              </div>
            </div>

            {/* Effort */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Zap className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Effort estimé</p>
                  <p className="text-lg font-semibold text-gray-900">{action.effort}</p>
                </div>
              </div>
            </div>

            {/* Coût */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Coût estimé</p>
                  <p className="text-lg font-semibold text-gray-900">{action.cout_estime || 'Non défini'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sources de risque */}
          {action.sources_couvertes && action.sources_couvertes.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h5 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                Sources de risque couvertes
              </h5>
              <div className="flex flex-wrap gap-2">
                {action.sources_couvertes.map((src, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-sm font-medium text-orange-700">
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Biens supports */}
          {action.biens_supports && action.biens_supports.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-blue-500" />
                Biens supports protégés
              </h5>
              <div className="flex flex-wrap gap-2">
                {action.biens_supports.map((bs, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700">
                    {bs}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Références normatives */}
          {action.references_normatives && action.references_normatives.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Bookmark className="w-4 h-4 mr-2 text-gray-500" />
                Références normatives
              </h5>
              <div className="flex flex-wrap gap-2">
                {action.references_normatives.map((ref, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
