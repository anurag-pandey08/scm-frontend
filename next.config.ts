import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    // Connectivity detection, and automatic retry of navigations that were
    // blocked by a dropped line. It is also what makes `useOffline` report
    // anything — without the flag the hook is always `false`.
    useOffline: true,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // The worker decides what every other request does, so it is the one
        // file that must never be served from a stale cache.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
}

export default nextConfig
