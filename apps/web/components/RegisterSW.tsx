"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isProd = process.env.NODE_ENV === "production";

    if (!isProd) {
      // In dev, an old SW from a previous run will happily keep serving stale
      // chunks and make code edits look like they did nothing. Tear it down.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => undefined));
      }).catch(() => undefined);
      if ("caches" in window) {
        caches.keys().then((keys) =>
          Promise.all(keys.filter((k) => k.startsWith("fitflow-")).map((k) => caches.delete(k))),
        ).catch(() => undefined);
      }
      return;
    }

    const reg = () =>
      navigator.serviceWorker
        .register("/sw.js")
        .catch((e) => console.warn("SW registration failed", e));
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(reg);
    } else {
      setTimeout(reg, 1500);
    }
  }, []);
  return null;
}
