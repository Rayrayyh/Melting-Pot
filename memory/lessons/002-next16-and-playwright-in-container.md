# 002 Next 16 conventions and Playwright setup in this container

Summary: Next 16 renamed middleware.ts to proxy.ts and makes params async; Playwright here must use the preinstalled Chromium via launchOptions.executablePath, never `playwright install`.

## Next 16 (project uses 16.3.1)

- `middleware.ts` is deprecated; the file is `proxy.ts` at the project root exporting `proxy(request: NextRequest)`. Same NextRequest/NextResponse API, so the Supabase SSR session-refresh pattern ports directly.
- `params` and `searchParams` in pages/layouts are Promises: `const { potId } = await params`.
- Generated route types exist: `LayoutProps<"/">`, and typed helpers per route. `create-next-app` writes `AGENTS.md` + `CLAUDE.md` into the project pointing at the full docs bundled at `web/node_modules/next/dist/docs/`; read those before assuming an API.
- Turbopack is the default dev/build bundler.

## Playwright

- `pnpm test:e2e` failed until `use.launchOptions.executablePath` was pointed at `/opt/pw-browsers/chromium` (a symlink to chromium-1194). The env pins PLAYWRIGHT_BROWSERS_PATH but @playwright/test 1.62 wants a different browser revision than the one preinstalled, so it asks to download, which is blocked. The config override in `web/playwright.config.ts` fixes it permanently; `PW_CHROMIUM_PATH` env var overrides it elsewhere (CI, other machines).

## Why it mattered

Both would have burned time in every later step: auth needs proxy.ts, every dynamic route needs awaited params, and all e2e verification depends on Playwright launching.
