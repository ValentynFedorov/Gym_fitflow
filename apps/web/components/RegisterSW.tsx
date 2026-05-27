"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Defer until idle so we don't compete with first paint.
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
