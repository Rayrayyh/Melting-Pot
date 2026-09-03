import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Plant,
  PaperPlaneTilt,
  PencilSimple,
  Signature,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { getAuthUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Contributions",
  description:
    "Write rough, review the organized version, share it yourself. How a contribution travels from your keyboard to your class's vault, with your name on it.",
};

const LOOP = [
  {
    icon: PencilSimple,
    title: "Write it rough",
    body: "Type what you remember, attach a photo of the whiteboard, paste a link. No formatting, no minimum polish.",
  },
  {
    icon: Sparkle,
    title: "MeltingPot organizes",
    body: "Your note comes back with a title, a summary, a clean body, and a suggested section. Your original sits right beside it, untouched.",
  },
  {
    icon: CheckCircle,
    title: "You review and edit",
    body: "Change anything: the title, the structure, every word. The organized version is a draft of yours, not a decision made for you.",
  },
  {
    icon: PaperPlaneTilt,
    title: "You share it",
    body: "Nothing reaches the class until you press share. Until then it is a private draft only you can see.",
  },
];

export default async function ContributionsPage() {
  const user = await getAuthUser();

  return (
    <div className="flex flex-col">
      <SiteHeader signedIn={Boolean(user)} active="/contributions" />

      <section className="px-6 sm:px-10 pt-14 sm:pt-20 pb-16 sm:pb-24">
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
            From your keyboard to the vault
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] text-ink">
            Contributions
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-ink-muted leading-relaxed">
            A contribution is anything you know that your class does not have
            yet. It travels four short steps, and you hold the pen at every
            one of them.
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-10 py-20 sm:py-28 bg-surface border-y border-edge">
        <Reveal className="mx-auto w-full max-w-5xl space-y-14">
          <div className="max-w-lg space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              The loop
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Four steps, and you approve the one that matters.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {LOOP.map((step, index) => (
              <div key={step.title} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary font-display text-lg font-semibold">
                    {index + 1}
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
        <Reveal className="mx-auto w-full max-w-5xl grid md:grid-cols-2 gap-6">
          <div className="bg-surface border border-edge rounded-(--radius-card) p-8 space-y-4 shadow-(--shadow-card)">
            <Signature className="size-7 text-primary" weight="duotone" aria-hidden />
            <h3 className="text-lg font-semibold text-ink">Your name stays on it</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Shared notes carry their contributors. When a correction lands,
              both the original author and the person who fixed it appear in
              the version history, permanently.
            </p>
          </div>
          <div className="bg-surface border border-edge rounded-(--radius-card) p-8 space-y-4 shadow-(--shadow-card)">
            <Plant className="size-7 text-primary" weight="duotone" aria-hidden />
            <h3 className="text-lg font-semibold text-ink">A private record of your days</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Your run of days is yours alone. Nobody else sees it, where you
              stand in a class is shown only to you, and a quiet stretch shows
              the run you already managed rather than a zero.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="px-6 sm:px-10 pb-24 sm:pb-32">
        <Reveal className="mx-auto w-full max-w-5xl space-y-8">
          <div className="max-w-xl space-y-3">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
              After sharing
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Corrections go through people.
            </h2>
            <p className="text-base text-ink-muted leading-relaxed">
              Anyone in the class can propose a fix to a shared note, with a
              reason and sources. A maintainer reviews it and decides. Nothing
              in the vault ever changes silently, and no version is ever lost.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Button href="/classes" size="lg" roll>
              Join a class
            </Button>
            <Link
              href="/how-it-works"
              className="group/roll inline-flex items-center gap-2 text-[15px] font-medium text-ink hover:text-primary transition-colors"
            >
              See the whole flow
              <ArrowRight className="size-4 transition-transform duration-300 group-hover/roll:translate-x-1" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
