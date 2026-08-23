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
    // The seed has to be pristine, not merely present. A run that is killed
    // partway leaves the fixtures it was midway through changing: a note
    // removed and never restored, a proposal decided. The next suite then
    // fails somewhere unrelated to whatever broke it, which costs far more
    // time than reseeding would have.
    const potId = await lookupSeedPot(origin, anonKey);
    if (!potId) {
      throw new Error(
        `e2e reseed refused (${reseedResponse.status}) and the seed is absent. ` +
          "Run select public.dev_seed(); as service_role, then run the suite.",
      );
    }
    const dirty = await seedLooksUsed(origin, anonKey, access_token, potId);
    if (dirty) {
      throw new Error(
        `e2e reseed refused (${reseedResponse.status}) and the seed is dirty (${dirty}). ` +
          "An earlier run left state behind. Run select public.dev_seed(); as " +
          "service_role to reset, then run the suite.",
      );
    }
    console.log("e2e: reseed refused, seed is present and pristine, continuing");
  }
}

/** The seeded Pot's id, or null when the seed is not there at all. */
async function lookupSeedPot(
  origin: string,
  anonKey: string,
): Promise<string | null> {
  const response = await fetch(`${origin}/rest/v1/rpc/lookup_pot_by_code`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_code: "BIO101" }),
  });
  if (!response.ok) return null;
  const body = (await response.text()).trim();
  if (body === "null" || body === "") return null;
  try {
    const pot = JSON.parse(body) as { id?: string } | null;
    return pot?.id ?? "present";
  } catch {
    return "present";
  }
}

/**
 * Names what an earlier run left behind, or null when the seed is untouched.
 * Deliberately cheap: a couple of reads that catch the states the specs
 * actually mutate.
 */
async function seedLooksUsed(
  origin: string,
  anonKey: string,
  token: string,
  potId: string,
): Promise<string | null> {
  if (potId === "present") return null;
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const removed = await fetch(
    `${origin}/rest/v1/shared_notes?select=id&pot_id=eq.${potId}&removed_at=not.is.null`,
    { headers },
  );
  if (removed.ok) {
    const rows = (await removed.json()) as unknown[];
    if (rows.length > 0) return `${rows.length} note(s) left removed`;
  }
  const decided = await fetch(
    `${origin}/rest/v1/revision_proposals?select=id&pot_id=eq.${potId}&status=neq.pending`,
    { headers },
  );
  if (decided.ok) {
    const rows = (await decided.json()) as unknown[];
    // The seed itself ships exactly one accepted proposal.
    if (rows.length > 1) return `${rows.length} proposal(s) already decided`;
  }
  return null;
}
