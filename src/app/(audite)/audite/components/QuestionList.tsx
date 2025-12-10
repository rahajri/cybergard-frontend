'use client';

import { useEffect, useRef } from 'react';
import { QuestionForAudite } from '@/types/audite';
import { QuestionInput } from './QuestionInput';
import { QuestionComments } from '@/components/QuestionComments';
import { ChevronRight } from 'lucide-react';

interface QuestionListProps {
  questions: QuestionForAudite[];
  auditId: string;
  onSaveAnswer: (questionId: string, answerValue: Record<string, unknown>) => Promise<void>;
  onNext: () => void;
  isLastNode: boolean;
  highlightedQuestionId?: string | null;
  isPreviewMode?: boolean; // Mode prévisualisation
}

export function QuestionList({
  questions,
  auditId,
  onSaveAnswer,
  onNext,
  isLastNode,
  highlightedQuestionId,
  isPreviewMode = false,
}: QuestionListProps) {
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll vers la question mise en surbrillance
  useEffect(() => {
    if (highlightedQuestionId && questionRefs.current[highlightedQuestionId]) {
      questionRefs.current[highlightedQuestionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedQuestionId]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune question dans ce domaine</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((question, index) => {
        const questionIdStr = String(question.id);
        const isHighlighted = highlightedQuestionId === questionIdStr;
        const hasAnswer = question.current_answer !== null && question.current_answer !== undefined;

        return (
          <div
            key={question.id}
            ref={(el) => {
              questionRefs.current[questionIdStr] = el;
            }}
            className={`
              rounded-lg border p-6 shadow-sm transition-all
              ${isHighlighted
                ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                : hasAnswer
                ? 'bg-green-50 border-green-300'
                : 'bg-white border-gray-200'}
            `}
          >
          {/* Numéro de question */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium text-sm">
              {index + 1}
            </div>

            <div className="flex-1">
              {/* Texte de la question */}
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {question.question_text}
                  {question.is_required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </h3>
                {question.help_text && (
                  <p className="text-sm text-gray-500">{question.help_text}</p>
                )}
              </div>

              {/* Input de réponse */}
              <QuestionInput
                question={question}
                auditId={auditId}
                onSave={onSaveAnswer}
                isPreviewMode={isPreviewMode}
              />

              {/* Commentaires et mentions */}
              <QuestionComments
                questionId={questionIdStr}
                auditId={auditId}
              />
            </div>
          </div>
        </div>
        );
      })}

      {/* Bouton Suivant */}
      {!isLastNode && (
        <div className="flex justify-end pt-4">
          <button
            onClick={onNext}
            className="
              px-6 py-2 rounded-md bg-indigo-600
              text-sm font-medium text-white
              hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              transition-colors
              flex items-center gap-2
            "
          >
            Domaine suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
