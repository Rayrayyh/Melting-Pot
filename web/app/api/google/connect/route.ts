import { NextResponse } from "next/server";
import { authorizationUrl } from "@/lib/google/oauth";
import { supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 26;

const STATE_COOKIE = "mp:google-state";
const RETURN_COOKIE = "mp:google-return";

/**
 * Sends the maintainer to Google to grant the two Classroom scopes. The
 * state and the return path ride in httpOnly cookies, so a forged callback
 * has nothing to match against.
 */
export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    return NextResponse.json(
      { error: "not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("potId") ?? "";

  const response = NextResponse.redirect(
    authorizationUrl({
      clientId,
      redirectUri: `${origin}/api/google/callback`,
      state,
    }),
  );
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  response.cookies.set(RETURN_COOKIE, returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return response;
}
