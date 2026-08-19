# 004 Browser TLS is blocked by the egress proxy; route browser Supabase calls through a Next rewrite

Summary: In this container, Chromium cannot complete ANY outbound TLS handshake (the egress resets browser-fingerprint ClientHellos even through the proxy), while server-side Node fetch passes; dev/test therefore proxies Supabase same-origin via a Next rewrite.

## Findings (verified 2026-08-19)

- Playwright Chromium: every https:// destination fails with net::ERR_CONNECTION_RESET, with or without the egress proxy configured, with ECH/QUIC/post-quantum key share disabled. A wiretap relay showed CONNECT succeeding ("200 Connection Established") and the reset arriving right after Chromium's TLS ClientHello. openssl s_client through the same proxy handshakes fine (and gets the real certificate: passthrough, no MITM for supabase.co).
- Plain `node -e "fetch(...)"` reaches Supabase directly, no proxy needed. The egress evidently fingerprints and blocks browser TLS only.
- Plain-HTTP through the proxy returns 405 (CONNECT-only proxy), which is how Chromium's own http:// background requests fail.

## The fix (in place)

`web/next.config.ts` adds a rewrite `/supabase/:path*` -> `$SUPABASE_REWRITE_ORIGIN/:path*` when that env var is set. Dev `.env.local` sets `NEXT_PUBLIC_SUPABASE_URL=http://localhost:3111/supabase` so browser Supabase traffic is same-origin and the Next server (Node) does the outbound hop. `pnpm dev` is pinned to port 3111 to keep that URL valid. Production sets the direct Supabase URL and omits the rewrite origin. Playwright needs no proxy config at all.

## Why it mattered

Every browser-side Supabase call (join lookup, signup, sign-in, all client mutations) silently hung, failing 4 of 8 e2e tests with no obvious cause. Any future browser-driven testing in this container must keep external calls same-origin.
