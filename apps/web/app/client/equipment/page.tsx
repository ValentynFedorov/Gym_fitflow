"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReportIncidentButton from "../../../components/ReportIncidentButton";

interface EquipmentRow {
  id: string;
  name: string;
  type: string;
  status: string;
  _count?: { incidents: number };
}

export default function ClientEquipmentPage() {
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [filter, setFilter] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    apiFetch<EquipmentRow[]>("/equipment")
      .then(setRows)
      .catch(() => setRows([]));
  }, [tick]);

  const filtered = filter
    ? rows.filter((r) =>
        (r.name + r.type).toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Gym equipment</h2>
      <p className="text-xs text-slate-400">
        See something broken? Tap “Report broken” — admins get the ticket instantly.
      </p>

      <input
        type="search"
        placeholder="Search by name or type…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <div className="grid gap-2">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-2xl bg-surface p-3 text-sm">
            <div>
              <div className="font-semibold text-slate-100">{e.name}</div>
              <div className="text-[11px] text-slate-400">
                {e.type} •
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                  {e.status}
                </span>
                {e._count?.incidents ? (
                  <span className="ml-2 text-rose-300">{e._count.incidents} open ticket(s)</span>
                ) : null}
              </div>
            </div>
            <ReportIncidentButton
              equipmentId={e.id}
              equipmentName={e.name}
              onReported={() => setTick((t) => t + 1)}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl bg-surface p-4 text-center text-xs text-slate-400">No equipment.</p>
        )}
      </div>
    </main>
  );
}
