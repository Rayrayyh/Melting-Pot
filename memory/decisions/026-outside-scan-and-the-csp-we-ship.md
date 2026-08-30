# An outside scan set the header work, and the CSP ships permissive on purpose

The owner had the live site run through vibecodesecure.com before submission (2026-08-30). Its API is public: POST /api/scan with a url, poll GET /api/scan/id. First scan: 80/100, failing CSP, X-XSS-Protection, Server header and X-Powered-By. After the fixes: 95/100, must-have score 100, with one remaining fail.

What shipped, all in web/next.config.ts headers() and mirrored where it matters in web/netlify.toml:

- A Content-Security-Policy, production only. script-src carries 'unsafe-inline' because the App Router streams inline hydration scripts and the theme stamp in app/layout.tsx is an inline script. A nonce policy through proxy.ts is the right upgrade after the deadline. Even permissive, the policy pins images and connections to our own origin plus the Supabase project, and shuts off framing, base hijack, foreign form targets and plugins.
- X-XSS-Protection: 1; mode=block. Modern browsers ignore it. It exists to satisfy scanners, and the comment in next.config.ts says so.
- poweredByHeader false, nosniff and Cross-Origin-Opener-Policy everywhere, console stripped from the production bundle except error and warn.
- robots.txt keeps crawlers out of app routes; .well-known/security.txt carries the owner's contact (rayyan.hashmi@gmail.com, their call, 2026-08-30).

The one remaining fail is Server: Netlify. That header belongs to the platform and cannot be removed from here. Accepted.

Also accepted, not findings: the Supabase project URL and anon-role key in the client bundle are by design and safe under RLS (the probe confirmed no service_role material anywhere client-side), and the scanner's eight informational categories are covered by what already exists: RLS on all sixteen tables, definer RPCs behind rate limits, 2FA enforced at browser, edge, server and database.

Same round, owner request: signup gained the live password checklist (length 8, upper, lower, digit), with register_student redefined in migration 0041 to enforce the identical list server side. The client helper is web/lib/auth/password-rules.ts; keep the two lists in lockstep.
