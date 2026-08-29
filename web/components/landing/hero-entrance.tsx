"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";

/**
 * Load-in for the hero's product shot: one unbroken glide up into place on
 * GSAP's ticker, then a soft light bar sweeps the surface once as the glide
 * lands. The bar is a blurred solid, not a gradient, which keeps the one
 * gradient rule intact.
 *
 * This wrapper sits OUTSIDE the drop-shadow filter on purpose. Animating
 * anything inside the filter forces the browser to re-rasterize the whole
 * four layer shadow on every frame, which is what made earlier passes stutter;
 * moving the filtered result as a single composited unit keeps the glide on
 * the compositor. Keep the filter inside this component's subtree.
 *
 * The markup renders in its finished state, so without JavaScript, and under
 * reduced motion, the card is simply there. The shine span lives inside the
 * card's clipped corner radius and is found by class name within this scope.
 */
export function HeroEntrance({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { y: 72, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 1.4,
          ease: "expo.out",
          force3D: true,
          clearProps: "willChange",
          willChange: "transform, opacity",
        },
      );
      const shine = ref.current!.querySelector(".mp-hero-shine");
      if (shine) {
        gsap.fromTo(
          shine,
          { x: -280 },
          { x: 1420, duration: 0.75, ease: "power1.inOut", delay: 0.85 },
        );
        gsap.fromTo(
          shine,
          { opacity: 0 },
          { opacity: 0.8, duration: 0.35, yoyo: true, repeat: 1, delay: 0.85 },
        );
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
