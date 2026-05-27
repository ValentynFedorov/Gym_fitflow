"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function ReportIncidentButton({
  equipmentId,
  equipmentName,
  onReported,
}: {
  equipmentId: string;
  equipmentName: string;
  onReported?: () => void;
}) {
  const [open, setOpen]     = useState(false);
  const [severity, setSev]  = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [note, setNote]     = useState("");
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await apiFetch("/equipment/incidents", {
        method: "POST",
        body: JSON.stringify({ equipmentId, severity, note: note || undefined }),
      });
      setOpen(false);
      setNote("");
      onReported?.();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30"
        title="Report this equipment as broken"
      >
        Report broken
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-100">
              Report “{equipmentName}”
            </h3>
            <div className="mt-3">
              <label className="text-[11px] uppercase tracking-wide text-slate-400">Severity</label>
              <div className="mt-1 flex gap-1">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSev(s)}
                    className={`flex-1 rounded-md px-2 py-1 text-xs ${severity === s ? "bg-emerald-500 text-slate-900" : "bg-slate-900 text-slate-200"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              placeholder="What's wrong? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-3 w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
              <button onClick={submit} disabled={busy} className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50">
                {busy ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
