"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, Eye, Lightbulb } from "@phosphor-icons/react";

// The signature landing moment: scrolling melts a rough note into an
// organized shared-note card while the original stays intact beside it.
// Honest stages, scrubbed by scroll, pinned for its duration. Reduced
// motion (or JS failure) shows the finished side-by-side state statically.

const STAGES = [
  "Original preserved",
  "Structured",
  "Summarized",
  "Ready for your approval",
];

export function ScrollStopper() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      // The pinned sequence needs the two-column layout and full motion;
      // small screens and reduced motion get the finished state statically.
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-melt-item]");
        const stages = gsap.utils.toArray<HTMLElement>("[data-melt-stage]");
        const raw = sectionRef.current?.querySelector<HTMLElement>("[data-melt-raw]");
        const organized =
          sectionRef.current?.querySelector<HTMLElement>("[data-melt-organized]");
        const approval =
          sectionRef.current?.querySelector<HTMLElement>("[data-melt-approval]");
        if (!raw || !organized || !approval) return;

        // Starting state: the rough note alone, centered; everything else out.
        gsap.set(raw, { xPercent: 55, scale: 1.04 });
        gsap.set(organized, { autoAlpha: 0, y: 24 });
        gsap.set(items, { autoAlpha: 0, y: 18 });
        gsap.set(approval, { autoAlpha: 0, y: 12 });
        gsap.set(stages, { opacity: 0.35 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=1700",
            // Scrolling is native, so the scrub is the only smoothing layer.
            // At 0.6 the melt trails the gesture far enough to feel mushy,
            // so it stays short.
            scrub: 0.3,
          },
        });

        tl.to(stages[0], { opacity: 1, duration: 0.5 }, 0)
          .to(raw, { xPercent: 0, scale: 1, duration: 1.4 }, 0.2)
          .to(organized, { autoAlpha: 1, y: 0, duration: 1 }, 1.2)
          .to(stages[1], { opacity: 1, duration: 0.5 }, 1.6)
          .to(items[0], { autoAlpha: 1, y: 0, duration: 0.8 }, 1.9)
          .to(items[1], { autoAlpha: 1, y: 0, duration: 0.8 }, 2.5)
          .to(stages[2], { opacity: 1, duration: 0.5 }, 2.8)
          .to(items[2], { autoAlpha: 1, y: 0, duration: 0.8 }, 3.1)
          .to(items[3], { autoAlpha: 1, y: 0, duration: 0.8 }, 3.7)
          .to(items[4], { autoAlpha: 1, y: 0, duration: 0.8 }, 4.3)
          .to(stages[3], { opacity: 1, duration: 0.5 }, 4.7)
          .to(approval, { autoAlpha: 1, y: 0, duration: 0.8 }, 4.8)
          // Tail room so the finished state holds before the pin releases.
          .to({}, { duration: 0.6 }, 5.6);
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="How organizing works"
      data-testid="scroll-stopper"
      // Sticky, not ScrollTrigger's pin: pinning flips the section between
      // in-flow and position fixed, and each flip forced the entire document
      // to re-rasterize for several frames, a traced scroll hitch at both
      // boundaries. The section owns its scroll span in layout instead, and
      // the inner viewport sticks natively. The extra height and stickiness
      // exist only where the scrub timeline does: md and up, motion allowed.
      className="relative bg-paper motion-safe:md:h-[calc(100dvh+1700px)]"
    >
      <div className="min-h-dvh flex flex-col justify-center px-6 py-16 motion-safe:md:sticky motion-safe:md:top-0">
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2 max-w-md">
              <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
                The melt
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
                Rough thoughts go in. Real notes come out.
              </h2>
            </div>
            <ol className="flex flex-col gap-1.5" aria-hidden>
              {STAGES.map((stage) => (
                <li
                  key={stage}
                  data-melt-stage
                  className="flex items-center gap-2 text-[13px] font-medium text-ink"
                >
                  <Check className="size-3.5 text-success" />
                  {stage}
                </li>
              ))}
            </ol>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div data-melt-raw className="will-change-transform">
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint pb-2">
                What you type
              </p>
              <div className="bg-sunken border border-edge rounded-(--radius-card) p-5 shadow-(--shadow-card) rotate-[-0.5deg]">
                <p className="font-mono text-[13px] leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {"ok notes from today.. mitochondria makes ATP which is the energy thing. krebs cycle happens in the matrix?? i think. electron transport chain = inner membrane, makes the most ATP by far. remember the exam loves asking for ATP counts"}
                </p>
              </div>
            </div>

            <div data-melt-organized className="will-change-transform">
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint pb-2">
                What your class sees
              </p>
              <div className="bg-surface border border-edge rounded-(--radius-card) p-5 shadow-(--shadow-raised) space-y-4">
                <div data-melt-item className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight text-ink">
                    How cells make ATP
                  </h3>
                </div>
                <p data-melt-item className="text-sm text-ink-muted leading-relaxed">
                  The mitochondria produce ATP in stages, and the electron
                  transport chain produces the most by far.
                </p>
                <div
                  data-melt-item
                  className="border-l-2 border-primary/40 bg-primary-soft/40 rounded-r-lg px-4 py-3"
                >
                  <p className="font-serif text-[15px] text-ink">
                    <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-primary block mb-1">
                      Electron transport chain
                    </span>
                    Runs along the inner membrane and makes the most ATP by far.
                  </p>
                </div>
                <ul
                  data-melt-item
                  className="font-serif text-[15px] text-ink space-y-1.5 pl-5 list-disc marker:text-ink-faint"
                >
                  <li>Mitochondria make ATP, the cell&apos;s energy</li>
                  <li>Krebs cycle runs in the matrix</li>
                </ul>
                <div
                  data-melt-item
                  className="bg-clay-soft/50 border border-clay/20 rounded-lg px-4 py-2.5"
                >
                  <p className="flex items-center gap-1.5 text-[13px] text-clay font-medium">
                    <Lightbulb className="size-4" aria-hidden />
                    The exam loves asking for ATP counts.
                  </p>
                </div>
                <p className="text-[11px] text-ink-faint border-t border-edge pt-3">
                  Still to confirm: krebs cycle location, flagged from your
                  &quot;i think&quot;. Nothing gets smoothed over.
                </p>
              </div>
            </div>
          </div>

          <div
            data-melt-approval
            className="mx-auto flex items-center gap-4 bg-surface border border-edge rounded-full pl-5 pr-2 py-2 shadow-(--shadow-raised) w-fit"
          >
            <p className="flex items-center gap-2 text-[13px] text-ink-muted">
              <Eye className="size-4" aria-hidden />
              Only you can approve what gets shared.
            </p>
            <span className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-on-primary">
              Share with class
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
