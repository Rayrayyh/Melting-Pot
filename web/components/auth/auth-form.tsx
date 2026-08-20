"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clearPendingJoin, takePendingJoin } from "@/lib/pending-join";
import { GoogleMark } from "@/components/auth/google-mark";

// Google sign in only appears once the provider is configured, so the button
// is never on screen in a state where pressing it fails. See docs/GOOGLE-SIGN-IN.md.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "on";

function friendlyError(message: string): string {
  if (message.includes("email_taken")) {
    return "That email already has an account. Sign in instead.";
  }
  if (message.includes("weak_password")) {
    return "Use a password with at least 8 characters.";
  }
  if (message.includes("invalid_email")) {
    return "That email address doesn't look right.";
  }
  if (message.includes("Invalid login credentials")) {
    return "That email and password don't match. Check them and try again.";
  }
  if (message.includes("rate_limited")) {
    return "Too many attempts from this network. Wait a few minutes and try again.";
  }
  return "Something went wrong. Try again.";
}

export function AuthForm({
  mode,
  code,
  next,
  potTitle,
  initialError = null,
}: {
  mode: "login" | "signup";
  code?: string;
  next?: string;
  potTitle?: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  // Set once a password is accepted but the account also asks for a code.
  const [secondStepFactorId, setSecondStepFactorId] = useState<string | null>(null);
  const [secondStepCode, setSecondStepCode] = useState("");

  async function finalize() {
    const supabase = supabaseBrowser();
    const pendingCode = code ?? takePendingJoin();
    if (pendingCode) {
      const { data: potId, error: joinError } = await supabase.rpc("join_pot_with_code", {
        p_code: pendingCode,
      });
      if (joinError) {
        // The account exists now, but the join failed (rate limit, or the
        // Pot was archived or its code changed since the preview). Keep the
        // pending code so a retry can still land it, and say what happened.
        setError(
          joinError.message.includes("rate_limited")
            ? "Your account is ready, but joining was rate limited. Open the class code again in a moment."
            : "Your account is ready, but that class code is no longer valid. Ask for a fresh code.",
        );
        setBusy(false);
        return;
      }
      clearPendingJoin();
      if (potId) {
        router.push(`/p/${potId}`);
        router.refresh();
        return;
      }
    }
    router.push(next && next.startsWith("/") ? next : "/home");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();

    if (mode === "signup") {
      const { error: registerError } = await supabase.rpc("register_student", {
        p_email: email.trim(),
        p_password: password,
        p_display_name: displayName.trim(),
      });
      if (registerError) {
        setError(friendlyError(registerError.message));
        setBusy(false);
        return;
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(friendlyError(signInError.message));
      setBusy(false);
      return;
    }

    // Accounts with two-step sign in are only half way in at this point.
    const { data: levels } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (levels?.currentLevel === "aal1" && levels.nextLevel === "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((f) => f.status === "verified");
      if (factor) {
        setSecondStepFactorId(factor.id);
        setSecondStepCode("");
        setBusy(false);
        return;
      }
    }

    await finalize();
  }

  async function continueWithGoogle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    // Carry the class code through the round trip so the membership still
    // lands, the same way the password path does.
    const pendingCode = code ?? takePendingJoin();
    const destination = pendingCode
      ? `/join/${pendingCode}`
      : next && next.startsWith("/")
        ? next
        : "/home";
    const { error: oauthError } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    if (oauthError) {
      setError("We couldn't reach Google just now. Try again, or use your email and password.");
      setBusy(false);
    }
    // On success the browser leaves for Google, so there is nothing to reset.
  }

  async function submitSecondStep(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !secondStepFactorId) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabaseBrowser().auth.mfa.challengeAndVerify({
      factorId: secondStepFactorId,
      code: secondStepCode.trim(),
    });
    if (verifyError) {
      setError("That code did not match. Codes change every 30 seconds, so try the current one.");
      setBusy(false);
      return;
    }
    await finalize();
  }

  const heading =
    mode === "signup"
      ? potTitle
        ? "You're in. Save your account."
        : "Create your account"
      : potTitle
        ? "Sign in to keep your spot"
        : "Sign in";
  const sub =
    mode === "signup"
      ? potTitle
        ? `Create an account so ${potTitle} stays in your vault.`
        : "A name, an email, and a password. That's all."
      : potTitle
        ? `${potTitle} is waiting for you.`
        : "Welcome back.";

  const codeParam = code ? `?code=${encodeURIComponent(code)}` : "";

  if (secondStepFactorId) {
    return (
      <Card className="w-full max-w-md">
        <CardSection className="p-6 space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">One more step</h1>
            <p className="text-sm text-ink-muted">
              Open your authenticator app and enter the code it shows.
            </p>
          </div>
          <form onSubmit={submitSecondStep} className="space-y-4">
            <Field label="Six-digit code">
              {(props) => (
                <Input
                  {...props}
                  value={secondStepCode}
                  onChange={(e) =>
                    setSecondStepCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  autoFocus
                  required
                  className="font-mono tracking-[0.3em]"
                />
              )}
            </Field>
            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || secondStepCode.length !== 6}
            >
              {busy ? "Checking" : "Continue"}
            </Button>
          </form>
        </CardSection>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardSection className="p-6 space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-ink-muted">{sub}</p>
        </div>
        {GOOGLE_ENABLED ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={continueWithGoogle}
              disabled={busy}
            >
              <GoogleMark className="size-[18px]" />
              Continue with Google
            </Button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-edge" />
              <span className="text-[12px] text-ink-faint">or</span>
              <span className="h-px flex-1 bg-edge" />
            </div>
          </div>
        ) : null}
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <Field label="Display name">
              {(props) => (
                <Input
                  {...props}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  maxLength={80}
                />
              )}
            </Field>
          ) : null}
          <Field label="Email">
            {(props) => (
              <Input
                {...props}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            )}
          </Field>
          <Field
            label="Password"
            hint={mode === "signup" ? "At least 8 characters." : undefined}
          >
            {(props) => (
              <Input
                {...props}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
              />
            )}
          </Field>
          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy
              ? mode === "signup"
                ? "Creating your account"
                : "Signing in"
              : mode === "signup"
                ? potTitle
                  ? "Create account and enter"
                  : "Create account"
                : potTitle
                  ? "Sign in and open Pot"
                  : "Sign in"}
          </Button>
        </form>
        <p className="text-center text-[13px] text-ink-muted">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link href={`/login${codeParam}`} className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href={`/signup${codeParam}`} className="text-primary hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </CardSection>
    </Card>
  );
}
