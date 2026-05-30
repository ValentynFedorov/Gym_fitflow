"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

interface HoursRow {
  dayOfWeek: number;
  openMin:   number;
  closeMin:  number;
  isClosed:  boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function mmToHHMM(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function HHMMtoMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export default function AdminHoursPage() {
  const [rows, setRows] = useState<HoursRow[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const [okMsg, setOk]  = useState<string | null>(null);

  function load() {
    apiFetch<HoursRow[]>("/gym-hours").then(setRows).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  function patch(idx: number, p: Partial<HoursRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...p } : row)));
  }

  async function save(idx: number) {
    const row = rows[idx];
    setBusy(idx); setErr(null); setOk(null);
    try {
      await apiFetch(`/gym-hours/${row.dayOfWeek}`, {
        method: "PUT",
        body: JSON.stringify({ openMin: row.openMin, closeMin: row.closeMin, isClosed: row.isClosed }),
      });
      setOk(`${DAY_NAMES[row.dayOfWeek]} saved.`);
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(null); }
  }

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Opening hours</h2>
      <p className="text-xs text-slate-400">
        Set the gym's daily opening window. Check-in is blocked outside these hours so we never log 3-am visits.
      </p>

      {err   && <div className="rounded-md bg-red-500/10 p-2 text-xs text-red-300">{err}</div>}
      {okMsg && <div className="rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-300">{okMsg}</div>}

      <div className="rounded-2xl bg-surface p-4">
        <table className="min-w-full border-separate border-spacing-y-1 text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">Day</th>
              <th className="px-2 py-1 text-left">Open</th>
              <th className="px-2 py-1 text-left">Close</th>
              <th className="px-2 py-1 text-left">Closed all day</th>
              <th className="px-2 py-1 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.dayOfWeek} className="rounded bg-black/30">
                <td className="px-2 py-2 text-slate-100">{DAY_NAMES[r.dayOfWeek]}</td>
                <td className="px-2 py-2">
                  <input
                    type="time"
                    value={mmToHHMM(r.openMin)}
                    disabled={r.isClosed}
                    onChange={(e) => patch(idx, { openMin: HHMMtoMM(e.target.value) })}
                    className="rounded-md bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="time"
                    value={mmToHHMM(r.closeMin)}
                    disabled={r.isClosed}
                    onChange={(e) => patch(idx, { closeMin: HHMMtoMM(e.target.value) })}
                    className="rounded-md bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={r.isClosed}
                    onChange={(e) => patch(idx, { isClosed: e.target.checked })}
                    className="h-4 w-4 accent-emerald-500"
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={() => save(idx)}
                    disabled={busy === idx}
                    className="rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900 disabled:opacity-50"
                  >
                    {busy === idx ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
