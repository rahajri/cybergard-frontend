// ❌ PAS de 'use client' ici : layout côté serveur = ordre CSS stable
import "@/app/globals.css";
import Link from "next/link";
import { Shield } from "lucide-react";
import Sidebar from "./sidebar.client"; // composant client (voir plus bas)
import { AdminLayoutWrapper } from "./admin-layout-wrapper";

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayoutWrapper>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Sidebar (client) */}
        <aside className="bg-slate-900 text-white border-r border-slate-800 flex-shrink-0 relative z-30">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 min-w-0">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </AdminLayoutWrapper>
  );
}
