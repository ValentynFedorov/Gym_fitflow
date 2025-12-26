"use client";

import { useEffect, useState } from "react";

interface ClientClassRow {
  id: string;
  title: string;
  description?: string | null;
  trainerEmail: string;
  zoneName: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookingsCount: number;
  isFull: boolean;
  isBooked: boolean;
  bookingId: string | null;
}

export default function ClientClassesPage() {
  const [rows, setRows] = useState<ClientClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("fitflow_token");
      if (!token) {
        setRows([]);
        return;
      }

      const res = await fetch("http://localhost:3001/api/v1/classes/client", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json()) as ClientClassRow[];
      setRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onToggle = async (row: ClientClassRow) => {
    try {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("fitflow_token");
      if (!token) return;

      if (row.isBooked) {
        await fetch(`http://localhost:3001/api/v1/classes/${row.id}/book`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        await fetch(`http://localhost:3001/api/v1/classes/${row.id}/book`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Classes</h2>
      {loading && (
        <div className="text-xs text-slate-400">Loading classes…</div>
      )}
      <div className="rounded-2xl bg-surface p-4 text-xs text-slate-200">
        <table className="min-w-full border-separate border-spacing-y-1">
          <thead className="text-slate-400">
            <tr>
              <th className="px-2 py-1 text-left">Title</th>
              <th className="px-2 py-1 text-left">Time</th>
              <th className="px-2 py-1 text-left">Zone</th>
              <th className="px-2 py-1 text-right">Spots</th>
              <th className="px-2 py-1 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="rounded bg-black/30">
                <td className="px-2 py-1">
                  <div className="font-semibold text-slate-100">{c.title}</div>
                  {c.description && (
                    <div className="text-[10px] text-slate-400">
                      {c.description}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1 text-slate-300">
                  {new Date(c.startTime).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-slate-200">{c.zoneName}</td>
                <td className="px-2 py-1 text-right text-slate-100">
                  {c.bookingsCount}/{c.capacity}
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    onClick={() => onToggle(c)}
                    disabled={c.isFull && !c.isBooked}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      c.isBooked
                        ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        : c.isFull
                        ? "bg-slate-700/40 text-slate-500"
                        : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    }`}
                  >
                    {c.isBooked ? "Cancel" : c.isFull ? "Full" : "Book"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-slate-500">
                  No upcoming classes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
