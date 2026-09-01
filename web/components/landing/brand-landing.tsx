import { ArrowDown, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CursorLock } from "@/components/landing/cursor-lock";
import { HeroDashboard } from "@/components/landing/hero-dashboard";
import { JoinInline } from "@/components/landing/join-inline";
import { NamesOnTheNote } from "@/components/landing/names-on-the-note";
import { ScrollStopper } from "@/components/landing/scroll-stopper";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { PRINCIPLES, STEPS } from "@/components/landing/site-content";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { RollText } from "@/components/ui/roll-text";

/**
 * The public landing: brand hero up top, the join and create paths one scroll
 * below, then the melt story. Signed-in people are welcome here too, so the
 * account calls to action turn into a way back to their dashboard rather than
 * asking them to sign in again.
 */
export function BrandLanding({
  initialCode,
  initialError,
  signedIn = false,
}: {
  initialCode?: string;
  initialError?: string | null;
  signedIn?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <CursorLock />
      {/* Same ground as the hero, so the top of the page is one surface
          rather than a paper band over a sunken one. */}
      <div className="bg-sunken">
        <SiteHeader signedIn={signedIn} getStartedHref="#join" />
      </div>

      <main id="main" className="flex flex-col">
      <section id="top" className="relative overflow-hidden bg-sunken">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-12 pt-8 sm:pt-10 pb-16 md:pb-0 text-center">
          {/* Fluid so the three forced lines never become four or five. */}
          <h1 className="font-display text-[32px] sm:text-[clamp(2.1rem,3.4vw,3.4rem)] font-semibold leading-[1.08] tracking-tight text-ink">
            Everyone takes notes.
            <br />
            Meltingpot brings
            <br />
            them together.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg sm:text-xl text-ink-muted leading-relaxed">
            Turn scattered notes, resources, and explanations into one
            shared course space your whole class can explore.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
            <Button href={signedIn ? "/home" : "#join"} size="lg" roll>
              {signedIn ? "Go to dashboard" : "Join a class"}
            </Button>
            <a
              href="#explore"
              className="group/roll inline-flex items-center gap-2 text-[16px] font-medium text-ink hover:text-primary transition-colors"
            >
              <RollText>Learn more</RollText>
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover/roll:translate-x-1"
                aria-hidden
              />
            </a>
          </div>
        </div>
        {/* The product shot: a Pot page built from the shipped components,
            tilted 7 degrees and cropped by this container so the surface
            reads as continuing past the fold. The container height, not the
            section, owns the cut, so the crop line stays on the same swept
            row of the card at every viewport width. Below md the card would
            be illegible at any honest scale, so the hero is copy only there.

            Decorative throughout: fabricated demo content, hidden from
            assistive tech, inert to pointer and selection. */}
        <div
          aria-hidden
          inert
          className="pointer-events-none select-none mt-10 hidden h-[586px] justify-start overflow-hidden md:flex min-[1360px]:justify-center"
        >
          {/* The shadow lives here, on an untransformed wrapper, as a filter:
              the silhouette tilts with the card but the light stays overhead. */}
          <div className="pl-4 sm:pl-10 min-[1360px]:pl-0 pt-6 will-change-transform [filter:var(--shadow-hero)]">
            <div
              style={{
                transform: "translateX(-4px) skewY(1.5deg) skewX(-7deg)",
                transformOrigin: "50% 50%",
              }}
            >
              <HeroDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* Slot two names the problem, then gives every arrival a door that
          works. The audit that reshaped it: both hero CTAs used to land on a
          code form almost no first-time visitor could complete, with the
          teacher path in 13px fine print and the demo class nowhere. Now the
          codeless majority gets the live demo Pot, code holders get a compact
          entry whose button never plays dead, and teachers get equal billing.
          The old #spaces id survives for stale links; #join is where the hero
          and header CTAs land. */}
      <section
        id="spaces"
        className="px-6 sm:px-10 py-24 sm:py-28 bg-surface border-y border-edge scroll-mt-8"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              How notes reach the class
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-ink">
              The part you need is in someone else&apos;s handwriting.
            </h2>
            <p className="text-lg text-ink-muted leading-relaxed">
              A classmate&apos;s notebook often holds the note you need, written
              in a hurry with no other reader in mind. Meltingpot prepares an
              organized version alongside the original, with uncertain passages
              marked, and shares it with the class once the writer approves.
            </p>
          </div>

          <div id="join" className="scroll-mt-24 mt-14 grid gap-6 md:grid-cols-3">
            <Reveal className="h-full">
              <div className="flex h-full flex-col rounded-(--radius-card) border border-edge-strong bg-paper p-6">
                <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
                  No code? Start here
                </p>
                <h3 className="mt-3 text-lg font-semibold text-ink">
                  Peek inside a real class
                </h3>
                <p className="mt-2 flex-1 text-sm text-ink-muted leading-relaxed">
                  Human Biology is our live demo Pot: shared notes, open
                  corrections, flashcards, the lot. Open it and read everything
                  before you make any account.
                </p>
                <div className="mt-5 space-y-3">
                  <Button href="/join/HXU863" size="md" className="w-full" roll>
                    Open the demo Pot
                  </Button>
                  <p className="text-center text-[12px] text-ink-faint">
                    Class code <span className="font-mono tracking-[0.2em]">HXU863</span>
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="h-full">
              <div className="flex h-full flex-col rounded-(--radius-card) border border-edge bg-surface-raised p-6">
                <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-ink-faint">
                  For students
                </p>
                <h3 className="mt-3 text-lg font-semibold text-ink">
                  I have a class code
                </h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                  Enter the 6 characters your class shared. You see the Pot
                  before you join anything.
                </p>
                <div className="mt-5">
                  <JoinInline initialCode={initialCode} initialError={initialError} />
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.16} className="h-full">
              <div className="flex h-full flex-col rounded-(--radius-card) border border-edge bg-surface-raised p-6">
                <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-ink-faint">
                  For teachers
                </p>
                <h3 className="mt-3 text-lg font-semibold text-ink">
                  I run a class
                </h3>
                <p className="mt-2 flex-1 text-sm text-ink-muted leading-relaxed">
                  Create a Pot and share one code. Your class joins in seconds,
                  and everything they type stays theirs to approve.
                </p>
                <div className="mt-5">
                  <Button
                    href="/pots/new"
                    variant="secondary"
                    size="md"
                    className="w-full"
                    roll
                  >
                    Create a Pot
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>

        </div>
        <a
          href="#explore"
          className="group/roll mx-auto mt-14 flex w-fit items-center justify-center gap-2 text-[12px] text-ink-faint transition-colors hover:text-primary"
        >
          <ArrowDown className="size-3.5" aria-hidden />
          <RollText>See how the melt works</RollText>
        </a>
      </section>

      <div id="explore" className="scroll-mt-8">
        <ScrollStopper />
      </div>

      <section className="px-6 sm:px-10 py-24 sm:py-36 bg-surface border-y border-edge">
        <Reveal className="mx-auto w-full max-w-5xl space-y-16">
          <div className="max-w-lg space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              Three steps, no friction
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              As easy as typing what you know.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-10 lg:gap-14">
            {STEPS.map((step) => (
              <div key={step.number} className="group space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-display text-lg font-semibold transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
                    {step.number}
                  </span>
                  <step.icon className="size-5 text-ink-faint" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-6 sm:px-10 py-24 sm:py-36">
        <Reveal className="mx-auto w-full max-w-5xl space-y-16">
          <div className="max-w-lg space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              Built on trust
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Your words stay yours.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="bg-surface border border-edge rounded-(--radius-card) p-8 space-y-4 shadow-(--shadow-card) transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-(--shadow-raised)"
              >
                <principle.icon className="size-7 text-primary" weight="duotone" aria-hidden />
                <h3 className="text-lg font-semibold text-ink">{principle.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{principle.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <NamesOnTheNote />

      {/* Its own top padding: the section above it ends on a border, so the
          orange card cannot borrow the gap it used to inherit. */}
      <section className="px-6 sm:px-10 pt-24 sm:pt-32 pb-28 sm:pb-36">
        <Reveal className="mx-auto w-full max-w-4xl bg-primary rounded-(--radius-card) px-8 py-16 sm:px-16 sm:py-20 text-center space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-on-primary">
            Start your Pot tonight.
          </h2>
          <p className="text-sm sm:text-base text-on-primary/80 max-w-md mx-auto leading-relaxed">
            Create it in ten seconds, share one code, and watch the vault fill
            before the next exam.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              href="/pots/new"
              size="lg"
              roll
              className="bg-surface text-primary hover:bg-surface/90"
            >
              Create a Pot
            </Button>
            <a
              href="#join"
              className="text-[14px] font-medium text-on-primary/90 hover:text-on-primary underline underline-offset-4"
            >
              or enter a class code
            </a>
          </div>
        </Reveal>
      </section>

      </main>

      <SiteFooter />
    </div>
  );
}
