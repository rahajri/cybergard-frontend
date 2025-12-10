'use client';

import { useState } from 'react';
import { AlertTriangle, Lock, ServerCrash, WifiOff, RefreshCw, Home, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from './button';
import { useRouter } from 'next/navigation';
import { UnauthorizedActionModal } from './UnauthorizedActionModal';

// ============================================================================
// TYPES
// ============================================================================

export type ErrorType =
  | 'forbidden'
  | 'not-found'
  | 'server-error'
  | 'network-error'
  | 'unauthorized'
  | 'generic';

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface ErrorDisplayProps {
  /** Type d'erreur pour afficher le message approprié */
  type?: ErrorType;
  /** Code d'erreur HTTP (optionnel, pour détection automatique du type) */
  statusCode?: number;
  /** Message personnalisé (remplace le message par défaut) */
  customMessage?: string;
  /** Titre personnalisé (remplace le titre par défaut) */
  customTitle?: string;
  /** Afficher le bouton "Réessayer" */
  showRetry?: boolean;
  /** Callback pour le bouton "Réessayer" */
  onRetry?: () => void;
  /** Afficher le bouton "Retour" */
  showBack?: boolean;
  /** Afficher le bouton "Accueil" */
  showHome?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
  /** Code de permission requis (pour afficher le bouton "Demander l'accès") */
  permissionCode?: string;
  /** Nom du module/action (pour le contexte de la demande) */
  actionName?: string;
}

// ============================================================================
// CONFIGURATION DES ERREURS
// ============================================================================

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  forbidden: {
    icon: <Lock className="w-16 h-16" />,
    title: "Accès non autorisé",
    message: "Oups... Vous n'avez pas le droit nécessaire !",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200"
  },
  unauthorized: {
    icon: <Lock className="w-16 h-16" />,
    title: "Session expirée",
    message: "Votre session a expiré ou vous n'êtes pas connecté. Veuillez vous reconnecter pour continuer.",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  'not-found': {
    icon: <AlertTriangle className="w-16 h-16" />,
    title: "Ressource introuvable",
    message: "La page ou la ressource que vous recherchez n'existe pas ou a été déplacée.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  'server-error': {
    icon: <ServerCrash className="w-16 h-16" />,
    title: "Erreur serveur",
    message: "Une erreur inattendue s'est produite sur le serveur. Notre équipe technique a été notifiée. Veuillez réessayer dans quelques instants.",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  },
  'network-error': {
    icon: <WifiOff className="w-16 h-16" />,
    title: "Problème de connexion",
    message: "Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200"
  },
  generic: {
    icon: <AlertTriangle className="w-16 h-16" />,
    title: "Une erreur s'est produite",
    message: "Quelque chose s'est mal passé. Veuillez réessayer ou contacter le support si le problème persiste.",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  }
};

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Détermine le type d'erreur à partir du code HTTP
 */
function getErrorTypeFromStatusCode(statusCode: number): ErrorType {
  if (statusCode === 401) return 'unauthorized';
  if (statusCode === 403) return 'forbidden';
  if (statusCode === 404) return 'not-found';
  if (statusCode >= 500) return 'server-error';
  return 'generic';
}

/**
 * Détermine le type d'erreur à partir d'un message d'erreur
 */
export function getErrorTypeFromMessage(message: string): ErrorType {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) {
    return 'forbidden';
  }
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('session')) {
    return 'unauthorized';
  }
  if (lowerMessage.includes('404') || lowerMessage.includes('not found') || lowerMessage.includes('introuvable')) {
    return 'not-found';
  }
  if (lowerMessage.includes('500') || lowerMessage.includes('server') || lowerMessage.includes('serveur')) {
    return 'server-error';
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connexion')) {
    return 'network-error';
  }

  return 'generic';
}

/**
 * Extrait le code de permission d'un message d'erreur
 * Recherche des patterns comme 'PERMISSION_CODE' ou (PERMISSION_CODE)
 */
export function extractPermissionCodeFromMessage(message: string): string | undefined {
  // Pattern pour trouver un code de permission entre quotes simples
  const singleQuoteMatch = message.match(/'([A-Z][A-Z_]+)'/);
  if (singleQuoteMatch) return singleQuoteMatch[1];

  // Pattern pour trouver un code de permission entre parenthèses
  const parenMatch = message.match(/\(([A-Z][A-Z_]+)\)/);
  if (parenMatch) return parenMatch[1];

  // Pattern pour trouver un code de permission entre quotes doubles
  const doubleQuoteMatch = message.match(/"([A-Z][A-Z_]+)"/);
  if (doubleQuoteMatch) return doubleQuoteMatch[1];

  // Pattern général pour un code de permission (mot en majuscules avec underscore)
  const generalMatch = message.match(/\b([A-Z]+_[A-Z_]+)\b/);
  if (generalMatch) return generalMatch[1];

  return undefined;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function ErrorDisplay({
  type,
  statusCode,
  customMessage,
  customTitle,
  showRetry = true,
  onRetry,
  showBack = true,
  showHome = false,
  className = '',
  permissionCode,
  actionName
}: ErrorDisplayProps) {
  const router = useRouter();
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Déterminer le type d'erreur
  const errorType: ErrorType = type || (statusCode ? getErrorTypeFromStatusCode(statusCode) : 'generic');
  const config = ERROR_CONFIGS[errorType];

  // Afficher le bouton "Demander l'accès" si c'est une erreur forbidden et qu'on a un permissionCode
  const canRequestAccess = (errorType === 'forbidden' || statusCode === 403) && permissionCode;

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.push('/client/dashboard');
  };

  return (
    <>
      <div className={`flex items-center justify-center min-h-[400px] p-8 ${className}`}>
        <div className={`max-w-md w-full ${config.bgColor} ${config.borderColor} border rounded-2xl p-8 text-center shadow-sm`}>
          {/* Icône */}
          <div className={`${config.color} flex justify-center mb-6`}>
            {config.icon}
          </div>

          {/* Titre */}
          <h2 className={`text-xl font-semibold ${config.color} mb-3`}>
            {customTitle || config.title}
          </h2>

          {/* Message - Pour les erreurs forbidden avec demande d'accès, utiliser le message standard */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {canRequestAccess ? config.message : (customMessage || config.message)}
          </p>

          {/* Code d'erreur (si fourni) */}
          {statusCode && (
            <p className="text-sm text-gray-400 mb-6">
              Code erreur : {statusCode}
            </p>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            {showRetry && onRetry && (
              <Button
                onClick={onRetry}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            )}

            {/* Masquer Retour et Accueil si on peut demander l'accès */}
            {showBack && !canRequestAccess && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            )}

            {showHome && !canRequestAccess && (
              <Button
                variant="outline"
                onClick={handleHome}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </Button>
            )}

            {/* Bouton Demander l'accès pour les erreurs forbidden */}
            {canRequestAccess && (
              <Button
                onClick={() => setShowRequestModal(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Demander l'accès
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de demande de droits */}
      {canRequestAccess && (
        <UnauthorizedActionModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          actionName={actionName || 'accéder à cette ressource'}
          permissionCode={permissionCode}
          showContactAdmin={true}
        />
      )}
    </>
  );
}

// ============================================================================
// COMPOSANTS SPECIFIQUES (pour usage simplifié)
// ============================================================================

export function ForbiddenError({ onRetry, permissionCode, actionName, ...props }: Omit<ErrorDisplayProps, 'type'>) {
  return <ErrorDisplay type="forbidden" onRetry={onRetry} permissionCode={permissionCode} actionName={actionName} {...props} />;
}

export function NotFoundError({ onRetry, ...props }: Omit<ErrorDisplayProps, 'type'>) {
  return <ErrorDisplay type="not-found" onRetry={onRetry} {...props} />;
}

export function ServerError({ onRetry, ...props }: Omit<ErrorDisplayProps, 'type'>) {
  return <ErrorDisplay type="server-error" onRetry={onRetry} {...props} />;
}

export function NetworkError({ onRetry, ...props }: Omit<ErrorDisplayProps, 'type'>) {
  return <ErrorDisplay type="network-error" onRetry={onRetry} {...props} />;
}

export default ErrorDisplay;
