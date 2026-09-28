import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Der Service Worker muss immer frisch geladen werden, sonst bleiben Geräte auf einer alten Fassung.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: "/c/:path*", destination: "/:path*" }];
  },
};

export default nextConfig;
