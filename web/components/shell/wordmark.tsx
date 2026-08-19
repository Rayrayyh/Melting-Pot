import Link from "next/link";
import { PotMark } from "@/components/brand/pot-mark";
import { cn } from "@/lib/cn";

export function Wordmark({
  href = "/",
  size = "md",
  className,
}: {
  href?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 text-ink", className)}
    >
      <PotMark
        className={cn(size === "lg" ? "size-10" : "size-8")}
        title="MeltingPot"
      />
      <span
        className={cn(
          "font-brand font-semibold tracking-tight lowercase",
          size === "lg" ? "text-[26px]" : "text-[20px]",
        )}
      >
        meltingpot
      </span>
    </Link>
  );
}
