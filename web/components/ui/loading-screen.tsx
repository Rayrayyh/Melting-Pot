"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { StirPot, STIR_LOOP } from "@/components/brand/stir-pot";

/**
 * The full-screen wait, for work that genuinely takes seconds: signing in,
 * organizing a note, building a deck or a test. Short work keeps the inline
 * mark instead, because covering the whole screen for half a second reads as
 * a flash rather than as progress.
 *
 * One clock drives the pot. It is a real animation frame loop rather than CSS
 * because the scene is authored as a pure function of time: the paddle, the
 * ladle's figure eight, the wisps and the burst all read the same `t`, and
 * splitting them across separate CSS animations is what lets them drift apart.
 *
 * Under prefers-reduced-motion the pot switches to its still variant and the
 * dots stop cycling. The clock keeps running, slowly, because that variant
 * still breathes: what it drops is everything that travels.
 *
 * It renders through a portal to the body rather than in place. A fixed child
 * is positioned against the nearest transformed ancestor rather than the
 * viewport, and the page-enter animation leaves an identity transform on
 * <main> forever, so in place this covered the content column and pushed the
 * pot a thousand pixels below the fold. The portal is what makes "full screen"
 * mean the screen.
 */
/**
 * How long each phrase holds before the next one takes over.
 *
 * Slow enough to be read rather than skimmed. A wait of twenty seconds gets
 * five phrases at this pace, which is enough variety to show the screen is
 * alive without the text flickering.
 */
const PHRASE_SECONDS = 4;

/**
 * The default rotation. Kitchen language, because the product is a pot and a
 * wait is the one moment where saying so costs nothing.
 */
export const STIR_PHRASES = [
  "Stirring the pot",
  "Folding everything in",
  "Letting it simmer",
  "Tasting as we go",
  "Reading what the class shared",
  "Finding what matters",
  "Checking the seasoning",
  "Almost ready",
];

export function LoadingScreen({
  open,
  message = STIR_PHRASES,
  detail,
  children,
}: {
  open: boolean;
  /**
   * Sentence case, no trailing punctuation: the dots supply the motion. Pass
   * several and they take turns, which is what keeps a long wait from looking
   * like a frozen one.
   */
  message?: string | readonly string[];
  /** One quiet line under the message, for saying what is taking the time. */
  detail?: string;
  /** Anything that says more than a line can: a stage checklist, say. */
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  // Elapsed rather than looped. The pot wants t within its eight second loop,
  // but the phrases and the dots must not restart when it wraps.
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setElapsed((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // The page behind must not scroll under the cover.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // No document on the server, and a portal contributes no inline markup on
  // either side, so bailing here cannot desync hydration.
  if (!open || typeof document === "undefined") return null;

  const t = elapsed % STIR_LOOP;
  const phrases = typeof message === "string" ? [message] : message;
  // Reduced motion gets the first phrase and a settled row of dots: swapping
  // text on a timer is motion too, and it is the kind that cannot be ignored.
  const phrase = reduced ? phrases[0] : phrases[Math.floor(elapsed / PHRASE_SECONDS) % phrases.length];
  const lit = reduced ? 3 : 1 + Math.floor((elapsed / 0.5) % 3);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-paper px-6"
      role="status"
      aria-live="polite"
    >
      <StirPot
        t={t}
        variant={reduced ? "reduced" : "indet"}
        className="w-[200px] sm:w-[248px] h-auto"
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-semibold text-ink">
          {phrase}
          {/* The unlit dots stay in the layout but go fully invisible, so they
              arrive one at a time without the sentence shifting under them. */}
          <span aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ opacity: i < lit ? 1 : 0 }}>
                .
              </span>
            ))}
          </span>
        </p>
        {detail ? <p className="text-sm text-ink-muted max-w-sm">{detail}</p> : null}
      </div>
      {children ? <div className="w-full max-w-sm">{children}</div> : null}
    </div>,
    document.body,
  );
}
