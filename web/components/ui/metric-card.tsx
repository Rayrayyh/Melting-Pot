import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  href,
  accessory,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  accessory?: ReactNode;
  tone?: "default" | "attention";
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "bg-surface border border-edge rounded-(--radius-card) px-4 py-3 h-full",
        href && "hover:border-edge-strong transition-colors",
        className,
      )}
    >
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={cn(
            "text-lg font-semibold tabular-nums",
            tone === "attention" ? "text-pending" : "text-ink",
          )}
        >
          {value}
        </span>
        {accessory}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}
