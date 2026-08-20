"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";

const FACTOR_NAME = "Authenticator app";

type Enrolling = { factorId: string; qr: string; secret: string };

/**
 * Second-step sign-in backed by an authenticator app. Offered to people who
 * run a Pot, because their account holds a whole class's work.
 */
export function TwoFactorPanel({ enrolledFactorId }: { enrolledFactorId: string | null }) {
  const router = useRouter();
  // Seeded from the server so the panel never flashes the wrong state; kept
  // locally afterwards so turning it on or off shows immediately.
  const [factorId, setFactorId] = useState(enrolledFactorId);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    // A previous attempt that was never confirmed still holds the name, so
    // clear those out before asking for a fresh secret.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: FACTOR_NAME,
    });
    setBusy(false);
    if (enrollError || !data) {
      setError("We could not start setup just now. Try again in a moment.");
      return;
    }
    setCode("");
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabaseBrowser().auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (verifyError) {
      setError("That code did not match. Codes change every 30 seconds, so try the current one.");
      return;
    }
    setEnrolling(null);
    setCode("");
    setFactorId(enrolling.factorId);
    router.refresh();
  }

  async function cancel() {
    if (!enrolling) return;
    await supabaseBrowser().auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
    setError(null);
  }

  async function turnOff() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: offError } = await supabaseBrowser().auth.mfa.unenroll({ factorId });
    setBusy(false);
    setConfirmOff(false);
    if (offError) {
      setError("We could not turn it off. Sign out, sign back in with a code, and try again.");
      return;
    }
    setFactorId(null);
    router.refresh();
  }

  return (
    <Card>
      <CardSection className="space-y-4">
        <div className="space-y-1.5">
          <Eyebrow>Two-step sign in</Eyebrow>
          <p className="text-sm text-ink-muted leading-relaxed">
            Ask for a six-digit code from an authenticator app, like Google
            Authenticator, every time you sign in. Your class trusts what is in
            this Pot, so it is worth the extra few seconds.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        {factorId ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle className="size-[18px]" weight="fill" aria-hidden />
              Two-step sign in is on
            </p>
            <Button variant="secondary" size="sm" onClick={() => setConfirmOff(true)}>
              Turn off
            </Button>
          </div>
        ) : enrolling ? (
          <form onSubmit={confirm} className="space-y-5">
            <ol className="space-y-5">
              <li className="space-y-3">
                <p className="text-sm text-ink">
                  1. Scan this with your authenticator app.
                </p>
                {/* A data URI from Supabase, so next/image has nothing to optimize. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrolling.qr}
                  alt="Setup code as a scannable square"
                  className="size-44 rounded-(--radius-card) border border-edge bg-white p-2"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] text-ink-muted">Cannot scan? Enter this key:</p>
                  <code className="rounded bg-sunken px-2 py-1 font-mono text-[12px] text-ink break-all">
                    {enrolling.secret}
                  </code>
                  <CopyButton value={enrolling.secret} label="Copy key" />
                </div>
              </li>
              <li className="space-y-2">
                <Field label="2. Enter the six-digit code it shows">
                  {(props) => (
                    <Input
                      {...props}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      className="max-w-40 font-mono tracking-[0.3em]"
                    />
                  )}
                </Field>
              </li>
            </ol>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy || code.length !== 6}>
                Turn on two-step sign in
              </Button>
              <Button type="button" variant="quiet" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={start} disabled={busy}>
            <ShieldCheck className="size-[18px]" aria-hidden />
            Set up two-step sign in
          </Button>
        )}
      </CardSection>

      <ConfirmDialog
        open={confirmOff}
        title="Turn off two-step sign in?"
        confirmLabel="Turn it off"
        onConfirm={turnOff}
        onCancel={() => setConfirmOff(false)}
      >
        Your account goes back to a password on its own. You can set this up
        again at any time.
      </ConfirmDialog>
    </Card>
  );
}
