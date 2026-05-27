"use client";

import { useCallback } from "react";

// Lightweight celebrate hook: pulls canvas-confetti only on demand (dynamic
// import keeps initial bundle small) and plays a short ding via WebAudio so
// we don't ship a 200 KB audio asset. Falls back silently if the browser
// blocks autoplay or canvas access.
export function useCelebrate() {
  return useCallback(async (opts: { intensity?: "small" | "big" } = {}) => {
    const intensity = opts.intensity ?? "small";
    try {
      const mod = await import("canvas-confetti");
      const confetti = mod.default;
      const count = intensity === "big" ? 200 : 80;
      confetti({
        particleCount: count,
        spread: intensity === "big" ? 100 : 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#38bdf8", "#fbbf24", "#f472b6"],
      });
    } catch {
      // canvas-confetti not installed yet — silently skip
    }

    // Mute check via localStorage so the user can toggle.
    if (typeof window !== "undefined" && localStorage.getItem("fitflow_muted") === "1") return;

    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.20, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.start();
      o.stop(ctx.currentTime + 0.4);
    } catch {
      // ignore audio errors
    }
  }, []);
}
