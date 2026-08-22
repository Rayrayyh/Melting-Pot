import { getVerifiedSecondFactorId } from "@/lib/auth/server";
import { UserShell } from "@/components/shell/user-shell";
import { ProfilePanel } from "@/components/settings/profile-panel";
import { ThemeChoice } from "@/components/settings/theme-choice";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { requireUser, runsAnyPot } from "@/lib/data/user";

export const metadata = { title: "Settings" };

export default async function AccountSettingsPage() {
  const [user, runsAPot] = await Promise.all([requireUser(), runsAnyPot()]);

  // Read the enrolled factor here so the security panel opens in the right
  // state instead of resolving it after paint.
  const enrolledFactorId = runsAPot ? await getVerifiedSecondFactorId() : null;

  return (
    <UserShell>
      <div className="mx-auto w-full max-w-2xl px-6 py-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-ink-muted">
            Your account and how MeltingPot looks while you work.
          </p>
        </header>

        <ProfilePanel
          userId={user.id}
          email={user.email}
          initialName={user.displayName}
          initialAvatarPath={user.avatarPath}
        />

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
