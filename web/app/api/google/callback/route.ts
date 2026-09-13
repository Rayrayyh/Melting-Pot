import { NextResponse } from "next/server";
import { readExchange, tokenRequestBody, TOKEN_ENDPOINT_URL } from "@/lib/google/oauth";
import { supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 26;

const STATE_COOKIE = "mp:google-state";
const RETURN_COOKIE = "mp:google-return";

/**
 * Finishes the exchange Google sent the maintainer back with. The state
 * cookie is the whole of the anti-forgery check: it must match the query and
 * is cleared either way. Every outcome lands back on the Pot's settings page
 * with a word for what happened.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denial = url.searchParams.get("error");

  const stateCookie = readCookie(request.headers.get("cookie"), STATE_COOKIE);
  const returnCookie = readCookie(request.headers.get("cookie"), RETURN_COOKIE);
  const potId = returnCookie && /^[0-9a-f-]{36}$/i.test(returnCookie) ? returnCookie : "";
  const back = new URL(potId ? `/p/${potId}/settings` : "/", url.origin);

  const response = NextResponse.redirect(back);
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(RETURN_COOKIE, "", { path: "/", maxAge: 0 });

  const fail = (word: string) => {
    back.searchParams.set("google", word);
    return response;
  };

  if (!stateCookie || !state || stateCookie !== state) return fail("failed");
  if (denial || !code) return fail("denied");

  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) return fail("failed");

  const origin = url.origin;
  const exchangeResponse = await fetch(TOKEN_ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody({ code, clientId, clientSecret, redirectUri: `${origin}/api/google/callback` }),
  });
  const payload = (await exchangeResponse.json().catch(() => null)) as unknown;
  const exchange = readExchange(payload, null);
  if (!exchange) return fail("failed");

  const accountEmail = readEmail(payload) ?? "(unknown account)";

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("store_google_token", {
    p_access_token: exchange.accessToken,
    p_refresh_token: exchange.refreshToken,
    p_expires_at: exchange.expiresAt.toISOString(),
    p_scope: exchange.scope,
    p_account_email: accountEmail,
  });
  if (error) return fail("failed");

  back.searchParams.set("google", "connected");
  return response;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** The email rides in the id_token Google returns alongside the access token. */
function readEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const idToken = (payload as Record<string, unknown>).id_token;
  if (typeof idToken !== "string") return null;
  const [, claims] = idToken.split(".");
  if (!claims) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(claims.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { email?: unknown };
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}
