import { PotMark } from "@/components/brand/pot-mark";

/**
 * The wait between routes: the middle tier between the inline Spinner and
 * the full-screen StirPot. Route transitions usually take a few hundred
 * milliseconds, long enough that a blank content area reads as a hang and
 * short enough that the full stir would be theatre.
 *
 * The mark sits still inside a ring while one orange arc runs the rim, the
 * same vocabulary as Spinner at a larger size. The whole thing is invisible
 * for its first 150ms (see .mp-route-loader in globals.css), so a fast
 * navigation never flashes it.
 */
export function RouteLoader({ caption = "Warming the pot" }: { caption?: string }) {
  return (
    <div className="mp-route-loader flex w-full flex-1 flex-col items-center justify-center gap-6 py-24">
      <span className="relative inline-flex size-48 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-edge" />
        <span className="mp-route-loader-arc absolute inset-0 rounded-full border-2 border-transparent border-t-primary" />
        <PotMark className="size-22" />
      </span>
      <p role="status" className="text-base text-ink-faint">
        {caption}
      </p>
    </div>
  );
}
