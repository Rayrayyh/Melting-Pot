import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { MainNav } from "@/components/shell/main-nav";
import { getUserPots, requireUser } from "@/lib/data/user";
import { getNotifications } from "@/lib/data/notifications";
import { avatarSrc } from "@/lib/avatar-url";

/** Signed-in shell: top bar plus the one nav the whole product shares. */
export async function UserShell({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [pots, notifications] = await Promise.all([getUserPots(), getNotifications(user.id)]);
  return (
    <AppShell
      displayName={user.displayName}
      avatarSrc={avatarSrc(user.avatarPath)}
      email={user.email}
      nav={<MainNav pots={pots.map((p) => ({ id: p.id, title: p.title }))} />}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
