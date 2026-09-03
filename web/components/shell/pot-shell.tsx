import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PotTabs } from "@/components/shell/pot-tabs";
import { MainNav } from "@/components/shell/main-nav";
import { getPotContext, type PotContext } from "@/lib/data/pot";
import { getUserPots, requireUser } from "@/lib/data/user";
import { getNotifications } from "@/lib/data/notifications";
import { avatarSrc } from "@/lib/avatar-url";

/**
 * Signed-in shell inside a Pot. Resolves membership and passes the Pot
 * context to the page via a render prop so data loads once.
 */
export async function PotShell({
  potId,
  children,
}: {
  potId: string;
  children: (pot: PotContext) => ReactNode;
}) {
  const user = await requireUser();
  const pot = await getPotContext(potId);
  if (!pot) notFound();
  // The sidebar is account level everywhere, so a Pot page still lists every
  // class rather than swapping the nav out underneath you.
  const [pots, notifications] = await Promise.all([getUserPots(), getNotifications(user.id)]);
  const navPots = pots.map((p) => ({ id: p.id, title: p.title }));

  return (
    <AppShell
      displayName={user.displayName}
      avatarSrc={avatarSrc(user.avatarPath)}
      email={user.email}
      nav={<MainNav pots={navPots} />}
      notifications={notifications}
    >
      <PotTabs potId={pot.id} role={pot.role} openReviewCount={pot.openProposalCount} />
      {children(pot)}
    </AppShell>
  );
}
