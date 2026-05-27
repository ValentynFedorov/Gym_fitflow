"use client";

import { useEffect, useState } from "react";
import IncidentInbox from "../../../components/IncidentInbox";
import ReportIncidentButton from "../../../components/ReportIncidentButton";
import { apiFetch } from "../../../lib/api";

interface EquipmentRow {
  id: string;
  name: string;
  type: string;
  status: string;
  serialNumber?: string | null;
  lastServiceAt?: string | null;
  nextServiceAt?: string | null;
  _count?: { incidents: number };
}

export default function AdminEquipmentPage() {
  const [rows, setRows] = useState<EquipmentRow[] | null>(null);
  const [tick, setTick] = useState(0); // bumped after a successful report

  useEffect(() => {
    apiFetch<EquipmentRow[]>("/equipment")
      .then((data) => setRows(data))
      .catch(() => setRows([]));
  }, [tick]);

  const safeRows = Array.isArray(rows) ? rows : [];
  const total = safeRows.length;
  const active = safeRows.filter((e) => e.status === "ACTIVE").length;
  const needsRepair = safeRows.filter((e) => e.status === "NEEDS_REPAIR" || e.status === "NEEDS_SERVICE").length;

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Equipment</h2>

      <section className="grid gap-3 text-xs md:grid-cols-3">
        <StatCard label="Total items" value={total} />
        <StatCard label="Active"      value={active}      tone="emerald" />
        <StatCard label="Needs repair" value={needsRepair} tone="amber" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4 text-xs text-slate-200 lg:col-span-2">
          <table className="min-w-full border-separate border-spacing-y-1">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-1 text-left">Name</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">Open tickets</th>
                <th className="px-2 py-1 text-left">Serial</th>
                <th className="px-2 py-1 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {safeRows.map((e) => (
                <tr key={e.id} className="rounded bg-black/30">
                  <td className="px-2 py-1 text-slate-100">{e.name}</td>
                  <td className="px-2 py-1 text-slate-200">{e.type}</td>
                  <td className="px-2 py-1">
                    <StatusPill status={e.status} />
                  </td>
                  <td className="px-2 py-1 text-slate-300">
                    {e._count?.incidents ? (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                        {e._count.incidents}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-1 text-slate-300">{e.serialNumber ?? "-"}</td>
                  <td className="px-2 py-1">
                    <ReportIncidentButton
                      equipmentId={e.id}
                      equipmentName={e.name}
                      onReported={() => setTick((t) => t + 1)}
                    />
                  </td>
                </tr>
              ))}
              {safeRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-slate-500">
                    No equipment records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <IncidentInbox />
      </section>
    </main>
  );
}

function StatCard({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "emerald" | "amber" }) {
  const colors = {
    slate:   "text-slate-50",
    emerald: "text-emerald-300",
    amber:   "text-amber-300",
  } as const;
  return (
    <div className="rounded-md bg-black/30 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${colors[tone]}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:       "bg-emerald-500/20 text-emerald-300",
    NEEDS_REPAIR: "bg-rose-500/20 text-rose-300",
    NEEDS_SERVICE:"bg-amber-500/20 text-amber-300",
    OUT_OF_ORDER: "bg-slate-600/40 text-slate-200",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? "bg-slate-600/40 text-slate-200"}`}>
      {status}
    </span>
  );
}
