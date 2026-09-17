import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/c/:path*", destination: "/:path*" },
    ];
  },
};

export default nextConfig;
