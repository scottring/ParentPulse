import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
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
