"use client";

import { useEffect, useState } from "react";

interface AdminClassRow {
  id: string;
  title: string;
  description?: string | null;
  trainer: { email: string };
  zone: { name: string };
  startTime: string;
  endTime: string;
  capacity: number;
  _count: { bookings: number };
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<AdminClassRow[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    if (!token) return;

    fetch("http://localhost:3001/api/v1/classes/admin", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setClasses(data as AdminClassRow[]))
      .catch((e) => console.error(e));
  }, []);

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Classes</h2>
      <div className="rounded-2xl bg-surface p-4 text-xs text-slate-200">
        <table className="min-w-full border-separate border-spacing-y-1">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th className="px-2 py-1 text-left">Trainer</th>
              <th className="px-2 py-1 text-left">Zone</th>
              <th className="px-2 py-1 text-left">Start</th>
              <th className="px-2 py-1 text-left">End</th>
              <th className="px-2 py-1 text-right">Bookings</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="rounded bg-black/30">
                <td className="px-2 py-1 text-slate-100">{c.title}</td>
                <td className="px-2 py-1 text-slate-200">{c.trainer.email}</td>
                <td className="px-2 py-1 text-slate-200">{c.zone.name}</td>
                <td className="px-2 py-1 text-slate-300">
                  {new Date(c.startTime).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-slate-300">
                  {new Date(c.endTime).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-right text-slate-100">
                  {c._count.bookings}/{c.capacity}
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-slate-500">
                  No classes scheduled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
