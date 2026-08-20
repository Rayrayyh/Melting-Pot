import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  HandPalm,
  LockSimpleOpen,
  PencilSimple,
  ShieldCheck,
  SignIn,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { PotHeroArt } from "@/components/brand/pot-mark";
import { JoinCard } from "@/components/landing/join-card";
import { ScrollStopper } from "@/components/landing/scroll-stopper";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    number: "1",
    icon: SignIn,
    title: "Join your class",
    body: "One code from a classmate puts the whole vault in front of you. No forms, no setup, no login wall.",
  },
  {
    number: "2",
    icon: PencilSimple,
    title: "Write it rough",
    body: "Type what you remember between classes. Typos, fragments, half-ideas: all welcome. Formatting is not your job.",
  },
  {
    number: "3",
    icon: UsersThree,
    title: "Approve and share",
    body: "Review the organized version next to your original, change anything, then share it with the class.",
  },
];

const PRINCIPLES = [
  {
    icon: LockSimpleOpen,
    title: "Originals are sacred",
    body: "Every submission is kept exactly as written and stays one tap away, in every version, forever.",
  },
  {
    icon: HandPalm,
    title: "You hold the pen",
    body: "The organizer suggests titles, structure, and placement. It never publishes. Only you can share your notes.",
  },
  {
    icon: ShieldCheck,
    title: "People decide corrections",
    body: "Suggested fixes travel with reasons and sources to a maintainer who decides. Nothing changes silently.",
  },
];

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
      <header className="w-full">
        <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-12 h-24 flex items-center justify-between">
          <Wordmark size="lg" />
          <nav className="flex items-center gap-6 lg:gap-10 text-[15px]">
            <a href="#top" className="hidden md:block text-ink hover:text-primary transition-colors">
              Home
            </a>
            <a href="#spaces" className="hidden md:block text-ink hover:text-primary transition-colors">
              Spaces
            </a>
            <a href="#explore" className="hidden md:block text-ink hover:text-primary transition-colors">
              Explore
            </a>
            {signedIn ? (
              <Link
                href="/home"
                className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-ink hover:text-primary transition-colors">
                  Sign in
                </Link>
                <a
                  href="#spaces"
                  className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
                >
                  Get started
                </a>
              </>
            )}
          </nav>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-12 grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center gap-x-8 gap-y-12 min-h-[calc(100vh-6rem)] pt-10 lg:pt-0">
          <div className="space-y-8 lg:pb-24">
            {/* Fluid so the three forced lines never become four: a fourth
                line pushes the pot below the fold on shorter screens. */}
            <h1 className="font-display text-[40px] sm:text-[clamp(2.5rem,4.6vw,4.625rem)] font-semibold leading-[1.05] tracking-tight text-ink">
              Many ideas.
              <br />
              One shared
              <br />
              knowledge base.
            </h1>
            <p className="text-lg sm:text-xl text-ink-muted leading-relaxed max-w-md">
              Write your notes however they come out. MeltingPot shapes them
              into something the whole class can read, and nothing leaves your
              hands until you say so.
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-2">
              <Button href={signedIn ? "/home" : "#spaces"} size="lg">
                {signedIn ? "Go to dashboard" : "Get started"}
              </Button>
              <a
                href="#explore"
                className="inline-flex items-center gap-2 text-[16px] font-medium text-ink hover:text-primary transition-colors"
              >
                Learn more
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
          </div>
          <div className="relative h-full min-h-[320px] lg:min-h-[calc(100vh-6rem)] flex items-end justify-center lg:justify-end">
            <PotHeroArt className="w-full max-w-120 lg:max-w-150 max-h-[calc(100dvh-8.5rem)] mb-2.5" />
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
        <div className="mx-auto w-full max-w-5xl space-y-16">
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
              <div key={step.number} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-display text-lg font-semibold">
                    {step.number}
                  </span>
                  <step.icon className="size-5 text-ink-faint" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-10 py-24 sm:py-36">
        <div className="mx-auto w-full max-w-5xl space-y-16">
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
        </div>
      </section>

      <section className="px-6 sm:px-10 pb-28 sm:pb-36">
        <div className="mx-auto w-full max-w-4xl bg-primary rounded-(--radius-card) px-8 py-16 sm:px-16 sm:py-20 text-center space-y-6">
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
        </div>
      </section>

      <footer className="px-6 sm:px-10 py-12 border-t border-edge">
        <div className="mx-auto w-full max-w-5xl flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Wordmark />
            <p className="max-w-xs text-[13px] text-ink-muted">
              Everything your class knows, in one Pot. Open source under the
              MIT license.
            </p>
          </div>
          <a
            href="https://pixel-forge-ai-hackathon-08.devpost.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex flex-col gap-2.5 sm:items-end"
          >
            {/* The hackathon's own mark, kept at its own colors as a credit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pixel-forge-ai-hackathon.png"
              alt="Pixel Forge AI"
              width={932}
              height={103}
              className="h-7 w-auto"
            />
            <span className="text-[13px] text-ink-muted">
              Made for the Pixel Forge AI Hackathon
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}
