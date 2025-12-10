// 🔧 ViewModal.tsx avec le style original restauré + liste d’exigences scrollable

"use client";

import React, { useEffect, useState } from "react";

export interface ControlPoint {
  id: string;
  code?: string;
  title?: string;
  name?: string;
  description?: string;
  domain?: string;
  category?: string;
  subdomain?: string;
  criticality?: string;
  criticality_level?: string;
  effort_estimation?: number;
  estimated_effort_hours?: number;
  ai_confidence?: number;
  requirements_count?: number;
  mapped_requirements_count?: number;
  mapped_requirements?: unknown[];
  [key: string]: unknown;
}

interface ViewModalProps {
  cp: ControlPoint | null;
  onClose: () => void;
}

const ViewModal: React.FC<ViewModalProps> = ({ cp, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [detailedCp, setDetailedCp] = useState<ControlPoint | null>(null);

  // Charger les détails
  useEffect(() => {
    if (!cp?.id) {
      setDetailedCp(null);
      return;
    }

    setLoading(true);
    fetch(`/api/v1/control-points/${cp.id}`)
      .then((response) => (response.ok ? response.json() : cp))
      .then((data) => setDetailedCp({ ...cp, ...data }))
      .catch(() => setDetailedCp(cp))
      .finally(() => setLoading(false));
  }, [cp]);

  // Gestion scroll et escape (style original)
  React.useEffect(() => {
    if (!cp) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEsc);
    };
  }, [cp, onClose]);

  // Fonction helper pour convertir en string sûr
  const safeString = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "object") {
      if ((value as any).name) return String((value as any).name);
      if ((value as any).code) return String((value as any).code);
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (!cp) return null;

  const currentCp = detailedCp || cp;

  // --- NORMALISATION DES EXIGENCES (style original) ---
  type Req = {
    id?: string;
    official_code?: string;
    code?: string;
    reference?: string;
    title?: string;
    description?: string;
    chapter?: string;
    framework_name?: string;
    framework?: string;
  };

  const normalizeRequirements = (obj: unknown): Req[] => {
    if (!obj) return [];
    const cp = obj as Record<string, unknown>;
    const candidates =
      cp.mapped_requirements ??
      cp.requirements ??
      cp.mappings ??
      cp.mappedRequirements ??
      [];

    const list = Array.isArray((candidates as Record<string, unknown>)?.items) ? (candidates as Record<string, unknown>).items : candidates;
    if (!Array.isArray(list)) return [];
    return list as Req[];
  };

  const reqs = normalizeRequirements(currentCp);
  const reqCount = (currentCp as any)?.mapped_requirements_count ?? reqs.length;

  // --- badge criticité (style original) ---
  const CritBadge = ({ value }: { value?: string }) => {
    if (!value) return <span className="text-gray-400">—</span>;
    const V = value.toUpperCase();
    let cls =
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
    if (V === "CRITICAL") cls += " bg-red-100 text-red-700";
    else if (V === "HIGH") cls += " bg-orange-100 text-orange-700";
    else if (V === "MEDIUM") cls += " bg-amber-100 text-amber-700";
    else if (V === "LOW") cls += " bg-green-100 text-green-700";
    else cls += " bg-gray-100 text-gray-700";

    const icon =
      V === "CRITICAL"
        ? "🔴"
        : V === "HIGH"
        ? "🟠"
        : V === "MEDIUM"
        ? "🟡"
        : V === "LOW"
        ? "🟢"
        : "⚪";
    return (
      <span className={cls}>
        <span>{icon}</span> {V}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {/* Panel: style original avec max-h-[90vh] */}
        <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          {/* Header sticky - style original */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 backdrop-blur px-6 py-4">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">
                Détails — {currentCp?.code ?? "Point"}
              </div>
              <h3 className="truncate text-xl font-semibold">
                {currentCp?.name ?? currentCp?.title ?? "—"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>

          {/* Corps scrollable - style original */}
          <div className="max-h-[calc(90vh-64px-64px)] overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-gray-600">Chargement des détails...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Col 1: infos générales */}
                <div className="space-y-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Code
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold">
                      {safeString(currentCp?.code)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Domaine
                    </div>
                    <div className="mt-1 text-[15px] font-medium text-gray-900">
                      {safeString(currentCp?.domain ?? currentCp?.category)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Sous-domaine
                    </div>
                    <div className="mt-1 text-[15px] font-medium text-gray-900">
                      {safeString(currentCp?.subdomain)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Criticité
                    </div>
                    <div className="mt-1">
                      <CritBadge
                        value={currentCp?.criticality ?? currentCp?.criticality_level}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Effort estimé
                    </div>
                    <div className="mt-1 text-[15px] font-medium text-gray-900">
                      {String(
                        currentCp?.effort_estimation ??
                          currentCp?.estimated_effort_hours ??
                          0
                      )}
                      h
                    </div>
                  </div>

                  {currentCp?.ai_confidence && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Confiance IA
                      </div>
                      <div className="mt-1 text-[15px] font-medium text-gray-900">
                        {Math.round((currentCp.ai_confidence || 0) * 100)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Col 2: Description + rationale */}
                <div className="space-y-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Description
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-900">
                      {safeString(
                        currentCp?.description || "Aucune description disponible"
                      )}
                    </div>
                  </div>

                  {!!(currentCp as Record<string, unknown>)?.rationale && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Rationale IA
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 italic">
                        {safeString((currentCp as Record<string, unknown>).rationale)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Col 3: Exigences mappées - maintenant SCROLLABLE */}
                <div className="space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                      Exigences mappées ({reqCount} élément{reqCount !== 1 ? "s" : ""})
                    </div>

                    {reqCount === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                        <div className="text-sm text-gray-500">
                          Aucune exigence liée
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Les mappings peuvent être générés automatiquement
                        </div>
                        <button
                          onClick={() => {
                            fetch("/api/v1/control-points/create-mappings", {
                              method: "POST",
                            })
                              .then(() => {
                                if (cp) {
                                  fetch(`/api/v1/control-points/${cp.id}`)
                                    .then((r) => (r.ok ? r.json() : cp))
                                    .then((data) => setDetailedCp({ ...cp, ...data }))
                                    .catch(() => {});
                                }
                              })
                              .catch(console.error);
                          }}
                          className="mt-3 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                        >
                          Générer les mappings
                        </button>
                      </div>
                    ) : (
                      // 👉 Conteneur scrollable dédié
                      <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3">
                        {reqs.map((req, idx) => (
                          <div
                            key={req.id ?? idx}
                            className="rounded-lg border bg-gray-50/50 p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                {/* Code officiel en badge */}
                                {(req.official_code || req.code || req.reference) && (
                                  <div className="mb-2">
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-mono text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                      {safeString(
                                        req.official_code || req.code || req.reference
                                      )}
                                    </span>
                                  </div>
                                )}

                                {/* Titre */}
                                <div className="text-sm font-medium text-gray-900">
                                  {safeString(req.title || "Exigence sans titre")}
                                </div>

                                {/* Infos supplémentaires */}
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                  {req.chapter && (
                                    <span>📖 {safeString(req.chapter)}</span>
                                  )}
                                  {(req.framework_name || req.framework) && (
                                    <span>
                                      🏷️ {safeString(req.framework_name || req.framework)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer avec méta-infos - style original */}
          <div className="sticky bottom-0 z-10 border-t bg-gray-50/80 backdrop-blur px-6 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                Dernière mise à jour:{" "}
                {(currentCp as Record<string, unknown>)?.updated_at
                  ? new Date((currentCp as Record<string, unknown>).updated_at as string).toLocaleString("fr-FR")
                  : "—"}
              </div>
              {!!(currentCp as Record<string, unknown>)?.status && (
                <div className="font-medium">Statut: {String((currentCp as Record<string, unknown>).status)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewModal;
