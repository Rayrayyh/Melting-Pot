"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CaretDown, CaretUp, PencilSimple, Plus, TrashSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export type SectionRow = { id: string; title: string; position: number };

const ICON_BUTTON =
  "inline-flex size-7 items-center justify-center rounded-(--radius-control) text-ink-faint hover:text-ink hover:bg-sunken disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-faint transition-colors";

/** Maintainer surface for organizing a Pot's sections. RLS authorizes
 * maintainers directly, so these are plain table operations. */
export function SectionsPanel({
  potId,
  sections,
}: {
  potId: string;
  sections: SectionRow[];
}) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<SectionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = supabaseBrowser();

  async function run(
    action: () => PromiseLike<{ error: unknown }>,
    failure: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError(null);
    const { error: actionError } = await action();
    setBusy(false);
    if (actionError) {
      setError(failure);
      return false;
    }
    router.refresh();
    return true;
  }

  async function add() {
    const title = newTitle.trim();
    if (!title) return;
    const position =
      sections.length > 0 ? Math.max(...sections.map((s) => s.position)) + 1 : 1;
    const ok = await run(
      () => supabase.from("sections").insert({ pot_id: potId, title, position }),
      "Adding the section didn't go through. Try again.",
    );
    if (ok) setNewTitle("");
  }

  async function rename() {
    if (!renaming) return;
    const title = renaming.title.trim();
    if (!title) return;
    const ok = await run(
      () => supabase.from("sections").update({ title }).eq("id", renaming.id),
      "Renaming didn't go through. Try again.",
    );
    if (ok) setRenaming(null);
  }

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[other]] = [reordered[other], reordered[index]];
    await run(
      async () => {
        // Rewrites every out-of-place position so ties from older data
        // cannot make a swap a no-op.
        for (let i = 0; i < reordered.length; i++) {
          if (reordered[i].position !== i + 1) {
            const result = await supabase
              .from("sections")
              .update({ position: i + 1 })
              .eq("id", reordered[i].id);
            if (result.error) return result;
          }
        }
        return { error: null };
      },
      "Reordering didn't go through. Try again.",
    );
  }

  async function remove() {
    if (!deleting) return;
    const ok = await run(
      () => supabase.from("sections").delete().eq("id", deleting.id),
      "Deleting didn't go through. Try again.",
    );
    if (ok) setDeleting(null);
  }

  return (
    <Card>
      <CardSection className="space-y-4">
        <div className="space-y-1">
          <Eyebrow>Sections</Eyebrow>
          <p className="text-[13px] text-ink-muted">
            Sections give shared notes a place to live. Members see them as
            filters on the class feed and as suggestions while contributing.
          </p>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No sections yet. Add the first one below.
          </p>
        ) : (
          <ul aria-label="Sections" className="space-y-2">
            {sections.map((section, index) => (
              <li
                key={section.id}
                className="flex items-center gap-1.5 rounded-(--radius-control) border border-edge bg-surface px-3 py-2"
              >
                {renaming?.id === section.id ? (
                  <form
                    className="flex flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void rename();
                    }}
                  >
                    <Input
                      value={renaming.title}
                      onChange={(e) =>
                        setRenaming({ id: section.id, title: e.target.value })
                      }
                      aria-label={`Rename ${section.title}`}
                      maxLength={120}
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={busy || !renaming.title.trim()}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => setRenaming(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 text-sm text-ink truncate">
                      {section.title}
                    </span>
                    <button
                      type="button"
                      aria-label={`Move ${section.title} up`}
                      disabled={busy || index === 0}
                      onClick={() => void move(index, -1)}
                      className={ICON_BUTTON}
                    >
                      <CaretUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${section.title} down`}
                      disabled={busy || index === sections.length - 1}
                      onClick={() => void move(index, 1)}
                      className={ICON_BUTTON}
                    >
                      <CaretDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Rename ${section.title}`}
                      disabled={busy}
                      onClick={() => setRenaming({ id: section.id, title: section.title })}
                      className={ICON_BUTTON}
                    >
                      <PencilSimple className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${section.title}`}
                      disabled={busy}
                      onClick={() => setDeleting(section)}
                      className={cn(ICON_BUTTON, "hover:text-danger")}
                    >
                      <TrashSimple className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New section name"
            aria-label="New section name"
            maxLength={120}
          />
          <Button type="submit" variant="secondary" disabled={busy || !newTitle.trim()}>
            <Plus className="size-4" />
            Add section
          </Button>
        </form>

        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </CardSection>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this section?"
        confirmLabel="Delete section"
        tone="danger"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      >
        Notes filed under {deleting?.title ?? "this section"} keep all their
        content and simply lose the label. Nothing else is deleted.
      </ConfirmDialog>
    </Card>
  );
}
