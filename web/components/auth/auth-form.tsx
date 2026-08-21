"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AuthError, getClientAuth } from "@/lib/auth/client";
import { safeNextPath } from "@/lib/auth/next-path";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clearPendingJoin, takePendingJoin } from "@/lib/pending-join";

/** One sentence per failure the seam can report. */
const MESSAGES: Record<string, string> = {
  email_taken: "That email already has an account. Sign in instead.",
  weak_password: "Use a password with at least 8 characters.",
  invalid_email: "That email address doesn't look right.",
  invalid_display_name: "Enter a display name of 80 characters or fewer.",
  invalid_credentials: "That email and password don't match. Check them and try again.",
  rate_limited: "Too many attempts from this network. Wait a few minutes and try again.",
  invalid_code:
    "That code did not match. Codes change every 30 seconds, so try the current one.",
  not_configured: "Sign in is not available in this build.",
};

function friendlyError(error: unknown): string {
  const code = error instanceof AuthError ? error.code : "unknown";
  return MESSAGES[code] ?? "Something went wrong. Try again.";
}

export function AuthForm({
  mode,
  code,
  next,
  potTitle,
}: {
  mode: "login" | "signup";
  code?: string;
  next?: string;
  potTitle?: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    router.push(safeNextPath(next) ?? "/home");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const auth = getClientAuth();

    try {
      if (mode === "signup") {
        await auth.register({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        });
      }
      const outcome = await auth.signIn({ email: email.trim(), password });
      if (outcome.status === "second-factor-required") {
        setSecondStepFactorId(outcome.factorId);
        setSecondStepCode("");
        setBusy(false);
        return;
      }
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
      return;
    }

    try {
      await finalize();
    } catch {
      // finalize ends in a redirect, so busy is meant to stay true through it.
      // It only clears here, where the round trip failed and there will be no
      // navigation: otherwise the full-screen cover would have no way down.
      setError("The connection dropped. Check your network and try again.");
      setBusy(false);
    }
  }

  async function submitSecondStep(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !secondStepFactorId) return;
    setBusy(true);
    setError(null);
    try {
      await getClientAuth().verifySecondFactor({
        factorId: secondStepFactorId,
        code: secondStepCode.trim(),
      });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
      return;
    }
    try {
      await finalize();
    } catch {
      // finalize ends in a redirect, so busy is meant to stay true through it.
      // It only clears here, where the round trip failed and there will be no
      // navigation: otherwise the full-screen cover would have no way down.
      setError("The connection dropped. Check your network and try again.");
      setBusy(false);
    }
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


  // Signing in is a round trip and then a redirect, so it is one of the waits
  // the full-screen pot is for. `busy` already spans the whole of it.
  const waitMessage = secondStepFactorId
    ? ["Checking your code"]
    : mode === "signup"
      ? ["Setting up your account", "Getting your vault ready"]
      : ["Signing you in", "Finding your Pots"];

  if (secondStepFactorId) {
    return (
      <>
        <LoadingScreen open={busy} message={waitMessage} />
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
      </>
    );
  }

  return (
    <>
      <LoadingScreen open={busy} message={waitMessage} />
      <Card className="w-full max-w-md">
      <CardSection className="p-6 space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-ink-muted">{sub}</p>
        </div>
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
    </>
  );
}
