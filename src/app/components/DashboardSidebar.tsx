'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Target, HelpCircle, BookOpen, Search, Settings, LogOut, Shield, FileText, Users, Radar, BarChart3, Zap } from 'lucide-react';
import { clearAuthData, getUser } from '@/lib/auth';

interface DashboardSidebarProps {
  children: React.ReactNode;
  theme?: 'admin' | 'client';
}

export default function DashboardSidebar({
  children,
  theme = 'admin',
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = getUser();

  const handleLogout = () => {
    try {
      console.log('🔓 Déconnexion en cours...');
      
      // Nettoyer les données d'authentification
      clearAuthData();
      
      // Supprimer les cookies
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Nettoyer le localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
      }
      
      console.log('✅ Déconnexion réussie');
      
      // Rediriger vers la page de connexion
      router.push('/login');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      // Forcer la redirection même en cas d'erreur
      window.location.href = '/login';
    }
  };

  // Configuration des thèmes de couleur
  const getThemeClasses = () => {
    const themes = {
      admin: {
        sidebar: 'bg-gray-900',
        border: 'border-gray-700',
        hover: 'hover:bg-gray-700',
        active: 'bg-blue-600',
        text: 'text-gray-300',
        textHover: 'hover:text-white',
        accent: 'bg-blue-600'
      },
      client: {
        sidebar: 'bg-slate-800',
        border: 'border-slate-600', 
        hover: 'hover:bg-slate-700',
        active: 'bg-emerald-600',
        text: 'text-slate-300',
        textHover: 'hover:text-white',
        accent: 'bg-emerald-600'
      }
    };
    return themes[theme];
  };

  const themeClasses = getThemeClasses();

  // Navigation items configuration based on theme
  const getNavigationItems = () => {
    if (theme === 'admin') {
      return [
        {
          href: '/admin/dashboard',
          icon: Shield,
          label: 'Dashboard',
          section: 'gestion'
        },
        {
          href: '/admin/referentiels',
          icon: BookOpen,
          label: 'Référentiels',
          section: 'gestion'
        },
        {
          href: '/admin/points-controle',
          icon: Target,
          label: 'Points de contrôle',
          section: 'gestion'
        },
        {
          href: '/admin/questionnaires',
          icon: HelpCircle,
          label: 'Questionnaires',
          section: 'gestion'
        },
        {
          href: '/admin/clients',
          icon: Users,
          label: 'Clients',
          section: 'configuration'
        },
        {
          href: '/admin/reports/templates',
          icon: FileText,
          label: 'Rapports',
          section: 'configuration'
        }
      ];
    } else {
      // Client routes
      return [
        {
          href: '/client/dashboard',
          icon: Shield,
          label: 'Dashboard',
          section: 'client'
        },
        {
          href: '/client/administration',
          icon: Settings,
          label: 'Administration',
          section: 'client'
        },
        {
          href: '/client/campagnes',
          icon: Search,
          label: 'Campagnes',
          section: 'client'
        },
        {
          href: '/client/actions',
          icon: Target,
          label: 'Actions',
          section: 'client'
        },
        // Section Sécurité Technique
        {
          href: '/client/scanner',
          icon: Radar,
          label: 'Scanner Externe',
          section: 'security'
        }
      ];
    }
  };

  const navigationItems = getNavigationItems();

  // Grouper les items par section
  const gestionItems = navigationItems.filter(item => item.section === 'gestion');
  const configurationItems = navigationItems.filter(item => item.section === 'configuration');
  const clientItems = navigationItems.filter(item => item.section === 'client');
  const securityItems = navigationItems.filter(item => item.section === 'security');

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay pour mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${isCollapsed ? 'w-16 lg:w-16' : 'w-64 lg:w-64'}
        transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${themeClasses.sidebar} text-white
        lg:${themeClasses.sidebar}
      `}>
        <div className="flex flex-col h-full">
          {/* Header de la sidebar */}
          <div className={`flex items-center justify-between p-6 border-b ${themeClasses.border}`}>
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${themeClasses.accent} rounded-lg flex items-center justify-center`}>
                <Shield size={20} className="text-white" />
              </div>
              {!isCollapsed && (
                <div className="hidden lg:block">
                  <h2 className="text-lg font-bold">CYBERGARD AI</h2>
                  <p className="text-xs text-gray-400">
                    {theme === 'admin' ? 'Administration' : 'Espace Client'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Bouton collapse pour desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden lg:block p-1 rounded-md ${themeClasses.hover} transition-colors`}
              title={isCollapsed ? "Étendre le menu" : "Réduire le menu"}
            >
              <div className={`transform transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </div>
            </button>
            
            {/* Bouton fermer pour mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className={`lg:hidden p-1 rounded-md ${themeClasses.hover}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation principale */}
          <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
            {theme === 'admin' ? (
              <>
                {/* Section GESTION */}
                {gestionItems.length > 0 && (
                  <div>
                    {!isCollapsed && (
                      <div className="hidden lg:block mb-3">
                        <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider">
                          GESTION
                        </h3>
                      </div>
                    )}
                    <div className="space-y-1">
                      {gestionItems.map((item) => (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          icon={item.icon}
                          isActive={pathname === item.href}
                          isCollapsed={isCollapsed}
                          theme={theme}
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section CONFIGURATION */}
                {configurationItems.length > 0 && (
                  <div>
                    {!isCollapsed && (
                      <div className="hidden lg:block mb-3">
                        <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider">
                          CONFIGURATION
                        </h3>
                      </div>
                    )}
                    <div className="space-y-1">
                      {configurationItems.map((item) => (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          icon={item.icon}
                          isActive={pathname === item.href}
                          isCollapsed={isCollapsed}
                          theme={theme}
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Section CLIENT - Navigation */}
                <div>
                  {!isCollapsed && (
                    <div className="hidden lg:block mb-3">
                      <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider">
                        NAVIGATION
                      </h3>
                    </div>
                  )}
                  <div className="space-y-1">
                    {clientItems.map((item) => (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                        isCollapsed={isCollapsed}
                        theme={theme}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>

                {/* Section SÉCURITÉ TECHNIQUE */}
                {securityItems.length > 0 && (
                  <div>
                    {!isCollapsed && (
                      <div className="hidden lg:block mb-3 mt-6 pt-4 border-t border-slate-600">
                        <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider flex items-center">
                          <Shield size={12} className="mr-2" />
                          SÉCURITÉ TECHNIQUE
                        </h3>
                      </div>
                    )}
                    {isCollapsed && (
                      <div className="hidden lg:block my-4 border-t border-slate-600" />
                    )}
                    <div className="space-y-1">
                      {securityItems.map((item) => (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          icon={item.icon}
                          isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                          isCollapsed={isCollapsed}
                          theme={theme}
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </nav>

          {/* Bouton de déconnexion */}
          <div className={`p-4 border-t ${themeClasses.border}`}>
            <button
              onClick={handleLogout}
              className={`
                group flex items-center rounded-lg text-sm font-medium
                transition-all duration-200 relative w-full
                ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'}
                ${themeClasses.text} ${themeClasses.textHover} ${themeClasses.hover}
              `}
              title="Déconnexion"
            >
              <LogOut size={20} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="ml-3 hidden lg:block">
                  Déconnexion
                </span>
              )}
              {/* Tooltip pour mode collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Déconnexion
                </div>
              )}
            </button>
            
            {!isCollapsed && (
              <div className="hidden lg:block text-xs text-gray-400 text-center mt-3">
                © {new Date().getFullYear()} CYBERGARD AI
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 lg:ml-0">
        {/* Header avec bouton menu mobile */}
        <header className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center px-4 py-4">
            {/* Bouton menu mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            
            {/* Logo mobile */}
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-900">CYBERGARD AI</h1>
            </div>
          </div>
        </header>

        {/* Contenu de la page */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

// Composant NavLink
function NavLink({
  href,
  icon: Icon,
  children,
  isActive,
  isCollapsed = false,
  theme = 'admin'
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  children: React.ReactNode;
  isActive: boolean;
  isCollapsed?: boolean;
  theme?: 'admin' | 'client';
}) {
  // Configuration des thèmes pour NavLink
  const getNavThemeClasses = () => {
    const themes = {
      admin: {
        active: 'bg-blue-600',
        text: 'text-gray-300',
        textHover: 'hover:text-white',
        hover: 'hover:bg-gray-700'
      },
      client: {
        active: 'bg-emerald-600',
        text: 'text-slate-300', 
        textHover: 'hover:text-white',
        hover: 'hover:bg-slate-700'
      }
    };
    return themes[theme];
  };

  const navTheme = getNavThemeClasses();
  const baseClasses = `
    group flex items-center rounded-lg text-sm font-medium
    transition-all duration-200 relative
    ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2'}
  `;

  const activeClasses = isActive 
    ? `${navTheme.active} text-white shadow-lg` 
    : `${navTheme.text} ${navTheme.textHover} ${navTheme.hover}`;

  const content = (
    <>
      {/* Icône */}
      <Icon size={20} className="flex-shrink-0" />
      
      {/* Label - caché en mode collapsed */}
      {!isCollapsed && (
        <span className="ml-3 hidden lg:block">
          {children}
        </span>
      )}

      {/* Tooltip pour mode collapsed */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {children}
        </div>
      )}

      {/* Indicateur actif */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-lg" />
      )}
    </>
  );

  return (
    <Link 
      href={href} 
      className={`${baseClasses} ${activeClasses}`}
    >
      {content}
    </Link>
  );
}
