import "server-only";
import { TOKEN_ENDPOINT_URL, needsRefresh, tokenRequestBody } from "@/lib/google/oauth";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * The server-side holder of a maintainer's Google authorization.
 *
 * The token row is reachable only through `my_google_token`, a definer
 * function that returns the caller's own row, so the token arrives here and
 * never in a browser. A push that starts with a stale access token refreshes
 * it first; the stored row is updated through the same definer write every
 * other secret answers to.
 */

export type GoogleCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
  accountEmail: string;
};

export async function getGoogleAccessToken(): Promise<{
  accessToken: string;
  accountEmail: string;
} | null> {
  const row = await readOwnTokenRow();
  if (!row) return null;

  if (!needsRefresh(row.expiresAt)) {
    return { accessToken: row.accessToken, accountEmail: row.accountEmail };
  }

  const response = await fetch(TOKEN_ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody({
      refreshToken: row.refreshToken,
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirectUri: "",
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!response.ok || !body?.access_token) return null;

  const supabase = await supabaseServer();
  const expiresAt = new Date(Date.now() + (body.expires_in ?? 3600) * 1000).toISOString();
  await supabase.rpc("store_google_token", {
    p_access_token: body.access_token,
    p_refresh_token: row.refreshToken,
    p_expires_at: expiresAt,
    p_scope: row.scope,
    p_account_email: row.accountEmail,
  });
  return { accessToken: body.access_token, accountEmail: row.accountEmail };
}

/**
 * What the settings card needs: whether an account is connected, and the
 * email to name it by. Deliberately not the token: the card renders on the
 * server, and nothing about the connection's credentials belongs in a prop,
 * an RSC payload, or a browser console.
 */
export async function getGoogleAccount(): Promise<{
  connected: boolean;
  accountEmail: string | null;
}> {
  const row = await readOwnTokenRow();
  return { connected: row !== null, accountEmail: row?.accountEmail ?? null };
}

async function readOwnTokenRow(): Promise<GoogleCredentials | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("my_google_token");
  if (error || !data) return null;
  const row = data as unknown as GoogleCredentials;
  if (!row.accessToken || !row.refreshToken) return null;
  return row;
}
