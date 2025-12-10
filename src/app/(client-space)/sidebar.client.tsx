'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Target,
  FileBarChart,
  Building2,
  Layers,
  Users,
  Shield,
  ShieldAlert,
  Settings,
  MessageSquare,
  Radar,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";

// Sous-menu Administration
const adminSubMenuItems = [
  { icon: Building2, label: "Organismes", href: "/client/administration", color: "bg-emerald-600" },
  { icon: Layers, label: "Pôles & Catégories", href: "/client/administration/poles-categories", color: "bg-blue-600" },
  { icon: Users, label: "Utilisateurs", href: "/client/administration/users", color: "bg-indigo-600" },
  { icon: Shield, label: "Rôles", href: "/client/administration/roles", color: "bg-purple-600" },
] as const;

export default function SidebarClient() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const { logout } = useAuth();

  // Vérifier si on est sur une page Administration
  const isAdminActive = pathname.startsWith("/client/administration");

  // Ouvrir automatiquement le sous-menu si on est sur une page Administration
  useEffect(() => {
    if (isAdminActive) {
      setIsAdminExpanded(true);
    }
  }, [isAdminActive]);

  // Menu principal - Espace Client (sans Administration qui sera traité séparément)
  const mainMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/client/dashboard", color: "bg-blue-600" },
    { icon: Target, label: "Campagnes", href: "/client/campagnes", color: "bg-purple-600" },
    { icon: ClipboardList, label: "Questionnaires", href: "/client/questionnaires", color: "bg-pink-600" },
    { icon: ListChecks, label: "Actions", href: "/client/actions", color: "bg-orange-600" },
  ] as const;

  // Menu Gestion des risques
  const riskMenuItems = [
    { icon: ShieldAlert, label: "EBIOS RM", href: "/client/ebios", color: "bg-red-600" },
  ] as const;

  // Menu Communication
  const communicationMenuItems = [
    { icon: MessageSquare, label: "Discussions", href: "/client/discussions", color: "bg-teal-600" },
  ] as const;

  // Menu Configuration
  const configMenuItems = [
    { icon: FileBarChart, label: "Rapports", href: "/client/configuration/rapports", color: "bg-violet-600" },
  ] as const;

  // Toggle du sous-menu Administration
  const toggleAdminMenu = () => {
    setIsAdminExpanded((prev) => !prev);
  };

  return (
    <div
      className={[
        "h-full flex flex-col transition-all duration-300 ease-in-out bg-slate-900",
        isCollapsed ? "w-16" : "w-64",
      ].join(" ")}
    >
      {/* Header avec Logo */}
      <div className="p-6 border-b border-slate-800 flex-shrink-0">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <Link
            href="/client/dashboard"
            className="flex items-center justify-center flex-shrink-0"
            title="Accueil"
          >
            <Image
              src="/logo-cyberguard.png"
              alt="Logo CyberGard"
              width={60}
              height={60}
              className="object-contain"
              priority
            />
          </Link>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base leading-tight text-white truncate">
                CYBERGARD AI
              </h1>
              <p className="text-xs text-slate-400 truncate">Espace Client</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
        title={isCollapsed ? "Étendre le menu" : "Réduire le menu"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-300" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-xs text-slate-500 uppercase font-semibold mb-3 px-3">
            Espace Client
          </p>
        )}

        {/* Dashboard */}
        {mainMenuItems.slice(0, 1).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? `${item.color} text-white shadow-lg`
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                isCollapsed ? "justify-center" : "",
              ].join(" ")}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Administration avec sous-menu */}
        <div className="relative">
          {/* Bouton Administration */}
          <button
            type="button"
            onClick={toggleAdminMenu}
            className={[
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
              isAdminActive
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
              isCollapsed ? "justify-center" : "",
            ].join(" ")}
            title={isCollapsed ? "Administration" : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="font-medium text-sm truncate flex-1 text-left">Administration</span>
                <ChevronDown
                  className={[
                    "w-4 h-4 transition-transform duration-200",
                    isAdminExpanded ? "rotate-180" : "",
                  ].join(" ")}
                />
              </>
            )}
          </button>

          {/* Sous-menu Administration */}
          {!isCollapsed && isAdminExpanded && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-1">
              {adminSubMenuItems.map((subItem) => {
                const isSubActive = pathname === subItem.href;
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={[
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                      isSubActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white",
                    ].join(" ")}
                  >
                    <subItem.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{subItem.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Tooltip pour mode collapsed */}
          {isCollapsed && (
            <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
              <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 min-w-[160px]">
                {adminSubMenuItems.map((subItem) => {
                  const isSubActive = pathname === subItem.href;
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={[
                        "flex items-center gap-3 px-4 py-2 transition-all text-sm",
                        isSubActive
                          ? "bg-slate-700 text-white"
                          : "text-slate-300 hover:bg-slate-700 hover:text-white",
                      ].join(" ")}
                    >
                      <subItem.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reste des items du menu principal */}
        {mainMenuItems.slice(1).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? `${item.color} text-white shadow-lg`
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                isCollapsed ? "justify-center" : "",
              ].join(" ")}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Séparateur Gestion des risques */}
        <div className="py-2">
          <div className="border-t border-slate-700"></div>
        </div>

        {!isCollapsed && (
          <p className="text-xs text-slate-500 uppercase font-semibold mb-3 px-3">
            Gestion des risques
          </p>
        )}

        {riskMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? `${item.color} text-white shadow-lg`
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                isCollapsed ? "justify-center" : "",
              ].join(" ")}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Séparateur Sécurité Technique */}
        <div className="py-2">
          <div className="border-t border-slate-700"></div>
        </div>

        {!isCollapsed && (
          <p className="text-xs text-slate-500 uppercase font-semibold mb-3 px-3">
            Sécurité Technique
          </p>
        )}

        {/* Scanner de vulnérabilités */}
        {(() => {
          const isScannerActive = pathname.startsWith("/client/scanner");
          return (
            <Link
              href="/client/scanner"
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isScannerActive
                  ? "bg-cyan-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                isCollapsed ? "justify-center" : "",
              ].join(" ")}
              title={isCollapsed ? "Scanner" : undefined}
            >
              <Radar className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm truncate">Scanner</span>
              )}
            </Link>
          );
        })()}

        {/* Séparateur Configuration */}
        <div className="py-2">
          <div className="border-t border-slate-700"></div>
        </div>

        {!isCollapsed && (
          <p className="text-xs text-slate-500 uppercase font-semibold mb-3 px-3">
            Configuration
          </p>
        )}

        {configMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? `${item.color} text-white shadow-lg`
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                isCollapsed ? "justify-center" : "",
              ].join(" ")}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Séparateur Communication */}
        <div className="py-2">
          <div className="border-t border-slate-700"></div>
        </div>

        {!isCollapsed && (
          <p className="text-xs text-slate-500 uppercase font-semibold mb-3 px-3">
            Communication
          </p>
        )}

        {communicationMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? `${item.color} text-white shadow-lg`
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                isCollapsed ? "justify-center" : "",
              ].join(" ")}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer avec NotificationBell et UserMenu */}
      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        {!isCollapsed ? (
          <div className="space-y-3">
            {/* Notification Bell */}
            <div className="flex justify-center">
              <NotificationBell />
            </div>
            {/* User Menu */}
            <UserMenu />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* Notification Bell en mode collapsed */}
            <NotificationBell />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-800 to-red-900 flex items-center justify-center text-white font-bold">
              C
            </div>
            <Button
              type="button"
              onClick={logout}
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-red-900/40 hover:text-red-100"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
