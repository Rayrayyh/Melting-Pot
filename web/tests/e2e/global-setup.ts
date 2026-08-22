import { readFileSync } from "node:fs";
import path from "node:path";

// Resets the database to the seeded state before every suite run so tests
// never inherit data from earlier runs (see memory/lessons/006). Talks to
// Supabase directly (server-side Node traffic passes the egress; the
// browser rewrite is not up yet when global setup runs).

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const file = readFileSync(path.join(__dirname, "..", "..", ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2];
    }
  } catch {
    // Fall back to process env (CI).
  }
  return { ...env, ...process.env } as Record<string, string>;
}

export default async function globalSetup() {
  const env = loadEnv();
  const origin = env.SUPABASE_REWRITE_ORIGIN ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!origin || !anonKey) {
    throw new Error("Supabase env missing; cannot reseed for e2e");
  }

  const tokenResponse = await fetch(`${origin}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "maya@meltingpot.dev",
      password: "MeltingPot-dev1",
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`e2e reseed sign-in failed: ${tokenResponse.status}`);
  }
  const { access_token } = (await tokenResponse.json()) as { access_token: string };

  const reseedResponse = await fetch(`${origin}/rest/v1/rpc/dev_reseed`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  // Reseeding over the anon endpoint is no longer allowed: dev_reseed guarded
  // on the caller's email ending in @meltingpot.dev, and nothing proves an
  // address belongs to whoever typed it, so a stranger could reseed the live
  // database (migration 0034). Only service_role may reseed now, which is what
  // an operator does over SQL before a run.
  //
  // So a refusal here is expected rather than fatal. What must not be silent
  // is running the suite against a database with no seed in it, because every
  // spec would then fail on missing fixtures with no hint why. Check for the
  // seed and say plainly which of the two situations this is.
  if (!reseedResponse.ok) {
    const seeded = await fetch(
      `${origin}/rest/v1/rpc/lookup_pot_by_code`,
      {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_code: "BIO101" }),
      },
    );
    const found = seeded.ok && (await seeded.text()).trim() !== "null";
    if (!found) {
      throw new Error(
        `e2e reseed refused (${reseedResponse.status}) and the seed is absent. ` +
          "Run select public.dev_seed(); as service_role before the suite.",
      );
    }
    console.log("e2e: reseed refused, seed already present, continuing");
  }
}
