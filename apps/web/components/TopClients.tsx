"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface TopClientRow {
  userId: string;
  email: string;
  visitCount: number;
}

export default function TopClients() {
  const [clients, setClients] = useState<TopClientRow[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    if (!token) return;

    axios
      .get<TopClientRow[]>(
        "http://localhost:3001/api/v1/dashboard/top-clients?limit=10",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .then((res) => setClients(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (clients.length === 0) {
    return <div className="text-sm text-slate-400">No client data yet.</div>;
  }

  return (
    <div className="rounded-lg bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Top Clients by Visits</h3>
      <div className="max-h-72 overflow-auto text-xs">
        <table className="min-w-full border-separate border-spacing-y-1">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">Email</th>
              <th className="px-2 py-1 text-right">Visits</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.userId} className="rounded bg-black/20">
                <td className="px-2 py-1 align-top text-slate-100">{c.email}</td>
                <td className="px-2 py-1 align-top text-right text-slate-50">
                  {c.visitCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
