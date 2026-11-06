"use client";
import { useEffect, useState } from "react";
import { isNewerBuild, runningBuild } from "@/lib/relish/version";

const EVERY = 5 * 60 * 1000;

/**
 * True once a newer Relish build is live than the one this tab (or the iPhone
 * app's web view) loaded. Checks on an interval and whenever the app comes back
 * to the foreground. Best effort: silent when offline, off in local dev.
 */
export function useNewVersion(build = runningBuild): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!build || available) return;
    let cancelled = false;
    const check = async () => {
      if (cancelled || document.hidden) return;
      try {
        const res = await fetch("/api/relish/version/", { cache: "no-store" });
        if (!res.ok) return;
        const { build: live } = (await res.json()) as { build?: unknown };
        if (!cancelled && isNewerBuild(build, live)) setAvailable(true);
      } catch {}
    };
    void check();
    const timer = window.setInterval(() => void check(), EVERY);
    const onShow = () => void check();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [build, available]);
  return available;
}
