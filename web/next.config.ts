import type { NextConfig } from "next";

// In this development container, outbound TLS from browsers is blocked by the
// egress policy while server-side Node traffic passes. Setting
// SUPABASE_REWRITE_ORIGIN proxies the browser's Supabase calls same-origin
// through this server (NEXT_PUBLIC_SUPABASE_URL then points at
// http://localhost:3111/supabase). Production leaves it unset and the browser
// talks to Supabase directly. See memory/lessons/004.
const supabaseRewriteOrigin = process.env.SUPABASE_REWRITE_ORIGIN;

const nextConfig: NextConfig = {
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
  // SSR responses, so the baseline security headers live here instead.
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
        ],
      },
    ];
  },
};

export default nextConfig;
