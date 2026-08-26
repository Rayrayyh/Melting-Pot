"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/cn";

/**
 * A text field whose caret is drawn rather than native, so it glides between
 * positions instead of jumping.
 *
 * Adapted from skiper-ui's skiper106. Two things changed on the way in. Their
 * version reads its spring from dialkit, a live control panel for their demo
 * page, so those values are inlined here rather than pulling a dependency that
 * exists to tune a playground. And their PASSWORD_CHAR is computed at module
 * scope from navigator.userAgent, which throws the moment this renders on the
 * server, so it is resolved lazily instead.
 *
 * The native caret is hidden with caret-color and a div takes its place, moved
 * by a spring. Position comes from measuring the text before the caret in a
 * hidden span that copies the input's own computed font, which is the only way
 * to know where a character actually ends.
 *
 * Reduced motion gets a spring stiff enough to arrive instantly, so the caret
 * still tracks the cursor but never appears to travel.
 */

const SPRING = { stiffness: 500, damping: 30, mass: 0.5 } as const;
const RIGID = { stiffness: 10000, damping: 100, mass: 0.1 } as const;

function passwordChar() {
  if (typeof navigator === "undefined") return "•";
  return /firefox|fxios/i.test(navigator.userAgent) ? "●" : "•";
}

export function SmoothCaretInput({
  className,
  onChange,
  onBlur,
  ...props
}: ComponentProps<"input">) {
  const caretX = useMotionValue(0);
  const caretOpacity = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const springCaretX = useSpring(caretX, prefersReducedMotion ? RIGID : SPRING);

  const update = useCallback(
    (target: HTMLInputElement) => {
      const measure = measureRef.current;
      if (!measure) return;

      const styles = window.getComputedStyle(target);
      // The hidden span has to be the input's font exactly, or every
      // measurement is off by the difference.
      measure.style.font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      measure.style.letterSpacing = styles.letterSpacing;

      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;
      const hasSelection = start !== end;
      const index =
        start === end ? start : target.selectionDirection === "backward" ? start : end;

      const before =
        target.type === "password"
          ? passwordChar().repeat(index)
          : target.value.slice(0, index);

      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      measure.textContent = before;
      const absolute = before.length > 0 ? measure.offsetWidth + paddingLeft : paddingLeft - 1;

      // Keep the caret inside the visible strip when the value is longer than
      // the field, matching what the native caret would do.
      const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
      const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
      const visibleLeft = target.scrollLeft + paddingLeft;
      if (absolute > visibleRight) {
        target.scrollLeft = Math.min(absolute - target.clientWidth + paddingRight, maxScroll);
      } else if (absolute < visibleLeft) {
        target.scrollLeft = Math.max(0, absolute - paddingLeft);
      }

      const x = absolute - target.scrollLeft;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      caretX.set(Math.min(x, maxX));
      // Hidden while a range is selected: the browser draws that highlight and
      // a caret sitting inside it reads as a second cursor.
      caretOpacity.set(!hasSelection && x >= minX && x <= maxX + 1 ? 1 : 0);
    },
    [caretX, caretOpacity],
  );

  // Assigned in an effect rather than during render: React reserves render
  // for pure work, and the listeners below only ever read this afterwards.
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    const input = inputRef.current;
    const container = containerRef.current;
    if (!input || !container) return;

    const refresh = () => {
      if (document.activeElement === input) updateRef.current(input);
    };
    // selectionchange is the only event that fires for arrow keys, clicks into
    // the middle of a value, and select-all alike.
    const onSelectionChange = () => {
      if (document.activeElement !== input) return;
      requestAnimationFrame(refresh);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    input.addEventListener("scroll", refresh);
    input.addEventListener("focus", refresh);
    // Webfonts land after first paint and change every measurement.
    document.fonts?.addEventListener("loadingdone", refresh);
    void document.fonts?.ready.then(refresh);

    const observer = new ResizeObserver(refresh);
    observer.observe(container);
    refresh();

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      input.removeEventListener("scroll", refresh);
      input.removeEventListener("focus", refresh);
      document.fonts?.removeEventListener("loadingdone", refresh);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative grid grid-cols-1">
      <input
        {...props}
        ref={inputRef}
        onChange={(e) => {
          onChange?.(e);
          const target = e.currentTarget;
          requestAnimationFrame(() => updateRef.current(target));
        }}
        onBlur={(e) => {
          caretOpacity.set(0);
          onBlur?.(e);
        }}
        className={cn("col-start-1 row-start-1 [caret-color:transparent]", className)}
      />
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre"
      />
      <motion.span
        aria-hidden
        className="pointer-events-none col-start-1 row-start-1 h-[1.1em] w-0.5 self-center rounded-full bg-primary"
        style={{ x: springCaretX, opacity: caretOpacity }}
      />
    </div>
  );
}
