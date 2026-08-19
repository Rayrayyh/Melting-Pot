import Link from "next/link";
import {
  ArrowDown,
  HandPalm,
  LockSimpleOpen,
  PencilSimple,
  ShieldCheck,
  SignIn,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
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

/** The public landing: code entry stays the hero; the story scrolls below. */
export function BrandLanding({
  initialCode,
  initialError,
}: {
  initialCode?: string;
  initialError?: string | null;
}) {
  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 h-16">
        <Wordmark />
        <nav className="flex items-center gap-4 text-[13px]">
          <Link href="/login" className="text-ink-muted hover:text-ink transition-colors">
            Sign in
          </Link>
          <Button href="/pots/new" variant="secondary" size="sm">
            Create a Pot
          </Button>
        </nav>
      </header>

      <section id="join" className="px-6 sm:px-10 pt-10 pb-20 sm:pt-16 sm:pb-28">
        <div className="mx-auto w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
          <div className="space-y-6">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              A shared class vault
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl xl:text-[56px] font-semibold tracking-tight leading-[1.08] text-ink">
              Everything your class knows, in one Pot.
            </h1>
            <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-lg">
              Join with a six-character code, write what you remember however
              it comes out, and MeltingPot shapes it into notes worth keeping.
              Nothing is shared until you say so.
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-muted">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-clay" />
                No formatting needed
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-clay" />
                Originals always preserved
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-clay" />
                You approve every share
              </li>
            </ul>
          </div>
          <div className="lg:justify-self-end w-full max-w-md">
            <JoinCard initialCode={initialCode} initialError={initialError} />
          </div>
        </div>
        <p className="flex items-center justify-center gap-2 pt-16 text-[12px] text-ink-faint">
          <ArrowDown className="size-3.5" aria-hidden />
          See how the melt works
        </p>
      </section>

      <ScrollStopper />

      <section className="px-6 sm:px-10 py-20 sm:py-28 bg-surface border-y border-edge">
        <div className="mx-auto w-full max-w-5xl space-y-12">
          <div className="max-w-md space-y-2">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              Three steps, no friction
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              As easy as typing what you know.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary font-serif text-lg font-semibold">
                    {step.number}
                  </span>
                  <step.icon className="size-5 text-ink-faint" aria-hidden />
                </div>
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-5xl space-y-12">
          <div className="max-w-md space-y-2">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              Built on trust
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Your words stay yours.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="bg-surface border border-edge rounded-(--radius-card) p-6 space-y-3 shadow-(--shadow-card)"
              >
                <principle.icon className="size-6 text-primary" weight="duotone" aria-hidden />
                <h3 className="font-semibold text-ink">{principle.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{principle.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-10 pb-24">
        <div className="mx-auto w-full max-w-3xl bg-primary rounded-(--radius-card) px-8 py-12 sm:px-14 text-center space-y-5">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-on-primary">
            Start your class&apos;s Pot tonight.
          </h2>
          <p className="text-sm sm:text-base text-on-primary/80 max-w-md mx-auto">
            Create it in ten seconds, share one code, and watch the vault fill
            before the next exam.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              href="/pots/new"
              size="lg"
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
        </div>
      </section>

      <footer className="px-6 sm:px-10 py-8 border-t border-edge">
        <div className="mx-auto w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-muted">
          <Wordmark />
          <p>A shared class vault. Open source under the MIT license.</p>
        </div>
      </footer>
    </div>
  );
}
