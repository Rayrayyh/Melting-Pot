import type { NextConfig } from "next";

// In this development container, outbound TLS from browsers is blocked by the
// egress policy while server-side Node traffic passes. Setting
// SUPABASE_REWRITE_ORIGIN proxies the browser's Supabase calls same-origin
// through this server (NEXT_PUBLIC_SUPABASE_URL then points at
// http://localhost:3111/supabase). Production leaves it unset and the browser
// talks to Supabase directly. See memory/lessons/004.
const supabaseRewriteOrigin = process.env.SUPABASE_REWRITE_ORIGIN;

// The one Supabase project this app talks to. The CSP below needs it spelled
// out for XHR and realtime websockets, and for storage-served avatar images.
const SUPABASE_ORIGIN = "https://evcfmwxzxwmeiczfupsw.supabase.co";
const SUPABASE_WSS = "wss://evcfmwxzxwmeiczfupsw.supabase.co";

// Production only: dev needs eval for React refresh, and a dev-shaped policy
// would drift from what actually ships. script-src carries 'unsafe-inline'
// because the App Router streams inline hydration scripts and the theme stamp
// in app/layout.tsx is inline; the tighter nonce-based policy through
// proxy.ts is the post-deadline upgrade.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WSS}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Keep visited pages in the browser's router cache. Without this, every
    // page in the app is dynamic, so clicking back to a tab you were just on
    // refetches it from the server and shows the loading boundary again.
    // Two minutes of reuse covers moving between tabs within a sitting; the
    // flows that change data already call router.refresh() afterwards, so a
    // fresh copy still arrives where it matters.
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  async rewrites() {
    if (!supabaseRewriteOrigin) return [];
    return [
      {
        source: "/supabase/:path*",
        destination: `${supabaseRewriteOrigin}/:path*`,
      },
    ];
  },
  // Netlify's Next runtime does not attach netlify.toml [[headers]] rules to
  // SSR responses, so the security headers live here instead.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Legacy header every modern browser ignores; external scanners
          // still look for it, and it costs nothing to carry.
          { key: "X-XSS-Protection", value: "1; mode=block" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy", value: csp }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
