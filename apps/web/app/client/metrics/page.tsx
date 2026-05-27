"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiFetch, getAuth } from "../../../lib/api";

interface Metric {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  bodyFatPct: number | null;
}

interface Summary {
  hasData: boolean;
  latest?: Metric;
  since?: string;
  delta?: { weightKg: number | null; waistCm: number | null; chestCm: number | null; bodyFatPct: number | null };
  count?: number;
}

export default function MetricsPage() {
  const [list, setList] = useState<Metric[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ weightKg: "", waistCm: "", chestCm: "", bodyFatPct: "", note: "" });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { userId } = getAuth();
    if (!userId) return;
    try {
      const [l, s] = await Promise.all([
        apiFetch<Metric[]>(`/metrics/users/${userId}?days=365`),
        apiFetch<Summary>(`/metrics/users/${userId}/summary`),
      ]);
      setList(l); setSummary(s);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { userId } = getAuth();
    if (!userId) return;
    setBusy(true);
    try {
      const body: Record<string, any> = {};
      if (form.weightKg)   body.weightKg   = Number(form.weightKg);
      if (form.waistCm)    body.waistCm    = Number(form.waistCm);
      if (form.chestCm)    body.chestCm    = Number(form.chestCm);
      if (form.bodyFatPct) body.bodyFatPct = Number(form.bodyFatPct);
      if (form.note)       body.note       = form.note;
      await apiFetch(`/metrics/users/${userId}`, { method: "POST", body: JSON.stringify(body) });
      setForm({ weightKg: "", waistCm: "", chestCm: "", bodyFatPct: "", note: "" });
      await refresh();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const chartData = list.map((m) => ({
    date: new Date(m.recordedAt).toLocaleDateString(),
    weight: m.weightKg,
    waist: m.waistCm,
    fat: m.bodyFatPct,
  }));

  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">Body metrics</h2>

      {err && <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{err}</div>}

      {/* Summary cards */}
      {summary?.hasData && summary.latest && summary.delta && (
        <section className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Weight"   value={summary.latest.weightKg}    unit="kg" delta={summary.delta.weightKg}    invert />
          <SummaryCard label="Waist"    value={summary.latest.waistCm}     unit="cm" delta={summary.delta.waistCm}     invert />
          <SummaryCard label="Chest"    value={summary.latest.chestCm}     unit="cm" delta={summary.delta.chestCm} />
          <SummaryCard label="Body fat" value={summary.latest.bodyFatPct}  unit="%"  delta={summary.delta.bodyFatPct}  invert />
        </section>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <section className="rounded-2xl bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Progress over time</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#34d399" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="waist"  name="Waist (cm)"  stroke="#f472b6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="fat"    name="Fat (%)"     stroke="#fb923c" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Add new entry */}
      <section className="rounded-2xl bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Log a measurement</h3>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[
            { k: "weightKg",   label: "Weight (kg)" },
            { k: "waistCm",    label: "Waist (cm)" },
            { k: "chestCm",    label: "Chest (cm)" },
            { k: "bodyFatPct", label: "Body fat (%)" },
          ].map((f) => (
            <label key={f.k} className="block text-xs">
              <span className="mb-1 block text-slate-400">{f.label}</span>
              <input
                type="number" step="0.1"
                value={(form as any)[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          ))}
          <label className="block text-xs sm:col-span-2 md:col-span-3">
            <span className="mb-1 block text-slate-400">Note</span>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="self-end rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      {/* Recent */}
      {list.length > 0 && (
        <section className="rounded-2xl bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Recent entries</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 pr-3 text-left">Date</th>
                  <th className="py-1 pr-3 text-right">Weight</th>
                  <th className="py-1 pr-3 text-right">Waist</th>
                  <th className="py-1 pr-3 text-right">Chest</th>
                  <th className="py-1 pr-3 text-right">Fat %</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {list.slice().reverse().map((m) => (
                  <tr key={m.id} className="border-t border-slate-800">
                    <td className="py-1 pr-3">{new Date(m.recordedAt).toLocaleDateString()}</td>
                    <td className="py-1 pr-3 text-right font-mono">{m.weightKg ?? "—"}</td>
                    <td className="py-1 pr-3 text-right font-mono">{m.waistCm ?? "—"}</td>
                    <td className="py-1 pr-3 text-right font-mono">{m.chestCm ?? "—"}</td>
                    <td className="py-1 pr-3 text-right font-mono">{m.bodyFatPct ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function SummaryCard({
  label, value, unit, delta, invert,
}: { label: string; value: number | null; unit: string; delta: number | null; invert?: boolean }) {
  const better = delta == null ? null : invert ? delta < 0 : delta > 0;
  const sign   = delta == null ? "" : delta > 0 ? "+" : "";
  const color  = better == null ? "text-slate-400" : better ? "text-emerald-300" : "text-rose-300";
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-100">
        {value != null ? value : "—"} <span className="text-xs font-normal text-slate-400">{unit}</span>
      </div>
      {delta != null && (
        <div className={`mt-1 text-xs font-mono ${color}`}>
          {sign}{delta} {unit} <span className="text-slate-500">vs ~30d ago</span>
        </div>
      )}
    </div>
  );
}
