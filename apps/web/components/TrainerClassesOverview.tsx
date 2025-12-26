"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrainerClassRow {
  id: string;
  title: string;
  description?: string | null;
  zoneName: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookingsCount: number;
}

export default function TrainerClassesOverview() {
  const [rows, setRows] = useState<TrainerClassRow[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    if (!token) {
      setRows([]);
      return;
    }

    fetch("http://localhost:3001/api/v1/classes/trainer", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load trainer classes");
        return res.json();
      })
      .then((data) => setRows(data as TrainerClassRow[]))
      .catch((e) => {
        console.error(e);
        setRows([]);
      });
  }, []);

  const safeRows = Array.isArray(rows) ? rows : [];
  const totalClasses = safeRows.length;
  const totalBookings = safeRows.reduce((sum, c) => sum + c.bookingsCount, 0);
  const totalCapacity = safeRows.reduce((sum, c) => sum + c.capacity, 0);
  const fillRate = totalCapacity ? Math.round((totalBookings / totalCapacity) * 100) : 0;

  const chartData = safeRows.map((c) => ({
    label: c.title.slice(0, 12) + (c.title.length > 12 ? "…" : ""),
    bookings: c.bookingsCount,
    capacity: c.capacity,
  }));

  return (
    <section className="rounded-2xl bg-surface p-4 text-xs text-slate-200">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">My upcoming classes</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Upcoming classes" value={totalClasses} />
        <StatCard label="Total bookings" value={totalBookings} />
        <StatCard label="Avg. fill rate" value={`${fillRate}%`} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1.3fr,1fr]">
        <div className="h-52">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[11px] text-slate-400">
              No upcoming classes yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="capacity" fill="rgba(148,163,184,0.4)" />
                <Bar dataKey="bookings" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="max-h-52 overflow-y-auto rounded-md bg-black/30 p-2">
          {safeRows.map((c) => (
            <div key={c.id} className="mb-2 rounded bg-black/40 p-2 last:mb-0">
              <div className="flex items-center justify-between text-[11px] text-slate-100">
                <span className="font-semibold">{c.title}</span>
                <span className="text-slate-400">
                  {c.bookingsCount}/{c.capacity}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                {c.zoneName} • {new Date(c.startTime).toLocaleString()}
              </div>
            </div>
          ))}
          {safeRows.length === 0 && (
            <div className="text-center text-[11px] text-slate-500">
              You have no upcoming classes.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-50">{value}</div>
    </div>
  );
}
