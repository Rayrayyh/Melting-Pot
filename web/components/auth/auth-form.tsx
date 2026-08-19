"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clearPendingJoin, takePendingJoin } from "@/lib/pending-join";

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

  async function finalize() {
    const supabase = supabaseBrowser();
    const pendingCode = code ?? takePendingJoin();
    if (pendingCode) {
      const { data: potId } = await supabase.rpc("join_pot_with_code", {
        p_code: pendingCode,
      });
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

  return (
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
  );
}
