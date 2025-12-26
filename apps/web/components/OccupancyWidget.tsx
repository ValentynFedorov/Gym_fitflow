"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface ZoneOccupancy {
  zoneId: string;
  current: number;
  max: number;
}

export default function OccupancyWidget() {
  const [zones, setZones] = useState<Record<string, ZoneOccupancy>>({});

  useEffect(() => {
    const socket: Socket = io("http://localhost:3001", {
      transports: ["websocket"],
    });

    socket.on("occupancy_update", (data: ZoneOccupancy) => {
      setZones((prev) => ({ ...prev, [data.zoneId]: data }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const values = Object.values(zones);

  if (values.length === 0) {
    return <div className="text-sm text-slate-400">Awaiting occupancy data...</div>;
  }

  return (
    <div className="space-y-3">
      {values.map((z) => {
        const pct = Math.round((z.current / z.max) * 100);
        return (
          <div key={z.zoneId} className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Zone {z.zoneId}</span>
              <span>
                {z.current}/{z.max} ({pct}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-black/40">
              <div
                className="h-2 rounded-full bg-accent-blue"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
