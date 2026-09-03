import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * What a stranger can reach.
 *
 * Row level security is the product's real authorization boundary, and until
 * now nothing checked it from outside the database. These run a real
 * anonymous client against the project with the publishable key, which is
 * the same key the browser bundle carries, and assert that the tables which
 * hold a class's work return nothing at all.
 *
 * Cross tenant checks between two signed-in people need credentials, so they
 * only run when MP_TEST_EMAIL and MP_TEST_PASSWORD are set. Nothing in this
 * file carries a secret.
 */

function fromEnvFile(key: string): string | undefined {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(path.resolve(process.cwd(), file), "utf8");
      const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
      if (line) return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
    } catch {
      /* no such file here */
    }
  }
  return undefined;
}

/**
 * The public URL, except in this development container, where the browser
 * variable points at the same-origin rewrite (memory/lessons/004) and the
 * real project origin lives in SUPABASE_REWRITE_ORIGIN.
 */
function projectUrl(): string | undefined {
  const direct = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fromEnvFile("NEXT_PUBLIC_SUPABASE_URL");
  if (direct && !direct.includes("localhost")) return direct;
  return process.env.SUPABASE_REWRITE_ORIGIN ?? fromEnvFile("SUPABASE_REWRITE_ORIGIN");
}

const url = projectUrl();
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fromEnvFile("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const reachable = Boolean(url && anonKey && !url.includes("localhost"));

// Skipped rather than failed where the project is not reachable, so a
// contributor without the public keys still gets a green suite. The skip is
// loud in the reporter, which is the point.
const online = reachable ? describe : describe.skip;

const anon = reachable ? createClient(url!, anonKey!, { auth: { persistSession: false } }) : null;

/** Every table that holds one class's work, and must be closed to a stranger. */
const CLOSED = [
  "pots",
  "memberships",
  "profiles",
  "sections",
  "contributions",
  "shared_notes",
  "note_versions",
  "revision_proposals",
  "proposal_events",
  "attachments",
  "study_sets",
  "study_set_keys",
  "study_attempts",
  "study_responses",
  "note_flashcards",
  "admin_events",
] as const;

online("an anonymous client", () => {
  beforeAll(() => {
    expect(anon).not.toBeNull();
  });

  for (const table of CLOSED) {
    it(`reads no rows from ${table}`, async () => {
      const { data, error } = await anon!.from(table).select("*").limit(5);
      // Either the policy returns nothing or the request is refused. Both are
      // closed; a row coming back is not.
      expect(error ? [] : (data ?? [])).toHaveLength(0);
    });
  }

  it("cannot write an audit entry", async () => {
    const { error } = await anon!
      .from("admin_events")
      .insert({ pot_id: "00000000-0000-0000-0000-000000000000", kind: "forged" });
    expect(error).not.toBeNull();
  });

  it("cannot ask where anybody stands", async () => {
    const { error } = await anon!.rpc("own_standing");
    expect(error?.message ?? "").toMatch(/not_authenticated|permission|denied|JWT/i);
  });

  it("cannot read the class weak topic evidence", async () => {
    const { error } = await anon!.rpc("class_topic_evidence", {
      p_pot_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).not.toBeNull();
  });

  it("still gets the one thing the join flow needs, and only that", async () => {
    // The positive control: if this fails the client is misconfigured and the
    // refusals above prove nothing.
    const { data, error } = await anon!.rpc("lookup_pot_by_code", { p_code: "ZZZZZZ" });
    expect(error).toBeNull();
    // An unknown code returns a not-found shape rather than a row.
    expect(JSON.stringify(data ?? {})).not.toMatch(/class_code/);
  });
});

const email = process.env.MP_TEST_EMAIL;
const password = process.env.MP_TEST_PASSWORD;
const signedIn = reachable && email && password ? describe : describe.skip;

signedIn("a signed-in member", () => {
  it("cannot read another person's study responses", async () => {
    const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    expect(signInError).toBeNull();
    const { data } = await client.from("study_responses").select("attempt_id").limit(50);
    const { data: mine } = await client.from("study_attempts").select("id").limit(200);
    const ids = new Set((mine ?? []).map((row) => row.id));
    for (const row of data ?? []) expect(ids.has(row.attempt_id)).toBe(true);
    await client.auth.signOut();
  });
});
