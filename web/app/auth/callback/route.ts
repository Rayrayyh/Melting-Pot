import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where Google sends people back to. Trades the one-time code for a session,
 * then hands off to wherever they were headed: a class code they were joining,
 * or the dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  // Only ever redirect inside this app; "//evil.com" is not a local path.
  const destination = next && /^\/(?!\/)/.test(next) ? next : "/home";

  if (!code) {
    // The provider reports refusals and cancellations here rather than a code.
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
