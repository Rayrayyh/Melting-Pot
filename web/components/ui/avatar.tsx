import { User } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

const TINT_COUNT = 6;

/**
 * Everyone gets the same person icon and one of six tints, chosen from their
 * name so the same person keeps the same color on every screen.
 */
function tintFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const slot = (Math.abs(hash) % TINT_COUNT) + 1;
  return {
    background: `var(--avatar-${slot}-soft)`,
    color: `var(--avatar-${slot})`,
  };
}

const SIZES = {
  sm: { box: "size-6", icon: "size-3.5" },
  md: { box: "size-8", icon: "size-[18px]" },
  lg: { box: "size-12", icon: "size-6" },
};

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={tintFor(name)}
      className={cn(
        "inline-flex items-center justify-center rounded-full shrink-0",
        SIZES[size].box,
        className,
      )}
    >
      <User className={SIZES[size].icon} weight="fill" />
    </span>
  );
}

/** Avatar + name + meta line, the standard attribution row. */
export function AttributionRow({
  name,
  meta,
  size = "md",
  className,
}: {
  name: string;
  meta?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <Avatar name={name} size={size === "sm" ? "sm" : "md"} />
      <div className="min-w-0">
        <p className={cn("font-medium text-ink truncate", size === "sm" ? "text-[13px]" : "text-sm")}>
          {name}
        </p>
        {meta ? <p className="text-[12px] text-ink-muted truncate">{meta}</p> : null}
      </div>
    </div>
  );
}
