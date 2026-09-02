"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StirPot, STIR_LOOP } from "@/components/brand/stir-pot";
import { cn } from "@/lib/cn";
import type { WeekDay } from "@/lib/contributions/streak";

/**
 * The moment a day lands on someone's own record, in the shape the owner
 * picked on 2026-09-02: the stirring pot, the day count in Fraunces, the
 * week as seven dots, one line saying it is private, and one button back to
 * what they were doing.
 *
 * It fires where the day was earned, not on page load: the completion
 * screens ask the server whether this action was the first thing to count
 * today, and only that one opens this. A second share or study run on the
 * same day gets nothing, and nothing about the record ever opens by itself.
 *
 * The pot runs one loop of its stir and parks. Under reduced motion it uses
 * the still variant that breathes without travelling, and the card arrives
 * with no movement at all.
 */

const WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

function spelled(n: number): string {
  return n < WORDS.length ? WORDS[n] : String(n);
}

function heading(days: number): string {
  if (days <= 1) return "Day one. The pot is on.";
  return `Day ${days}, still stirring.`;
}

export function StillStirring({
  open,
  days,
  week,
  onClose,
}: {
  open: boolean;
  /** Days in a row, ending today. */
  days: number;
  /** The calendar week the strip draws, Monday first. */
  week: WeekDay[];
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  // One stir, then still. The clock stops at the end of the loop rather than
  // running forever behind a card nobody is watching any more.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      setElapsed(t);
      if (t < STIR_LOOP) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  // Only ever mounted by a completion screen after its write has landed, so
  // there is no server render of this to disagree with.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
        >
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink/35"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Your record"
            className="relative w-full max-w-sm rounded-(--radius-card) border border-edge bg-surface px-8 pb-7 pt-8 text-center shadow-(--shadow-raised)"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={
              reduced ? { duration: 0 } : { duration: 0.4, ease: [0.075, 0.82, 0.165, 1] }
            }
          >
            <div className="flex justify-center">
              <StirPot
                size={132}
                t={reduced ? 0 : elapsed}
                variant={reduced ? "reduced" : "indet"}
              />
            </div>

            <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">
              {heading(days)}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              {spelled(days)} {days === 1 ? "day" : "days"} of putting something in or
              taking something out.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
              {week.map((day, i) => (
                <motion.span
                  key={day.day}
                  className={cn(
                    "block size-2.5 rounded-full",
                    day.counted ? "bg-primary" : "border border-edge-strong",
                    day.future && "opacity-40",
                  )}
                  initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: day.future ? 0.4 : 1 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { delay: 0.25 + i * 0.05, duration: 0.3, ease: [0.075, 0.82, 0.165, 1] }
                  }
                />
              ))}
            </div>
            <p className="sr-only">
              {week.filter((d) => d.counted).length} of the days this week are on your record.
            </p>

            <p className="mt-4 text-[12px] text-ink-faint">Your record, nobody else&apos;s.</p>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover active:bg-(--primary-active)"
            >
              Back to it
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
