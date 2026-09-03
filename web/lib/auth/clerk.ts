import {
  AuthError,
  type AssuranceLevel,
  type AuthUser,
  type ClientAuthProvider,
  type SecondFactorSetup,
  type ServerAuthProvider,
  type SignInOutcome,
} from "@/lib/auth/types";

/**
 * Framework slot for Clerk, selected when NEXT_PUBLIC_AUTH_PROVIDER=clerk.
 * Deliberately not implemented: Supabase Auth carries every flow today.
 *
 * What filling this in actually involves, so the next person is not guessing:
 *
 *  1. `pnpm add @clerk/nextjs`, then wrap the root layout in <ClerkProvider>.
 *  2. Implement the two objects below against Clerk's SDK. The method names
 *     here are the product's, not Supabase's, so they map onto Clerk's own
 *     ideas without contortion: signIn -> signIn.create, second factor ->
 *     Clerk's TOTP strategy, register -> signUp.create.
 *  3. Replace the session refresh in proxy.ts with clerkMiddleware(). That
 *     file is Supabase-specific on purpose and is the one place outside this
 *     directory that a swap has to touch.
 *  4. Give Postgres a way to trust a Clerk token, because every row level
 *     security policy is written against auth.uid(). Supabase's third-party
 *     auth accepts Clerk JWTs; the alternative is reissuing a Supabase
 *     session after Clerk signs someone in. Whichever route, public.profiles
 *     rows still have to be created on first sign in, which is what the
 *     handle_new_user trigger does for the current provider.
 *
 * Step 4 is the real work. Steps 1 to 3 are an afternoon.
 */

const notConfigured = (): never => {
  throw new AuthError("not_configured", "Clerk is not configured in this build.");
};

export const clerkServerAuth: ServerAuthProvider = {
  name: "clerk",
  async getUser(): Promise<AuthUser | null> {
    return notConfigured();
  },
  async getVerifiedSecondFactorId(): Promise<string | null> {
    return notConfigured();
  },
  async getAssuranceLevel(): Promise<AssuranceLevel> {
    return notConfigured();
  },
};

export const clerkClientAuth: ClientAuthProvider = {
  name: "clerk",
  async getUserId(): Promise<string | null> {
    return notConfigured();
  },
  async register(): Promise<void> {
    return notConfigured();
  },
  async signIn(): Promise<SignInOutcome> {
    return notConfigured();
  },
  async signOut(): Promise<void> {
    return notConfigured();
  },
  async changePassword(): Promise<void> {
    return notConfigured();
  },
  async verifySecondFactor(): Promise<void> {
    return notConfigured();
  },
  async beginSecondFactorSetup(): Promise<SecondFactorSetup> {
    return notConfigured();
  },
  async completeSecondFactorSetup(): Promise<void> {
    return notConfigured();
  },
  async cancelSecondFactorSetup(): Promise<void> {
    return notConfigured();
  },
  async removeSecondFactor(): Promise<void> {
    return notConfigured();
  },
};
