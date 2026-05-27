"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { useCelebrate } from "../lib/useCelebrate";
import { apiFetch, getAuth } from "../lib/api";

interface PassData {
  userId: string;
  membershipType?: string;
  status: string;
  qrToken: string;
}

interface Zone {
  id: string;
  name: string;
  currentOccupancy: number;
  maxCapacity: number;
}

export default function MyPass() {
  const [pass, setPass]   = useState<PassData | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [flash, setFlash] = useState(false);
  const [msg, setMsg]     = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy]   = useState(false);
  const celebrate = useCelebrate();

  useEffect(() => {
    axios
      .get("http://localhost:3001/api/v1/mock/my-pass")
      .then((res) => setPass(res.data))
      .catch((err) => console.error(err));

    apiFetch<Zone[]>("/zones")
      .then((data) => {
        setZones(data);
        if (data.length > 0) setZoneId(data[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function simulateScan() {
    const { token } = getAuth();
    if (!token) {
      setMsg({ kind: "err", text: "Please log in first." });
      return;
    }
    if (!zoneId) {
      setMsg({ kind: "err", text: "Pick a zone first." });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      // Try check-in. If already in gym, fall back to check-out of the latest visit.
      try {
        await apiFetch("/attendance/check-in", {
          method: "POST",
          body: JSON.stringify({ zoneId }),
        });
        setFlash(true); setTimeout(() => setFlash(false), 700);
        await celebrate({ intensity: "small" });
        setMsg({ kind: "ok", text: "Checked in 💪 +XP coming on check-out." });
      } catch (e: any) {
        // Try to find an open visit and check out.
        const open = await apiFetch<any[]>(`/attendance/me/open`).catch(() => []);
        if (open && open.length > 0) {
          await apiFetch(`/attendance/check-out/${open[0].id}`, { method: "POST" });
          setFlash(true); setTimeout(() => setFlash(false), 700);
          await celebrate({ intensity: "big" });
          setMsg({ kind: "ok", text: "Checked out — nice session! XP awarded." });
        } else {
          setMsg({ kind: "err", text: e.message });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (!pass) return <div className="text-sm text-slate-400">Loading pass…</div>;

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1 space-y-1">
          <div className="text-xs uppercase tracking-wide text-slate-400">Membership</div>
          <div className="text-lg font-semibold">{pass.membershipType ?? "FitFlow Pass"}</div>
          <div className="text-xs text-slate-400">Status: {pass.status}</div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <label className="text-slate-400">Zone:</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="rounded-md bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.currentOccupancy}/{z.maxCapacity})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <motion.button
            onClick={simulateScan}
            disabled={busy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="relative flex items-center justify-center rounded-lg bg-black/20 p-3 ring-1 ring-slate-700 hover:ring-emerald-400 disabled:opacity-60"
            aria-label="Simulate QR scan"
            title="Click QR to simulate scanner at entrance"
          >
            <QRCode value={pass.qrToken} size={140} bgColor="#020617" fgColor="#38bdf8" />
            <AnimatePresence>
              {flash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 rounded-lg bg-emerald-300/40"
                />
              )}
            </AnimatePresence>
          </motion.button>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            Tap QR to simulate scan
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mt-3 rounded-md px-3 py-2 text-xs ${msg.kind === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
