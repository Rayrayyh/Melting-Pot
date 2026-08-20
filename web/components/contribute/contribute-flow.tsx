"use client";

import { getClientAuth } from "@/lib/auth/client";
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
import { suggestSection } from "@/lib/organizer";
import type { OrganizedResult } from "@/lib/organizer";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Step = "write" | "section" | "organizing" | "failed" | "review" | "shared";

type SectionOption = { id: string; title: string };

export type StoredOrganized = {
  title: string;
  summary: string;
  blocks: NoteBlock[];
  takeaways: string[];
  suggested_section_id: string | null;
};

export type InitialContribution = {
  id: string;
  rawText: string;
  sectionId: string | null;
  organized?: StoredOrganized | null;
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
  viewerName,
  initial,
}: {
  potId: string;
  potTitle: string;
  sections: SectionOption[];
  viewerName?: string;
  initial?: InitialContribution;
}) {
  const router = useRouter();
  // A draft resumed after it reached review rehydrates its organized result
  // and reopens at the review step, so the organized version and any edits
  // are not silently thrown away and re-derived from scratch.
  const initialOrganized: EditableOrganized | null = initial?.organized
    ? {
        title: initial.organized.title,
        summary: initial.organized.summary,
        bodyDraft: blocksToEditableText(initial.organized.blocks),
        takeawaysDraft: initial.organized.takeaways.join("\n"),
        suggestedSectionId: initial.organized.suggested_section_id,
      }
    : null;
  const [step, setStep] = useState<Step>(initialOrganized ? "review" : "write");
  const [contributionId, setContributionId] = useState<string | null>(initial?.id ?? null);
  const [rawText, setRawText] = useState(initial?.rawText ?? "");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">(
    initial ? "saved" : "idle",
  );
  const [sectionChoice, setSectionChoice] = useState<string | null | undefined>(
    initial?.sectionId ?? undefined,
  );
  const [sectionQuery, setSectionQuery] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{
      id: string;
      name: string;
      kind: string;
      storage_path?: string | null;
      ai_caption?: string | null;
      ai_extracted_text?: string | null;
    }>
  >([]);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [stageStates, setStageStates] = useState<StageState[]>([]);
  const [organized, setOrganized] = useState<EditableOrganized | null>(initialOrganized);
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
      const userId = await getClientAuth().getUserId();
      if (!userId) return null;
      const { data } = await supabase
        .from("contributions")
        .insert({ pot_id: potId, author_id: userId, raw_text: rawText })
        .select("id")
        .single();
      if (data) setContributionId(data.id);
      return data?.id ?? null;
    })();
    const id = await creating.current;
    if (!id) {
      // A failed create must not poison the flow: drop the cached promise
      // so the next action retries, and say what happened.
      creating.current = null;
      setSaved("error");
      setErrorNote("Your note couldn't be saved. Check your connection and try again.");
    }
    return id;
  }, [contributionId, potId, rawText, supabase]);

  // Autosave the raw text from the first meaningful keystroke. The "saving"
  // indicator flips in the change handler; this effect only schedules writes.
  useEffect(() => {
    if (rawText.trim().length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const id = await ensureContribution();
      if (!id) return;
      // .select proves the write landed: an RLS-blocked or signed-out
      // update returns zero rows without an error, which is not "Saved".
      const { data, error } = await supabase
        .from("contributions")
        .update({ raw_text: rawText })
        .eq("id", id)
        .select("id");
      if (error || !data || data.length === 0) {
        setSaved("error");
        return;
      }
      setSaved("saved");
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [rawText, ensureContribution, supabase]);

  function handleRawTextChange(next: string) {
    const trimmed = next.slice(0, 20000);
    setRawText(trimmed);
    // Autosave only fires for non-empty text; clearing to whitespace must
    // not leave the indicator stuck on "Saving" for a write that never runs.
    setSaved(trimmed.trim().length === 0 ? "idle" : "saving");
  }

  // Attachments load for resumed drafts.
  useEffect(() => {
    if (!initial?.id) return;
    void supabase
      .from("attachments")
      .select("id, name, kind, storage_path, ai_caption, ai_extracted_text")
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
    const userId = await getClientAuth().getUserId();
    if (!userId) return;
    const { data } = await supabase
      .from("attachments")
      .insert({
        pot_id: potId,
        contribution_id: id,
        name: name.slice(0, 300),
        kind: "link",
        url: url.trim(),
        created_by: userId,
      })
      .select("id, name, kind")
      .single();
    if (data) setAttachments((prev) => [...prev, data]);
  }

  async function attachFile(file: File) {
    const id = await ensureContribution();
    if (!id) return;
    const userId = await getClientAuth().getUserId();
    if (!userId) return;
    setErrorNote(null);
    // Storage keys must stay ASCII-safe (unicode file names are rejected by
    // the storage API); the original name lives on the attachments row and
    // comes back as the download filename.
    const extension = (file.name.match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? "").toLowerCase();
    const path = `${potId}/${id}/${Date.now()}${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (uploadError) {
      const message = uploadError.message ?? "";
      setErrorNote(
        /mime|content.?type|not.?allowed|invalid/i.test(message)
          ? "That file type isn't supported. Use an image, PDF, text, or Office document."
          : /exceed|size|too large|payload|maximum/i.test(message)
            ? "That file is over the 10 MB limit. Try a smaller one."
            : "That file couldn't be uploaded. Check your connection and try again.",
      );
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
        created_by: userId,
      })
      .select("id, name, kind, storage_path")
      .single();
    if (data) setAttachments((prev) => [...prev, data]);
  }

  async function removeAttachment(id: string) {
    const target = attachments.find((a) => a.id === id);
    await supabase.from("attachments").delete().eq("id", id);
    // Detaching an uploaded file also removes the object, so nothing
    // orphans in storage. Best effort; the row is the source of truth.
    if (target?.storage_path) {
      await supabase.storage.from("attachments").remove([target.storage_path]);
    }
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
      const response = await fetch("/api/ai/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          potId,
          rawText,
          sections,
          attachmentIds: attachments.map((attachment) => attachment.id),
        }),
      });
      const payload = await response.json().catch(() => null) as {
        result?: OrganizedResult;
        analyses?: Array<{ id: string; caption: string; extractedText: string }>;
        error?: string;
        detail?: string;
        visionWarning?: string | null;
      } | null;
      if (!response.ok || !payload?.result) {
        const message = payload?.error === "rate_limited"
          ? "You've generated several notes recently. Wait a little and try again."
          : payload?.detail || "The AI organizer couldn't finish this note.";
        throw new Error(message);
      }
      const result = payload.result;
      if (payload.visionWarning) {
        setErrorNote(`The note was organized, but one image could not be captioned: ${payload.visionWarning}`);
      }
      if (payload.analyses?.length) {
        const byId = new Map(payload.analyses.map((analysis) => [analysis.id, analysis]));
        setAttachments((current) => current.map((attachment) => {
          const analysis = byId.get(attachment.id);
          return analysis ? {
            ...attachment,
            ai_caption: analysis.caption,
            ai_extracted_text: analysis.extractedText,
          } : attachment;
        }));
      }
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
      setErrorNote(error instanceof Error ? error.message : "The AI organizer couldn't finish this note.");
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
      setErrorNote(
        error?.message.includes("not_pot_member")
          ? "You are no longer a member of this Pot, so this can't be shared here."
          : error?.message.includes("pot_archived")
            ? "This Pot has been archived, so nothing new can be shared to it."
            : error?.message.includes("rate_limited")
              ? "You're sharing very quickly. Wait a moment and try again."
              : "Sharing didn't go through. Your note is safe; try again.",
      );
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
              <span className={saved === "error" ? "text-danger" : undefined}>
                {rawText.trim().length > 0 && rawText.trim().length < 20
                  ? "A few more words and this can be organized. Notes need at least 20 characters."
                  : saved === "saving"
                    ? "Saving"
                    : saved === "saved"
                      ? "Saved"
                      : saved === "error"
                        ? "Couldn't save. Your next keystroke retries."
                        : ""}
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
              <AttachmentChips
                attachments={attachments}
                onRemove={(id) => void removeAttachment(id)}
              />
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
            onClick={() =>
              sections.length === 0
                ? void runOrganize(null)
                : setStep("section")
            }
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
            className="min-w-0"
            onClick={() => void runOrganize(sectionChoice === undefined ? null : sectionChoice)}
          >
            {sectionChoice ? (
              <span className="truncate">
                Continue with {sectionTitle(sectionChoice)}
              </span>
            ) : (
              "Continue"
            )}
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
            {viewerName ? (
              <span className="ml-auto text-[13px] text-ink-muted">
                Shared as <span className="font-medium text-ink">{viewerName}</span>
              </span>
            ) : null}
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
                            maxLength={160}
                            onChange={(e) =>
                              setOrganized({ ...organized, title: e.target.value.slice(0, 160) })
                            }
                          />
                        )}
                      </Field>
                      <Field label="Summary">
                        {(props) => (
                          <TextArea
                            {...props}
                            rows={2}
                            maxLength={400}
                            value={organized.summary}
                            onChange={(e) =>
                              setOrganized({ ...organized, summary: e.target.value.slice(0, 400) })
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
                            maxLength={20000}
                            value={organized.bodyDraft}
                            onChange={(e) =>
                              setOrganized({
                                ...organized,
                                bodyDraft: e.target.value.slice(0, 20000),
                              })
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

          {attachments.length > 0 ? (
            <section aria-label="Attachments" className="space-y-2">
              <Eyebrow>Attachments included with this note</Eyebrow>
              <AttachmentChips
                attachments={attachments}
                onRemove={(id) => void removeAttachment(id)}
              />
            </section>
          ) : null}

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

function AttachmentChips({
  attachments,
  onRemove,
}: {
  attachments: Array<{
    id: string;
    name: string;
    kind: string;
    ai_caption?: string | null;
    ai_extracted_text?: string | null;
  }>;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="rounded-xl border border-edge bg-sunken px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink">
            {attachment.kind === "link" ? (
              <LinkSimple className="size-3.5 text-ink-faint" aria-hidden />
            ) : (
              <Paperclip className="size-3.5 text-ink-faint" aria-hidden />
            )}
            <span className="max-w-64 truncate">{attachment.name}</span>
            <button
              type="button"
              aria-label={`Remove ${attachment.name}`}
              onClick={() => onRemove(attachment.id)}
              className="inline-flex size-4 items-center justify-center rounded-full hover:bg-edge text-ink-faint"
            >
              <X className="size-3" />
            </button>
          </span>
          {attachment.ai_caption ? (
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Image caption:</span> {attachment.ai_caption}
            </p>
          ) : null}
          {attachment.ai_extracted_text ? (
            <details className="mt-1 text-[12px] text-ink-muted">
              <summary className="cursor-pointer font-medium text-ink">Text found in image</summary>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{attachment.ai_extracted_text}</p>
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
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
