'use client';

import { X, Target, AlertCircle, Calendar, User, CheckCircle, FileText, Shield, HelpCircle, Building2, Users, Bug, ExternalLink } from 'lucide-react';
import { RichTextDisplay } from './RichTextDisplay';

interface ControlPoint {
  id: string;
  control_id: string;
  title: string;
  referential_name?: string;
  referential_code?: string;
}

interface SourceQuestion {
  id: string;
  question_text: string;
  question_code?: string;
  domain_name?: string;
}

interface ActionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: {
    id: string;
    code_action?: string;  // Référence unique (ACT_CAMP_001_001 ou ACT_001)
    title: string;
    description: string;
    objective?: string;
    deliverables?: string;
    severity: 'critical' | 'major' | 'minor' | 'info';
    priority: 'P1' | 'P2' | 'P3';
    recommended_due_days: number;
    suggested_role: string;
    control_points?: ControlPoint[];
    source_question_ids?: string[];
    source_question?: SourceQuestion;
    ai_justifications?: {
      why_action?: string;
      why_severity?: string;
      why_priority?: string;
      why_role?: string;
      why_due_days?: string;
    };
    // Entité associée
    entity_id?: string;
    entity_name?: string;
    // Personne assignée
    assigned_user_id?: string | null;
    assigned_user_name?: string | null;
    // CVE et informations de vulnérabilité (pour actions issues de scans)
    cve_ids?: string[] | null;
    cvss_score?: number | null;
    cve_source_url?: string | null;
  };
}

export function ActionDetailsModal({ isOpen, onClose, action }: ActionDetailsModalProps) {
  if (!isOpen) return null;

  const getSeverityConfig = (severity: string) => {
    const configs = {
      critical: {
        label: 'Critique',
        className: 'bg-red-100 text-red-700 border-red-300',
        icon: AlertCircle,
        iconColor: 'text-red-600'
      },
      major: {
        label: 'Majeure',
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        icon: AlertCircle,
        iconColor: 'text-orange-600'
      },
      minor: {
        label: 'Mineure',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: AlertCircle,
        iconColor: 'text-yellow-600'
      },
      info: {
        label: 'Info',
        className: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: AlertCircle,
        iconColor: 'text-blue-600'
      },
    };
    return configs[severity as keyof typeof configs] || configs.info;
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      P1: { label: 'P1 - Haute', className: 'bg-red-100 text-red-700 border-red-300' },
      P2: { label: 'P2 - Moyenne', className: 'bg-orange-100 text-orange-700 border-orange-300' },
      P3: { label: 'P3 - Basse', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    };
    return configs[priority as keyof typeof configs] || configs.P2;
  };

  const severityConfig = getSeverityConfig(action.severity);
  const priorityConfig = getPriorityConfig(action.priority);
  const SeverityIcon = severityConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 flex items-center justify-between border-b border-orange-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Détails de l'action</h3>
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
          {/* Titre de l'action avec référence */}
          <div>
            <div className="flex items-start space-x-3">
              <SeverityIcon className={`w-6 h-6 mt-1 ${severityConfig.iconColor} flex-shrink-0`} />
              <div className="flex-1">
                {/* Badge référence */}
                {action.code_action && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-mono font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                      Référence : {action.code_action}
                    </span>
                  </div>
                )}
                <h4 className="text-xl font-semibold text-gray-900 leading-tight">
                  {action.title}
                </h4>
              </div>
            </div>
          </div>

          {/* Badges : Sévérité et Priorité */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Sévérité :</span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${severityConfig.className}`}>
                <SeverityIcon className="w-4 h-4 mr-1.5" />
                {severityConfig.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Priorité :</span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${priorityConfig.className}`}>
                {priorityConfig.label}
              </span>
            </div>
          </div>

          {/* Description principale */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-gray-500" />
              Description
            </h5>
            <RichTextDisplay content={action.description} className="text-gray-800" />
          </div>

          {/* Objectif */}
          {action.objective && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2 text-blue-600" />
                Objectif
              </h5>
              <RichTextDisplay content={action.objective} className="text-blue-800" />
            </div>
          )}

          {/* Livrables attendus */}
          {action.deliverables && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h5 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                Livrables attendus
              </h5>
              <RichTextDisplay content={action.deliverables} className="text-green-800" />
            </div>
          )}

          {/* Section CVE - Informations de vulnérabilité (pour actions issues de scans) */}
          {action.cve_ids && action.cve_ids.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h5 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
                <Bug className="w-4 h-4 mr-2 text-red-600" />
                Vulnérabilité(s) CVE
              </h5>
              <div className="space-y-3">
                {/* Liste des CVE */}
                <div className="flex flex-wrap gap-2">
                  {action.cve_ids.map((cve, index) => (
                    <a
                      key={index}
                      href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-mono font-semibold bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 hover:border-red-400 transition-colors"
                    >
                      {cve}
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </a>
                  ))}
                </div>

                {/* Score CVSS */}
                {action.cvss_score !== null && action.cvss_score !== undefined && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-red-700 font-medium">Score CVSS :</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold ${
                      action.cvss_score >= 9.0 ? 'bg-red-600 text-white' :
                      action.cvss_score >= 7.0 ? 'bg-orange-500 text-white' :
                      action.cvss_score >= 4.0 ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {action.cvss_score.toFixed(1)}
                      <span className="ml-1 text-xs font-normal opacity-90">
                        {action.cvss_score >= 9.0 ? '(Critique)' :
                         action.cvss_score >= 7.0 ? '(Élevé)' :
                         action.cvss_score >= 4.0 ? '(Moyen)' :
                         '(Faible)'}
                      </span>
                    </span>
                  </div>
                )}

                {/* Lien vers la source */}
                {action.cve_source_url && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <a
                      href={action.cve_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      Voir les détails sur NVD (National Vulnerability Database)
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informations complémentaires */}
          <div className="space-y-4">
            {/* Ligne 1: Délai et Rôle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Délai recommandé */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Délai recommandé</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {action.recommended_due_days} jours
                    </p>
                  </div>
                </div>
              </div>

              {/* Rôle suggéré */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Rôle suggéré</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {action.suggested_role}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ligne 2: Organisme et Assigné à */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Organisme (Entité) */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Organisme</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {action.entity_name || 'Non défini'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assigné à */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Assigné à</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {action.assigned_user_name || 'Non assigné'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question source et Contrôles référentiels */}
          {(action.source_question || (action.control_points && action.control_points.length > 0)) && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h5 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-orange-500" />
                Point(s) de contrôle associé(s)
              </h5>

              {/* Question source */}
              {action.source_question && (
                <div className="bg-white rounded-lg p-3 border border-orange-200 mb-3">
                  <div className="flex items-start space-x-2">
                    <HelpCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {action.source_question.question_code && (
                          <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                            {action.source_question.question_code}
                          </span>
                        )}
                        {action.source_question.domain_name && (
                          <span className="text-xs text-orange-500 font-medium">
                            {action.source_question.domain_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">
                        {action.source_question.question_text}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Control points */}
              {action.control_points && action.control_points.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-orange-700 mb-2">
                    {action.control_points.length} contrôle(s) référentiel(s) :
                  </p>
                  {action.control_points.map((cp) => (
                    <div
                      key={cp.id}
                      className="bg-white rounded-lg p-3 border border-orange-200 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-orange-500 text-white flex-shrink-0">
                          {cp.referential_code || 'N/A'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-orange-900 text-sm">
                            {cp.control_id}
                          </div>
                          <div className="text-orange-700 text-xs mt-0.5 leading-relaxed">
                            {cp.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Justifications IA (optionnel, peut être masqué par défaut) */}
          {action.ai_justifications && (
            <details className="bg-gray-50 rounded-lg border border-gray-200">
              <summary className="px-4 py-3 cursor-pointer font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                📊 Justifications de l'IA
              </summary>
              <div className="px-4 py-3 space-y-3 border-t border-gray-200">
                {action.ai_justifications.why_action && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Pourquoi cette action ?</p>
                    <p className="text-sm text-gray-700">{action.ai_justifications.why_action}</p>
                  </div>
                )}
                {action.ai_justifications.why_severity && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Pourquoi cette sévérité ?</p>
                    <p className="text-sm text-gray-700">{action.ai_justifications.why_severity}</p>
                  </div>
                )}
                {action.ai_justifications.why_priority && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Pourquoi cette priorité ?</p>
                    <p className="text-sm text-gray-700">{action.ai_justifications.why_priority}</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
