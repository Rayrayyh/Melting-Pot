"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  Archive,
  Gear,
  TrashSimple,
  Users,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RolePill } from "@/components/ui/pills";
import { supabaseBrowser } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/time";
import type { PotRole } from "@/lib/database.types";

export type ManagedPot = {
  id: string;
  title: string;
  role: PotRole;
  archived: boolean;
  memberCount: number | null;
  noteCount: number | null;
  openProposalCount: number | null;
  lastActivityAt: string | null;
};

type Pending = { kind: "archive" | "unarchive" | "delete"; pot: ManagedPot } | null;

/**
 * Every Pot someone belongs to, in one place, with the things an owner would
 * otherwise have to open each Pot's settings to do. Archiving and deleting stay
 * owner-only here exactly as they are there: this is a shorter path to the same
 * authority, never a wider one, and row level security is what actually decides.
 */
export function PotManager({ pots }: { pots: ManagedPot[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { pot, kind } = pending;
    const { error: failure } =
      kind === "delete"
        ? await supabase.from("pots").delete().eq("id", pot.id)
        : await supabase
            .from("pots")
            .update({ archived_at: kind === "archive" ? new Date().toISOString() : null })
            .eq("id", pot.id);
    setBusy(false);
    setPending(null);
    if (failure) {
      setError(
        kind === "delete"
          ? "Deleting did not go through. Try again."
          : kind === "archive"
            ? "Archiving did not go through. Try again."
            : "Unarchiving did not go through. Try again.",
      );
      return;
    }
    router.refresh();
  };

  const running = pots.filter((pot) => !pot.archived && pot.role !== "member");
  const joined = pots.filter((pot) => !pot.archived && pot.role === "member");
  const archived = pots.filter((pot) => pot.archived);

  return (
    <div className="space-y-10">
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <PotGroup
        title="Pots you run"
        empty="You do not own or maintain a Pot yet."
        pots={running}
        onAct={setPending}
      />
      <PotGroup
        title="Pots you are in"
        empty="You have not joined anyone else's Pot."
        pots={joined}
        onAct={setPending}
      />
      <PotGroup
        title="Archived"
        empty="Nothing is archived."
        pots={archived}
        onAct={setPending}
      />

      <ConfirmDialog
        open={pending?.kind === "archive"}
        title="Archive this Pot?"
        confirmLabel={busy ? "Archiving" : "Archive Pot"}
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      >
        <p>
          The class code stops working and nothing new can be shared. Everything
          already in it stays readable, and you can bring it back at any time.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pending?.kind === "unarchive"}
        title="Bring this Pot back?"
        confirmLabel={busy ? "Unarchiving" : "Unarchive Pot"}
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      >
        <p>The class code works again and the class can share and correct as before.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pending?.kind === "delete"}
        title={`Delete ${pending?.pot.title ?? "this Pot"}?`}
        confirmLabel={busy ? "Deleting" : "Delete Pot permanently"}
        tone="danger"
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      >
        <p>
          Every note, every version, and everyone&apos;s credit in this Pot is
          deleted with it. This cannot be undone. Archiving keeps all of it and is
          reversible.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function PotGroup({
  title,
  empty,
  pots,
  onAct,
}: {
  title: string;
  empty: string;
  pots: ManagedPot[];
  onAct: (pending: Pending) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {title}
      </h2>
      {pots.length === 0 ? (
        <p className="text-sm text-ink-faint">{empty}</p>
      ) : (
        <div className="space-y-2.5">
          {pots.map((pot) => (
            <PotRow key={pot.id} pot={pot} onAct={onAct} />
          ))}
        </div>
      )}
    </section>
  );
}

function PotRow({ pot, onAct }: { pot: ManagedPot; onAct: (pending: Pending) => void }) {
  const isOwner = pot.role === "owner";
  return (
    <Card className={pot.archived ? "border-dashed" : undefined}>
      <CardSection className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/p/${pot.id}`}
              className="truncate text-sm font-medium text-ink hover:text-primary transition-colors"
            >
              {pot.title}
            </Link>
            <RolePill role={pot.role} />
            {pot.archived ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
                <Archive className="size-3" aria-hidden />
                Archived
              </span>
            ) : null}
          </div>
          <p className="text-[12px] text-ink-faint">
            {pot.memberCount === null ? (
              "Open it to see what is inside."
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" aria-hidden />
                  {pot.memberCount} {pot.memberCount === 1 ? "member" : "members"}
                </span>
                {" · "}
                {pot.noteCount} {pot.noteCount === 1 ? "note" : "notes"}
                {pot.openProposalCount ? ` · ${pot.openProposalCount} waiting on review` : ""}
                {pot.lastActivityAt ? ` · active ${relativeTime(pot.lastActivityAt)}` : ""}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="quiet" size="sm" href={`/p/${pot.id}`}>
            Open
          </Button>
          <Button variant="quiet" size="sm" href={`/p/${pot.id}/settings`}>
            <Gear className="size-4" />
            Settings
          </Button>
          {isOwner ? (
            pot.archived ? (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => onAct({ kind: "unarchive", pot })}
              >
                <ArrowCounterClockwise className="size-4" />
                Unarchive
              </Button>
            ) : (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => onAct({ kind: "archive", pot })}
              >
                <Archive className="size-4" />
                Archive
              </Button>
            )
          ) : null}
          {isOwner ? (
            <Button variant="danger" size="sm" onClick={() => onAct({ kind: "delete", pot })}>
              <TrashSimple className="size-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </CardSection>
    </Card>
  );
}
