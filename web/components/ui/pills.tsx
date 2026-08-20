import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "pending"
  | "primary"
  | "clay";

const tones: Record<StatusTone, string> = {
  neutral: "bg-sunken text-ink-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  pending: "bg-pending-soft text-pending",
  primary: "bg-primary-soft text-primary",
  clay: "bg-clay-soft text-clay",
};

/**
 * Status is always conveyed by the label text; the tone only reinforces it,
 * so color is never the sole indicator.
 */
export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-[22px] px-2.5 rounded-full text-[11px] font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type PotRole = "owner" | "maintainer" | "member";

const roleLabel: Record<PotRole, string> = {
  owner: "Owner",
  maintainer: "Maintainer",
  member: "Member",
};

export function RolePill({ role, className }: { role: PotRole; className?: string }) {
  return (
    <StatusPill
      tone={role === "owner" ? "clay" : role === "maintainer" ? "primary" : "neutral"}
      className={className}
    >
      {roleLabel[role]}
    </StatusPill>
  );
}

export function SectionPill({
  active = false,
  className,
  children,
}: {
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-7 px-3 rounded-full text-[13px] font-medium border transition-colors max-w-full",
        active
          ? "bg-primary-soft border-primary/30 text-primary"
          : "bg-surface border-edge text-ink-muted",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
