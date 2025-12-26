"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

interface AdminEvent {
  type: string;
  payload: any;
}

export default function AdminEventStreamTile() {
  const [events, setEvents] = useState<AdminEvent[]>([]);

  useEffect(() => {
    const socket: Socket = io("http://localhost:3001", {
      transports: ["websocket"],
    });

    socket.on("admin_event", (event: AdminEvent) => {
      setEvents((prev) => {
        const next = [event, ...prev];
        return next.slice(0, 40);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="h-full rounded-lg bg-surface p-4 text-xs text-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Live Event Stream
        </h3>
        <span className="inline-flex items-center text-[10px] text-emerald-300">
          <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.map((e, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-md bg-black/30 px-2 py-1 text-[10px]"
            >
              <span className="font-semibold text-emerald-400">{e.type}</span>{" "}
              <span className="text-slate-400">
                {JSON.stringify(e.payload)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <div className="mt-4 text-center text-[10px] text-slate-500">
            Waiting for events (check-ins, check-outs, registrations)…
          </div>
        )}
      </div>
    </div>
  );
}
