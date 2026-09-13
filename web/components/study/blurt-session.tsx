"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, MagnifyingGlass, Sparkle } from "@phosphor-icons/react";
import { checkRecord, type RecordCheck } from "@/app/actions/record";
import { StillStirring } from "@/components/streak/still-stirring";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Input, TextArea } from "@/components/ui/input";
import { Stir } from "@/components/brand/stir";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

const MAX_BLURT = 8_000;
const MAX_PICKED = 20;

type BlurtResult = {
  covered: { point: string; noteTitle: string }[];
  missed: { point: string; noteTitle: string; where: string }[];
  wrong: { claim: string; correction: string; noteTitle: string }[];
  engine?: string;
};

function coachMessage(error: string | undefined, detail: string | undefined): string {
  if (error === "no_notes_matched") return "The notes you picked are not in this Pot any more. Choose again.";
  if (error === "mixing_unavailable") return "Mixing is not set up on this server yet, so the notes cannot be read against your blurt. Everything you wrote is still yours.";
  if (error === "rate_limited") return "You have run the coach a lot just now. Wait a little and try again.";
  if (detail) return detail;
  return "Your blurt could not be read against the notes. Try again in a moment.";
}

/**
 * Blurting: write everything you remember, then see what the notes say back.
 * The result is three fixed groups, every item traced to the note it rests
 * on. No transcript, no conversation: one pass, one read-back.
 */
export function BlurtSession({
  potId,
  potTitle,
  notes,
}: {
  potId: string;
  potTitle: string;
  notes: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<BlurtResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<RecordCheck | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const recordedRef = useRef(false);

  const queryLower = query.trim().toLowerCase();
  const matches = notes.filter((note) => note.title.toLowerCase().includes(queryLower));
  const visibleNotes = matches.slice(0, 30);

  useEffect(() => {
    if (!result || recordedRef.current) return;
    recordedRef.current = true;
    void (async () => {
      await supabaseBrowser().rpc("record_study_run", {
        p_attempt_id: crypto.randomUUID(),
        p_pot_id: potId,
        p_kind: "blurt",
        p_detail: { notes: picked.length, words: text.trim().split(/\s+/).length },
      });
      const check = await checkRecord().catch(() => null);
      if (check?.countedNow) {
        setRecord(check);
        setCelebrating(true);
        router.refresh();
      }
    })();
  }, [result, potId, picked.length, text, router]);

  async function compare() {
    if (busy || picked.length === 0 || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ potId, mode: "blurt", noteIds: picked, text }),
      });
      const body = (await response.json().catch(() => null)) as
        | (BlurtResult & { error?: string; detail?: string })
        | null;
      if (!response.ok || !body || body.error) {
        setError(coachMessage(body?.error, body?.detail));
        return;
      }
      setResult(body);
    } catch {
      setError(coachMessage(undefined, undefined));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
      <Button variant="quiet" size="sm" href={`/p/${potId}`}>
        <ArrowLeft className="size-4" /> Back to {potTitle}
      </Button>
      {record?.countedNow ? (
        <StillStirring
          open={celebrating}
          days={record.days}
          week={record.week}
          onClose={() => setCelebrating(false)}
        />
      ) : null}
      <Card>
        <CardSection className="space-y-6 py-8">
          <div className="space-y-1.5 text-center">
            <Eyebrow>Blurt</Eyebrow>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
              Pick notes, then write everything you remember about them without
              looking. The notes answer back: what you covered, what you
              missed, what you had wrong.
            </p>
          </div>

          {!result ? (
            <>
              {notes.length > 0 ? (
                <fieldset className="space-y-2">
                  <legend className="text-[13px] font-medium text-ink">Which notes</legend>
                  <p className="text-[12px] text-ink-faint">
                    Up to {MAX_PICKED}. The read-back only ever looks at these.
                  </p>
                  {notes.length > 8 ? (
                    <div className="relative">
                      <MagnifyingGlass
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                        aria-hidden
                      />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search the notes"
                        aria-label="Search the notes"
                        className="pl-9"
                      />
                    </div>
                  ) : null}
                  {picked.length > 0 ? (
                    <p className="text-[12px] text-ink-faint">
                      {picked.length} {picked.length === 1 ? "note" : "notes"} picked.{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() => setPicked([])}
                      >
                        Clear
                      </button>
                    </p>
                  ) : null}
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-(--radius-control) border border-edge bg-surface p-1.5">
                    {visibleNotes.map((note) => {
                      const on = picked.includes(note.id);
                      return (
                        <button
                          key={note.id}
                          type="button"
                          aria-pressed={on}
                          disabled={!on && picked.length >= MAX_PICKED}
                          onClick={() =>
                            setPicked((current) =>
                              current.includes(note.id)
                                ? current.filter((id) => id !== note.id)
                                : [...current, note.id].sort(),
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-full px-3.5 py-1.5 text-left text-[13px] transition-colors disabled:opacity-40",
                            on
                              ? "bg-primary-soft font-medium text-primary"
                              : "text-ink-muted hover:bg-sunken hover:text-ink",
                          )}
                        >
                          <span className="truncate">{note.title}</span>
                          {on ? <Check weight="bold" className="size-3.5 shrink-0" aria-hidden /> : null}
                        </button>
                      );
                    })}
                    {matches.length === 0 ? (
                      <p className="px-2.5 py-1.5 text-[12px] text-ink-faint">No notes match that.</p>
                    ) : null}
                  </div>
                </fieldset>
              ) : null}

              <TextArea
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, MAX_BLURT))}
                rows={10}
                aria-label="Your blurt"
                placeholder="Everything you remember: definitions, examples, the order things happen in. Wrong is fine. Missing is fine. That is the point."
                className="text-[15px] min-h-[220px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="tabular-nums text-[12px] text-ink-faint">
                  {text.length.toLocaleString()} / {MAX_BLURT.toLocaleString()}
                </span>
                <Button
                  onClick={() => void compare()}
                  disabled={busy || picked.length === 0 || !text.trim()}
                >
                  {busy ? (
                    <>
                      <Stir size={16} tone="on-primary" />
                      Reading the notes
                    </>
                  ) : (
                    <>
                      <Sparkle className="size-4" />
                      Compare with the notes
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <EngineCredit label="Read against the notes by" engine={result.engine ?? null} />
              <BlurtGroup title="What you covered" tone="covered" items={result.covered.map((entry) => ({ main: entry.point, note: entry.noteTitle }))} />
              <BlurtGroup title="What you missed" tone="missed" items={result.missed.map((entry) => ({ main: entry.point, note: entry.noteTitle, extra: entry.where }))} />
              <BlurtGroup title="What you had wrong" tone="wrong" items={result.wrong.map((entry) => ({ main: entry.claim, note: entry.noteTitle, extra: entry.correction }))} />
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResult(null);
                    recordedRef.current = false;
                  }}
                >
                  Write another blurt
                </Button>
              </div>
            </div>
          )}

          {error && !result ? (
            <p role="alert" className="text-center text-[13px] text-danger">
              {error}
            </p>
          ) : null}
        </CardSection>
      </Card>
    </div>
  );
}

const GROUP_TONE = {
  covered: { dot: "bg-success", empty: "Nothing confirmed yet. The notes may hold more than you think." },
  missed: { dot: "bg-pending", empty: "Nothing left out. Either you remembered it all, or the notes were thin here." },
  wrong: { dot: "bg-danger", empty: "Nothing contradicts the notes." },
} as const;

/** The credit line: which engine read the work, in the coach's own verb. */
export function EngineCredit({ label, engine }: { label: string; engine: string | null }) {
  if (!engine) return null;
  return (
    <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-faint">
      <Sparkle className="size-3.5 shrink-0" weight="fill" aria-hidden />
      <span>
        {label} <span className="text-ink-muted">{engine}</span>
      </span>
    </p>
  );
}

function BlurtGroup({
  title,
  tone,
  items,
}: {
  title: string;
  tone: keyof typeof GROUP_TONE;
  items: Array<{ main: string; note: string; extra?: string }>;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <span className={cn("size-2 rounded-full", GROUP_TONE[tone].dot)} aria-hidden />
        {title}
        <span className="tabular-nums text-ink-faint">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-[13px] text-ink-faint">{GROUP_TONE[tone].empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="rounded-(--radius-control) border border-edge bg-surface px-3.5 py-2.5">
              <p className="text-[13px] leading-relaxed text-ink">{item.main}</p>
              {item.extra ? (
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{item.extra}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-ink-faint">{item.note}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
