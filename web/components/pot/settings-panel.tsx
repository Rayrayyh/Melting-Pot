"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowSquareOut, GraduationCap, Plugs } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, TextArea } from "@/components/ui/input";
import type { PotContext } from "@/lib/data/pot";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SettingsPanel({ pot, isOwner }: { pot: PotContext; isOwner: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(pot.title);
  const [description, setDescription] = useState(pot.description ?? "");
  const [classCode, setClassCode] = useState(pot.classCode);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"regenerate" | "archive" | "delete" | "leave" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = supabaseBrowser();

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error: leaveError } = await supabase
      .from("memberships")
      .delete()
      .eq("pot_id", pot.id)
      .eq("user_id", user.id);
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
              <Button variant="secondary" size="sm" onClick={() => setDialog("archive")}>
                Archive Pot
              </Button>
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
