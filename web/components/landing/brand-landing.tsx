import Link from "next/link";
import { ArrowDown, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PotHeroBlob } from "@/components/brand/pot-blob";
import { JoinCard } from "@/components/landing/join-card";
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
      <SiteHeader signedIn={signedIn} getStartedHref="#spaces" />

      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-12 grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center gap-x-8 gap-y-12 min-h-[calc(100svh-5rem)] sm:min-h-[calc(100svh-6rem)] pt-10 lg:pt-0">
          <div className="space-y-8 lg:pb-24">
            {/* Fluid so the three forced lines never become four or five: a
                wrapped line pushes the pot below the fold on shorter screens.
                These lines run longer than the old ones, so the ramp tops out
                lower. */}
            <h1 className="font-display text-[32px] sm:text-[clamp(2.1rem,3.4vw,3.4rem)] font-semibold leading-[1.08] tracking-tight text-ink">
              Everyone takes notes.
              <br />
              Meltingpot brings
              <br />
              them together.
            </h1>
            <p className="text-lg sm:text-xl text-ink-muted leading-relaxed max-w-md">
              Turn scattered notes, resources, and explanations into one
              shared course space your whole class can explore.
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-2">
              <Button href={signedIn ? "/home" : "#spaces"} size="lg" roll>
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
          <div className="relative h-full min-h-[320px] lg:min-h-[calc(100svh-6rem)] flex items-end justify-center lg:justify-end">
            <PotHeroBlob className="w-full max-w-120 lg:max-w-150 max-h-[calc(100dvh-8.5rem)] mb-2.5 -translate-x-3 -translate-y-4 lg:-translate-x-[27px]" />
          </div>
        </div>
      </section>

      <section
        id="spaces"
        className="px-6 sm:px-10 py-24 sm:py-32 bg-surface border-y border-edge scroll-mt-8"
      >
        <div className="mx-auto w-full max-w-6xl grid lg:grid-cols-[1fr_minmax(0,26rem)] gap-14 lg:gap-24 items-center">
          <div className="space-y-7">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              A shared class vault
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-ink">
              Everything your class knows, in one Pot.
            </h2>
            <p className="text-lg text-ink-muted leading-relaxed max-w-xl">
              One code opens the whole vault. Thirty people take thirty sets of
              half-finished notes and end up with one set worth studying from,
              built by all of them and checked by people, not guesswork.
            </p>
            <ul className="flex flex-wrap gap-x-8 gap-y-3 pt-1 text-[13px] text-ink-muted">
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                No formatting needed
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                Originals always preserved
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                You approve every share
              </li>
            </ul>
          </div>
          <div className="w-full space-y-4">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-ink-faint">
              For students
            </p>
            <JoinCard initialCode={initialCode} initialError={initialError} />
            <p className="text-center text-[13px] text-ink-muted">
              Teaching a class?{" "}
              <Link
                href="/pots/new"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                Create a Pot
              </Link>{" "}
              and share the code.
            </p>
          </div>
        </div>
        <p className="flex items-center justify-center gap-2 pt-20 text-[12px] text-ink-faint">
          <ArrowDown className="size-3.5" aria-hidden />
          See how the melt works
        </p>
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
            Start your class&apos;s Pot tonight.
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
              href="#spaces"
              className="text-[14px] font-medium text-on-primary/90 hover:text-on-primary underline underline-offset-4"
            >
              or enter a class code
            </a>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
