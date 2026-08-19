"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  LinkSimple,
  MagnifyingGlass,
  Paperclip,
  Question,
  X,
} from "@phosphor-icons/react";
import { NoteBody, TakeawaysCard } from "@/components/pot/note-body";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input, TextArea } from "@/components/ui/input";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { SectionPill, StatusPill } from "@/components/ui/pills";
import { FlowProgress, StageChecklist, type StageState } from "@/components/ui/progress-steps";
import { Settle } from "@/components/ui/settle";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import type { NoteBlock } from "@/lib/data/pot";
import {
  blocksToBodyText,
  blocksToEditableText,
  editableTextToBlocks,
} from "@/lib/organizer/edit";
import { getOrganizer, OrganizeError, suggestSection } from "@/lib/organizer";
import type { OrganizedResult } from "@/lib/organizer";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Step = "write" | "section" | "organizing" | "failed" | "review" | "shared";

type SectionOption = { id: string; title: string };

export type InitialContribution = {
  id: string;
  rawText: string;
  sectionId: string | null;
};

type EditableOrganized = {
  title: string;
  summary: string;
  bodyDraft: string;
  takeawaysDraft: string;
  suggestedSectionId: string | null;
};

const STAGES = [
  { label: "Original preserved", detail: "Saved exactly as you wrote it" },
  { label: "Structuring the idea", detail: "Building a scannable explanation" },
  { label: "Creating a summary", detail: "One line the class can skim" },
  { label: "Suggesting placement", detail: "Matching this to a section" },
] as const;

export function ContributeFlow({
  potId,
  potTitle,
  sections,
  initial,
}: {
  potId: string;
  potTitle: string;
  sections: SectionOption[];
  initial?: InitialContribution;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("write");
  const [contributionId, setContributionId] = useState<string | null>(initial?.id ?? null);
  const [rawText, setRawText] = useState(initial?.rawText ?? "");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">(initial ? "saved" : "idle");
  const [sectionChoice, setSectionChoice] = useState<string | null | undefined>(
    initial?.sectionId ?? undefined,
  );
  const [sectionQuery, setSectionQuery] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; kind: string }>
  >([]);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [stageStates, setStageStates] = useState<StageState[]>([]);
  const [organized, setOrganized] = useState<EditableOrganized | null>(null);
  const [editing, setEditing] = useState(false);
  const [sharedNoteId, setSharedNoteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorNote, setErrorNote] = useState<string | null>(null);
  const cancelOrganize = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = supabaseBrowser();

  // Guarded against concurrent callers (autosave + attach can fire together):
  // exactly one contribution row is ever created per flow.
  const creating = useRef<Promise<string | null> | null>(null);
  const ensureContribution = useCallback(async (): Promise<string | null> => {
    if (contributionId) return contributionId;
    creating.current ??= (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("contributions")
        .insert({ pot_id: potId, author_id: user.id, raw_text: rawText })
        .select("id")
        .single();
      if (data) setContributionId(data.id);
      return data?.id ?? null;
    })();
    return creating.current;
  }, [contributionId, potId, rawText, supabase]);

  // Autosave the raw text from the first meaningful keystroke. The "saving"
  // indicator flips in the change handler; this effect only schedules writes.
  useEffect(() => {
    if (rawText.trim().length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const id = await ensureContribution();
      if (!id) return;
      await supabase.from("contributions").update({ raw_text: rawText }).eq("id", id);
      setSaved("saved");
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [rawText, ensureContribution, supabase]);

  function handleRawTextChange(next: string) {
    setRawText(next.slice(0, 20000));
    setSaved("saving");
  }

  // Attachments load for resumed drafts.
  useEffect(() => {
    if (!initial?.id) return;
    void supabase
      .from("attachments")
      .select("id, name, kind")
      .eq("contribution_id", initial.id)
      .then(({ data }) => {
        if (data) setAttachments(data);
      });
  }, [initial?.id, supabase]);

  async function attachLink(url: string) {
    const id = await ensureContribution();
    if (!id || !url.trim()) return;
    let name = url.trim();
    try {
      name = new URL(url).hostname + new URL(url).pathname;
    } catch {
      // Keep the raw text as the display name.
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("attachments")
      .insert({
        pot_id: potId,
        contribution_id: id,
        name: name.slice(0, 300),
        kind: "link",
        url: url.trim(),
        created_by: user.id,
      })
      .select("id, name, kind")
      .single();
    if (data) setAttachments((prev) => [...prev, data]);
  }

  async function attachFile(file: File) {
    const id = await ensureContribution();
    if (!id) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${potId}/${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(path, file);
    if (uploadError) {
      setErrorNote("That file couldn't be uploaded. Try a smaller file.");
      return;
    }
    const kind = file.type.startsWith("image/")
      ? "image"
      : file.type === "application/pdf"
        ? "pdf"
        : "file";
    const { data } = await supabase
      .from("attachments")
      .insert({
        pot_id: potId,
        contribution_id: id,
        name: file.name.slice(0, 300),
        kind,
        storage_path: path,
        created_by: user.id,
      })
      .select("id, name, kind")
      .single();
    if (data) setAttachments((prev) => [...prev, data]);
  }

  async function removeAttachment(id: string) {
    await supabase.from("attachments").delete().eq("id", id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function runOrganize(chosen: string | null) {
    const id = await ensureContribution();
    if (!id) return;
    cancelOrganize.current = false;
    setStep("organizing");
    setStageStates(["active", "waiting", "waiting", "waiting"]);
    await supabase.from("contributions").update({ status: "organizing" }).eq("id", id);

    const advance = (index: number) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          setStageStates((prev) =>
            prev.map((s, i) => (i < index + 1 ? "done" : i === index + 1 ? "active" : "waiting")),
          );
          resolve();
        }, 550);
      });

    try {
      await advance(0);
      if (cancelOrganize.current) return;
      const result: OrganizedResult = await getOrganizer().organize({
        rawText,
        sections,
      });
      await advance(1);
      if (cancelOrganize.current) return;
      await advance(2);
      if (cancelOrganize.current) return;
      await advance(3);
      if (cancelOrganize.current) return;

      const next: EditableOrganized = {
        title: result.title,
        summary: result.summary,
        bodyDraft: blocksToEditableText(result.blocks),
        takeawaysDraft: result.takeaways.join("\n"),
        suggestedSectionId: result.suggestedSectionId,
      };
      setOrganized(next);
      // The suggestion is shown at review, never silently applied: an
      // unchosen section stays "No section yet" until the student picks.
      await supabase
        .from("contributions")
        .update({
          status: "ready_to_review",
          organized: {
            title: next.title,
            summary: next.summary,
            blocks: result.blocks,
            takeaways: result.takeaways,
            suggested_section_id: result.suggestedSectionId,
          },
          section_id: chosen,
        })
        .eq("id", id);
      setStep("review");
    } catch (error) {
      await supabase.from("contributions").update({ status: "failed" }).eq("id", id);
      setErrorNote(
        error instanceof OrganizeError && error.reason === "too_short"
          ? "There isn't enough here to organize yet."
          : null,
      );
      setStep("failed");
    }
  }

  function currentBlocks(): NoteBlock[] {
    if (!organized) return [];
    return editableTextToBlocks(organized.bodyDraft);
  }

  function currentTakeaways(): string[] {
    if (!organized) return [];
    return organized.takeawaysDraft
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function share() {
    if (!contributionId || !organized || busy) return;
    setBusy(true);
    setErrorNote(null);
    const blocks = currentBlocks();
    const { data, error } = await supabase.rpc("share_contribution", {
      p_contribution_id: contributionId,
      p_title: organized.title.trim(),
      p_summary: organized.summary.trim(),
      p_body: blocks,
      p_body_text: blocksToBodyText(blocks),
      p_takeaways: currentTakeaways(),
      p_section_id: sectionChoice ?? undefined,
    });
    if (error || !data) {
      setErrorNote("Sharing didn't go through. Your note is safe; try again.");
      setBusy(false);
      return;
    }
    setSharedNoteId(data);
    setStep("shared");
    setBusy(false);
    router.refresh();
  }

  const sectionTitle = (id: string | null | undefined) =>
    sections.find((s) => s.id === id)?.title ?? null;

  // ----- Write step ---------------------------------------------------------

  if (step === "write") {
    const ready = rawText.trim().length >= 20;
    return (
      <div className="flex flex-col flex-1">
        <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6 flex-1 pb-24">
          <FlowProgress step={1} total={3} label="Write" />
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Write anything</h1>
            <p className="text-sm text-ink-muted">
              No templates, no formatting, no pressure.
            </p>
          </header>
          <div className="space-y-3">
            <TextArea
              value={rawText}
              onChange={(e) => handleRawTextChange(e.target.value)}
              rows={12}
              autoFocus
              aria-label="Your contribution"
              placeholder="Type whatever you remember, paste rough notes, explain an idea, or share an example. Formatting does not matter."
              className="text-[15px] min-h-[280px]"
            />
            <div className="flex items-center justify-between text-[12px] text-ink-muted">
              <span>
                {saved === "saving" ? "Saving" : saved === "saved" ? "Saved" : ""}
              </span>
              <span className="tabular-nums">{rawText.length.toLocaleString()} / 20,000</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 items-center gap-2 px-3.5 rounded-(--radius-control) border border-edge-strong bg-surface text-[13px] font-medium text-ink cursor-pointer hover:bg-sunken transition-colors">
                <Paperclip className="size-4" aria-hidden />
                Attach file
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf,.txt,.md,.csv,.docx,.pptx,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void attachFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button variant="secondary" size="sm" onClick={() => setLinkDraft("")}>
                <LinkSimple className="size-4" />
                Add link
              </Button>
            </div>
            {linkDraft !== null ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void attachLink(linkDraft);
                  setLinkDraft(null);
                }}
              >
                <Input
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                  placeholder="https://..."
                  aria-label="Link URL"
                  autoFocus
                />
                <Button type="submit" variant="secondary">
                  Attach
                </Button>
              </form>
            ) : null}
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full bg-sunken border border-edge text-[12px] text-ink"
                  >
                    {attachment.kind === "link" ? (
                      <LinkSimple className="size-3.5 text-ink-faint" aria-hidden />
                    ) : (
                      <Paperclip className="size-3.5 text-ink-faint" aria-hidden />
                    )}
                    <span className="max-w-48 truncate">{attachment.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() => void removeAttachment(attachment.id)}
                      className="inline-flex size-4 items-center justify-center rounded-full hover:bg-edge text-ink-faint"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {errorNote ? <p className="text-[13px] text-danger">{errorNote}</p> : null}
          </div>
        </div>
        <StickyActionBar
          icon={<Eye />}
          message="Original text will always be preserved."
        >
          <Button variant="quiet" href={`/p/${potId}`}>
            Cancel
          </Button>
          <Button
            disabled={!ready}
            onClick={() => setStep("section")}
          >
            Continue
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  // ----- Section step -------------------------------------------------------

  if (step === "section") {
    const recommendation = suggestSection(rawText, sections);
    const filtered = sections.filter((s) =>
      s.title.toLowerCase().includes(sectionQuery.toLowerCase()),
    );
    const recommended = filtered.find((s) => s.id === recommendation.id);
    const others = filtered.filter((s) => s.id !== recommendation.id);
    return (
      <div className="flex flex-col flex-1">
        <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6 flex-1 pb-24">
          <FlowProgress step={2} total={3} label="Optional section" />
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Where might this belong?
            </h1>
            <p className="text-sm text-ink-muted">
              Pick a section if you know it. Skipping is completely fine.
            </p>
          </header>

          {sections.length > 4 ? (
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-faint" />
              <Input
                value={sectionQuery}
                onChange={(e) => setSectionQuery(e.target.value)}
                placeholder="Search sections"
                aria-label="Search sections"
                className="pl-9"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            {recommended ? (
              <SectionOptionRow
                title={recommended.title}
                hint="Recommended from what you wrote"
                selected={sectionChoice === recommended.id}
                onSelect={() => setSectionChoice(recommended.id)}
              />
            ) : null}
            {others.map((section) => (
              <SectionOptionRow
                key={section.id}
                title={section.title}
                selected={sectionChoice === section.id}
                onSelect={() => setSectionChoice(section.id)}
              />
            ))}
            <SectionOptionRow
              title="Not sure where it belongs"
              hint="Nothing is decided for you. A suggestion appears at review."
              icon={<Question className="size-4" aria-hidden />}
              selected={sectionChoice === null}
              onSelect={() => setSectionChoice(null)}
            />
          </div>
        </div>
        <StickyActionBar
          icon={<Eye />}
          message="Nothing is shared until you approve it."
        >
          <Button variant="quiet" onClick={() => setStep("write")}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button
            onClick={() => void runOrganize(sectionChoice === undefined ? null : sectionChoice)}
          >
            {sectionChoice
              ? `Continue with ${sectionTitle(sectionChoice)}`
              : "Continue"}
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  // ----- Organizing state ---------------------------------------------------

  if (step === "organizing") {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-12 space-y-8">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Organizing your note</h1>
          <p className="text-sm text-ink-muted">
            Your original is saved. Nothing has been shared yet.
          </p>
        </header>
        <Card>
          <CardSection className="py-6">
            <StageChecklist
              stages={STAGES.map((stage, i) => ({
                ...stage,
                state: stageStates[i] ?? "waiting",
              }))}
            />
          </CardSection>
        </Card>
        <div className="text-center">
          <Button
            variant="quiet"
            onClick={async () => {
              cancelOrganize.current = true;
              if (contributionId) {
                await supabase
                  .from("contributions")
                  .update({ status: "draft" })
                  .eq("id", contributionId);
              }
              setStep("write");
            }}
          >
            Cancel and return to draft
          </Button>
        </div>
      </div>
    );
  }

  // ----- Failure state ------------------------------------------------------

  if (step === "failed") {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-12 space-y-6">
        <NoticeBanner tone="danger" title="We couldn't organize this contribution">
          Your original draft is safe. You can try again or edit it manually.
          {errorNote ? ` ${errorNote}` : ""}
        </NoticeBanner>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => void runOrganize(sectionChoice ?? null)}>Try again</Button>
          <Button variant="secondary" onClick={() => setStep("write")}>
            Edit manually
          </Button>
          <Button variant="quiet" href={`/p/${potId}`}>
            Save draft
          </Button>
        </div>
      </div>
    );
  }

  // ----- Review step --------------------------------------------------------

  if (step === "review" && organized) {
    const blocks = currentBlocks();
    const takeaways = currentTakeaways();
    return (
      <div className="flex flex-col flex-1">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6 flex-1 pb-24">
          <div className="flex items-center justify-between gap-3">
            <FlowProgress step={3} total={3} label="Review before sharing" className="flex-1 max-w-52" />
            <StatusPill tone="primary">Review required</StatusPill>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>Suggested placement</Eyebrow>
            <select
              value={sectionChoice ?? ""}
              onChange={(e) => setSectionChoice(e.target.value || null)}
              aria-label="Section"
              className="h-8 rounded-(--radius-control) border border-edge-strong bg-surface px-2.5 text-[13px] text-ink focus:border-primary focus:outline-none"
            >
              <option value="">No section yet</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                  {section.id === organized.suggestedSectionId ? " (suggested)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 items-start">
            <section aria-label="Original" className="space-y-2 order-2 lg:order-1">
              <Eyebrow>Original preserved</Eyebrow>
              <div className="bg-sunken/70 border border-edge rounded-(--radius-card) px-5 py-4">
                <p className="text-[14px] leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {rawText}
                </p>
              </div>
            </section>

            <section aria-label="Organized" className="space-y-2 order-1 lg:order-2">
              <div className="flex items-center justify-between">
                <Eyebrow>Organized</Eyebrow>
                <Button variant="quiet" size="sm" onClick={() => setEditing((v) => !v)}>
                  {editing ? "Done editing" : "Edit"}
                </Button>
              </div>
              <Card>
                <CardSection className="space-y-4">
                  {editing ? (
                    <div className="space-y-4">
                      <Field label="Title">
                        {(props) => (
                          <Input
                            {...props}
                            value={organized.title}
                            onChange={(e) =>
                              setOrganized({ ...organized, title: e.target.value })
                            }
                          />
                        )}
                      </Field>
                      <Field label="Summary">
                        {(props) => (
                          <TextArea
                            {...props}
                            rows={2}
                            value={organized.summary}
                            onChange={(e) =>
                              setOrganized({ ...organized, summary: e.target.value })
                            }
                          />
                        )}
                      </Field>
                      <Field
                        label="Body"
                        hint="Blank lines separate blocks. Lines starting with - become bullets. Term: text becomes a definition."
                      >
                        {(props) => (
                          <TextArea
                            {...props}
                            rows={10}
                            value={organized.bodyDraft}
                            onChange={(e) =>
                              setOrganized({ ...organized, bodyDraft: e.target.value })
                            }
                          />
                        )}
                      </Field>
                      <Field label="Key takeaways" hint="One per line. Leave empty for none.">
                        {(props) => (
                          <TextArea
                            {...props}
                            rows={2}
                            value={organized.takeawaysDraft}
                            onChange={(e) =>
                              setOrganized({ ...organized, takeawaysDraft: e.target.value })
                            }
                          />
                        )}
                      </Field>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <h2 className="text-xl font-semibold tracking-tight">
                          {organized.title}
                        </h2>
                        <p className="text-sm text-ink-muted">{organized.summary}</p>
                      </div>
                      <NoteBody blocks={blocks} className="text-[15px]" />
                      <TakeawaysCard takeaways={takeaways} />
                    </div>
                  )}
                </CardSection>
              </Card>
              <p className="text-[12px] text-ink-faint text-right">Organized for you; every word stays yours to change.</p>
            </section>
          </div>

          {errorNote ? (
            <p role="alert" className="text-[13px] text-danger">
              {errorNote}
            </p>
          ) : null}
        </div>

        <StickyActionBar icon={<Eye />} message="Only you can approve what gets shared.">
          <Button variant="quiet" href={`/p/${potId}`}>
            Save draft
          </Button>
          <Button
            variant="secondary"
            onClick={() => void runOrganize(sectionChoice ?? null)}
          >
            Organize again
          </Button>
          <Button onClick={() => void share()} disabled={busy || !organized.title.trim()}>
            {busy ? "Sharing" : "Share with class"}
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  // ----- Shared success -----------------------------------------------------

  if (step === "shared" && organized) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-12 space-y-6">
        <Settle className="flex flex-col items-center text-center gap-3">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle weight="fill" className="size-8 text-success" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Shared with the class</h1>
            <p className="text-sm text-ink-muted">
              Your contribution is live and credited to you.
            </p>
          </div>
        </Settle>
        <Card>
          <CardSection className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">{organized.title}</p>
              <StatusPill tone="success">Live</StatusPill>
            </div>
            <p className="text-sm text-ink-muted line-clamp-2">{organized.summary}</p>
            <p className="text-[12px] text-ink-faint">
              {sectionTitle(sectionChoice ?? null)
                ? `Added to ${sectionTitle(sectionChoice ?? null)} in ${potTitle}`
                : `Added to ${potTitle}`}{" "}
              just now
            </p>
          </CardSection>
        </Card>
        <div className="flex flex-col gap-2.5">
          {sharedNoteId ? (
            <Button size="lg" href={`/p/${potId}/n/${sharedNoteId}`}>
              View in class notes
            </Button>
          ) : null}
          <Button variant="secondary" href={`/p/${potId}`}>
            Back to class feed
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setStep("write");
              setContributionId(null);
              creating.current = null;
              setRawText("");
              setSectionChoice(undefined);
              setOrganized(null);
              setAttachments([]);
              setSharedNoteId(null);
              setSaved("idle");
            }}
          >
            Add another contribution
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function SectionOptionRow({
  title,
  hint,
  icon,
  selected,
  onSelect,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full flex items-center gap-3 rounded-(--radius-card) border px-4 py-3.5 text-left transition-colors",
        selected
          ? "border-primary/50 bg-primary-soft/60"
          : "border-edge bg-surface hover:border-edge-strong",
      )}
    >
      {icon ? <span className="text-ink-faint">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-medium", selected ? "text-primary" : "text-ink")}>
          {title}
        </span>
        {hint ? <span className="block text-[12px] text-ink-muted">{hint}</span> : null}
      </span>
      {selected ? <SectionPill active>Selected</SectionPill> : null}
    </button>
  );
}
