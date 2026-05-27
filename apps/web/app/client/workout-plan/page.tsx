"use client";

import { useState } from "react";
import { apiFetch } from "../../../lib/api";

type Goal  = "lose_fat" | "gain_mass" | "endurance" | "general";
type Level = "beginner" | "intermediate" | "advanced";

interface WorkoutPlan {
  summary: string;
  notes: string[];
  source: "ai" | "mock";
  weeklySchedule: {
    day: number;
    focus: string;
    exercises: { name: string; sets: number; reps: string; restSec: number }[];
  }[];
}

export default function WorkoutPlanPage() {
  const [form, setForm] = useState({
    goal: "gain_mass" as Goal,
    level: "intermediate" as Level,
    daysPerWeek: 3,
    minutesPerSession: 60,
    equipment: "full_gym" as "full_gym" | "bodyweight",
  });
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const data = await apiFetch<WorkoutPlan>("/ai/workout-plan", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setPlan(data);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">AI workout plan</h2>
      <p className="text-xs text-slate-400">
        Generate a personalised weekly plan. Powered by Claude when the API key is configured, otherwise a template plan tailored to your inputs.
      </p>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Goal"
          value={form.goal}
          onChange={(v) => setForm({ ...form, goal: v as Goal })}
          options={[
            { value: "lose_fat",  label: "Lose fat" },
            { value: "gain_mass", label: "Gain mass" },
            { value: "endurance", label: "Endurance" },
            { value: "general",   label: "General fitness" },
          ]}
        />
        <Select
          label="Level"
          value={form.level}
          onChange={(v) => setForm({ ...form, level: v as Level })}
          options={[
            { value: "beginner",     label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced",     label: "Advanced" },
          ]}
        />
        <NumberField label="Days / week" min={1} max={7} value={form.daysPerWeek}
          onChange={(v) => setForm({ ...form, daysPerWeek: v })} />
        <NumberField label="Min / session" min={20} max={120} step={5} value={form.minutesPerSession}
          onChange={(v) => setForm({ ...form, minutesPerSession: v })} />
        <Select
          label="Equipment"
          value={form.equipment}
          onChange={(v) => setForm({ ...form, equipment: v as any })}
          options={[
            { value: "full_gym",    label: "Full gym" },
            { value: "bodyweight",  label: "Bodyweight only" },
          ]}
        />
        <div className="sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate plan"}
          </button>
        </div>
      </form>

      {err && <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{err}</div>}

      {plan && (
        <section className="space-y-4">
          <div className="rounded-2xl bg-surface p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Your plan</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.source === "ai" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-200"}`}>
                {plan.source === "ai" ? "Claude" : "Template"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{plan.summary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.weeklySchedule.map((d) => (
              <div key={d.day} className="rounded-2xl bg-surface p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold text-slate-100">Day {d.day}</h4>
                  <span className="text-[10px] text-slate-400">{d.focus}</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-200">
                  {d.exercises.map((ex, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 last:border-none">
                      <span>{ex.name}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {ex.sets}×{ex.reps} • rest {ex.restSec}s
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {plan.notes.length > 0 && (
            <div className="rounded-2xl bg-surface p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-100">Coach notes</h4>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                {plan.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function NumberField({
  label, value, onChange, min, max, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-slate-400">{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(Number(e.target.value))}
             className="w-full rounded-md bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500" />
    </label>
  );
}
