# Production lives at meltingpot-io.netlify.app

Decision: the live site is https://meltingpot-io.netlify.app (Netlify site id d8615623-0dc2-4eda-bf6f-a1d9f6986c01, team rayrayyh). The name "meltingpot" was already taken across Netlify, so "meltingpot-io" (matching the product name meltingpot.io) is the closest available, per the owner's "meltingpot.netlify.app or another available one".

How it deploys: the package root is web/ (uploaded via the Netlify MCP zip deploy, which only excludes top-level node_modules, so deploying from the repo root fails on upload size). web/netlify.toml declares the build and, critically, the @netlify/plugin-nextjs runtime plugin: zip deploys do not auto-inject it, and without it Netlify publishes the raw .next directory and every route 404s. A future git-linked build from the repo root would set base = "web" instead.

Environment: NEXT_PUBLIC_SUPABASE_URL (direct https project URL; the dev-only rewrite stays off because SUPABASE_REWRITE_ORIGIN is unset) and NEXT_PUBLIC_SUPABASE_ANON_KEY, both set at the site level. No service role key exists anywhere in the deployment; RLS and the security-definer RPCs are the entire enforcement layer.

Production is clean: migration 0013 wiped all dev-seed data and dropped dev_seed/dev_reseed before the deploy, the post-deploy smoke test created a temporary account and Pot, ran the full contribution and correction loops plus the RLS guards against the live stack (all checks passed), deleted the Pot, and the temporary auth users were removed afterward. Every table and the storage bucket sit at zero rows.

Owner decision point, left as the spec intended: the organizer ships deterministic. Flipping NEXT_PUBLIC_ORGANIZER_PROVIDER=claude selects the ClaudeOrganizer slot once it is implemented; nothing else changes.
