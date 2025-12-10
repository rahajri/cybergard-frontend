'use client';

import { useState } from 'react';
import { QuestionForAudite } from '@/types/audite';
import { FileUpload } from './FileUpload';
import DatePicker, { registerLocale } from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker-custom.css';

// Enregistrer la locale française
registerLocale('fr', fr);

interface UploadedFile {
  id: string;
  filename: string;
  original_filename: string;
  size: number;
  content_type: string;
  uploaded_at: string;
  download_url?: string;
}

interface QuestionInputProps {
  question: QuestionForAudite;
  auditId: string;
  onSave: (questionId: string, answerValue: Record<string, unknown>) => Promise<void>;
  isPreviewMode?: boolean; // Mode prévisualisation : affiche toujours les uploads
}

export function QuestionInput({ question, auditId, onSave, isPreviewMode = false }: QuestionInputProps) {
  const [value, setValue] = useState<Record<string, unknown> | null>(question.current_answer?.answer_value || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenSaved, setHasBeenSaved] = useState(!!question.current_answer);

  const handleSave = async (newValue: Record<string, unknown> | null) => {
    setValue(newValue);
    setIsSaving(true);
    try {
      await onSave(String(question.id), newValue || {});
      setHasBeenSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Classes de bordure communes
  const getBorderClasses = () => {
    if (isFocused) {
      return 'border-red-300 ring-2 ring-red-200';
    }
    if (hasBeenSaved) {
      return 'border-green-500';
    }
    return 'border-gray-300';
  };

  // Vérifier si l'upload de fichiers doit être affiché
  const shouldShowUpload = () => {
    if (!question.upload_conditions) {
      return false;
    }

    // Si aucune condition de valeur requise, toujours afficher
    const requiredValues = question.upload_conditions.required_for_values;
    if (!requiredValues || requiredValues.length === 0) {
      return true;
    }

    // Vérifier si la valeur actuelle correspond aux conditions
    if (question.response_type === 'boolean') {
      const boolValue = value?.bool;
      const stringValue = boolValue ? 'Oui' : 'Non';
      return requiredValues.includes(stringValue);
    }
    if (question.response_type === 'single_choice') {
      const choiceValue = String(value?.choice || '');
      return requiredValues.includes(choiceValue);
    }
    if (question.response_type === 'number') {
      // Pour les nombres, vérifier si la valeur est dans les conditions ou si "toutes valeurs"
      return requiredValues.some((rv: string) => rv === 'toute valeur' || rv.includes('+'));
    }
    if (question.response_type === 'date') {
      // Pour les dates, si "toute date" est requis
      return requiredValues.includes('toute date');
    }

    return true;
  };

  // Afficher un indicateur d'upload conditionnel en mode preview
  const shouldShowUploadIndicator = () => {
    if (!isPreviewMode) return false;
    if (!question.upload_conditions) return false;

    // Afficher l'indicateur seulement si l'upload n'est pas déjà affiché
    return !shouldShowUpload();
  };

  // Indicateur d'upload conditionnel (mode preview uniquement)
  const UploadIndicator = () => {
    if (!shouldShowUploadIndicator()) return null;

    const requiredValues = question.upload_conditions?.required_for_values || [];
    const conditionText = requiredValues.length > 0
      ? `si la réponse est : ${requiredValues.join(' ou ')}`
      : 'pour cette question';

    return (
      <div className="mt-4 pt-4 border-t border-dashed border-blue-300">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-lg">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Upload conditionnel configuré
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Un champ d'upload de documents sera affiché {conditionText}
                {question.upload_conditions?.is_mandatory && (
                  <span className="text-red-600 font-medium"> (obligatoire)</span>
                )}
              </p>
              {question.upload_conditions?.help_text && (
                <p className="text-xs text-blue-600 mt-1 italic">
                  "{question.upload_conditions.help_text}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Composant d'upload conditionnel
  const UploadSection = () => {
    if (!shouldShowUpload()) return null;

    const uploadHelpText = question.upload_conditions?.help_text;

    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📎 Documents justificatifs
          {question.upload_conditions?.is_mandatory && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        {uploadHelpText && (
          <p className="text-sm text-gray-500 mb-2 bg-blue-50 p-2 rounded">{uploadHelpText}</p>
        )}
        <FileUpload
          questionId={String(question.id)}
          auditId={auditId}
          answerId={question.current_answer?.id}
          existingFiles={Array.isArray(value?.files) ? value.files : []}
          maxFiles={question.upload_conditions?.max_files || 10}
          maxSizeMB={question.upload_conditions?.max_size_mb || 10}
          acceptedTypes={question.upload_conditions?.accepted_types || ['*/*']}
          onFilesChange={(files) => {
            const newValue = { ...value, files };
            setValue(newValue);
            handleSave(newValue);
          }}
          disabled={isSaving}
        />
        {question.upload_conditions?.min_files && (
          <p className="text-xs text-gray-500 mt-1">
            📌 Minimum {question.upload_conditions.min_files} fichier(s) requis
          </p>
        )}
      </div>
    );
  };

  // Composant selon le type de réponse
  switch (question.response_type) {
    case 'boolean':
      return (
        <div>
          <div className="flex gap-4">
            <button
              onClick={() => handleSave({ bool: true })}
              className={`
                px-6 py-2 rounded-md border-2 transition-all
                ${value?.bool === true
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                }
                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={isSaving}
            >
              Oui
            </button>
            <button
              onClick={() => handleSave({ bool: false })}
              className={`
                px-6 py-2 rounded-md border-2 transition-all
                ${value?.bool === false
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
                }
                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={isSaving}
            >
              Non
            </button>
          </div>
          <UploadSection />
          <UploadIndicator />
        </div>
      );

    case 'single_choice':
      return (
        <div>
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 rounded-md border border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.value}
                  checked={value?.choice === option.value}
                  onChange={(e) => handleSave({ choice: e.target.value })}
                  className="w-4 h-4 text-indigo-600"
                  disabled={isSaving}
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          <UploadSection />
          <UploadIndicator />
        </div>
      );

    case 'multiple_choice':
      return (
        <div>
          <div className="space-y-2">
            {question.options?.map((option) => {
              const selectedValues = (value?.choices as string[]) || [];
              const isChecked = selectedValues.includes(option.value);

              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 rounded-md border border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter((v: string) => v !== option.value);
                      handleSave({ choices: newValues });
                    }}
                    className="w-4 h-4 text-indigo-600 rounded"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              );
            })}
          </div>
          <UploadSection />
          <UploadIndicator />
        </div>
      );

    case 'text':
      return (
        <div>
          <input
            type="text"
            value={(value?.text as string) || ''}
            onChange={(e) => setValue({ text: e.target.value })}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              handleSave(value);
            }}
            placeholder="Votre réponse..."
            className={`w-full px-4 py-2 border rounded-md transition-all ${getBorderClasses()}`}
            disabled={isSaving}
          />
          <UploadSection />
          <UploadIndicator />
        </div>
      );

    case 'textarea':
      return (
        <div>
          <textarea
            value={(value?.text as string) || ''}
            onChange={(e) => setValue({ text: e.target.value })}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              handleSave(value);
            }}
            placeholder="Votre réponse..."
            rows={4}
            className={`w-full px-4 py-2 border rounded-md transition-all ${getBorderClasses()}`}
            disabled={isSaving}
          />
          <UploadSection />
          <UploadIndicator />
        </div>
      );

    case 'number':
      return (
        <div>
          <input
            type="number"
            min="0"
            step="1"
            value={(value?.number as number) ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              // Permettre la saisie vide ou des nombres >= 0
              if (val === '') {
                setValue({ number: null });
              } else {
                const numVal = parseFloat(val);
                if (!isNaN(numVal) && numVal >= 0) {
                  setValue({ number: numVal });
                }
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              handleSave(value);
            }}
            placeholder="Votre réponse..."
            className={`w-full px-4 py-2 border rounded-md transition-all ${getBorderClasses()}`}
            disabled={isSaving}
          />
          <UploadSection />
          <UploadIndicator />
        </div>
      );

    case 'date': {
      // Convertir la date depuis le format stocké vers un objet Date
      const existingDate = (value?.date as string) || '';

      const parseStoredDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;

        // Format JJ/MM/AAAA
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        // Format YYYY-MM-DD
        if (dateStr.includes('-')) {
          const [year, month, day] = dateStr.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        return null;
      };

      const [selectedDate, setSelectedDate] = useState<Date | null>(parseStoredDate(existingDate));

      const handleDateChange = (date: Date | null) => {
        setSelectedDate(date);

        if (date) {
          // Formater en JJ/MM/AAAA
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const formatted = `${day}/${month}/${year}`;
          handleSave({ date: formatted });
        } else {
          handleSave({ date: '' });
        }
      };

      return (
        <div>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            locale="fr"
            dateFormat="dd/MM/yyyy"
            placeholderText="JJ/MM/AAAA"
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={100}
            minDate={new Date(1900, 0, 1)}
            maxDate={new Date(2100, 11, 31)}
            className={`w-full px-4 py-2 border rounded-md transition-all ${getBorderClasses()}`}
            disabled={isSaving}
            showMonthDropdown
            dropdownMode="select"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format : JJ/MM/AAAA (exemple: 19/11/2025)
          </p>
          <UploadSection />
          <UploadIndicator />
        </div>
      );
    }

    case 'rating':
      return (
        <div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleSave({ rating })}
                className={`
                  px-4 py-2 rounded-md transition-all
                  ${value?.rating === rating
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                disabled={isSaving}
              >
                {rating}
              </button>
            ))}
          </div>
          <UploadSection />
          <UploadIndicator />
        </div>
      );

    case 'file_upload':
      return (
        <FileUpload
          questionId={String(question.id)}
          auditId={auditId}
          answerId={question.current_answer?.id}
          existingFiles={(value?.files as UploadedFile[]) || []}
          maxFiles={question.upload_conditions?.max_files || 5}
          maxSizeMB={question.upload_conditions?.max_size_mb || 10}
          acceptedTypes={question.upload_conditions?.accepted_types || ['*/*']}
          onFilesChange={(files) => handleSave({ files })}
          disabled={isSaving}
        />
      );

    case 'open':
      const hasUploadConditions = question.upload_conditions && Object.keys(question.upload_conditions).length > 0;
      const uploadHelpText = question.upload_conditions?.help_text;

      return (
        <div className="space-y-4">
          {/* Zone de texte libre */}
          <div>
            <textarea
              value={(value?.text as string) || ''}
              onChange={(e) => {
                const newValue = { ...value, text: e.target.value };
                setValue(newValue);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                handleSave(value);
              }}
              placeholder="Décrivez votre réponse de manière détaillée..."
              rows={8}
              className={`w-full px-4 py-3 border rounded-md resize-y transition-all ${getBorderClasses()}`}
              disabled={isSaving}
            />
          </div>

          {/* Upload de documents (si upload_conditions défini) */}
          {hasUploadConditions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documents justificatifs
                {question.upload_conditions?.is_mandatory && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              {uploadHelpText && (
                <p className="text-sm text-gray-500 mb-2">{uploadHelpText}</p>
              )}
              <FileUpload
                questionId={String(question.id)}
                auditId={auditId}
                answerId={question.current_answer?.id}
                existingFiles={Array.isArray(value?.files) ? value.files : []}
                maxFiles={question.upload_conditions?.max_files || 10}
                maxSizeMB={question.upload_conditions?.max_size_mb || 10}
                acceptedTypes={question.upload_conditions?.accepted_types || ['*/*']}
                onFilesChange={(files) => {
                  const newValue = { ...value, files };
                  setValue(newValue);
                  handleSave(newValue);
                }}
                disabled={isSaving}
              />
              {question.upload_conditions?.min_files && (
                <p className="text-xs text-gray-500 mt-1">
                  Minimum {question.upload_conditions.min_files} fichier(s) requis
                </p>
              )}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="text-gray-500 italic">
          Type de question non supporté : {question.response_type}
        </div>
      );
  }
}
