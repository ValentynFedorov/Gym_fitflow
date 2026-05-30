"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WrappedPdfButton from "../../../components/WrappedPdfButton";
import Heatmap from "../../../components/Heatmap";

interface FavoriteZone {
  name: string;
  count: number;
}

interface VisitTimelineEntry {
  id: string;
  date: string;
  durationMin: number;
  zoneName: string;
}

interface MonthlyReport {
  month: number;
  year: number;
  totalVisits: number;
  totalMinutes: number;
  totalCalories: number;
  favoriteZones: FavoriteZone[];
  visitsTimeline: VisitTimelineEntry[];
}

const slidesOrder = ["overview", "favorites", "timeline"] as const;
type SlideKey = (typeof slidesOrder)[number];

export default function WrappedPage() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [slide, setSlide] = useState<SlideKey>("overview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    const userId = localStorage.getItem("fitflow_userId");
    if (!token || !userId) {
      setError("Please log in to view your Wrapped.");
      return;
    }

    fetch(
      `http://localhost:3001/api/v1/gamification/monthly-report/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load report");
        return res.json();
      })
      .then((data) => setReport(data as MonthlyReport))
      .catch((e) => {
        console.error(e);
        setError("Could not load Wrapped report.");
      });
  }, []);

  const currentIndex = slidesOrder.indexOf(slide);

  const next = () =>
    setSlide(slidesOrder[(currentIndex + 1) % slidesOrder.length]);
  const prev = () =>
    setSlide(
      slidesOrder[(currentIndex - 1 + slidesOrder.length) %
        slidesOrder.length],
    );

  // Read userId only after mount — reading from localStorage during SSR
  // returns null while the client immediately has a value, which causes a
  // hydration mismatch on the <Heatmap> branch below.
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setUserId(localStorage.getItem("fitflow_userId"));
  }, []);

  return (
    <main className="space-y-6">
      {report && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">FitFlow Wrapped • {String(report.month).padStart(2, "0")}/{report.year}</h2>
          <WrappedPdfButton report={report} />
        </div>
      )}
      <div className="relative h-[540px] w-full overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/90 shadow-[0_0_120px_rgba(56,189,248,0.35)]">
        {error && !report && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            {error}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="absolute inset-0 p-8"
          >
            {!report ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Generating your FitFlow Wrapped…
              </div>
            ) : slide === "overview" ? (
              <OverviewSlide report={report} />
            ) : slide === "favorites" ? (
              <FavoritesSlide report={report} />
            ) : (
              <TimelineSlide report={report} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-8 text-[11px] text-slate-400">
          <button
            onClick={prev}
            className="rounded-full border border-slate-600/60 bg-black/30 px-3 py-1 hover:border-emerald-400 hover:text-emerald-300"
          >
            Prev
          </button>
          <div className="flex gap-2">
            {slidesOrder.map((key) => (
              <span
                key={key}
                className={`h-1.5 w-6 rounded-full ${
                  key === slide ? "bg-emerald-400" : "bg-slate-600/50"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="rounded-full border border-slate-600/60 bg-black/30 px-3 py-1 hover:border-sky-400 hover:text-sky-300"
          >
            Next
          </button>
        </div>
      </div>
      {userId && <Heatmap userId={userId} days={90} title="Your last 90 days" />}
    </main>
  );
}

function OverviewSlide({ report }: { report: MonthlyReport }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-6">
      <div className="text-xs uppercase tracking-[0.25em] text-emerald-300">
        FitFlow Wrapped
      </div>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {report.month}/{report.year} was{" "}
        <span className="bg-gradient-to-br from-emerald-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
          your power month
        </span>
        .
      </h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Sessions" value={report.totalVisits} />
        <StatCard label="Minutes Trained" value={report.totalMinutes} />
        <StatCard
          label="Calories Burned (est.)"
          value={report.totalCalories}
        />
      </div>
      <p className="max-w-md text-xs text-slate-400">
        These numbers are based on your check-ins, durations, and estimated energy output.
        Imagine what next month will look like if you keep this streak.
      </p>
    </div>
  );
}

function FavoritesSlide({ report }: { report: MonthlyReport }) {
  const zones = report.favoriteZones.slice(0, 4);
  return (
    <div className="flex h-full flex-col justify-center space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        Your favorite playgrounds
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {zones.map((z) => (
          <StatCard key={z.name} label={z.name} value={`${z.count} visits`} />
        ))}
      </div>
      <p className="max-w-md text-xs text-slate-400">
        These are the zones where you spent most of your time. Each session shapes a
        different part of your performance profile.
      </p>
    </div>
  );
}

function TimelineSlide({ report }: { report: MonthlyReport }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        Your month as a timeline
      </h2>
      <div className="max-h-72 space-y-2 overflow-y-auto text-xs">
        {report.visitsTimeline.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2"
          >
            <div>
              <div className="font-semibold text-slate-100">
                {new Date(v.date).toLocaleDateString()} — {v.zoneName}
              </div>
              <div className="text-[11px] text-slate-400">{v.durationMin} min</div>
            </div>
          </div>
        ))}
      </div>
      <p className="max-w-md text-xs text-slate-400">
        Every dot on this timeline is proof you showed up. That&apos;s what separates
        intention from progress.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-black/40 px-4 py-3 shadow-inner shadow-emerald-500/15">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-50">{value}</div>
    </div>
  );
}
