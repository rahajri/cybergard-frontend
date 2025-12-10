// src/components/common/Modal.tsx
"use client";

import { ReactNode, useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const max = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[size];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${max} max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5`}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white">
            <div className="text-lg font-semibold">{title}</div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Fermer">✕</button>
          </div>
          <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-56px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
