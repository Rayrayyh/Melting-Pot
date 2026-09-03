/**
 * The authentication seam.
 *
 * Everything the app needs from an identity provider is expressed here in the
 * product's own words, never in one vendor's. Swapping Supabase Auth for Clerk
 * is then a config change plus one new implementation, not a hunt through
 * thirty call sites. Same shape as the organizer seam in lib/organizer.
 *
 * The split between server and client is deliberate: the server reads identity
 * from the request, the browser drives the session lifecycle. Keeping them in
 * separate interfaces stops server-only code (next/headers) leaking into the
 * client bundle.
 */

/** A signed-in person, as the product thinks of them. */
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  /** Path inside the avatars bucket, or null for the tinted icon. */
  avatarPath: string | null;
};

/** What a fresh second-factor setup hands the person so they can scan it. */
export type SecondFactorSetup = {
  factorId: string;
  /** Scannable image, ready for an img src. */
  qrCode: string;
  /** The same secret in text, for typing in by hand. */
  secret: string;
};

/**
 * How far a session got. "aal1" is a correct password; "aal2" has also cleared
 * a second factor. `next` is what the account expects, so aal1/aal2 means a
 * factor is enrolled and this session has not satisfied it yet.
 */
export type AssuranceLevel = {
  current: "aal1" | "aal2" | null;
  next: "aal1" | "aal2" | null;
};

/** Signing in either completes, or stops to ask for a code. */
export type SignInOutcome =
  | { status: "signed-in" }
  | { status: "second-factor-required"; factorId: string };

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "weak_password"
  | "invalid_email"
  | "invalid_display_name"
  | "rate_limited"
  | "invalid_code"
  | "not_configured"
  | "unknown";

/** One error type for every provider, so the UI maps codes and not messages. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
  }
}

/** Identity as read on the server, from the incoming request. */
export interface ServerAuthProvider {
  readonly name: string;
  /** The signed-in person, or null. Includes the display name. */
  getUser(): Promise<AuthUser | null>;
  /** The id of a confirmed second factor, when the account has one. */
  getVerifiedSecondFactorId(): Promise<string | null>;
  /**
   * What this session has cleared, and what the account asks of it. Read on
   * the server because a second factor the browser alone enforces is a screen
   * rather than a boundary.
   */
  getAssuranceLevel(): Promise<AssuranceLevel>;
}

/** Session lifecycle, driven from the browser. */
export interface ClientAuthProvider {
  readonly name: string;

  /** Just the id, which is all a browser-side query ever needs. */
  getUserId(): Promise<string | null>;

  /** Create an account. Throws AuthError; does not sign in. */
  register(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<void>;

  /** Throws AuthError, or reports whether a code is still required. */
  signIn(input: { email: string; password: string }): Promise<SignInOutcome>;

  signOut(): Promise<void>;

  /**
   * Set a new password and end every other session. A password change is
   * often the answer to somebody else having the old one, so the sessions
   * that old password opened must not survive it.
   */
  changePassword(input: { password: string }): Promise<void>;

  /** Finish a sign in that stopped for a code. Throws AuthError. */
  verifySecondFactor(input: { factorId: string; code: string }): Promise<void>;

  /** Start setup, returning something to scan. Clears abandoned attempts first. */
  beginSecondFactorSetup(): Promise<SecondFactorSetup>;

  /** Confirm setup with a code from the app. Throws AuthError. */
  completeSecondFactorSetup(input: { factorId: string; code: string }): Promise<void>;

  /** Abandon a setup that was never confirmed. */
  cancelSecondFactorSetup(input: { factorId: string }): Promise<void>;

  /** Turn an active second factor off. */
  removeSecondFactor(input: { factorId: string }): Promise<void>;
}
