import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";
import { RollText } from "@/components/ui/roll-text";
import { cn } from "@/lib/cn";

const NAV = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Classes", href: "/classes" },
  { label: "Contributions", href: "/contributions" },
] as const;

/**
 * The public pages' shared header. Each nav item is a real page rather than a
 * scroll anchor, so the links work from anywhere and the browser's back button
 * means something. Signed-in people get their way back to the dashboard; everyone
 * else gets sign in and a start.
 */
export function SiteHeader({
  signedIn,
  active,
  getStartedHref = "/classes",
}: {
  signedIn: boolean;
  /** Pathname of the current page, to mark its nav link. */
  active?: string;
  /** Where the start pill points; the landing sends it to its own join section. */
  getStartedHref?: string;
}) {
  return (
    <header className="w-full">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-12 h-20 sm:h-24 flex items-center justify-between gap-3">
        <Wordmark size="lg" className="min-w-0 shrink" />
        {/* Every label here is nowrap: the pill has a fixed height, so a
            wrapped label spills out of it rather than growing the button. */}
        <nav className="flex shrink-0 items-center gap-4 sm:gap-6 lg:gap-10 text-[14px] sm:text-[15px]">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={cn(
                "hidden md:block whitespace-nowrap transition-colors hover:text-primary",
                active === item.href ? "text-primary font-medium" : "text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
          {signedIn ? (
            <Link
              href="/home"
              className="group/roll inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-4 sm:px-6 text-[14px] sm:text-[15px] font-medium text-on-primary transition-opacity hover:opacity-90"
            >
              <RollText>Go to dashboard</RollText>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap text-ink hover:text-primary transition-colors"
              >
                Sign in
              </Link>
              <a
                href={getStartedHref}
                className="group/roll inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-ink px-4 sm:px-6 text-[14px] sm:text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
              >
                <RollText>Get started</RollText>
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
