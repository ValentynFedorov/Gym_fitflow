"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function EquipmentFormModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name:         "",
    type:         "CARDIO",
    serialNumber: "",
    status:       "ACTIVE",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  async function save() {
    if (!form.name || !form.type) {
      setErr("Name and type are required.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      await apiFetch("/equipment", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          serialNumber: form.serialNumber || undefined,
          status: form.status,
        }),
      });
      onSaved();
      onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-100">Add equipment</h3>
        <div className="mt-3 space-y-2">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                   className={inputCls} placeholder="Treadmill A3" />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option value="CARDIO">CARDIO</option>
              <option value="STRENGTH">STRENGTH</option>
              <option value="FLEXIBILITY">FLEXIBILITY</option>
              <option value="OTHER">OTHER</option>
            </select>
          </Field>
          <Field label="Serial number">
            <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                   className={inputCls} placeholder="optional" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="NEEDS_REPAIR">NEEDS_REPAIR</option>
              <option value="NEEDS_SERVICE">NEEDS_SERVICE</option>
              <option value="OUT_OF_ORDER">OUT_OF_ORDER</option>
            </select>
          </Field>
        </div>
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50">
            {busy ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px]">
      <span className="mb-1 block uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
