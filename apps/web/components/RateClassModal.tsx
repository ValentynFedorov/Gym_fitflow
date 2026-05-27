"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function RateClassModal({
  classId,
  classTitle,
  onClose,
  onSaved,
}: {
  classId: string;
  classTitle: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [stars, setStars]     = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    try {
      await apiFetch(`/ratings/classes/${classId}`, {
        method: "POST",
        body: JSON.stringify({ stars, comment: comment || undefined }),
      });
      onSaved?.();
      onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-100">Rate “{classTitle}”</h3>
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className={`text-3xl transition ${n <= stars ? "text-amber-400" : "text-slate-700"}`}
              aria-label={`${n} stars`}
            >★</button>
          ))}
        </div>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment…"
          className="mt-3 w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50">
            {busy ? "Saving…" : "Save rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
