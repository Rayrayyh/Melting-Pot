import Link from "next/link";
import { PotMark } from "@/components/brand/pot-mark";
import { cn } from "@/lib/cn";

export function Wordmark({
  href = "/",
  size = "md",
  className,
  idPrefix,
}: {
  href?: string;
  size?: "md" | "lg";
  className?: string;
  /** Forwarded to the mark. Set it on the second Wordmark of a page so the
   *  two do not share SVG def ids. See PotMark. */
  idPrefix?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 text-ink", className)}
    >
      <PotMark
        // The large mark steps down on a phone, where the header is tight.
        className={cn("shrink-0", size === "lg" ? "size-8 sm:size-10" : "size-8")}
        title="MeltingPot"
        idPrefix={idPrefix}
      />
      <span
        className={cn(
          // Below 360px the mark carries the brand alone: there is not room
          // for the word and the account controls, and overlapping them is
          // worse than showing the pot on its own.
          "font-brand font-semibold tracking-tight lowercase max-[359px]:hidden",
          size === "lg" ? "text-[21px] sm:text-[26px]" : "text-[20px]",
        )}
      >
        meltingpot
      </span>
    </Link>
  );
}
