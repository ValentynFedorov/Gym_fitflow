import FitFlowHeroCanvas from "../components/hero/FitFlowHeroCanvas";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.25),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(59,130,246,0.25),_transparent_60%)]" />
      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4">
        <div className="grid w-full items-center gap-10 md:grid-cols-[1.1fr,1fr]">
          <div className="space-y-5">
            <h1 className="bg-gradient-to-br from-emerald-300 via-sky-300 to-fuchsia-300 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
              Log in to your gym OS
            </h1>
            <p className="max-w-md text-sm text-slate-300 md:text-base">
              FitFlow OS connects your staff, trainers, and members in real time: smart check-ins,
              live occupancy, class booking, and gamified progress tracking.
            </p>
            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Admins get full control over classes, equipment, and live metrics. Trainers manage
                sessions and keep an eye on their top members. Clients see their XP, classes, and
                monthly "Wrapped".
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-xs md:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300"
              >
                Login / Sign up
              </Link>
              <a
                href="#demo-roles"
                className="inline-flex items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/40 px-5 py-2 text-slate-200 backdrop-blur transition hover:border-emerald-400/60 hover:text-emerald-200"
              >
                Learn how roles work
              </a>
            </div>
          </div>
          <div className="h-[320px] md:h-[420px]">
            <FitFlowHeroCanvas />
          </div>
        </div>
        <section id="demo-roles" className="mt-12 grid w-full gap-4 text-xs md:grid-cols-3">
          <div className="rounded-2xl bg-surface/80 p-4">
            <h3 className="mb-1 text-sm font-semibold text-emerald-300">Admins</h3>
            <p className="text-slate-300">
              See live occupancy, top clients, equipment status, and manage classes and memberships
              from a single dashboard.
            </p>
          </div>
          <div className="rounded-2xl bg-surface/80 p-4">
            <h3 className="mb-1 text-sm font-semibold text-sky-300">Trainers</h3>
            <p className="text-slate-300">
              Manage your classes, monitor attendance, and follow member progress to keep them
              engaged.
            </p>
          </div>
          <div className="rounded-2xl bg-surface/80 p-4">
            <h3 className="mb-1 text-sm font-semibold text-fuchsia-300">Clients</h3>
            <p className="text-slate-300">
              Book classes, track XP and levels, and relive your month with a Spotify Wrapped-style
              recap.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
