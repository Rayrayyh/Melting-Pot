"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AttributionRow } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RolePill, type PotRole } from "@/components/ui/pills";
import { supabaseBrowser } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/time";

export type MemberRow = {
  userId: string;
  name: string;
  role: PotRole;
  joinedAt: string;
};

export function MembersPanel({
  potId,
  members,
  viewerId,
  viewerRole,
}: {
  potId: string;
  members: MemberRow[];
  viewerId: string;
  viewerRole: PotRole;
}) {
  const router = useRouter();
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = supabaseBrowser();
  const isOwner = viewerRole === "owner";
  const isMaintainer = viewerRole === "owner" || viewerRole === "maintainer";

  async function setRole(member: MemberRow, role: "member" | "maintainer") {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("set_member_role", {
      p_pot_id: potId,
      p_user_id: member.userId,
      p_role: role,
    });
    if (rpcError) setError("That change didn't go through. Try again.");
    else router.refresh();
    setBusy(false);
  }

  async function remove(member: MemberRow) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("remove_member", {
      p_pot_id: potId,
      p_user_id: member.userId,
    });
    if (rpcError) setError("Removing didn't go through. Try again.");
    else router.refresh();
    setRemoveTarget(null);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <Card>
        <CardSection className="divide-y divide-edge">
          {members.map((member) => {
            const isSelf = member.userId === viewerId;
            const canPromote = isOwner && member.role === "member";
            const canDemote = isOwner && member.role === "maintainer";
            const canRemove =
              !isSelf &&
              member.role !== "owner" &&
              (isOwner || (isMaintainer && member.role === "member"));
            return (
              // The row wraps rather than scrolling the page: at 320px the
              // name, the role and two actions do not fit on one line.
              <div
                key={member.userId}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
              >
                <AttributionRow
                  name={member.name}
                  meta={`Joined ${relativeTime(member.joinedAt)}${isSelf ? " · You" : ""}`}
                  className="min-w-0 flex-1 basis-40"
                />
                <RolePill role={member.role} />
                {canPromote ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void setRole(member, "maintainer")}
                  >
                    Make maintainer
                  </Button>
                ) : null}
                {canDemote ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void setRole(member, "member")}
                  >
                    Make member
                  </Button>
                ) : null}
                {canRemove ? (
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={busy}
                    onClick={() => setRemoveTarget(member)}
                    className="text-danger hover:text-danger"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            );
          })}
        </CardSection>
      </Card>
      <p className="text-[12px] text-ink-faint">
        Maintainers review corrections and organize sections. The owner can
        promote anyone.
      </p>

      <ConfirmDialog
        open={removeTarget !== null}
        title={`Remove ${removeTarget?.name ?? "this member"}?`}
        confirmLabel="Remove from Pot"
        tone="danger"
        busy={busy}
        onConfirm={() => removeTarget && void remove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      >
        They can rejoin with the class code. Their shared notes stay credited
        to them.
      </ConfirmDialog>
    </div>
  );
}
