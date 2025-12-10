'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Search, FileText, CheckCircle, Loader2, BookOpen } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ControlPoint {
  id: string;
  control_id: string;
  title: string;
  referential_name: string;
  referential_code: string;
}

interface Question {
  id: string;
  question_text: string;
  question_code: string;
  chapter: string;
  requirement_title: string;
  domain_name: string;
  control_points: ControlPoint[];
}

interface DomainWithQuestions {
  domain_name: string;
  questions: Question[];
}

interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  framework_name?: string;
  framework_code?: string;
  question_count?: number;
}

interface GlobalQuestionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (question: Question) => void;
  selectedQuestionId?: string;
}

export function GlobalQuestionSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedQuestionId,
}: GlobalQuestionSelectorModalProps) {
  // État pour les questionnaires
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(true);

  // État pour les questions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainGroups, setDomainGroups] = useState<DomainWithQuestions[]>([]);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredQuestion, setHoveredQuestion] = useState<Question | null>(null);

  // Charger les questionnaires au démarrage
  useEffect(() => {
    if (isOpen) {
      loadQuestionnaires();
    }
  }, [isOpen]);

  // Charger les questions quand un questionnaire est sélectionné
  useEffect(() => {
    if (selectedQuestionnaire) {
      loadQuestions(selectedQuestionnaire.id);
    }
  }, [selectedQuestionnaire]);

  const loadQuestionnaires = async () => {
    try {
      setLoadingQuestionnaires(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Charger uniquement les questionnaires partagés/activés pour le tenant
      const response = await fetch(
        `${API_BASE}/api/v1/questionnaires?activated_for_tenant=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // L'API retourne un tableau avec 'name' au lieu de 'title'
        const questList = Array.isArray(data) ? data : (data.questionnaires || []);
        // Mapper 'name' vers 'title' pour compatibilité avec l'interface
        const mappedQuestionnaires = questList.map((q: any) => ({
          id: q.id,
          title: q.name || q.title,  // Utiliser 'name' de l'API ou 'title' si déjà présent
          description: q.description,
          framework_name: q.framework_name,
          framework_code: q.framework_code,
          question_count: q.questions_count || q.question_count,
        }));
        setQuestionnaires(mappedQuestionnaires);
      } else {
        setError('Erreur lors du chargement des questionnaires');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion');
    } finally {
      setLoadingQuestionnaires(false);
    }
  };

  const loadQuestions = async (questionnaireId: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_BASE}/api/v1/questionnaires/${questionnaireId}/questions-with-control-points`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const questions: Question[] = data.questions || [];

        // Grouper les questions par domaine
        const grouped: { [key: string]: Question[] } = {};
        questions.forEach((q) => {
          const domainName = q.domain_name || 'Sans domaine';
          if (!grouped[domainName]) {
            grouped[domainName] = [];
          }
          grouped[domainName].push(q);
        });

        // Convertir en tableau
        const domainList: DomainWithQuestions[] = Object.entries(grouped).map(
          ([domain_name, questions]) => ({
            domain_name,
            questions,
          })
        );

        // Trier par nom de domaine
        domainList.sort((a, b) => a.domain_name.localeCompare(b.domain_name));

        setDomainGroups(domainList);
        // Ouvrir le premier domaine par défaut
        if (domainList.length > 0) {
          setExpandedDomains(new Set([domainList[0].domain_name]));
        }
      } else {
        setError('Erreur lors du chargement des questions');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const toggleDomain = (domainName: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domainName)) {
      newExpanded.delete(domainName);
    } else {
      newExpanded.add(domainName);
    }
    setExpandedDomains(newExpanded);
  };

  const handleSelectQuestion = (question: Question) => {
    onSelect(question);
    onClose();
  };

  const handleSelectQuestionnaire = (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setDomainGroups([]);
    setExpandedDomains(new Set());
  };

  const handleBackToQuestionnaires = () => {
    setSelectedQuestionnaire(null);
    setDomainGroups([]);
    setExpandedDomains(new Set());
  };

  // Filtrer les questions selon la recherche
  const filteredDomains = domainGroups
    .map((domain) => ({
      ...domain,
      questions: domain.questions.filter(
        (q) =>
          q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.question_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.control_points.some(
            (cp) =>
              cp.control_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cp.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
      ),
    }))
    .filter((domain) => domain.questions.length > 0);

  // Bloquer le scroll du body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {selectedQuestionnaire
                  ? 'Sélectionner une question'
                  : 'Sélectionner un questionnaire'}
              </h3>
              <p className="text-purple-200 text-sm">
                {selectedQuestionnaire
                  ? `Questionnaire : ${selectedQuestionnaire.title}`
                  : 'Choisissez un questionnaire pour voir les questions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        {!selectedQuestionnaire ? (
          // Liste des questionnaires
          <div className="flex-1 overflow-y-auto p-6">
            {loadingQuestionnaires ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                <span className="ml-3 text-gray-600">Chargement des questionnaires...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : questionnaires.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucun questionnaire disponible
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questionnaires.map((questionnaire) => (
                  <button
                    key={questionnaire.id}
                    onClick={() => handleSelectQuestionnaire(questionnaire)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {questionnaire.title}
                        </h4>
                        {questionnaire.framework_code && (
                          <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {questionnaire.framework_code}
                          </span>
                        )}
                        {questionnaire.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {questionnaire.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Questions du questionnaire sélectionné
          <>
            {/* Barre de recherche + retour */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToQuestionnaires}
                  className="flex items-center text-sm text-purple-600 hover:text-purple-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
                  Retour aux questionnaires
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une question ou un point de contrôle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Arbre des domaines/questions */}
              <div className="flex-1 overflow-y-auto p-4 border-r border-gray-200">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <span className="ml-3 text-gray-600">Chargement des questions...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-600">{error}</div>
                ) : filteredDomains.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery ? 'Aucune question trouvée' : 'Aucune question disponible'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDomains.map((domain) => (
                      <div key={domain.domain_name} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* En-tête du domaine */}
                        <button
                          onClick={() => toggleDomain(domain.domain_name)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {expandedDomains.has(domain.domain_name) ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="font-medium text-gray-800">{domain.domain_name}</span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              {domain.questions.length} question(s)
                            </span>
                          </div>
                        </button>

                        {/* Liste des questions du domaine */}
                        {expandedDomains.has(domain.domain_name) && (
                          <div className="divide-y divide-gray-100">
                            {domain.questions.map((question) => (
                              <div
                                key={question.id}
                                className={`px-4 py-3 cursor-pointer transition-colors ${
                                  selectedQuestionId === question.id
                                    ? 'bg-purple-50 border-l-4 border-purple-500'
                                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                                }`}
                                onClick={() => handleSelectQuestion(question)}
                                onMouseEnter={() => setHoveredQuestion(question)}
                                onMouseLeave={() => setHoveredQuestion(null)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    {question.question_code && (
                                      <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded mr-2">
                                        {question.question_code}
                                      </span>
                                    )}
                                    <p className="text-sm text-gray-800 mt-1 line-clamp-2">
                                      {question.question_text}
                                    </p>
                                    {question.control_points.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {question.control_points.slice(0, 3).map((cp) => (
                                          <span
                                            key={cp.id}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700"
                                          >
                                            {cp.referential_code} - {cp.control_id}
                                          </span>
                                        ))}
                                        {question.control_points.length > 3 && (
                                          <span className="text-xs text-gray-500">
                                            +{question.control_points.length - 3} autre(s)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {selectedQuestionId === question.id && (
                                    <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 ml-2" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panneau de prévisualisation des control points */}
              <div className="w-80 bg-gray-50 p-4 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-purple-600" />
                  Points de contrôle associés
                </h4>

                {hoveredQuestion ? (
                  hoveredQuestion.control_points.length > 0 ? (
                    <div className="space-y-2">
                      {hoveredQuestion.control_points.map((cp) => (
                        <div
                          key={cp.id}
                          className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm"
                        >
                          <div className="flex items-start space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-600 text-white flex-shrink-0">
                              {cp.referential_code}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-purple-900 text-sm">
                                {cp.control_id}
                              </div>
                              <div className="text-purple-700 text-xs mt-0.5 line-clamp-3">
                                {cp.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Aucun point de contrôle associé à cette question
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Survolez une question pour voir ses points de contrôle
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-100 border-t border-gray-200 px-6 py-3 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {selectedQuestionnaire
              ? `${filteredDomains.reduce((acc, d) => acc + d.questions.length, 0)} question(s) disponible(s)`
              : `${questionnaires.length} questionnaire(s) disponible(s)`
            }
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
