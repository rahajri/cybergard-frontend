'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  FileText,
  Target,
  HelpCircle,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  FileBarChart,
  GitCompare,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

// Sous-menu Points de contrôle
const pointsControleSubMenuItems = [
  { icon: GitCompare, label: "Cross référentiels", href: "/admin/points-controle/cross-referentiels", color: "bg-violet-600" },
  { icon: Link2, label: "Mapping", href: "/admin/points-controle/mapping-validation", color: "bg-cyan-600" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPointsControleExpanded, setIsPointsControleExpanded] = useState(false);

  // Vérifier si on est sur une page Points de contrôle
  const isPointsControleActive = pathname.startsWith("/admin/points-controle");

  // Ouvrir automatiquement le sous-menu si on est sur une page Points de contrôle
  useEffect(() => {
    if (isPointsControleActive) {
      setIsPointsControleExpanded(true);
    }
  }, [isPointsControleActive]);

  // Toggle du sous-menu Points de contrôle
  const togglePointsControleMenu = () => {
    setIsPointsControleExpanded((prev) => !prev);
  };

  const coreMenuItems = [
    { icon: Shield, label: "Dashboard", href: "/admin/dashboard", color: "bg-blue-600" },
    { icon: FileText, label: "Référentiels", href: "/admin/referentiels", color: "bg-indigo-600" },
    // Points de contrôle sera géré séparément avec sous-menu
    { icon: HelpCircle, label: "Questionnaires", href: "/admin/questionnaires", color: "bg-pink-600" },
  ] as const;

  const clientMenuItems = [
    { icon: Building2, label: "Clients", href: "/admin/clients", color: "bg-emerald-600" },
    { icon: FileBarChart, label: "Rapports", href: "/admin/reports/templates", color: "bg-violet-600" },
  ] as const;

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      document.cookie = "token=; path=/; max-age=0";
      document.cookie = "user=; path=/; max-age=0";
    } catch {}
    router.push("/login");
  };

  return (
    <div
      className={[
        "h-full flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
      ].join(" ")}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex-shrink-0">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          {/* --- Logo (shared) --- */}
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-center flex-shrink-0"
            title="Accueil"
          >
            <Image
              src="/logo-cyberguard.png"
              alt="Logo CYBERGARD AI"
              width={60}
              height={60}
              className="object-contain scale-[1.25] -translate-y-[1px]"
              priority
            />
          </Link>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base leading-tight truncate">CYBERGARD AI</h1>
              <p className="text-xs text-slate-400 truncate">Administration</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle */}
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
            Gestion
          </p>
        )}

        {/* Dashboard */}
        {coreMenuItems.slice(0, 1).map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
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
                <span className="font-medium text-sm truncate">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Référentiels */}
        {coreMenuItems.slice(1, 2).map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
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
                <span className="font-medium text-sm truncate">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Points de contrôle avec sous-menu */}
        <div className="relative">
          {/* Bouton Points de contrôle */}
          <button
            type="button"
            onClick={togglePointsControleMenu}
            className={[
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
              isPointsControleActive
                ? "bg-purple-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
              isCollapsed ? "justify-center" : "",
            ].join(" ")}
            title={isCollapsed ? "Points de contrôle" : undefined}
          >
            <Target className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="font-medium text-sm truncate flex-1 text-left">Points de contrôle</span>
                <ChevronDown
                  className={[
                    "w-4 h-4 transition-transform duration-200",
                    isPointsControleExpanded ? "rotate-180" : "",
                  ].join(" ")}
                />
              </>
            )}
          </button>

          {/* Sous-menu Points de contrôle */}
          {!isCollapsed && isPointsControleExpanded && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-1">
              {/* Lien vers page principale */}
              <Link
                href="/admin/points-controle"
                className={[
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                  pathname === "/admin/points-controle"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                ].join(" ")}
              >
                <Target className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Vue d'ensemble</span>
              </Link>
              {pointsControleSubMenuItems.map((subItem) => {
                const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/");
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
              <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 min-w-[180px]">
                <Link
                  href="/admin/points-controle"
                  className={[
                    "flex items-center gap-3 px-4 py-2 transition-all text-sm",
                    pathname === "/admin/points-controle"
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white",
                  ].join(" ")}
                >
                  <Target className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Vue d'ensemble</span>
                </Link>
                {pointsControleSubMenuItems.map((subItem) => {
                  const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/");
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

        {/* Questionnaires */}
        {coreMenuItems.slice(2).map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
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
                <span className="font-medium text-sm truncate">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Séparateur */}
        <div className="py-2">
          <div className="border-t border-slate-700"></div>
        </div>

        {!isCollapsed && (
          <p className="text-xs text-slate-500 uppercase font-semibold mb-3 px-3">
            Configuration
          </p>
        )}

                {clientMenuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
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
                <span className="font-medium text-sm truncate">
                  {item.label}
                </span>
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
              A
            </div>
            <Button
              type="button"
              onClick={handleLogout}
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
