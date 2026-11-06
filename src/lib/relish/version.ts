/**
 * Which deployment this tab is running, baked in at build time. Vercel sets
 * the same commit SHA at build time and at runtime, so the version route and
 * the client agree until a newer build ships. Empty outside Vercel (local dev),
 * which turns the update check off.
 */
export const runningBuild = process.env.NEXT_PUBLIC_RELISH_BUILD || "";

export function liveBuild(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA || "";
}

/** A newer build is live only when both sides know their build and they differ. */
export function isNewerBuild(running: string, live: unknown): boolean {
  return (
    !!running &&
    typeof live === "string" &&
    /^[0-9a-f]{7,64}$/i.test(live) &&
    live !== running
  );
}
