"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "qrcode.react";

interface PassData {
  userId: string;
  membershipType?: string;
  status: string;
  qrToken: string;
}

export default function MyPass() {
  const [pass, setPass] = useState<PassData | null>(null);

  useEffect(() => {
    // In a real app, attach auth and call a dedicated endpoint.
    axios
      .get("http://localhost:3001/api/v1/mock/my-pass")
      .then((res) => setPass(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!pass) {
    return <div className="text-sm text-slate-400">Loading pass...</div>;
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface p-4 md:flex-row md:items-center">
      <div className="flex-1 space-y-1">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Membership
        </div>
        <div className="text-lg font-semibold text-slate-50">
          {pass.membershipType ?? "FitFlow Pass"}
        </div>
        <div className="text-xs text-slate-400">Status: {pass.status}</div>
      </div>
      <div className="flex items-center justify-center rounded-lg bg-black/20 p-3">
        <QRCode value={pass.qrToken} size={120} bgColor="#020617" fgColor="#38bdf8" />
      </div>
    </div>
  );
}
