// ViewModal.tsx pour Questionnaires - Version UX moderne et élégante

"use client";

import React, { useEffect, useState } from "react";
import { X, FileText, CheckCircle, AlertCircle, Clock, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { authenticatedFetch } from "@/lib/api";

export interface Question {
  id?: string;
  question_text?: string;
  response_type?: string;
  is_required?: boolean;
  help_text?: string;
  criticality_level?: string;
  options?: string[];
  domain?: string;
  category?: string;
  [key: string]: unknown;
}

export interface Questionnaire {
  id: string;
  name?: string;
  questions_count?: number;
  status?: string;
  created_at?: string;
  source_type?: string;
  ai_generated?: boolean;
  has_embeddings?: boolean;
  questions?: Question[];
  [key: string]: unknown;
}

interface ViewModalProps {
  questionnaire: Questionnaire | null;
  onClose: () => void;
  apiBaseUrl?: string; // URL de base pour le fetch (défaut: /api/v1/questionnaires)
}

const ViewModal: React.FC<ViewModalProps> = ({ questionnaire, onClose, apiBaseUrl = '/api/v1/questionnaires' }) => {
  const [loading, setLoading] = useState(false);
  const [detailedQuestionnaire, setDetailedQuestionnaire] = useState<Questionnaire | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Charger les détails avec authentification
  useEffect(() => {
    if (!questionnaire?.id) {
      setDetailedQuestionnaire(null);
      return;
    }

    setLoading(true);
    authenticatedFetch(`${apiBaseUrl}/${questionnaire.id}?include_questions=true`)
      .then((response) => (response.ok ? response.json() : questionnaire))
      .then((data) => {
        setDetailedQuestionnaire({ ...questionnaire, ...data });
        // Ouvrir tous les domaines par défaut
        if (data.questions) {
          const domains = new Set<string>(
            data.questions.map((q: Question) => q.domain || q.category || "Sans catégorie")
          );
          setExpandedDomains(domains);
        }
      })
      .catch(() => setDetailedQuestionnaire(questionnaire))
      .finally(() => setLoading(false));
  }, [questionnaire, apiBaseUrl]);

  // Gestion scroll et escape
  useEffect(() => {
    if (!questionnaire) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEsc);
    };
  }, [questionnaire, onClose]);

  if (!questionnaire) return null;

  const currentQ = detailedQuestionnaire || questionnaire;
  const questions = currentQ.questions || [];

  // Regrouper par domaine
  const questionsByDomain: Record<string, Question[]> = {};
  questions.forEach((q: Question) => {
    const domain = q.domain || q.category || "Sans catégorie";
    if (!questionsByDomain[domain]) {
      questionsByDomain[domain] = [];
    }
    questionsByDomain[domain].push(q);
  });

  const domains = Object.keys(questionsByDomain).sort();

  const toggleDomain = (domain: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  // Badge type de réponse
  const ResponseTypeBadge = ({ type }: { type?: string }) => {
    if (!type) return null;
    
    const typeMap: Record<string, { label: string; gradient: string; icon: string }> = {
      yes_no: { label: "Oui/Non", gradient: "bg-gradient-to-r from-blue-500 to-blue-600", icon: "✓" },
      single_choice: { label: "Choix unique", gradient: "bg-gradient-to-r from-purple-500 to-purple-600", icon: "○" },
      multi_choice: { label: "Choix multiple", gradient: "bg-gradient-to-r from-indigo-500 to-indigo-600", icon: "☑" },
      text: { label: "Texte", gradient: "bg-gradient-to-r from-green-500 to-green-600", icon: "T" },
      number: { label: "Nombre", gradient: "bg-gradient-to-r from-yellow-500 to-yellow-600", icon: "#" },
      date: { label: "Date", gradient: "bg-gradient-to-r from-pink-500 to-pink-600", icon: "📅" },
      file: { label: "Fichier", gradient: "bg-gradient-to-r from-orange-500 to-orange-600", icon: "📎" },
    };

    const info = typeMap[type] || { label: type, gradient: "bg-gradient-to-r from-gray-500 to-gray-600", icon: "?" };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${info.gradient} shadow-sm`}>
        <span className="text-sm">{info.icon}</span>
        {info.label}
      </span>
    );
  };

  // Badge criticité
  const CritBadge = ({ level }: { level?: string }) => {
    if (!level) return null;
    
    const levelMap: Record<string, { icon: string; gradient: string; label: string }> = {
      critical: { icon: "🔴", gradient: "bg-gradient-to-r from-red-500 to-red-600", label: "CRITIQUE" },
      high: { icon: "🟠", gradient: "bg-gradient-to-r from-orange-500 to-orange-600", label: "HAUTE" },
      medium: { icon: "🟡", gradient: "bg-gradient-to-r from-amber-500 to-amber-600", label: "MOYENNE" },
      low: { icon: "🟢", gradient: "bg-gradient-to-r from-green-500 to-green-600", label: "BASSE" },
    };

    const info = levelMap[level.toLowerCase()] || { icon: "⚪", gradient: "bg-gradient-to-r from-gray-500 to-gray-600", label: level.toUpperCase() };
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white ${info.gradient} shadow-sm`}>
        <span>{info.icon}</span> {info.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop avec blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Panel principal */}
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header avec gradient */}
        <div className="relative bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 px-8 py-6">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {currentQ.status === 'published' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-lg">
                      <CheckCircle size={14} />
                      Publié
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/30 text-white backdrop-blur-sm">
                      <AlertCircle size={14} />
                      Brouillon
                    </span>
                  )}
                  {currentQ.ai_generated && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500 text-white shadow-lg">
                      <Sparkles size={14} />
                      Généré par IA
                    </span>
                  )}
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 truncate">
                {currentQ.name || "Questionnaire"}
              </h2>
              <div className="flex items-center gap-4 text-sm text-white/90">
                <span className="flex items-center gap-1.5">
                  <FileText size={16} />
                  {questions.length} question{questions.length > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={16} />
                  {formatDate(currentQ.created_at)}
                </span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm group"
              aria-label="Fermer"
            >
              <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Corps avec scroll */}
        <div className="overflow-y-auto max-h-[calc(92vh-200px)] bg-gradient-to-b from-gray-50 to-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <Sparkles className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-6 text-gray-600 font-medium">Chargement des questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="p-6 bg-gray-100 rounded-full mb-6">
                <FileText className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune question</h3>
              <p className="text-gray-500">Ce questionnaire ne contient pas encore de questions</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Stats bar */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      {questions.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Questions totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {domains.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Domaines</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {questions.filter(q => q.is_required).length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Obligatoires</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      {currentQ.source_type === 'framework' ? '📋' : currentQ.source_type === 'control_points' ? '🎯' : '✏️'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {currentQ.source_type === 'framework' ? 'Framework' : 
                       currentQ.source_type === 'control_points' ? 'Points de contrôle' : 'Manuel'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Domaines et questions */}
              {domains.map((domain, domainIdx) => {
                const domainQuestions = questionsByDomain[domain];
                const isExpanded = expandedDomains.has(domain);
                
                return (
                  <div 
                    key={domain} 
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md"
                  >
                    {/* Domain header */}
                    <button
                      onClick={() => toggleDomain(domain)}
                      className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white font-bold shadow-lg">
                          {domainIdx + 1}
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {domain}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {domainQuestions.length} question{domainQuestions.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {domainQuestions.length}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 transition-transform duration-200" />
                        )}
                      </div>
                    </button>

                    {/* Questions list */}
                    {isExpanded && (
                      <div className="px-6 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                        {domainQuestions.map((question, idx) => (
                          <div
                            key={question.id || idx}
                            className="group relative pl-4 pr-4 py-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200"
                          >
                            {/* Barre de couleur à gauche */}
                            <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-pink-500 via-purple-500 to-indigo-500 rounded-full"></div>
                            
                            <div className="flex items-start gap-4">
                              {/* Numéro de question */}
                              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                {idx + 1}
                              </div>
                              
                              <div className="flex-1 min-w-0 space-y-3">
                                {/* Texte de la question */}
                                <p className="text-base font-medium text-gray-900 leading-relaxed">
                                  {question.question_text || "—"}
                                </p>
                                
                                {/* Aide */}
                                {question.help_text && (
                                  <div className="flex items-start gap-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                                    <span className="text-blue-600 text-lg">💡</span>
                                    <p className="text-sm text-blue-900 leading-relaxed">
                                      {question.help_text}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <ResponseTypeBadge type={question.response_type} />
                                  {question.criticality_level && (
                                    <CritBadge level={question.criticality_level} />
                                  )}
                                  {question.is_required && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-white shadow-sm">
                                      ⚠️ Obligatoire
                                    </span>
                                  )}
                                </div>

                                {/* Options */}
                                {question.options && question.options.length > 0 && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Options de réponse :</p>
                                    <ul className="space-y-1.5">
                                      {question.options.map((option, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-semibold">
                                            {i + 1}
                                          </span>
                                          {option}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-white px-8 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6 text-gray-600">
              <span className="flex items-center gap-2">
                <Clock size={16} className="text-purple-600" />
                Créé le {formatDate(currentQ.created_at)}
              </span>
              {currentQ.has_embeddings !== undefined && (
                <span className="flex items-center gap-2">
                  {currentQ.has_embeddings ? (
                    <>
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-green-600 font-medium">Embeddings générés</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} className="text-orange-600" />
                      <span className="text-orange-600 font-medium">Embeddings non générés</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewModal;