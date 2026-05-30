"use client";

import { useEffect, useState } from "react";

interface Status {
  isOpen: boolean;
  reason?: string;
  closesAt?: string;
  opensAt?: string;
}

// Polls /gym-hours/status every minute so the badge stays accurate even if the
// user leaves the tab open across opening/closing time.
export default function GymStatusBadge() {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("http://localhost:3001/api/v1/gym-hours/status")
        .then((r) => r.json())
        .then((data) => { if (!cancelled) setS(data); })
        .catch(() => undefined);
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (!s) return null;

  const time = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "?";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
        s.isOpen
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-rose-500/15 text-rose-300"
      }`}
      title={s.isOpen ? `Closes at ${time(s.closesAt)}` : `Opens at ${time(s.opensAt)}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.isOpen ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
      {s.isOpen ? `Open until ${time(s.closesAt)}` : `Closed — opens ${time(s.opensAt)}`}
    </span>
  );
}
