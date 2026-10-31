import type { NextRequest } from "next/server";
const localHost = (host: string) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(host);
export function connection(request: NextRequest) {
  const host = (
    request.headers.get("host") || request.nextUrl.host
  ).toLowerCase();
  const local =
    !process.env.VERCEL &&
    localHost(request.nextUrl.hostname) &&
    localHost(new URL(`http://${host}`).hostname) &&
    (process.env.NODE_ENV !== "production" ||
      process.env.RELISH_LOCAL_AI_ENABLED === "true");
  const allowed = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`);
  for (const origin of (process.env.RELISH_AI_ORIGINS || "").split(",")) {
    try {
      const url = new URL(origin.trim());
      if (url.protocol === "https:") allowed.push(url.origin);
    } catch {}
  }
  const origin = local
    ? `${request.nextUrl.protocol}//${host}`
    : `https://${host}`;
  return { local, origin, hosted: !local && allowed.includes(origin) };
}
