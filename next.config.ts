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
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  async redirects() {
    return [
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
