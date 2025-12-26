"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LeaderboardRow {
  rank: number;
  userId: string;
  email: string;
  xpTotal: number;
  level: number;
}

export default function LeaderboardTile() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    if (!token) return;

    fetch("http://localhost:3001/api/v1/gamification/leaderboard?limit=10", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setRows(data as LeaderboardRow[]))
      .catch((e) => console.error(e));
  }, []);

  return (
    <div className="rounded-2xl bg-surface p-4 text-xs shadow-lg shadow-fuchsia-500/10 backdrop-blur">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Global Leaderboard
      </h3>
      <div className="space-y-1">
        {rows.map((row) => (
          <motion.div
            key={row.userId}
            className="flex items-center justify-between rounded-md bg-black/30 px-2 py-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-emerald-300">
                #{row.rank}
              </span>
              <span className="truncate text-[11px] text-slate-100">
                {row.email}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                Lv {row.level}
              </span>
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-300">
                {row.xpTotal} XP
              </span>
            </div>
          </motion.div>
        ))}
        {rows.length === 0 && (
          <div className="text-[10px] text-slate-500">
            No leaderboard data yet.
          </div>
        )}
      </div>
    </div>
  );
}
