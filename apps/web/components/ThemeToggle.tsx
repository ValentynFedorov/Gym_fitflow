"use client";

import { useEffect, useState } from "react";

const KEY = "fitflow_theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [muted, setMuted] = useState(false);

  // Apply persisted preferences on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem(KEY) as "dark" | "light") ?? "dark";
    setTheme(saved);
    apply(saved);
    setMuted(localStorage.getItem("fitflow_muted") === "1");
  }, []);

  function apply(t: "dark" | "light") {
    document.documentElement.classList.toggle("light", t === "light");
    document.documentElement.classList.toggle("dark",  t === "dark");
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(KEY, next);
    apply(next);
  }
  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("fitflow_muted", next ? "1" : "0");
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        className="rounded-full bg-surface px-2 py-1 text-xs text-slate-200 hover:text-emerald-300"
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </button>
      <button
        onClick={toggleMute}
        title={muted ? "Unmute SFX" : "Mute SFX"}
        className="rounded-full bg-surface px-2 py-1 text-xs text-slate-200 hover:text-emerald-300"
      >
        {muted ? "🔇" : "🔈"}
      </button>
    </div>
  );
}
