"use client";
import { RefreshCw } from "lucide-react";
import { useNewVersion } from "./useNewVersion";

/** Thin bar at the top when a newer Relish has shipped while this tab stayed open. */
export default function UpdateBar({ build }: { build?: string }) {
  const available = useNewVersion(build);
  if (!available) return null;
  return (
    <div className="lb-app lb-update" role="status">
      <span>A new version of Relish is available.</span>
      <button type="button" onClick={() => window.location.reload()}>
        <RefreshCw size={14} aria-hidden="true" /> Reload
      </button>
    </div>
  );
}
