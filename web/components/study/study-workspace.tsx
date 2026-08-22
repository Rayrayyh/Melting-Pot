"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Cards,
  Check,
  ClockCounterClockwise,
  FloppyDisk,
  Sparkle,
  TrashSimple,
} from "@phosphor-icons/react";
import { FlashcardSession } from "@/components/study/flashcard-session";
import { PracticeSession } from "@/components/study/practice-session";
import { PracticeSetup } from "@/components/study/practice-setup";
import { Button } from "@/components/ui/button";
import { Stir } from "@/components/brand/stir";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { cn } from "@/lib/cn";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";
import type { StudyKind } from "@/lib/mix/contracts";
import type { SavedStudySet } from "@/lib/data/study";
import type { StudyCard } from "@/lib/study/flashcard-session";
import {
  markLocally,
  type PracticeMark,
  type PracticeMarking,
  type PracticeQuestion,
} from "@/lib/study/practice-session";
import {
  DEFAULT_PRACTICE_OPTIONS,
  describeOptions,
  normalizePracticeOptions,
  practiceOptionsKey,
  type PracticeOptions,
} from "@/lib/study/practice-options";
import { relativeTime } from "@/lib/time";

type SummaryResult = {
  overview: string;
  keyTopics: Array<{ title: string; explanation: string }>;
  stillToConfirm: string[];
};
type FlashcardResult = { cards: StudyCard[] };
type PracticeResult = { title: string; questions: PracticeQuestion[] };
type StudyResult = SummaryResult | FlashcardResult | PracticeResult;

type Loaded = {
  result: StudyResult;
  /** True when the set came out of the Pot's store rather than a fresh call. */
  cached: boolean;
  generatedAt: string | null;
  studySetId: string | null;
  /**
   * What the set was built from. Carried so the browser can store a set the
   * server failed to store: saving there is best effort on purpose, because a
   * storage failure must not throw away a generation somebody waited for.
   * Null for a set that was opened from the store, which is already saved.
   */
  fingerprint: string | null;
  model: string | null;
  /**
   * True when this set's answers live on the server, so handing it in records
   * a marked attempt. Sets from before the boundary carry their answers in the
   * payload and stay client-marked practice.
   */
  secured: boolean;
};

/** How long a settings change waits before the store is asked about it. */
const SETTLE_MS = 400;

const copy = {
  summary: {
    title: "Summary",
    description: "Turn the full Pot into a focused study guide.",
    icon: Sparkle,
    build: "Build the summary",
    rebuild: "Build a new summary",
  },
  flashcards: {
    title: "Flashcards",
    description: "Build recall cards from the notes everyone shared.",
    icon: Cards,
    build: "Build the deck",
    rebuild: "Build a new deck",
  },
  practice: {
    title: "Practice",
    description: "Build a rigorous practice test grounded in the Pot.",
    icon: Brain,
    build: "Write the test",
    rebuild: "Write a new test",
  },
} as const;

/**
 * What the full-screen wait says while the model works. Separate from `build`
 * because that names a button and this narrates a wait already under way.
 */
const waiting = {
  summary: ["Writing your summary", "Reading what the class shared", "Pulling out what matters"],
  flashcards: ["Building your deck", "Reading what the class shared", "Picking what is worth remembering"],
  practice: ["Writing your test", "Reading what the class shared", "Choosing what to ask"],
} as const;

function message(error: string | undefined, detail: string | undefined): string {
  if (error === "mixing_unavailable") {
    return "Mixing is not set up on this server yet, so nothing new can be built. Anything the Pot already has still opens.";
  }
  if (error === "no_notes") return "Share at least one note before building study material.";
  if (error === "no_notes_in_sections") {
    return "Nothing has been shared in the parts you picked. Choose another part, or the whole Pot.";
  }
  if (error === "rate_limited") {
    return "You have built several study sets recently. Wait a little and try again.";
  }
  if (error === "not_pot_member") return "You need to be in this Pot to study from it.";
  if (error === "generation_closed") {
    return "This Pot is set so only maintainers build new study material. Anything the class has already built still opens.";
  }
  return detail || "This study set could not be built.";
}

export function StudyWorkspace({
  potId,
  potTitle,
  kind,
  sections,
  canModerate,
  savedSets,
}: {
  potId: string;
  potTitle: string;
  kind: StudyKind;
  /** The Pot's sections, so a test can be asked for from named parts. */
  sections: Array<{ id: string; title: string }>;
  /** Maintainers can take a bad set away so the class stops being served it. */
  canModerate: boolean;
  /** Everything of this kind the Pot has already built, newest first. */
  savedSets: SavedStudySet[];
}) {
  const router = useRouter();
  // What the reader has opened, and what the store happens to hold for the
  // settings on screen, are two different things. Keeping them apart is what
  // lets the lookup run quietly: it can learn there is a saved test without
  // replacing the one being read, or tearing down the form being filled in.
  const [opened, setOpened] = useState<Loaded | null>(null);
  const [peeked, setPeeked] = useState<Loaded | null>(null);
  // Which settings the store has already been asked about. Derived from, not
  // set alongside, the chosen settings: they differ exactly while a lookup is
  // outstanding, which is the whole of what "checking" means.
  const [lookedUpKey, setLookedUpKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // busy also covers opening a saved set, which is one read. Only a real
  // generation earns the full screen; anything shorter would just flash.
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<PracticeOptions>(DEFAULT_PRACTICE_OPTIONS);
  // A test is set up before it is written, so the settings are a screen of
  // their own that the reader can come back to.
  const [settingUp, setSettingUp] = useState(kind === "practice");
  const [tab, setTab] = useState<"new" | "previous">("new");
  const firstLook = useRef(true);

  const mode = copy[kind];
  const Icon = mode.icon;
  const optionsKey = practiceOptionsKey(options);
  const sectionTitles = new Map(sections.map((section) => [section.id, section.title]));

  const load = useCallback(
    async (request: { peek?: boolean; regenerate?: boolean; options?: PracticeOptions }) => {
      const { options: chosen, ...flags } = request;
      const response = await fetch("/api/ai/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ potId, kind, ...flags, options: chosen }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            result?: StudyResult;
            cached?: boolean;
            generatedAt?: string;
            studySetId?: string | null;
            fingerprint?: string | null;
            model?: string | null;
            secured?: boolean;
            error?: string;
            detail?: string;
          }
        | null;
      if (!response.ok || !payload?.result) {
        return { failure: payload?.error, detail: payload?.detail };
      }
      return {
        loaded: {
          result: payload.result,
          cached: payload.cached === true,
          generatedAt: payload.generatedAt ?? null,
          studySetId: payload.studySetId ?? null,
          fingerprint: payload.fingerprint ?? null,
          model: payload.model ?? null,
          secured: payload.secured === true,
        } satisfies Loaded,
      };
    },
    [potId, kind],
  );

  // What the Pot already has appears without asking for anything, and without
  // spending a generation. Changing a setting looks again, for the test those
  // settings describe, but in the background: the form stays exactly where it
  // is, keeps what has been typed, and keeps the caret inside it.
  useEffect(() => {
    let live = true;
    const first = firstLook.current;
    firstLook.current = false;
    const timer = setTimeout(
      () => {
        void load({ peek: true, options }).then((outcome) => {
          if (!live) return;
          setPeeked(outcome.loaded ?? null);
          // A summary and a deck have nothing to configure, so whatever the Pot
          // holds is simply what the page shows.
          if (kind !== "practice") setOpened(outcome.loaded ?? null);
          setLookedUpKey(optionsKey);
        });
      },
      // The first look is what the page is waiting on, so it goes at once.
      // Later ones are keystrokes and taps, and wait for those to stop.
      first ? 0 : SETTLE_MS,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // optionsKey stands in for options: it is the whole of what the lookup
    // depends on, and it is a string, so the effect does not re-run on identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, optionsKey, kind]);

  async function generate(regenerate: boolean) {
    if (busy) return;
    setBusy(true);
    setGenerating(true);
    setError(null);
    // The finally is what makes the full screen safe to use here. `load` calls
    // fetch, which rejects outright when the network drops, and a flag that
    // only ever cleared on the happy path would leave the cover up with no way
    // out. A stuck button is an annoyance; a stuck cover is a trap.
    try {
      const outcome = await load({ regenerate, options });
      if (!outcome.loaded) {
        // The reply is missing, which is not the same as the work being
        // missing. A generation can finish and be stored and still lose its
        // answer on the way back: the platform cuts a long call off, a phone
        // changes network, a tab is backgrounded. Reporting failure without
        // looking told people their test had not been written while it sat in
        // Previous tests.
        //
        // So ask the Pot what it holds before saying anything. A peek never
        // generates, so this costs nothing and cannot spend a second one.
        const rescued = await load({ peek: true, options });
        if (rescued.loaded) {
          setOpened(rescued.loaded);
          setPeeked(rescued.loaded);
          setSettingUp(false);
          setTab("new");
          router.refresh();
          return;
        }
        setError(message(outcome.failure, outcome.detail));
        return;
      }
      setOpened(outcome.loaded);
      setPeeked(outcome.loaded);
      setSettingUp(false);
      setTab("new");
      // The list of what the Pot holds is rendered on the server, so it has to
      // be told that it just grew.
      router.refresh();
    } catch {
      setError("The connection dropped while this was being built. Try again.");
    } finally {
      setBusy(false);
      setGenerating(false);
    }
  }

  /** Opens a set the Pot already has, without building anything. */
  async function openSaved(set: SavedStudySet) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { data } = await supabaseBrowser()
      .from("study_sets")
      .select("id, payload, created_at, options, secured")
      .eq("id", set.id)
      .is("removed_at", null)
      .maybeSingle();
    setBusy(false);
    if (!data) {
      setError("That test could not be opened. It may have been removed.");
      return;
    }
    setOpened({
      result: data.payload as StudyResult,
      cached: true,
      generatedAt: data.created_at,
      studySetId: data.id,
      fingerprint: null,
      model: null,
      secured: data.secured === true,
    });
    // The settings move to the ones this test was written for, so the line
    // above it describes the test on screen rather than the last thing chosen.
    if (data.options) setOptions(normalizePracticeOptions(data.options));
    setSettingUp(false);
    setTab("new");
  }

  // Saving is normally done by the server the moment a set is built, and the
  // control below says so rather than pretending to be the thing that does it.
  // It becomes a real button in the one case that matters: the server's save
  // is best effort, and when it fails the work is otherwise lost on the next
  // navigation with nothing on screen admitting it.
  async function saveSet() {
    if (!opened || opened.studySetId || !opened.fingerprint || saving) return;
    setSaving(true);
    setError(null);
    const { data, error: rpcError } = await supabaseBrowser().rpc("save_study_set", {
      p_pot_id: potId,
      p_kind: kind,
      p_fingerprint: opened.fingerprint,
      p_payload: opened.result as unknown as Json,
      p_model: opened.model,
      p_options: kind === "practice" ? (options as unknown as Json) : null,
    });
    setSaving(false);
    if (rpcError || !data) {
      setError("That set could not be saved to the Pot. Try again.");
      return;
    }
    setOpened({ ...opened, studySetId: data });
    router.refresh();
  }

  async function removeSet() {
    if (!opened?.studySetId || deleting) return;
    setDeleting(true);
    const { error: rpcError } = await supabaseBrowser().rpc("delete_study_set", {
      p_study_set_id: opened.studySetId,
    });
    setDeleting(false);
    setAsking(false);
    if (rpcError) {
      setError("That set could not be removed. Try again.");
      return;
    }
    setOpened(null);
    setPeeked(null);
    if (kind === "practice") setSettingUp(true);
    router.refresh();
  }

  const markTest = useCallback(
    async (order: number[], answers: Record<number, number>): Promise<PracticeMarking> => {
      const questions = (opened?.result as PracticeResult | undefined)?.questions ?? [];
      if (!opened?.secured || !opened.studySetId) {
        return markLocally(questions, order, answers);
      }
      const { data, error: rpcError } = await supabaseBrowser().rpc("submit_practice_test", {
        p_attempt_id: crypto.randomUUID(),
        p_set_id: opened.studySetId,
        p_answers: { order, choices: answers } as unknown as Json,
      });
      if (rpcError || !data) throw new Error("submit_failed");
      const returned = data as {
        firstPass?: boolean;
        correct?: number;
        total?: number;
        marks?: Array<{
          index: number;
          choice: number | null;
          correct: boolean;
          answerIndex: number | null;
          explanation: string | null;
        }>;
      };
      const marks: Record<number, PracticeMark> = {};
      for (const mark of returned.marks ?? []) {
        marks[mark.index] = {
          choice: mark.choice,
          correct: mark.correct === true,
          answerIndex: mark.answerIndex,
          explanation: mark.explanation,
        };
      }
      return {
        firstPass: returned.firstPass === true,
        correct: returned.correct ?? 0,
        total: returned.total ?? order.length,
        marks,
      };
    },
    [opened],
  );

  const recordRun = useCallback(
    (known: number, learning: number) => {
      if (!opened?.studySetId) return;
      // Best effort on purpose: the round is over and the summary is on
      // screen; a dropped record must not take either away.
      void supabaseBrowser().rpc("record_flashcard_run", {
        p_attempt_id: crypto.randomUUID(),
        p_set_id: opened.studySetId,
        p_known: known,
        p_learning: learning,
      });
    },
    [opened],
  );

  const regenerating = busy && opened !== null;
  const showTabs = kind === "practice" && savedSets.length > 0;
  const checking = lookedUpKey !== optionsKey;
  const settled = lookedUpKey !== null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
      <LoadingScreen open={generating} message={waiting[kind]} />
      <Button variant="quiet" size="sm" href={`/p/${potId}`}>
        <ArrowLeft className="size-4" /> Back to {potTitle}
      </Button>

      <header className="flex items-start justify-between gap-5">
        <div className="space-y-1.5">
          <Eyebrow>Study from the full Pot</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">{mode.title}</h1>
          <p className="text-sm text-ink-muted">{mode.description}</p>
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" weight="fill" />
        </span>
      </header>

      {showTabs ? (
        <nav aria-label="Practice tests" className="flex gap-1.5 border-b border-edge">
          {(
            [
              ["new", settingUp || !opened ? "Set up a test" : "This test"],
              ["previous", `Previous tests (${savedSets.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      {kind === "practice" && tab === "previous" ? (
        <PreviousSets
          sets={savedSets}
          sectionTitles={sectionTitles}
          busy={busy}
          openedId={opened?.studySetId ?? null}
          onOpen={(set) => void openSaved(set)}
        />
      ) : kind === "practice" && (settingUp || !opened) ? (
        <PracticeSetup
          options={options}
          onChange={setOptions}
          sections={sections}
          hasSaved={Boolean(peeked)}
          checking={checking}
          busy={busy}
          error={error}
          onBuild={() => void generate(true)}
          onOpenSaved={() => {
            setOpened(peeked);
            setSettingUp(false);
          }}
        />
      ) : !settled ? (
        <Card>
          <CardSection className="py-12 text-center">
            <p className="text-sm text-ink-muted">Looking for what this Pot already has.</p>
          </CardSection>
        </Card>
      ) : !opened ? (
        <Card>
          <CardSection className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">
              This is mixed from the latest shared notes and the captions your class
              reviewed. Nothing outside the Pot goes in, and the class shares what you
              build here until someone shares a new note.
            </p>
            <Button onClick={() => void generate(false)} disabled={busy}>
              <Sparkle className="size-4" weight="fill" />
              {busy ? (
                <>
                  <Stir size={16} tone="on-primary" />
                  Mixing
                </>
              ) : (
                mode.build
              )}
            </Button>
            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}
          </CardSection>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-3">
            <p className="text-[12px] text-ink-faint">
              {opened.cached && opened.generatedAt
                ? `Built ${relativeTime(opened.generatedAt)} from the notes as they were then. Everyone in the Pot sees this one.`
                : "Built just now from the notes as they are now."}
              {kind === "practice" ? ` ${describeOptions(options, sectionTitles)}.` : ""}
              {kind === "practice" && opened.secured && opened.studySetId
                ? " Handed-in results are saved to this Pot, where you and this Pot's maintainers can see them."
                : kind === "practice"
                  ? " This test carries its own answers, so it stays practice and nothing is recorded."
                  : kind === "flashcards" && opened.studySetId
                    ? " Finished rounds are saved to this Pot, where you and this Pot's maintainers can see them."
                    : ""}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="quiet"
                size="sm"
                onClick={() => (kind === "practice" ? setSettingUp(true) : void generate(true))}
                disabled={busy}
              >
                <Sparkle className="size-4" />
                {kind === "practice" ? "Change the test" : regenerating ? "Mixing" : mode.rebuild}
              </Button>
              {opened.studySetId ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 h-8 text-[13px] font-medium text-success">
                  <Check weight="bold" className="size-3.5" aria-hidden />
                  Saved to this Pot
                </span>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => void saveSet()} disabled={saving}>
                  {saving ? <Stir size={16} /> : <FloppyDisk className="size-4" />}
                  {saving ? "Saving" : "Save to this Pot"}
                </Button>
              )}
              {canModerate && opened.studySetId ? (
                <Button variant="quiet" size="sm" onClick={() => setAsking(true)}>
                  <TrashSimple className="size-4" />
                  Remove this set
                </Button>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}

          {kind === "summary" ? <SummaryView result={opened.result as SummaryResult} /> : null}
          {kind === "flashcards" ? (
            <FlashcardSession
              // A rebuilt deck is a new session, not the old one with new cards.
              key={opened.studySetId ?? opened.generatedAt ?? "deck"}
              cards={(opened.result as FlashcardResult).cards}
              onRegenerate={() => void generate(true)}
              regenerating={busy}
              onFinished={recordRun}
            />
          ) : null}
          {kind === "practice" ? (
            <PracticeSession
              key={opened.studySetId ?? `${opened.generatedAt}:${optionsKey}`}
              title={(opened.result as PracticeResult).title}
              questions={(opened.result as PracticeResult).questions}
              onRegenerate={() => setSettingUp(true)}
              regenerating={busy}
              mark={markTest}
              recorded={opened.secured && Boolean(opened.studySetId)}
            />
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={asking}
        title="Remove this set from the Pot?"
        confirmLabel={deleting ? "Removing" : "Remove"}
        tone="danger"
        busy={deleting}
        onConfirm={() => void removeSet()}
        onCancel={() => setAsking(false)}
      >
        <p>
          The class stops being served this set. The notes it was built from are
          untouched, and anyone can build a new one.
        </p>
      </ConfirmDialog>
    </div>
  );
}

/**
 * Every test this Pot has written, newest first. A test survives the notes
 * moving on, so this is where a class comes back to one they have sat before
 * rather than spending a generation writing it again.
 */
function PreviousSets({
  sets,
  sectionTitles,
  busy,
  openedId,
  onOpen,
}: {
  sets: SavedStudySet[];
  sectionTitles: Map<string, string>;
  busy: boolean;
  openedId: string | null;
  onOpen: (set: SavedStudySet) => void;
}) {
  if (sets.length === 0) {
    return (
      <Card>
        <CardSection className="py-12 text-center">
          <p className="text-sm text-ink-muted">
            No tests yet. The first one written is kept here for the whole class.
          </p>
        </CardSection>
      </Card>
    );
  }
  return (
    <div className="space-y-2.5">
      <p className="text-[12px] text-ink-faint">
        Every test the class has written stays here. Opening one costs nothing.
      </p>
      {sets.map((set) => (
        <Card key={set.id}>
          <CardSection className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium text-ink">{set.title}</p>
              <p className="text-[12px] text-ink-faint">
                {set.options
                  ? describeOptions(set.options, sectionTitles)
                  : `${set.itemCount} questions`}
                {" · "}
                built {relativeTime(set.createdAt)}
              </p>
            </div>
            <Button
              variant={set.id === openedId ? "quiet" : "secondary"}
              size="sm"
              onClick={() => onOpen(set)}
              disabled={busy}
            >
              <ClockCounterClockwise className="size-4" />
              {set.id === openedId ? "Open again" : "Take this test"}
            </Button>
          </CardSection>
        </Card>
      ))}
    </div>
  );
}

function SummaryView({ result }: { result: SummaryResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardSection>
          <p className="text-[15px] leading-relaxed text-ink">{result.overview}</p>
        </CardSection>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {result.keyTopics.map((topic) => (
          <Card key={topic.title}>
            <CardSection className="space-y-1.5">
              <h2 className="font-semibold">{topic.title}</h2>
              <p className="text-sm leading-relaxed text-ink-muted">{topic.explanation}</p>
            </CardSection>
          </Card>
        ))}
      </div>
      {result.stillToConfirm.length ? (
        <Card>
          <CardSection className="space-y-2">
            <Eyebrow>Still to confirm</Eyebrow>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {result.stillToConfirm.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardSection>
        </Card>
      ) : null}
    </div>
  );
}
