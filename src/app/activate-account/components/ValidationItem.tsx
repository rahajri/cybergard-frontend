import { Check, X } from 'lucide-react';

interface ValidationItemProps {
  valid: boolean;
  text: string;
}

/**
 * Composant pour afficher un critère de validation de mot de passe
 * Affiche une icône verte (✓) ou rouge (✗) selon l'état de validation
 */
export default function ValidationItem({ valid, text }: ValidationItemProps) {
  return (
    <div className="validation-item">
      <div className={`validation-icon ${valid ? 'valid' : ''}`}>
        {valid ? (
          <Check style={{ width: '0.875rem', height: '0.875rem' }} strokeWidth={3} />
        ) : (
          <X style={{ width: '0.875rem', height: '0.875rem' }} />
        )}
      </div>
      <span className={`validation-text ${valid ? 'valid' : ''}`}>
        {text}
      </span>
    </div>
  );
}
