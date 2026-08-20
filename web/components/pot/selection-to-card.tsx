"use client";

import { Cards, Check, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, TextArea } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Column limits from migration 0021, applied here so nothing is sent to be rejected. */
const MAX_FRONT = 500;
const MAX_BACK = 2000;
const MAX_EXCERPT = 1000;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 40;

const MIN_PASSAGE = 3;
const PANEL_WIDTH = 320;
const OFFER_WIDTH = 190;

type Selected = {
  passage: string;
  /** Offsets inside the wrapper, so the affordance travels with the text. */
  top: number;
  left: number;
  containerWidth: number;
};

function questionStub(passage: string): string {
  const words = passage.split(/\s+/);
  if (words.length <= 6) return `What does ${passage.replace(/[.,;:]$/, "")} mean?`;
  return "What is the key point here?";
}

function parseTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of value.split(",")) {
    const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

/**
 * Wraps a note body and turns a selected passage into a flashcard. The card is
 * written by the person reading, never generated, so the form opens prefilled
 * with what they highlighted and they edit it before it is saved.
 */
export function SelectionToCard({
  potId,
  noteId,
  children,
}: {
  potId: string;
  noteId: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const offerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const pointerHeld = useRef(false);
  const frame = useRef<number | null>(null);

  const [selected, setSelected] = useState<Selected | null>(null);
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reduced = useReducedMotion();
  const headingId = useId();

  const readSelection = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSelected(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const within = range.commonAncestorContainer;
    // Selecting inside the form itself is editing, not a new passage.
    if (panelRef.current?.contains(within) || offerRef.current?.contains(within)) return;
    if (!container.contains(within)) {
      setSelected(null);
      return;
    }
    const passage = selection.toString().replace(/\s+/g, " ").trim();
    if (passage.length < MIN_PASSAGE) {
      setSelected(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const box = container.getBoundingClientRect();
    setSelected({
      passage,
      top: rect.bottom - box.top + 8,
      left: Math.max(0, rect.left - box.left),
      containerWidth: box.width,
    });
  }, []);

  useEffect(() => {
    // Once the form is open it owns the passage, so the selection stops moving it.
    if (open) return;

    const schedule = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        readSelection();
      });
    };
    const onSelectionChange = () => {
      if (!pointerHeld.current) schedule();
    };
    const onPointerDown = () => {
      pointerHeld.current = true;
    };
    const onPointerUp = () => {
      pointerHeld.current = false;
      schedule();
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    // A cancelled gesture never sends pointerup, and a stuck flag would leave
    // the affordance deaf to every later selection.
    document.addEventListener("pointercancel", onPointerUp, true);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [open, readSelection]);

  const close = useCallback(() => {
    // The form is about to unmount, so hand focus back to the note rather than
    // dropping it on the document.
    if (panelRef.current?.contains(document.activeElement)) containerRef.current?.focus();
    setOpen(false);
    setSaved(false);
    setError(null);
    setSelected(null);
  }, []);

  useEffect(() => {
    if (!selected && !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (open) close();
      else setSelected(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected, open, close]);

  useEffect(() => {
    if (!open || saved) return;
    const input = frontRef.current;
    input?.focus();
    input?.select();
  }, [open, saved]);

  useEffect(() => {
    if (saved) doneRef.current?.focus();
  }, [saved]);

  function openForm() {
    if (!selected) return;
    setFront(questionStub(selected.passage).slice(0, MAX_FRONT));
    setBack(selected.passage.slice(0, MAX_BACK));
    setTags("");
    setError(null);
    setSaved(false);
    setOpen(true);
  }

  async function save() {
    if (busy || !selected) return;
    const question = front.trim();
    const answer = back.trim();
    if (!question || !answer) {
      setError("A card needs a question and an answer.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabaseBrowser().rpc("add_note_flashcard", {
      p_pot_id: potId,
      p_note_id: noteId,
      p_front: question.slice(0, MAX_FRONT),
      p_back: answer.slice(0, MAX_BACK),
      p_tags: parseTags(tags),
      p_source_excerpt: selected.passage.slice(0, MAX_EXCERPT),
    });
    setBusy(false);
    if (rpcError) {
      setError(
        rpcError.message.includes("rate_limited")
          ? "You have added a lot of cards just now. Wait a moment and try again."
          : "That card could not be saved. Try again.",
      );
      return;
    }
    setSaved(true);
  }

  const offerLeft = selected
    ? Math.max(0, Math.min(selected.left, selected.containerWidth - OFFER_WIDTH))
    : 0;
  const panelLeft = selected
    ? Math.max(0, Math.min(selected.left, selected.containerWidth - PANEL_WIDTH))
    : 0;
  const rise = reduced
    ? {}
    : {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div ref={containerRef} tabIndex={-1} className="relative focus:outline-none">
      {children}
      <AnimatePresence>
        {selected && !open ? (
          <motion.div
            key="offer"
            ref={offerRef}
            className="absolute z-20"
            style={{ top: selected.top, left: offerLeft }}
            {...rise}
          >
            <button
              type="button"
              // Keeping the default from firing keeps the passage selected, so
              // the click lands on a selection that is still there.
              onMouseDown={(event) => event.preventDefault()}
              onClick={openForm}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-surface border border-edge-strong shadow-(--shadow-raised) text-[13px] font-medium text-ink hover:bg-sunken transition-colors"
            >
              <Cards className="size-4 text-primary" aria-hidden />
              Make a flashcard
            </button>
          </motion.div>
        ) : null}

        {selected && open ? (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-labelledby={headingId}
            className="absolute z-30 w-80 max-w-full bg-surface border border-edge rounded-(--radius-card) shadow-(--shadow-raised) p-4 space-y-3"
            style={{ top: selected.top, left: panelLeft }}
            {...rise}
          >
            <div className="flex items-start justify-between gap-2">
              <p id={headingId} className="text-sm font-semibold text-ink">
                Make a flashcard
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-ink-faint hover:text-ink transition-colors"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {saved ? (
              <div className="space-y-3">
                <p role="status" className="flex items-center gap-1.5 text-[13px] text-success">
                  <Check className="size-4" aria-hidden />
                  Card saved.
                </p>
                <div className="flex justify-end">
                  <Button ref={doneRef} size="sm" onClick={close}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Question">
                  {(props) => (
                    <Input
                      {...props}
                      ref={frontRef}
                      value={front}
                      maxLength={MAX_FRONT}
                      onChange={(event) => setFront(event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Answer">
                  {(props) => (
                    <TextArea
                      {...props}
                      rows={4}
                      value={back}
                      maxLength={MAX_BACK}
                      onChange={(event) => setBack(event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Tags" hint="Separate tags with commas.">
                  {(props) => (
                    <Input
                      {...props}
                      value={tags}
                      maxLength={200}
                      placeholder="osmosis, cell transport"
                      onChange={(event) => setTags(event.target.value)}
                    />
                  )}
                </Field>
                {error ? (
                  <p role="alert" className="text-[13px] text-danger">
                    {error}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={close} disabled={busy}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => void save()} disabled={busy}>
                    {busy ? "Saving" : "Save card"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
