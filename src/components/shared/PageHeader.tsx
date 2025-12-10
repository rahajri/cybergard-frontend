import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'blue' | 'green' | 'indigo' | 'purple' | 'pink' | 'orange' | 'red';
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Composant PageHeader réutilisable pour les espaces Client et Admin
 *
 * Crée un header sticky en haut de page avec:
 * - Un titre et une description
 * - Une icône colorée optionnelle
 * - Des boutons d'action à droite
 *
 * @example
 * <PageHeader
 *   title="Gestion Écosystème"
 *   subtitle="Gérez vos organismes internes et externes"
 *   icon={List}
 *   iconColor="green"
 *   actions={
 *     <>
 *       <button className="btn-secondary">Action 1</button>
 *       <button className="btn-primary">Action 2</button>
 *     </>
 *   }
 * />
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'green',
  actions,
  className = ''
}: PageHeaderProps) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    indigo: 'text-indigo-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
    orange: 'text-orange-600',
    red: 'text-red-600'
  };

  return (
    <div className={`bg-white border-b border-gray-200 sticky top-0 z-20 ${className}`}>
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Section gauche : Titre + Description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              {Icon && (
                <Icon className={`w-8 h-8 mr-3 flex-shrink-0 ${colorClasses[iconColor]}`} />
              )}
              <span className="truncate">{title}</span>
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-600">
                {subtitle}
              </p>
            )}
          </div>

          {/* Section droite : Boutons d'action */}
          {actions && (
            <div className="flex items-center space-x-3 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
