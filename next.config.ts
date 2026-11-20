import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: { root: process.cwd() },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        // Every page but the app refuses to be framed. The app's own CSP
        // (src/proxy.ts) lets only the kitchen wall frame it.
        source: "/:path((?!relish).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: "/relish/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/", destination: "/relish/", permanent: false },
      ...[
        "archive",
        "check-in",
        "coach",
        "experiments",
        "family-manual",
        "growth",
        "journal",
        "kid",
        "login",
        "manual",
        "mirror",
        "moments",
        "people",
        "register",
        "rituals",
        "settings",
        "therapy",
        "unspoken",
        "welcome",
        "workbook",
      ].map((route) => ({
        source: `/${route}/:path*`,
        destination: "/relish/",
        permanent: false,
      })),
      {
        source: "/growth",
        destination: "/experiments",
        permanent: true,
      },
      {
        source: "/growth/:itemId",
        destination: "/experiments/:itemId",
        permanent: true,
      },
      {
        source: "/kid/:personId",
        destination: "/check-in/:personId",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
