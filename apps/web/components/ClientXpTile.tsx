"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface XpSummary {
  userId: string;
  level: number;
  xpTotal: number;
  xpThisLevel: number;
  xpToNextLevel: number;
}

// Very simple ring using conic-gradient and CSS
export default function ClientXpTile() {
  const [xp, setXp] = useState<XpSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    const userId = localStorage.getItem("fitflow_userId");
    if (!token || !userId) {
      setError("Please log in to see your XP.");
      return;
    }

    fetch(`http://localhost:3001/api/v1/gamification/xp/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load XP");
        return res.json();
      })
      .then((data) => setXp(data as XpSummary))
      .catch((e) => {
        console.error(e);
        setError("Could not load XP.");
      });
  }, []);

  if (error && !xp) {
    return (
      <div className="rounded-2xl bg-surface p-4 text-sm text-slate-400">
        {error}
      </div>
    );
  }

  if (!xp) {
    return (
      <div className="rounded-2xl bg-surface p-4 text-sm text-slate-400">
        Loading level…
      </div>
    );
  }

  const pct = xp.xpToNextLevel
    ? Math.min(1, xp.xpThisLevel / xp.xpToNextLevel)
    : 0;

  const deg = pct * 360;

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 text-sm shadow-lg shadow-emerald-500/10">
      <div
        className="relative h-20 w-20 rounded-full bg-slate-900"
        style={{
          backgroundImage: `conic-gradient(#22c55e ${deg}deg, rgba(15,23,42,0.8) ${deg}deg)`,
        }}
      >
        <div className="absolute inset-1 rounded-full bg-slate-950 flex items-center justify-center">
          <div className="text-center text-xs">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              Level
            </div>
            <div className="text-lg font-semibold text-emerald-300">
              {xp.level}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-1 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span className="uppercase tracking-wide text-[10px] text-slate-400">
            XP Progress
          </span>
          <span className="font-mono text-[11px] text-emerald-300">
            {xp.xpThisLevel}/{xp.xpToNextLevel}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-black/40">
          <motion.div
            className="h-1.5 rounded-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
          />
        </div>
        <div className="text-[10px] text-slate-400">
          Total XP: <span className="font-mono text-slate-200">{xp.xpTotal}</span>
        </div>
      </div>
    </div>
  );
}
