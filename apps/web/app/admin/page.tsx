"use client";

import { useEffect, useState } from 'react';
import DashboardStats from '../../components/DashboardStats';
import OccupancyWidget from '../../components/OccupancyWidget';
import RecentVisitsTable from '../../components/RecentVisitsTable';
import TopClients from '../../components/TopClients';
import AdminEventStreamTile from '../../components/AdminEventStreamTile';
import LeaderboardTile from '../../components/LeaderboardTile';
import TrainerClassesOverview from '../../components/TrainerClassesOverview';
import Heatmap from '../../components/Heatmap';
import TrainerLeaderboard from '../../components/TrainerLeaderboard';

export default function AdminDashboardPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setRole(localStorage.getItem('fitflow_role'));
  }, []);

  if (role === 'TRAINER') {
    return (
      <main className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Trainer Console</h2>
          <div className="flex gap-2 text-xs text-slate-300">
            <a href="/admin" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
              Overview
            </a>
            <a href="/admin/classes" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
              My Classes
            </a>
            <a href="/admin/equipment" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
              Equipment
            </a>
            <a href="/dashboard/wrapped" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
              Members Wrapped
            </a>
          </div>
        </div>
        <TrainerClassesOverview />
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">
              Live Occupancy
            </h3>
            <OccupancyWidget />
          </div>
          <LeaderboardTile />
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Admin Dashboard</h2>
        <div className="flex gap-2 text-xs text-slate-300">
          <a href="/admin" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
            Overview
          </a>
          <a href="/admin/classes" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
            Classes
          </a>
          <a href="/admin/equipment" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
            Equipment
          </a>
          <a href="/dashboard/wrapped" className="rounded-full bg-surface px-3 py-1 hover:text-emerald-300">
            Wrapped Demo
          </a>
        </div>
      </div>
      <DashboardStats />
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">
            Live Occupancy
          </h3>
          <OccupancyWidget />
        </div>
        <TopClients />
        <AdminEventStreamTile />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Heatmap days={90} title="Visits — last 90 days (everyone)" />
        </div>
        <TrainerLeaderboard />
      </section>
      <section className="mt-4">
        <RecentVisitsTable />
      </section>
    </main>
  );
}
