"use client";

import { useEffect, useRef } from "react";

/**
 * A lock-on reticle for the landing page, translated from agentify.trade's
 * cursor crosshair. Theirs hides the OS cursor and draws full-screen
 * hairlines; both read wrong on cream paper, so the native cursor stays and
 * only the one good piece survives: four corners that glide out and frame
 * whatever link or button the pointer is over.
 *
 * The corners live on one container sized to a lerped rectangle. Idle, that
 * rectangle is a small invisible box riding the cursor, which is why the
 * corners appear to fly out of the pointer when they acquire a target and
 * fold back into it when they let go.
 *
 * Never mounts for touch pointers or reduced motion, so those sessions keep
 * the plain cursor untouched. The rAF loop parks itself once the lerp
 * settles and wakes on the next mouse event.
 */

const TARGETS = "a, button, input, select, textarea, [role='button'], [data-cursor-lock]";
const CURSOR_LERP = 0.3;
const RECT_LERP = 0.28;
const PAD_X = 10;
const PAD_Y = 8;
const IDLE_SIZE = 26;

export function CursorLock() {
  const frameRef = useRef<HTMLDivElement | null>(null);

  // The overlay always renders (it is invisible and inert); the behavior only
  // attaches for a fine pointer without reduced motion, so touch sessions and
  // still sessions carry an empty div and nothing else.
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;
    const frame = frameRef.current;
    if (!frame) return;

    let mouseX = -100;
    let mouseY = -100;
    let x = -100;
    let y = -100;
    const rect = { x: -100, y: -100, w: IDLE_SIZE, h: IDLE_SIZE };
    let target: Element | null = null;
    let running = false;
    let raf = 0;

    function goal() {
      if (target) {
        const r = target.getBoundingClientRect();
        return {
          x: r.left - PAD_X,
          y: r.top - PAD_Y,
          w: r.width + PAD_X * 2,
          h: r.height + PAD_Y * 2,
        };
      }
      return {
        x: x - IDLE_SIZE / 2,
        y: y - IDLE_SIZE / 2,
        w: IDLE_SIZE,
        h: IDLE_SIZE,
      };
    }

    function tick() {
      x += (mouseX - x) * CURSOR_LERP;
      y += (mouseY - y) * CURSOR_LERP;
      const g = goal();
      rect.x += (g.x - rect.x) * RECT_LERP;
      rect.y += (g.y - rect.y) * RECT_LERP;
      rect.w += (g.w - rect.w) * RECT_LERP;
      rect.h += (g.h - rect.h) * RECT_LERP;
      if (frame) {
        frame.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
        frame.style.width = `${rect.w}px`;
        frame.style.height = `${rect.h}px`;
        frame.style.opacity = target ? "1" : "0";
      }
      const delta =
        Math.abs(mouseX - x) +
        Math.abs(mouseY - y) +
        Math.abs(g.x - rect.x) +
        Math.abs(g.w - rect.w);
      if (delta < 0.3 && !target) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(tick);
    }

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      wake();
    }

    function onOver(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest?.(TARGETS) ?? null;
      const next = el && el.closest("[data-cursor-nolock]") ? null : el;
      if (next !== target) {
        target = next;
        if (target && frame) {
          // Restart the acquire pulse from zero on every new target.
          frame.classList.remove("mp-lock-pulse");
          void frame.offsetWidth;
          frame.classList.add("mp-lock-pulse");
        }
      }
      wake();
    }

    function onLeave() {
      target = null;
      wake();
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        wake();
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const corner = "absolute size-2.5 border-primary";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80]">
      <div
        ref={frameRef}
        className="absolute left-0 top-0 rounded-[10px] opacity-0 transition-opacity duration-200 will-change-transform"
      >
        <span className={`${corner} left-0 top-0 rounded-tl-[8px] border-l-2 border-t-2`} />
        <span className={`${corner} right-0 top-0 rounded-tr-[8px] border-r-2 border-t-2`} />
        <span className={`${corner} bottom-0 left-0 rounded-bl-[8px] border-b-2 border-l-2`} />
        <span className={`${corner} bottom-0 right-0 rounded-br-[8px] border-b-2 border-r-2`} />
      </div>
    </div>
  );
}
