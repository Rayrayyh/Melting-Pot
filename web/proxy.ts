import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/home", "/p/", "/me", "/pots", "/search"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix),
  );
}

/** Refreshes the Supabase session cookie and gates signed-in routes. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // The one auth call outside lib/auth. Route gating is bound up with the
  // Supabase cookie refresh above, so it cannot go behind the seam without
  // dragging the cookie plumbing with it. Swapping to Clerk replaces this
  // whole file with clerkMiddleware(); see lib/auth/clerk.ts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // A password alone reaches aal1. An account carrying a verified factor is
  // only half signed in until a code clears it, and until this check existed
  // that half-session had the same authority as a whole one: the pause lived
  // in React state, so reloading walked straight past it. The assurance level
  // is read from the session that getUser() just refreshed, so this costs no
  // extra round trip.
  if (user && isProtected(pathname) && pathname !== "/login/verify") {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel === "aal1" && assurance.nextLevel === "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/login/verify";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)",
  ],
};
