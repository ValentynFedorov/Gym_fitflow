"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch } from "../lib/api";

interface ZoneSnapshot {
  id: string;
  name: string;
  x: number; y: number; width: number; height: number;
  color: string;
  maxCapacity: number;
  currentOccupancy: number;
  visits: { id: string; userId: string; checkInTime: string }[];
}

// Pseudo-random but stable [0,1) per id — keeps dot positions still between renders.
function rand(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export default function FloorPlan() {
  const [zones, setZones] = useState<ZoneSnapshot[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // Initial fetch + listen for live updates.
  useEffect(() => {
    let cancelled = false;
    apiFetch<ZoneSnapshot[]>("/dashboard/floor-plan")
      .then((data) => { if (!cancelled) setZones(data); })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const socket: Socket = io("http://localhost:3001", { transports: ["websocket"] });
    const refetch = () =>
      apiFetch<ZoneSnapshot[]>("/dashboard/floor-plan")
        .then(setZones)
        .catch(() => undefined);

    socket.on("occupancy_update", refetch);
    socket.on("admin_event", refetch);
    return () => { socket.disconnect(); };
  }, []);

  const items = useMemo(() => zones, [zones]);

  if (err) return <div className="rounded-2xl bg-surface p-4 text-sm text-red-300">{err}</div>;
  if (items.length === 0)
    return <div className="rounded-2xl bg-surface p-4 text-sm text-slate-400">No zones configured.</div>;

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Live Floor Plan</h3>
        <span className="text-[10px] uppercase tracking-wide text-emerald-300">● Live</span>
      </div>
      <svg viewBox="0 0 100 100" className="aspect-video w-full rounded-lg bg-slate-950">
        {/* Outer wall */}
        <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="0.5" />
        {items.map((z) => {
          const utilization = z.maxCapacity ? z.currentOccupancy / z.maxCapacity : 0;
          const fill = utilization > 0.85 ? "rgba(244,63,94,0.20)"
                     : utilization > 0.5  ? "rgba(245,158,11,0.20)"
                                          : "rgba(56,189,248,0.15)";
          return (
            <g key={z.id}>
              <rect
                x={z.x} y={z.y} width={z.width} height={z.height}
                fill={fill}
                stroke={z.color}
                strokeWidth="0.4"
                rx="1.5"
              />
              <text x={z.x + 1.5} y={z.y + 3.5}
                    fontSize="2.2" fill="#e2e8f0" fontWeight="600">
                {z.name}
              </text>
              <text x={z.x + 1.5} y={z.y + 6.2}
                    fontSize="1.8" fill="#94a3b8">
                {z.currentOccupancy}/{z.maxCapacity}
              </text>
              {z.visits.map((v, i) => {
                const rx = rand(v.id, i) * (z.width - 4) + z.x + 2;
                const ry = rand(v.id, i + 7) * (z.height - 6) + z.y + 4;
                return (
                  <circle key={v.id} cx={rx} cy={ry} r="0.7"
                          fill="#22c55e" stroke="#052e16" strokeWidth="0.15" />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400">
        <span><span className="inline-block h-2 w-2 rounded-full bg-sky-400/60" /> Comfortable</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-amber-400/60" /> Busy &gt;50%</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-rose-400/60" /> Full &gt;85%</span>
      </div>
    </div>
  );
}
