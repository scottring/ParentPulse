import { NextRequest, NextResponse } from "next/server";
// The local vault is especially sensitive to script injection. Restrict active
// content to this app; Firebase is contacted only when the user opens sign-in.
// The kitchen wall (Symphony, app.symphony-os.com) shows Relish full screen in
// a frame so dinner games save to the family's books (Scott, 2026-11-19).
// Only the app pages may be framed, and only by the wall; everything else
// stays unframeable.
export const WALL_ORIGIN = "https://app.symphony-os.com";
export function frameAncestors(pathname: string, dev: boolean): string {
  if (!pathname.startsWith("/relish")) return "'none'";
  return ["'self'", WALL_ORIGIN, ...(dev ? ["http://localhost:*", "http://127.0.0.1:*"] : [])].join(" ");
}
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com${dev ? " ws://127.0.0.1:3210 ws://localhost:3210" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors(request.nextUrl.pathname, dev)}`,
    "frame-src 'none'",
    ...(!dev ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/", "/relish/:path*", "/privacy/:path*"] };
