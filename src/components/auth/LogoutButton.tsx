/**
 * Composant de bouton de déconnexion réutilisable et robuste
 */
'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearAuthData } from '@/lib/auth';

interface LogoutButtonProps {
  variant?: 'sidebar' | 'header' | 'menu';
  theme?: 'admin' | 'client';
  isCollapsed?: boolean;
  className?: string;
}

export default function LogoutButton({ 
  variant = 'sidebar', 
  theme = 'admin',
  isCollapsed = false,
  className = ''
}: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      console.log('🔐 Déconnexion initiée...');
      
      // Nettoyer toutes les données d'authentification
      clearAuthData();
      
      // Supprimer tous les cookies d'authentification
      const cookiesToClear = ['token', 'user', 'refreshToken', 'sessionId'];
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${window.location.hostname};`;
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      });
      
      // Nettoyer le stockage local
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      console.log('✅ Données nettoyées avec succès');
      
      // Redirection vers la page de connexion
      router.push('/login');
      
      // Fallback au cas où router.push ne fonctionne pas
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      // Force la redirection même en cas d'erreur
      window.location.href = '/login';
    }
  };

  // Styles en fonction du variant et du thème
  const getButtonStyles = () => {
    const baseStyles = 'group flex items-center rounded-lg text-sm font-medium transition-all duration-200 relative';
    
    const themeStyles = {
      admin: {
        text: 'text-gray-300',
        hover: 'hover:text-white hover:bg-gray-700'
      },
      client: {
        text: 'text-slate-300', 
        hover: 'hover:text-white hover:bg-slate-700'
      }
    };

    const variantStyles = {
      sidebar: isCollapsed ? 'px-2 py-3 justify-center w-full' : 'px-3 py-2 w-full',
      header: 'px-3 py-2',
      menu: 'px-4 py-2 w-full'
    };

    return [
      baseStyles,
      themeStyles[theme].text,
      themeStyles[theme].hover,
      variantStyles[variant],
      className
    ].join(' ');
  };

  return (
    <button
      onClick={handleLogout}
      type="button"
      className={getButtonStyles()}
      title="Déconnexion"
      aria-label="Se déconnecter de l'application"
    >
      <LogOut size={20} className="flex-shrink-0" />
      
      {/* Label visible selon le variant */}
      {!isCollapsed && variant === 'sidebar' && (
        <span className="ml-3 hidden lg:block font-medium">
          Déconnexion
        </span>
      )}
      
      {variant !== 'sidebar' && (
        <span className="ml-3">
          Déconnexion
        </span>
      )}
      
      {/* Tooltip pour mode collapsed */}
      {isCollapsed && variant === 'sidebar' && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          Déconnexion
        </div>
      )}
    </button>
  );
}