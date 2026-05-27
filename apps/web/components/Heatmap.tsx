"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface HeatmapData {
  days: number;
  start: string;
  max: number;
  series: { date: string; count: number }[];
}

interface Props {
  userId?: string;     // pass to filter to a single user
  days?: number;       // default 90
  title?: string;
}

const DAYS_OF_WEEK = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function colorFor(count: number, max: number): string {
  if (count === 0) return "rgba(148, 163, 184, 0.10)";   // slate
  const t = max > 0 ? Math.min(1, count / max) : 0;
  // green ramp
  if (t < 0.25) return "rgba(34, 197, 94, 0.30)";
  if (t < 0.5)  return "rgba(34, 197, 94, 0.55)";
  if (t < 0.75) return "rgba(34, 197, 94, 0.80)";
  return "rgba(16, 185, 129, 1)";
}

export default function Heatmap({ userId, days = 90, title = "Attendance heatmap" }: Props) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (userId) qs.set("userId", userId);
    if (days)   qs.set("days", String(days));
    apiFetch<HeatmapData>(`/dashboard/heatmap?${qs.toString()}`)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [userId, days]);

  if (err)  return <div className="rounded-2xl bg-surface p-4 text-xs text-red-300">Heatmap unavailable</div>;
  if (!data) return <div className="rounded-2xl bg-surface p-4 text-xs text-slate-400">Loading heatmap…</div>;

  // Group by week column (Monday-start). Each column = 7 day cells.
  const cells = data.series.map((s) => ({ ...s, jsDay: new Date(s.date).getDay() })); // 0=Sun..6=Sat
  // Convert Sunday(0) to 6, Monday(1) to 0 ... so Monday top.
  const dayIndex = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

  const first = cells[0];
  const padLeading = first ? dayIndex(first.jsDay) : 0;
  const columns: ({ date: string; count: number; jsDay: number } | null)[][] = [];
  let week: ({ date: string; count: number; jsDay: number } | null)[] = Array(padLeading).fill(null);
  for (const c of cells) {
    week.push(c);
    if (week.length === 7) {
      columns.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    columns.push(week);
  }

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          last {days}d • peak {data.max}/day
        </span>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        <div className="flex flex-col justify-between py-1 pr-1 text-[9px] text-slate-500">
          {DAYS_OF_WEEK.map((d) => <span key={d || Math.random()} className="h-3">{d}</span>)}
        </div>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[2px]">
            {col.map((cell, ri) =>
              cell ? (
                <div
                  key={cell.date}
                  className="h-3 w-3 rounded-[2px] transition hover:ring-1 hover:ring-emerald-300"
                  style={{ backgroundColor: colorFor(cell.count, data.max) }}
                  title={`${cell.date}: ${cell.count} visit${cell.count === 1 ? "" : "s"}`}
                />
              ) : (
                <div key={`pad-${ci}-${ri}`} className="h-3 w-3" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
        <span>Less</span>
        {[0, 0.25, 0.55, 0.8, 1].map((t, i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: colorFor(Math.ceil(t * data.max), data.max) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
