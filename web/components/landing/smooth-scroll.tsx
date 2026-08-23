"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";

// Lenis binds wheel, touchstart, touchmove, touchend and a window resize.
// It binds no keydown. So a keypress scrolls the page natively, and on the
// next frame Lenis writes its own animated value back over it: the keypress
// is discarded. reset() drops isScrolling to false so the native scroll
// reconciles instead. Same story for focus-driven scrolling.
const SCROLL_KEYS = new Set([
  " ",
  "Spacebar",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Tab",
]);

/**
 * Smooth scrolling, landing page only.
 *
 * Lenis writes the real scroll position every frame rather than transforming
 * a container, so document.body stays the scroller, ScrollTrigger keeps its
 * default pinType of "fixed", and the melt's pin needs no scrollerProxy.
 *
 * Reduced motion gets no Lenis at all, not merely a lerp of 1, and the
 * preference is watched live in both directions.
 */
export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    let lenis: Lenis | null = null;
    let onTick: ((time: number) => void) | null = null;
    let unbind: Array<() => void> = [];
    let cancelled = false;

    async function setup() {
      if (lenis || cancelled || query.matches) return;

      const { default: LenisCtor } = await import("lenis");
      // The route may have unmounted, or the preference flipped, while the
      // chunk was in flight. Without this, StrictMode's double-invoke leaves
      // an orphan instance with a ticker callback nobody removes.
      if (lenis || cancelled || query.matches) return;

      gsap.registerPlugin(ScrollTrigger);

      const instance = new LenisCtor({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1,
        orientation: "vertical",
        gestureOrientation: "vertical",
        overscroll: true,
        autoResize: true,
        autoRaf: false,
        anchors: false,
        allowNestedScroll: false,
        respectReducedMotion: true,
      });

      // Invalidates ScrollTrigger's cached scroll read synchronously inside
      // Lenis's own frame, so the pin's fixed offset is computed from the
      // position Lenis just wrote. Costs a second _updateAll per animated
      // frame; worth it for one pinned timeline, not free.
      instance.on("scroll", ScrollTrigger.update);

      // One RAF loop instead of two.
      onTick = (time: number) => instance.raf(time * 1000);
      gsap.ticker.add(onTick);
      // GSAP shifts its internal start time when a frame exceeds 500ms.
      // lenis.raf is fed that same clock, so the adjustment reads as a scroll
      // jolt. This is process-global GSAP state; teardown restores it.
      gsap.ticker.lagSmoothing(0);

      // Capture phase, ahead of React's delegated root listener, so this wins
      // whether the anchor is a bare <a> or the <a> that next/link renders
      // (Button with an href returns a Link, button.tsx:53).
      const onAnchorClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(
          'a[href^="#"]',
        );
        const hash = anchor?.getAttribute("href");
        if (!hash || hash === "#") return;

        const target = document.getElementById(hash.slice(1));
        if (!target) return;

        event.preventDefault();
        instance.scrollTo(target);
        // replaceState, not pushState: the deep link still works on load, but
        // Back leaves the landing instead of walking scroll positions.
        window.history.replaceState(null, "", hash);
      };

      // reset() is private in the shipped types. Scrolling to the position the
      // browser has just landed on, immediately, reaches the same reconciled
      // state through the public API: the animation stops and animatedScroll
      // is synced, so the native scroll sticks instead of being overwritten.
      const reconcile = () => instance.scrollTo(window.scrollY, { immediate: true });

      const onKeyDown = (event: KeyboardEvent) => {
        if (SCROLL_KEYS.has(event.key)) reconcile();
      };

      const onFocusIn = () => reconcile();

      document.addEventListener("click", onAnchorClick, true);
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("focusin", onFocusIn, true);
      unbind = [
        () => document.removeEventListener("click", onAnchorClick, true),
        () => document.removeEventListener("keydown", onKeyDown, true),
        () => document.removeEventListener("focusin", onFocusIn, true),
      ];

      lenis = instance;
      // html.lenis { height: auto } changes html's used height, so the pin
      // must be re-measured.
      ScrollTrigger.refresh();
    }

    function teardown() {
      if (!lenis) return;
      for (const off of unbind) off();
      unbind = [];
      if (onTick) gsap.ticker.remove(onTick);
      onTick = null;
      lenis.destroy();
      lenis = null;
      // Global GSAP state; hand the signed-in app back its defaults.
      gsap.ticker.lagSmoothing(500, 33);
      ScrollTrigger.refresh();
    }

    function sync() {
      if (query.matches) teardown();
      else void setup();
    }

    sync();
    query.addEventListener("change", sync);

    return () => {
      cancelled = true;
      query.removeEventListener("change", sync);
      teardown();
    };
  }, []);

  return null;
}
