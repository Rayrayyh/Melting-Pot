"use client";

import { useState } from "react";
import { Key } from "@phosphor-icons/react";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthError, getClientAuth } from "@/lib/auth/client";
import { passwordMeetsRules } from "@/lib/auth/password-rules";

/**
 * Changing the password from inside the account, which also ends every other
 * session. Until this existed the only route was the emailed reset, and a
 * session opened with the old password carried on working afterwards.
 */
export function PasswordPanel() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const ready = passwordMeetsRules(password) && confirm === password;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setDone(false);
    if (!passwordMeetsRules(password)) {
      setError("Your new password does not meet all five rules yet.");
      return;
    }
    if (confirm !== password) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await getClientAuth().changePassword({ password });
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof AuthError && caught.code === "weak_password"
          ? "That password does not meet all five rules."
          : "We could not change it just now. Try again in a moment.",
      );
    }
    setBusy(false);
  }

  return (
    <Card>
      <CardSection className="space-y-4">
        <div className="space-y-1.5">
          <Eyebrow>Password</Eyebrow>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-muted">
            <Key className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
            Changing it here signs out everywhere else. This device stays signed in.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="New password">
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>

          <PasswordChecklist password={password} />

          <Field label="Confirm password" error={error ?? undefined}>
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            )}
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy || !ready}>
              {busy ? "Changing" : "Change password"}
            </Button>
            {done ? (
              <p role="status" className="text-[13px] text-success">
                Changed. Every other session has been signed out.
              </p>
            ) : null}
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
