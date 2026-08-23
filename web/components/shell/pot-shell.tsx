import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PotNav } from "@/components/shell/left-nav";
import { getPotContext, type PotContext } from "@/lib/data/pot";
import { requireUser } from "@/lib/data/user";
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

  return (
    <AppShell
      displayName={user.displayName}
      avatarSrc={avatarSrc(user.avatarPath)}
      email={user.email}
      searchScope={{ potId: pot.id, potTitle: pot.title }}
      nav={
        <PotNav
          potId={pot.id}
          potTitle={pot.title}
          memberCount={pot.memberCount}
          sections={pot.sections}
          role={pot.role}
          openReviewCount={pot.openProposalCount}
          archived={pot.archived}
        />
      }
    >
      {children(pot)}
    </AppShell>
  );
}
