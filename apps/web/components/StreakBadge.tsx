"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, getAuth } from "../lib/api";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string | null;
}

export default function StreakBadge() {
  const [data, setData] = useState<StreakData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const { userId } = getAuth();
    if (!userId) return;
    apiFetch<StreakData>(`/gamification/streak/${userId}`)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="rounded-2xl bg-surface p-4 text-xs text-red-300">Streak unavailable</div>;
  if (!data) return <div className="rounded-2xl bg-surface p-4 text-xs text-slate-400">Loading streak…</div>;

  const onFire = data.currentStreak > 0;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-4 rounded-2xl p-4 shadow-lg ${onFire ? "bg-gradient-to-r from-orange-500/30 via-rose-500/20 to-amber-500/30 shadow-amber-500/20" : "bg-surface"}`}
    >
      <div className="text-4xl">{onFire ? "🔥" : "💤"}</div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wide text-slate-400">Current Streak</div>
        <div className="text-2xl font-bold text-amber-200">
          {data.currentStreak}
          <span className="ml-1 text-xs font-medium text-slate-400">day{data.currentStreak === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Longest: <span className="font-mono text-slate-200">{data.longestStreak}</span>
        </div>
      </div>
      <div className="text-right text-[10px] text-slate-400">
        <div>Next milestone</div>
        <div className="font-mono text-amber-300">
          {nextMilestone(data.currentStreak)} days
        </div>
      </div>
    </motion.div>
  );
}

function nextMilestone(current: number): number {
  for (const m of [3, 7, 30, 100, 365]) if (m > current) return m;
  return current + 100;
}
