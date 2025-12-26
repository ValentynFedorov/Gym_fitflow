"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Stats {
  activeMembers: number;
  activeSubscriptions: number;
  totalVisits: number;
  visitsByHour: { hour: number; count: number }[];
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    if (!token) return;

    axios
      .get("http://localhost:3001/api/v1/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStats(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!stats) {
    return <div className="text-sm text-slate-400">Loading stats...</div>;
  }

  return (
    <section className="rounded-lg bg-surface p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active Members" value={stats.activeMembers} />
        <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} />
        <StatCard label="Total Visits" value={stats.totalVisits} />
      </div>
      <div className="mt-6 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.visitsByHour}>
            <XAxis dataKey="hour" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#38bdf8"
              fill="rgba(56,189,248,0.2)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-black/20 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-50">{value}</div>
    </div>
  );
}
