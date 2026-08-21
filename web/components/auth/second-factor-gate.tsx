"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AuthError, getClientAuth } from "@/lib/auth/client";
import { safeNextPath } from "@/lib/auth/next-path";

/**
 * The second factor, on its own route, for a session that has a password but
 * has not cleared its code yet.
 *
 * The form inside the sign-in card handles the case where the person never
 * left the page. This one exists because that card is React state: reload, or
 * open a protected URL directly, and the pause vanished while the session
 * stayed fully authorized. The server sends every half-finished session here
 * instead, so the factor is a boundary rather than a screen.
 *
 * Signing out is offered deliberately. A person who has lost their
 * authenticator would otherwise be redirected here from every page with no
 * way to leave.
 */
export function SecondFactorGate({
  factorId,
  next,
}: {
  factorId: string;
  next?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await getClientAuth().verifySecondFactor({ factorId, code });
    } catch (err) {
      setError(
        err instanceof AuthError && err.code === "invalid_code"
          ? "That code was not right. Check the app and try the current one."
          : "That code could not be checked. Try again.",
      );
      setBusy(false);
      return;
    }
    router.replace(safeNextPath(next) ?? "/home");
    router.refresh();
  }

  async function leave() {
    await getClientAuth().signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <LoadingScreen open={busy} message={["Checking your code"]} />
      <Card className="w-full max-w-md">
        <CardSection className="p-6 space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">One more step</h1>
            <p className="text-sm text-ink-muted">
              Open your authenticator app and enter the code it shows.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Six-digit code">
              {(props) => (
                <Input
                  {...props}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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
            <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
              {busy ? "Checking" : "Continue"}
            </Button>
          </form>
          <p className="text-center text-[13px] text-ink-muted">
            Lost your authenticator?{" "}
            <button type="button" onClick={() => void leave()} className="text-primary hover:underline">
              Sign out
            </button>
          </p>
        </CardSection>
      </Card>
    </>
  );
}
