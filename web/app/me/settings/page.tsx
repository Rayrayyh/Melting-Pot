import { UserShell } from "@/components/shell/user-shell";
import { ThemeChoice } from "@/components/settings/theme-choice";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ownsAnyPot, requireUser } from "@/lib/data/user";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

export default async function AccountSettingsPage() {
  const [user, runsAPot] = await Promise.all([requireUser(), ownsAnyPot()]);

  // Read the enrolled factor here so the security panel opens in the right
  // state instead of resolving it after paint.
  let enrolledFactorId: string | null = null;
  if (runsAPot) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.mfa.listFactors();
    enrolledFactorId = data?.totp.find((f) => f.status === "verified")?.id ?? null;
  }

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-2xl px-6 py-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-ink-muted">
            Your account and how MeltingPot looks while you work.
          </p>
        </header>

        <Card>
          <CardSection className="flex items-center gap-4">
            <Avatar name={user.displayName} size="lg" />
            <div className="min-w-0">
              <p className="font-medium text-ink truncate">{user.displayName}</p>
              <p className="text-sm text-ink-muted truncate">{user.email}</p>
            </div>
          </CardSection>
        </Card>

        <Card>
          <CardSection className="space-y-4">
            <div className="space-y-1.5">
              <Eyebrow>Appearance</Eyebrow>
              <p className="text-sm text-ink-muted leading-relaxed">
                Pick a theme, or follow whatever your device is set to.
              </p>
            </div>
            <ThemeChoice />
          </CardSection>
        </Card>

        {runsAPot ? <TwoFactorPanel enrolledFactorId={enrolledFactorId} /> : null}
      </div>
    </UserShell>
  );
}
