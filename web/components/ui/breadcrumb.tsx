import Link from "next/link";
import { Fragment } from "react";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

export function Breadcrumb({
  crumbs,
  className,
}: {
  crumbs: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex items-center gap-1.5 text-[13px] text-ink-muted min-w-0">
        {crumbs.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 ? <CaretRight aria-hidden className="size-3 shrink-0 text-ink-faint" /> : null}
            <li className="truncate">
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-ink transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
