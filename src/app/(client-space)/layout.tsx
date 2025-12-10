// ❌ Pas de 'use client' ici : layout côté serveur (stabilité CSS)
import "@/app/globals.css";
import "@/app/styles/page-header.css";
import "@/app/styles/client-header.css";
import SidebarClient from "./sidebar.client"; // notre composant client (voir plus bas)
import { ClientLayoutWrapper } from "./client-layout-wrapper";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientLayoutWrapper>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Sidebar Client */}
        <aside className="bg-slate-900 text-white border-r border-slate-800 flex-shrink-0 relative z-30">
          <SidebarClient />
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 min-w-0">
          {children}
        </main>
      </div>
    </ClientLayoutWrapper>
  );
}
