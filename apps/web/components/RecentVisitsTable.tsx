"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface VisitRow {
  id: string;
  userEmail: string;
  zoneName: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
}

export default function RecentVisitsTable() {
  const [visits, setVisits] = useState<VisitRow[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("fitflow_token");
    if (!token) return;

    axios
      .get<VisitRow[]>(
        "http://localhost:3001/api/v1/dashboard/recent-visits?limit=20",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .then((res) => setVisits(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (visits.length === 0) {
    return <div className="text-sm text-slate-400">No recent visits yet.</div>;
  }

  return (
    <div className="rounded-lg bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Recent Visits</h3>
      <div className="max-h-72 overflow-auto text-xs">
        <table className="min-w-full border-separate border-spacing-y-1">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">User</th>
              <th className="px-2 py-1 text-left">Zone</th>
              <th className="px-2 py-1 text-left">Check-in</th>
              <th className="px-2 py-1 text-left">Check-out</th>
              <th className="px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id} className="rounded bg-black/20">
                <td className="px-2 py-1 align-top text-slate-100">{v.userEmail}</td>
                <td className="px-2 py-1 align-top text-slate-200">{v.zoneName}</td>
                <td className="px-2 py-1 align-top text-slate-300">
                  {new Date(v.checkInTime).toLocaleString()}
                </td>
                <td className="px-2 py-1 align-top text-slate-300">
                  {v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : "-"}
                </td>
                <td className="px-2 py-1 align-top">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      v.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
