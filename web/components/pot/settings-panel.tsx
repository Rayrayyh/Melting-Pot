"use client";

import { getClientAuth } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowSquareOut, GraduationCap, Plugs } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, TextArea } from "@/components/ui/input";
import type { PotStudyGeneration } from "@/lib/database.types";
import type { PotContext } from "@/lib/data/pot";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function SettingsPanel({
  pot,
  isOwner,
  sectionsSlot,
}: {
  pot: PotContext;
  isOwner: boolean;
  sectionsSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(pot.title);
  const [description, setDescription] = useState(pot.description ?? "");
  const [classCode, setClassCode] = useState(pot.classCode);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"regenerate" | "archive" | "delete" | "leave" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // How the Pot is run, as opposed to what it is called. Kept in state so the
  // toggle answers immediately rather than waiting on a refresh.
  const [joinOpen, setJoinOpen] = useState(pot.joinOpen);
  const [studyGeneration, setStudyGeneration] = useState(pot.studyGeneration);
  const [ruleBusy, setRuleBusy] = useState(false);

  const supabase = supabaseBrowser();

  /**
   * Both of these are enforced in Postgres, not here: joining goes through
   * join_pot_with_code, which refuses a closed Pot, and generating goes
   * through the study route, which refuses a member when the Pot says
   * maintainers only. This writes the setting; it does not police it.
   */
  async function saveRule(next: { joinOpen?: boolean; studyGeneration?: PotStudyGeneration }) {
    if (ruleBusy) return;
    setRuleBusy(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("pots")
      .update({
        ...(next.joinOpen === undefined ? {} : { join_open: next.joinOpen }),
        ...(next.studyGeneration === undefined ? {} : { study_generation: next.studyGeneration }),
      })
      .eq("id", pot.id);
    setRuleBusy(false);
    if (updateError) {
      setError("That setting could not be saved. Try again.");
      // Put the control back where the Pot actually is.
      setJoinOpen(pot.joinOpen);
      setStudyGeneration(pot.studyGeneration);
      return;
    }
    setSavedNote("Saved");
    router.refresh();
  }

  async function saveIdentity() {
    if (busy || !title.trim()) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("pots")
      .update({ title: title.trim(), description: description.trim() || null })
      .eq("id", pot.id);
    if (updateError) {
      setError("Saving didn't go through. Try again.");
    } else {
      setSavedNote("Saved");
      setTimeout(() => setSavedNote(null), 1800);
      router.refresh();
    }
    setBusy(false);
  }

  async function regenerate() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("regenerate_class_code", {
      p_pot_id: pot.id,
    });
    if (rpcError || !data) {
      setError("Regenerating didn't go through. Try again.");
    } else {
      setClassCode(data);
      router.refresh();
    }
    setDialog(null);
    setBusy(false);
  }

  async function archive() {
    setBusy(true);
    const { error: updateError } = await supabase
      .from("pots")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", pot.id);
    setDialog(null);
    setBusy(false);
    if (!updateError) {
      router.push("/home");
      router.refresh();
    } else {
      setError("Archiving didn't go through. Try again.");
    }
  }

  async function unarchive() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("pots")
      .update({ archived_at: null })
      .eq("id", pot.id);
    setBusy(false);
    if (updateError) {
      setError("Unarchiving didn't go through. Try again.");
    } else {
      router.refresh();
    }
  }

  async function deletePot() {
    setBusy(true);
    const { error: deleteError } = await supabase.from("pots").delete().eq("id", pot.id);
    setDialog(null);
    setBusy(false);
    if (!deleteError) {
      router.push("/home");
      router.refresh();
    } else {
      setError("Deleting didn't go through. Try again.");
    }
  }

  async function leave() {
    setBusy(true);
    const userId = await getClientAuth().getUserId();
    if (!userId) {
      setDialog(null);
      setBusy(false);
      setError("You're signed out. Sign in again to leave this Pot.");
      return;
    }
    const { error: leaveError } = await supabase
      .from("memberships")
      .delete()
      .eq("pot_id", pot.id)
      .eq("user_id", userId);
    setDialog(null);
    setBusy(false);
    if (!leaveError) {
      router.push("/home");
      router.refresh();
    } else {
      setError("Leaving didn't go through. Try again.");
    }
  }

  return (
    <div className="space-y-6">
      {pot.archived ? (
        <NoticeBanner tone="warning" title="This Pot is archived">
          Everything stays readable, but it is hidden from dashboards and
          closed to new joins and contributions.
          {isOwner ? " Unarchive it below to bring it back." : ""}
        </NoticeBanner>
      ) : null}
      <Card>
        <CardSection className="space-y-4">
          <Eyebrow>Identity</Eyebrow>
          {isOwner ? (
            <>
              <Field
                label="Pot name"
                hint="Names can repeat across classes. The class code is what stays unique."
              >
                {(props) => (
                  <Input
                    {...props}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                  />
                )}
              </Field>
              <Field label="Description">
                {(props) => (
                  <TextArea
                    {...props}
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                  />
                )}
              </Field>
              <div className="flex items-center justify-end gap-3">
                {savedNote ? <span className="text-[13px] text-success">{savedNote}</span> : null}
                <Button onClick={() => void saveIdentity()} disabled={busy || !title.trim()}>
                  Save changes
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold text-ink">{pot.title}</p>
              {pot.description ? (
                <p className="text-sm text-ink-muted">{pot.description}</p>
              ) : null}
              <p className="text-[12px] text-ink-faint pt-1">
                Only the owner can rename this Pot.
              </p>
            </div>
          )}
        </CardSection>
      </Card>

      <Card>
        <CardSection className="space-y-3">
          <Eyebrow>Class code</Eyebrow>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 items-center rounded-(--radius-control) border border-edge-strong bg-sunken px-4 font-mono text-lg font-semibold tracking-[0.3em] text-ink">
              {classCode}
            </span>
            <CopyButton value={classCode} label="Copy code" />
          </div>
          <p className="text-[13px] text-ink-muted">
            Anyone with the code can join this Pot.
          </p>
          {isOwner ? (
            <div>
              <Button variant="secondary" size="sm" onClick={() => setDialog("regenerate")}>
                Regenerate code
              </Button>
            </div>
          ) : null}
        </CardSection>
      </Card>

      <Card>
        <CardSection className="space-y-5">
          <Eyebrow>How this Pot runs</Eyebrow>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Joining</p>
              <p className="text-[13px] text-ink-muted">
                {joinOpen
                  ? "Anyone with the code can join."
                  : "Closed. The code still works for people already in, so invites you have sent stay valid for whenever you reopen it."}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {(
                [
                  [true, "Open"],
                  [false, "Closed"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={joinOpen === value}
                  disabled={ruleBusy}
                  onClick={() => {
                    setJoinOpen(value);
                    void saveRule({ joinOpen: value });
                  }}
                  className={cn(
                    "h-8 px-3.5 rounded-full border text-[13px] font-medium transition-colors disabled:opacity-50",
                    joinOpen === value
                      ? "bg-primary-soft border-primary/30 text-primary"
                      : "bg-surface border-edge-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-edge pt-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Building study material</p>
              <p className="text-[13px] text-ink-muted">
                {studyGeneration === "members"
                  ? "Anyone in the Pot can build a summary, a deck, or a test."
                  : "Only maintainers build new material. Everyone can still open anything the class has already built."}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {(
                [
                  ["members", "Anyone"],
                  ["maintainers", "Maintainers"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={studyGeneration === value}
                  disabled={ruleBusy}
                  onClick={() => {
                    setStudyGeneration(value);
                    void saveRule({ studyGeneration: value });
                  }}
                  className={cn(
                    "h-8 px-3.5 rounded-full border text-[13px] font-medium transition-colors disabled:opacity-50",
                    studyGeneration === value
                      ? "bg-primary-soft border-primary/30 text-primary"
                      : "bg-surface border-edge-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardSection>
      </Card>

      {sectionsSlot}

      <Card>
        <CardSection className="space-y-3">
          <Eyebrow>Integrations</Eyebrow>
          <p className="text-[13px] text-ink-muted">
            Import from your class tools. Not available yet; the hooks are here
            for a later release.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled>
              <GraduationCap className="size-4" />
              Connect Google Classroom
            </Button>
            <Button variant="secondary" size="sm" disabled>
              <Plugs className="size-4" />
              Connect Canvas
            </Button>
          </div>
        </CardSection>
      </Card>

      <Card className={isOwner ? "border-danger/25" : undefined}>
        <CardSection className="space-y-3">
          <Eyebrow>{isOwner ? "Careful actions" : "Membership"}</Eyebrow>
          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}
          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              {pot.archived ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void unarchive()}
                  disabled={busy}
                >
                  Unarchive Pot
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setDialog("archive")}>
                  Archive Pot
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={() => setDialog("delete")}>
                Delete Pot
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-ink-muted">
                Leaving removes this Pot from your vault. Your shared notes stay
                credited to you.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setDialog("leave")}>
                <ArrowSquareOut className="size-4" />
                Leave this Pot
              </Button>
            </div>
          )}
        </CardSection>
      </Card>

      <ConfirmDialog
        open={dialog === "regenerate"}
        title="Regenerate class code?"
        confirmLabel="Regenerate code"
        tone="danger"
        busy={busy}
        onConfirm={() => void regenerate()}
        onCancel={() => setDialog(null)}
      >
        This invalidates the old code immediately. Anyone joining will need the
        new one.
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "archive"}
        title="Archive this Pot?"
        confirmLabel="Archive Pot"
        tone="danger"
        busy={busy}
        onConfirm={() => void archive()}
        onCancel={() => setDialog(null)}
      >
        The Pot closes to new joins and disappears from dashboards. Nothing is
        deleted.
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "delete"}
        title="Delete this Pot?"
        confirmLabel="Delete Pot permanently"
        tone="danger"
        busy={busy}
        onConfirm={() => void deletePot()}
        onCancel={() => setDialog(null)}
      >
        Every note, version, and proposal in {pot.title} is permanently
        deleted. This cannot be undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "leave"}
        title="Leave this Pot?"
        confirmLabel="Leave Pot"
        busy={busy}
        onConfirm={() => void leave()}
        onCancel={() => setDialog(null)}
      >
        You can rejoin any time with the class code.
      </ConfirmDialog>
    </div>
  );
}
