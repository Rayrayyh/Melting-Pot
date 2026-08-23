# Authentication

MeltingPot signs people in with an email and a password, and offers a second
step with an authenticator app to anyone who runs a Pot. Supabase Auth does the
work today. Clerk is the intended replacement, and the code is arranged so that
swap is an implementation, not an excavation.

## The seam

Everything the app needs from an identity provider lives in `web/lib/auth`,
described in the product's own words rather than any one vendor's:

| File | What it is |
|---|---|
| `types.ts` | The contract: `AuthUser`, `SignInOutcome`, `AuthError`, and the two provider interfaces |
| `supabase-server.ts` | Reading identity from the request. The live implementation |
| `supabase-client.ts` | Session lifecycle in the browser. The live implementation |
| `clerk.ts` | The framework slot. Present, complete, and deliberately unimplemented |
| `server.ts` | Server entry point: `getAuthUser`, `requireAuthUser`, `getVerifiedSecondFactorId` |
| `client.ts` | Browser entry point: `getClientAuth()` |

The server and client halves are separate interfaces on purpose. The server
reads identity from the request; the browser drives sign in, sign out, and
second-factor setup. Keeping them apart stops server-only code (`next/headers`)
leaking into the client bundle.

Selection is one environment variable, matching the organizer seam:

```
NEXT_PUBLIC_AUTH_PROVIDER=        # unset or "supabase" (default)
NEXT_PUBLIC_AUTH_PROVIDER=clerk   # selects the slot in lib/auth/clerk.ts
```

## Using it

Server components and route handlers:

```ts
import { getAuthUser, requireAuthUser } from "@/lib/auth/server";

const user = await getAuthUser();        // AuthUser | null
const user = await requireAuthUser();    // AuthUser, or redirects to /login
```

`requireUser()` and `getUser()` in `lib/data/user.ts` are thin wrappers over
these and remain the usual entry point for pages.

Client components:

```ts
import { getClientAuth } from "@/lib/auth/client";

const outcome = await getClientAuth().signIn({ email, password });
if (outcome.status === "second-factor-required") {
  // ask for the code, then verifySecondFactor({ factorId, code })
}
```

Failures arrive as `AuthError` with a stable `code`, never as provider message
text. `auth-form.tsx` maps codes to sentences in one place.

## Rules

- **No component calls `supabase.auth.*` directly.** One exception, marked in
  the file: `proxy.ts`, where route gating is bound up with the Supabase cookie
  refresh. Clerk replaces that whole file with `clerkMiddleware()`.
- **New auth needs go through `types.ts` first.** Adding a method there makes
  the Clerk slot fail to compile until it is filled in, which is the point.
- **The Clerk slot throws `AuthError("not_configured")`, never returns null.**
  A half-finished swap fails loudly instead of quietly signing nobody in. A
  unit test asserts every method behaves that way.

## Swapping in Clerk

1. `pnpm add @clerk/nextjs`, wrap the root layout in `<ClerkProvider>`.
2. Implement `clerkServerAuth` and `clerkClientAuth` against Clerk's SDK. The
   method names map onto Clerk's own ideas without contortion: `signIn` to
   `signIn.create`, `register` to `signUp.create`, the second factor to Clerk's
   TOTP strategy.
3. Replace the session refresh in `proxy.ts` with `clerkMiddleware()`.
4. **Give Postgres a way to trust a Clerk token.** This is the real work, and
   it is worth understanding before starting. Every row level security policy
   in this project is written against `auth.uid()`, and every privileged
   operation runs through a security-definer function that re-validates the
   caller. None of that works if Postgres cannot identify a Clerk user. Two
   routes:
   - Supabase third-party auth, which accepts Clerk JWTs and keeps `auth.uid()`
     meaningful. Least disruptive.
   - Mint a Supabase session after Clerk signs someone in. Needs a server-side
     bridge holding a service-role key, which this deployment deliberately does
     not have anywhere.

   Either way, `public.profiles` rows still have to appear on first sign in.
   The `handle_new_user` trigger does that for the current provider and reads
   `full_name` and `name` as well as `display_name`, so it already handles the
   shape a third-party provider sends.
5. Set `NEXT_PUBLIC_AUTH_PROVIDER=clerk`.

Steps 1 to 3 and 5 are an afternoon. Step 4 decides how long the whole thing
takes, so cost it first.

## What was removed

Google sign in via Supabase OAuth was built and then taken out at the owner's
direction, along with its callback route, button, and setup guide. Nothing of
it remains except migration `0019_oauth_display_name.sql`, which is kept
deliberately: it teaches `handle_new_user` to read the name fields that
third-party providers actually send, which is a general improvement and exactly
what a future Clerk integration needs.
