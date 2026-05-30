"use client";

import { useEffect, useState } from "react";
import ClassFormModal, { ClassFormSeed } from "../../../components/ClassFormModal";
import { apiFetch } from "../../../lib/api";

interface AdminClassRow {
  id: string;
  title: string;
  description?: string | null;
  trainerId: string;
  zoneId: string;
  trainer: { email: string };
  zone: { name: string };
  startTime: string;
  endTime: string;
  capacity: number;
  _count: { bookings: number };
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<AdminClassRow[]>([]);
  const [err, setErr]         = useState<string | null>(null);
  const [modal, setModal]     = useState<ClassFormSeed | null>(null);
  const [role, setRole]       = useState<string | null>(null);

  useEffect(() => { setRole(localStorage.getItem("fitflow_role")); }, []);

  function refresh() {
    apiFetch<AdminClassRow[]>("/classes/admin")
      .then(setClasses)
      .catch((e) => setErr(e.message));
  }
  useEffect(() => { refresh(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this class? All bookings and ratings will be removed.")) return;
    try {
      await apiFetch(`/classes/${id}`, { method: "DELETE" });
      refresh();
    } catch (e: any) { setErr(e.message); }
  }

  const canCreate = role === "ADMIN" || role === "TRAINER";
  const canDelete = role === "ADMIN";

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Classes</h2>
        {canCreate && (
          <button
            onClick={() => setModal({})}
            className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-slate-900"
          >
            + New class
          </button>
        )}
      </div>

      {err && <div className="rounded-md bg-red-500/10 p-2 text-xs text-red-300">{err}</div>}

      <div className="rounded-2xl bg-surface p-4 text-xs text-slate-200">
        <table className="min-w-full border-separate border-spacing-y-1">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th className="px-2 py-1 text-left">Trainer</th>
              <th className="px-2 py-1 text-left">Zone</th>
              <th className="px-2 py-1 text-left">Start</th>
              <th className="px-2 py-1 text-left">End</th>
              <th className="px-2 py-1 text-right">Bookings</th>
              <th className="px-2 py-1 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="rounded bg-black/30">
                <td className="px-2 py-1 text-slate-100">{c.title}</td>
                <td className="px-2 py-1 text-slate-200">{c.trainer.email}</td>
                <td className="px-2 py-1 text-slate-200">{c.zone.name}</td>
                <td className="px-2 py-1 text-slate-300">{new Date(c.startTime).toLocaleString()}</td>
                <td className="px-2 py-1 text-slate-300">{new Date(c.endTime).toLocaleString()}</td>
                <td className="px-2 py-1 text-right text-slate-100">{c._count.bookings}/{c.capacity}</td>
                <td className="px-2 py-1 text-right">
                  {canCreate && (
                    <button
                      onClick={() =>
                        setModal({
                          id: c.id,
                          title: c.title,
                          description: c.description ?? undefined,
                          trainerId: c.trainerId,
                          zoneId: c.zoneId,
                          startTime: c.startTime,
                          endTime: c.endTime,
                          capacity: c.capacity,
                        })
                      }
                      className="mr-1 rounded-md bg-sky-500/20 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/30"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => remove(c.id)}
                      className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/30"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-slate-500">No classes scheduled.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <ClassFormModal seed={modal} onClose={() => setModal(null)} onSaved={refresh} />
      )}
    </main>
  );
}
