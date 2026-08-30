import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ChalkboardTeacher,
  ChatCircleText,
  ClockCounterClockwise,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { PRINCIPLES, STEPS } from "@/components/landing/site-content";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { getAuthUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Write rough notes, review the organized version, and share it yourself. How MeltingPot turns a class's typing into one vault worth studying from.",
};

const CORRECTION_STEPS = [
  {
    title: "Anyone can suggest a fix",
    body: "Select the sentence that reads wrong, propose better words, and say why. Sources welcome.",
  },
  {
    title: "A maintainer decides",
    body: "The suggestion travels to someone your class trusts, who accepts it, asks for a revision, or declines with a reason.",
  },
  {
    title: "History keeps everything",
    body: "An accepted fix becomes a new version. The old one stays readable, and both authors stay credited.",
  },
];

export default async function HowItWorksPage() {
  const user = await getAuthUser();

  return (
    <div className="flex flex-col">
      <SiteHeader signedIn={Boolean(user)} active="/how-it-works" />

      <section className="px-6 sm:px-10 pt-14 sm:pt-20 pb-16 sm:pb-24">
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
            The melt, start to finish
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] text-ink">
            How it works
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-ink-muted leading-relaxed">
            You type what you know, as messily as you like. MeltingPot shapes
            it, you approve it, and your class gets one shared set of notes
            that people actually keep current.
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-10 py-20 sm:py-28 bg-surface border-y border-edge">
        <Reveal className="mx-auto w-full max-w-5xl space-y-14">
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

      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <Reveal className="mx-auto w-full max-w-5xl space-y-12">
          <div className="max-w-xl space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              The organizer
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              From rough to readable, with your words intact.
            </h2>
            <p className="text-base text-ink-muted leading-relaxed">
              The organizer gives your note a title, a summary, and a clean
              structure, and suggests where it belongs. It never rewrites what
              you meant, and it never shares anything: the organized version
              goes back to you first, next to your original, for you to edit
              and approve.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface border border-edge rounded-(--radius-card) p-7 space-y-3 shadow-(--shadow-card)">
              <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-ink-faint">
                What you type
              </p>
              <p className="text-[15px] leading-relaxed text-ink-muted">
                mitochondria makes atp?? krebs cycle in the matrix, electron
                transport chain inner membrane. 36ish atp per glucose i think.
                anaerobic = only 2
              </p>
            </div>
            <div className="bg-surface border border-edge rounded-(--radius-card) p-7 space-y-3 shadow-(--shadow-card)">
              <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
                What your class sees
              </p>
              <div className="space-y-2">
                <p className="text-[15px] font-semibold text-ink">
                  Cellular respiration in the mitochondria
                </p>
                <p className="text-[15px] leading-relaxed text-ink-muted">
                  The Krebs cycle runs in the matrix and the electron transport
                  chain along the inner membrane. Aerobic respiration yields
                  roughly 36 ATP per glucose; anaerobic yields 2.
                </p>
              <p className="mt-3 border-t border-edge pt-3 text-[11px] text-ink-faint">
                Worth checking: the ATP count, flagged from your &quot;36ish
                ... i think&quot;. The organizer never smooths a doubt over.
              </p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-surface border border-edge rounded-(--radius-card) p-6 max-w-3xl">
            <Sparkle className="size-6 shrink-0 text-primary" weight="duotone" aria-hidden />
            <p className="text-sm text-ink-muted leading-relaxed">
              When a claim looks wrong or stretched past its evidence, the
              organizer does not correct it. It lists it in a worth checking
              panel beside your note, and the call stays yours.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="px-6 sm:px-10 py-20 sm:py-28 bg-surface border-y border-edge">
        <Reveal className="mx-auto w-full max-w-5xl space-y-12">
          <div className="max-w-xl space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              Corrections
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Shared notes stay right because people check them.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-10 lg:gap-14">
            {CORRECTION_STEPS.map((step, index) => (
              <div key={step.title} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-display text-lg font-semibold">
                    {index + 1}
                  </span>
                  {index === 0 ? (
                    <ChatCircleText className="size-5 text-ink-faint" aria-hidden />
                  ) : index === 2 ? (
                    <ClockCounterClockwise className="size-5 text-ink-faint" aria-hidden />
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* The teacher's half. Everything above this point is written for the
          student; a class has someone running it, and they get one screen. */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <Reveal className="mx-auto w-full max-w-5xl space-y-8">
          <div className="max-w-xl space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              For the person teaching
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Find out what to go over again.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <ChalkboardTeacher className="size-7 text-primary" weight="duotone" aria-hidden />
              <p className="text-sm text-ink-muted leading-relaxed">
                Whoever runs the Pot can read what the class has answered,
                grouped by the note each question came from, and get back the
                two to four topics worth revisiting with one concrete thing to
                try for each.
              </p>
            </div>
            <div className="space-y-4">
              <Sparkle className="size-7 text-primary" weight="duotone" aria-hidden />
              <p className="text-sm text-ink-muted leading-relaxed">
                The counting is the database&apos;s work and the reading is the
                model&apos;s, so no figure is ever invented. It stays quiet
                until enough people have practiced to mean anything, and it is
                about the material: no student is named, counted, or compared.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-6 sm:px-10 py-20 sm:py-28 bg-surface border-y border-edge">
        <Reveal className="mx-auto w-full max-w-5xl space-y-14">
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
                className="bg-surface border border-edge rounded-(--radius-card) p-8 space-y-4 shadow-(--shadow-card)"
              >
                <principle.icon className="size-7 text-primary" weight="duotone" aria-hidden />
                <h3 className="text-lg font-semibold text-ink">{principle.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{principle.body}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <Button href="/classes" size="lg" roll>
              Join a class
            </Button>
            <Link
              href="/contributions"
              className="group/roll inline-flex items-center gap-2 text-[15px] font-medium text-ink hover:text-primary transition-colors"
            >
              See how contributing works
              <ArrowRight className="size-4 transition-transform duration-300 group-hover/roll:translate-x-1" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
