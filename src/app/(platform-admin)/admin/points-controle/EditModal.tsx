"use client";
import { useEffect, useState } from "react";

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
  effort_estimation?: number;
  ai_confidence?: number;
}

export default function EditModal({
  cp,
  onClose,
  onSaved,
}: {
  cp: ControlPoint | null;
  onClose: () => void;
  onSaved: (updated: ControlPoint) => void;
}) {
  const [form, setForm] = useState<ControlPoint | null>(cp);
  useEffect(() => setForm(cp), [cp]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const save = async () => {
    if (!form?.id) return onClose();
    const res = await fetch(`/api/v1/control-points/${form.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = res.ok ? await res.json() : null;
    onSaved((data?.control_point ?? form) as ControlPoint);
    onClose();
  };

  if (!cp || !form) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white">
            <h3 className="text-lg font-semibold">Modifier – {cp.code ?? "Point"}</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Fermer">✕</button>
          </div>

          <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-56px-56px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-sm text-gray-600 mb-1">Nom</label>
                <input className="w-full rounded-xl border px-3 py-2"
                       value={form.name ?? form.title ?? ""}
                       onChange={(e) => setForm({ ...form, name: e.target.value, title: e.target.value })} />
                <label className="block text-sm text-gray-600 mb-1 mt-4">Domaine</label>
                <input className="w-full rounded-xl border px-3 py-2"
                       value={form.domain ?? ""}
                       onChange={(e) => setForm({ ...form, domain: e.target.value })} />
                <label className="block text-sm text-gray-600 mb-1 mt-4">Sous-domaine</label>
                <input className="w-full rounded-xl border px-3 py-2"
                       value={form.subdomain ?? ""}
                       onChange={(e) => setForm({ ...form, subdomain: e.target.value })} />
                <label className="block text-sm text-gray-600 mb-1 mt-4">Criticité</label>
                <select className="w-full rounded-xl border px-3 py-2"
                        value={String(form.criticality ?? "MEDIUM")}
                        onChange={(e) => setForm({ ...form, criticality: e.target.value })}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea rows={6} className="w-full rounded-xl border px-3 py-2"
                          value={form.description ?? ""}
                          onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Effort (h)</label>
                    <input type="number" className="w-full rounded-xl border px-3 py-2"
                           value={form.effort_estimation ?? 0}
                           onChange={(e) => setForm({ ...form, effort_estimation: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Confiance IA</label>
                    <input type="number" min={0} max={1} step={0.01}
                           className="w-full rounded-xl border px-3 py-2"
                           value={form.ai_confidence ?? 0}
                           onChange={(e) => setForm({ ...form, ai_confidence: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border">Annuler</button>
            <button onClick={save} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
