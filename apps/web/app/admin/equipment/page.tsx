"use client";

import { useEffect, useState } from "react";

interface EquipmentRow {
  id: string;
  name: string;
  type: string;
  status: string;
  serialNumber?: string | null;
  lastServiceAt?: string | null;
  nextServiceAt?: string | null;
}

export default function AdminEquipmentPage() {
  const [rows, setRows] = useState<EquipmentRow[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    if (!token) {
      setRows([]);
      return;
    }

    fetch("http://localhost:3001/api/v1/equipment", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load equipment");
        return res.json();
      })
      .then((data) => setRows(data as EquipmentRow[]))
      .catch((e) => {
        console.error(e);
        setRows([]);
      });
  }, []);

  const safeRows = Array.isArray(rows) ? rows : [];
  const total = safeRows.length;
  const active = safeRows.filter((e) => e.status === "ACTIVE").length;
  const needsService = safeRows.filter((e) => e.status === "NEEDS_SERVICE").length;

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Equipment</h2>
      <section className="grid gap-3 text-xs md:grid-cols-3">
        <div className="rounded-md bg-black/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Total items</div>
          <div className="mt-1 text-lg font-semibold text-slate-50">{total}</div>
        </div>
        <div className="rounded-md bg-black/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-emerald-300">Active</div>
          <div className="mt-1 text-lg font-semibold text-emerald-300">{active}</div>
        </div>
        <div className="rounded-md bg-black/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-amber-300">Needs service</div>
          <div className="mt-1 text-lg font-semibold text-amber-300">{needsService}</div>
        </div>
      </section>
      <div className="rounded-2xl bg-surface p-4 text-xs text-slate-200">
        <table className="min-w-full border-separate border-spacing-y-1">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1 text-left">Type</th>
              <th className="px-2 py-1 text-left">Status</th>
              <th className="px-2 py-1 text-left">Serial</th>
              <th className="px-2 py-1 text-left">Last Service</th>
              <th className="px-2 py-1 text-left">Next Service</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((e) => (
              <tr key={e.id} className="rounded bg-black/30">
                <td className="px-2 py-1 text-slate-100">{e.name}</td>
                <td className="px-2 py-1 text-slate-200">{e.type}</td>
                <td className="px-2 py-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      e.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : e.status === "NEEDS_SERVICE"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-slate-600/40 text-slate-200"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-2 py-1 text-slate-300">{e.serialNumber ?? "-"}</td>
                <td className="px-2 py-1 text-slate-300">
                  {e.lastServiceAt
                    ? new Date(e.lastServiceAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-2 py-1 text-slate-300">
                  {e.nextServiceAt
                    ? new Date(e.nextServiceAt).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
            {safeRows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-4 text-center text-slate-500"
                >
                  No equipment records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
