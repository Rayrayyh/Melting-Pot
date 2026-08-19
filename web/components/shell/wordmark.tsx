import Link from "next/link";
import { CookingPot } from "@phosphor-icons/react/dist/ssr";
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
      <CookingPot
        weight="duotone"
        className={cn("text-primary", size === "lg" ? "size-8" : "size-6")}
      />
      <span
        className={cn(
          "font-semibold tracking-tight",
          size === "lg" ? "text-xl" : "text-[15px]",
        )}
      >
        MeltingPot
      </span>
    </Link>
  );
}
