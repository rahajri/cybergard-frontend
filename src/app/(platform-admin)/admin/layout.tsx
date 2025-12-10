// src/app/(platform-admin)/admin/layout.tsx
import React from "react";

// 🧱 Import des styles globaux Admin
import "@/app/styles/page-header.css";
import "@/app/styles/points-controle.css";
import "@/app/styles/import-referentiels.css";
import "@/app/styles/referentiels.css";
import "@/app/styles/questionnaires.css";
import "@/app/styles/questionnaires-generation.css";
import "@/app/styles/admin-header.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ On englobe toutes les pages admin dans une div .admin
  return <div className="admin">{children}</div>;
}
