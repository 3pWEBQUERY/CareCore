import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Postgres-Verbindungspool (Railway) nur auf dem Server, nicht gebündelt.
  serverExternalPackages: ["pg"],
  // /api/health vergleicht die angewendeten Migrationen mit den Dateien im Deployment.
  outputFileTracingIncludes: {
    "/api/health": ["./database/migrations/*.sql"],
  },
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
      {
        // Vom Service Worker per importScripts geladen; wird bei jeder Aktualisierung mitgeprüft.
        source: "/sw-crypto.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: "/c/:path*", destination: "/:path*" }];
  },
};

export default nextConfig;
