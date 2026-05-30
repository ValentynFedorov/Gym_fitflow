"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Trainer { id: string; email: string; profileData: any }
interface Zone    { id: string; name: string }

export interface ClassFormSeed {
  id?: string;
  title?: string;
  description?: string;
  trainerId?: string;
  zoneId?: string;
  startTime?: string;
  endTime?: string;
  capacity?: number;
}

// One modal for create + edit. If `seed.id` is set we send PUT, else POST.
export default function ClassFormModal({
  seed = {},
  onClose,
  onSaved,
}: {
  seed?: ClassFormSeed;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [zones, setZones]       = useState<Zone[]>([]);
  const [form, setForm] = useState({
    title:       seed.title ?? "",
    description: seed.description ?? "",
    trainerId:   seed.trainerId ?? "",
    zoneId:      seed.zoneId ?? "",
    startTime:   seed.startTime ? toLocalInput(seed.startTime) : "",
    endTime:     seed.endTime   ? toLocalInput(seed.endTime)   : "",
    capacity:    seed.capacity ?? 15,
  });
  const [err,  setErr]  = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = !!seed.id;

  useEffect(() => {
    Promise.all([
      apiFetch<Trainer[]>("/users?role=TRAINER"),
      apiFetch<Zone[]>("/zones"),
    ])
      .then(([t, z]) => {
        setTrainers(t);
        setZones(z);
        // Pre-fill defaults if not editing.
        if (!editing) {
          setForm((f) => ({
            ...f,
            trainerId: f.trainerId || (t[0]?.id ?? ""),
            zoneId:    f.zoneId    || (z[0]?.id ?? ""),
          }));
        }
      })
      .catch((e) => setErr(e.message));
  }, [editing]);

  async function save() {
    if (!form.title || !form.trainerId || !form.zoneId || !form.startTime || !form.endTime) {
      setErr("All fields except description are required.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      const body: any = {
        title:       form.title,
        description: form.description || undefined,
        trainerId:   form.trainerId,
        zoneId:      form.zoneId,
        startTime:   new Date(form.startTime).toISOString(),
        endTime:     new Date(form.endTime).toISOString(),
        capacity:    Number(form.capacity),
      };
      if (editing) {
        await apiFetch(`/classes/${seed.id}`, { method: "PUT",  body: JSON.stringify(body) });
      } else {
        await apiFetch("/classes",            { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
      onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-100">
          {editing ? "Edit class" : "Create class"}
        </h3>
        <div className="mt-3 space-y-2">
          <Field label="Title">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                   className={inputCls} placeholder="Evening HIIT" />
          </Field>
          <Field label="Description">
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                   className={inputCls} placeholder="High intensity cardio…" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Trainer">
              <select value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} className={inputCls}>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>{t.profileData?.name ?? t.email}</option>
                ))}
              </select>
            </Field>
            <Field label="Zone">
              <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className={inputCls}>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start">
              <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} />
            </Field>
            <Field label="End">
              <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Capacity">
            <input type="number" min={1} max={500} value={form.capacity}
                   onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                   className={inputCls} />
          </Field>
        </div>
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50">
            {busy ? "Saving…" : editing ? "Save changes" : "Create"}
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

// Convert ISO string → "YYYY-MM-DDTHH:mm" expected by datetime-local input.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
