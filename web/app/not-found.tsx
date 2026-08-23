import { Button } from "@/components/ui/button";
import { StirPot } from "@/components/brand/stir-pot";
import { Wordmark } from "@/components/shell/wordmark";

export const metadata = { title: "Page not found" };

/**
 * The 404, from the design: a cream field with drifting accents, a giant
 * 4 pot 4, and one way back.
 *
 * Three departures from the mock, all deliberate. The pot is our own vector
 * mark rather than the design's raster splash, so it stays sharp and follows
 * the theme. The type is Fraunces and Inter rather than adding a fifth and
 * sixth family for one page. And the colours are tokens rather than the
 * design's fixed hexes, so this goes dark with everything else: a bright cream
 * page would otherwise be the one place the theme did not reach.
 */

/** Where the accents sit, in the design's own proportions. */
const BLOBS = [
  { cls: "mp-blob", style: { top: "10%", left: "11%", width: 46, height: 46, borderRadius: "62% 38% 55% 45% / 55% 48% 52% 45%", background: "var(--stir-ramp-0)", animationDuration: "7s" } },
  { cls: "mp-dot", style: { top: "24%", left: "6%", width: 18, height: 18, borderRadius: "50%", background: "var(--stir-ramp-1)", animationDuration: "5s" } },
  { cls: "mp-blob-alt", style: { top: "11%", right: "4%", width: 58, height: 58, borderRadius: "43% 57% 48% 52% / 58% 44% 56% 42%", background: "var(--stir-ramp-2)", animationDuration: "8s" } },
  { cls: "mp-dot", style: { top: "31%", right: "5.5%", width: 14, height: 14, borderRadius: "50%", background: "var(--stir-wisp-b)", animationDelay: "1s", animationDuration: "6s" } },
  { cls: "mp-blob", style: { bottom: "19%", left: "9%", width: 34, height: 52, borderRadius: "50% 50% 46% 54% / 62% 64% 36% 38%", background: "var(--stir-wisp-a)", animationDelay: "0.5s", animationDuration: "9s" } },
  { cls: "mp-dot", style: { bottom: "11%", left: "16%", width: 16, height: 16, borderRadius: "50%", background: "var(--stir-ramp-2)", animationDelay: "2s", animationDuration: "7s" } },
  { cls: "mp-blob-alt", style: { bottom: "24%", right: "7%", width: 42, height: 42, borderRadius: "55% 45% 62% 38% / 46% 55% 45% 54%", background: "var(--stir-ramp-0)", animationDelay: "1.2s", animationDuration: "7.5s" } },
  { cls: "mp-dot", style: { bottom: "12%", right: "13%", width: 20, height: 20, borderRadius: "50%", background: "var(--stir-ramp-1)", animationDelay: "0.7s", animationDuration: "5.5s" } },
  { cls: "mp-dot", style: { top: "52%", left: "3%", width: 12, height: 12, borderRadius: "50%", background: "var(--stir-wisp-b)", animationDelay: "1.6s", animationDuration: "6.5s" } },
  { cls: "mp-dot", style: { top: "46%", right: "3%", width: 10, height: 10, borderRadius: "50%", background: "var(--stir-wisp-a)", animationDelay: "0.3s", animationDuration: "8s" } },
] as const;

export default function NotFound() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="absolute left-6 top-6 sm:left-10 sm:top-8">
        <Wordmark />
      </div>

      {/* Decoration. Nothing here is announced, and reduced motion removes it. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {BLOBS.map((blob, i) => (
          <span key={i} className={`absolute block ${blob.cls}`} style={blob.style} />
        ))}
      </div>

      <div className="relative flex flex-col items-center text-center">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <span className="font-display font-black leading-[0.78] tracking-[-0.04em] text-clay text-[26vw] sm:text-[15rem] lg:text-[18rem]">
            4
          </span>
          <StirPot
            variant="reduced"
            className="w-[26vw] max-w-[20rem] sm:w-[15rem] lg:w-[19rem] h-auto shrink-0"
          />
          <span className="font-display font-black leading-[0.78] tracking-[-0.04em] text-clay text-[26vw] sm:text-[15rem] lg:text-[18rem]">
            4
          </span>
        </div>

        <h1 className="mt-8 font-display text-2xl font-bold tracking-tight sm:mt-11 sm:text-[2.75rem] sm:leading-[1.1]">
          This page melted away.
        </h1>
        <p className="mt-4 max-w-[34rem] text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
          The page you&rsquo;re trying to reach doesn&rsquo;t exist or has been
          moved. Everything worth reading is back in the Pot.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:mt-9">
          <Button href="/home" size="lg">
            Go to homepage
          </Button>
          <Button href="/" variant="secondary" size="lg">
            Enter a class code
          </Button>
        </div>
      </div>
    </div>
  );
}
