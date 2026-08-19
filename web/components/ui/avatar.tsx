import { cn } from "@/lib/cn";

const tints = [
  "bg-primary-soft text-primary",
  "bg-clay-soft text-clay",
  "bg-warning-soft text-warning",
  "bg-success-soft text-success",
  "bg-sunken text-ink-muted",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tintFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tints[Math.abs(hash) % tints.length];
}

export function AvatarInitial({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-6 text-[10px]",
    md: "size-8 text-[12px]",
    lg: "size-12 text-[16px]",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0",
        sizes[size],
        tintFor(name),
        className,
      )}
    >
      {initials(name)}
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
      <AvatarInitial name={name} size={size === "sm" ? "sm" : "md"} />
      <div className="min-w-0">
        <p className={cn("font-medium text-ink truncate", size === "sm" ? "text-[13px]" : "text-sm")}>
          {name}
        </p>
        {meta ? <p className="text-[12px] text-ink-muted truncate">{meta}</p> : null}
      </div>
    </div>
  );
}
