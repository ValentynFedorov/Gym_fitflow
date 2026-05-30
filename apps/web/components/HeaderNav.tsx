"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import GymStatusBadge from "./GymStatusBadge";

const CLIENT_LINKS = [
  { href: "/client",                label: "Overview" },
  { href: "/client/classes",        label: "Classes" },
  { href: "/client/equipment",      label: "Equipment" },
  { href: "/client/metrics",        label: "Metrics" },
  { href: "/client/workout-plan",   label: "AI Plan" },
  { href: "/dashboard/wrapped",     label: "Wrapped" },
];

const ADMIN_LINKS = [
  { href: "/admin",                label: "Dashboard" },
  { href: "/admin/floor-plan",     label: "Floor Plan" },
  { href: "/admin/classes",        label: "Classes" },
  { href: "/admin/equipment",      label: "Equipment" },
  { href: "/admin/hours",          label: "Hours" },
  { href: "/dashboard/wrapped",    label: "Wrapped" },
];

const TRAINER_LINKS = [
  { href: "/admin",                label: "Trainer Console" },
  { href: "/admin/floor-plan",     label: "Floor Plan" },
  { href: "/admin/classes",        label: "My Classes" },
  { href: "/dashboard/wrapped",    label: "Members Wrapped" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRole = localStorage.getItem("fitflow_role");
    setRole(storedRole);
  }, []);

  const onLogout = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("fitflow_token");
    localStorage.removeItem("fitflow_role");
    localStorage.removeItem("fitflow_userId");
    router.push("/");
  };

  let links: { href: string; label: string }[] = [];
  if (role === "ADMIN") links = ADMIN_LINKS;
  else if (role === "TRAINER") links = TRAINER_LINKS;
  else if (role === "CLIENT") links = CLIENT_LINKS;

  if (!role) {
    return (
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          FitFlow <span className="text-accent-emerald">OS</span>
        </h1>
        <nav className="flex items-center gap-3 text-sm text-slate-300">
          <GymStatusBadge />
          <ThemeToggle />
          <button
            onClick={() => router.push("/")}
            className="rounded-full bg-accent-blue px-4 py-1 text-xs font-semibold text-slate-900"
          >
            Login
          </button>
        </nav>
      </header>
    );
  }

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">
        FitFlow <span className="text-accent-emerald">OS</span>
      </h1>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`rounded-full px-3 py-1 transition ${
                active
                  ? "bg-accent-blue text-slate-900"
                  : "bg-surface text-slate-200 hover:bg-slate-700/70"
              }`}
            >
              {link.label}
            </button>
          );
        })}
        <GymStatusBadge />
        <ThemeToggle />
        <button
          onClick={onLogout}
          className="ml-2 rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:border-red-400 hover:text-red-300"
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
