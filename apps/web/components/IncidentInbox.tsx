"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiFetch, getAuth } from "../lib/api";

interface Incident {
  id: string;
  equipmentId: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  severity: "LOW" | "MEDIUM" | "HIGH";
  note: string | null;
  createdAt: string;
  resolvedAt: string | null;
  equipment: { id: string; name: string; type: string; status: string };
}

const SEVERITY_COLORS: Record<Incident["severity"], string> = {
  LOW:    "bg-sky-500/20 text-sky-300",
  MEDIUM: "bg-amber-500/20 text-amber-300",
  HIGH:   "bg-rose-500/20 text-rose-300",
};

const STATUS_COLORS: Record<Incident["status"], string> = {
  OPEN:        "bg-rose-500/20 text-rose-300",
  IN_PROGRESS: "bg-amber-500/20 text-amber-300",
  RESOLVED:    "bg-emerald-500/20 text-emerald-300",
};

export default function IncidentInbox() {
  const [items, setItems] = useState<Incident[]>([]);
  const [err, setErr]     = useState<string | null>(null);
  const role = typeof window !== "undefined" ? localStorage.getItem("fitflow_role") : null;
  const canMutate = role === "ADMIN";

  function refresh() {
    apiFetch<Incident[]>("/equipment/incidents")
      .then(setItems)
      .catch((e) => setErr(e.message));
  }
  useEffect(() => { refresh(); }, []);

  // Live updates via socket so the inbox refreshes as soon as someone reports.
  useEffect(() => {
    const socket: Socket = io("http://localhost:3001", { transports: ["websocket"] });
    socket.on("admin_event", (e: any) => {
      if (e?.type === "EQUIPMENT_INCIDENT" || e?.type === "EQUIPMENT_INCIDENT_UPDATED") refresh();
    });
    return () => { socket.disconnect(); };
  }, []);

  async function setStatus(id: string, status: Incident["status"]) {
    try {
      await apiFetch(`/equipment/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      refresh();
    } catch (e: any) { setErr(e.message); }
  }

  if (err) return <div className="rounded-2xl bg-surface p-4 text-xs text-red-300">{err}</div>;

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Equipment incidents</h3>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          {items.filter(i => i.status !== "RESOLVED").length} open
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No incidents — everything is humming.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="rounded-lg bg-black/30 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100">{i.equipment.name}</div>
                <div className="flex items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[i.severity]}`}>{i.severity}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[i.status]}`}>{i.status}</span>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {i.equipment.type} • reported {new Date(i.createdAt).toLocaleString()}
              </div>
              {i.note && <p className="mt-1 text-slate-300">“{i.note}”</p>}
              {canMutate && i.status !== "RESOLVED" && (
                <div className="mt-2 flex gap-2">
                  {i.status === "OPEN" && (
                    <button
                      onClick={() => setStatus(i.id, "IN_PROGRESS")}
                      className="rounded-md bg-amber-500/20 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/30"
                    >
                      Mark in progress
                    </button>
                  )}
                  <button
                    onClick={() => setStatus(i.id, "RESOLVED")}
                    className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/30"
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
