import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { UserNav } from "@/components/shell/left-nav";
import { getUserPots, requireUser } from "@/lib/data/user";

/** Signed-in shell at the user level: top bar plus the user nav. */
export async function UserShell({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const pots = await getUserPots();
  return (
    <AppShell
      displayName={user.displayName}
      email={user.email}
      nav={<UserNav pots={pots.map((p) => ({ id: p.id, title: p.title }))} />}
    >
      {children}
    </AppShell>
  );
}
