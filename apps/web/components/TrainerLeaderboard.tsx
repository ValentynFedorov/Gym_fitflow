"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Row {
  rank: number;
  trainerId: string;
  email: string;
  name: string | null;
  avgStars: number;
  ratingsCount: number;
}

export default function TrainerLeaderboard({ limit = 10 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr]   = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Row[]>(`/ratings/leaderboard?limit=${limit}`)
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, [limit]);

  if (err) return <div className="rounded-2xl bg-surface p-4 text-xs text-red-300">{err}</div>;

  return (
    <div className="rounded-2xl bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Top trainers</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No ratings yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.trainerId} className="flex items-center justify-between text-xs text-slate-200">
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 text-right font-mono text-slate-500">{r.rank}.</span>
                <span>{r.name ?? r.email}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <span className="font-mono">{r.avgStars.toFixed(2)}</span>
                <span>★</span>
                <span className="text-[10px] text-slate-500">({r.ratingsCount})</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
