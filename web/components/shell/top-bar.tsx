import { Wordmark } from "@/components/shell/wordmark";

/**
 * The top bar carries the mark and nothing else.
 *
 * Search moved into the nav, above everything, so it is the first thing in the
 * sidebar rather than a second field in the chrome. Two search boxes on one
 * screen is one too many, and this one had no reason to be the survivor.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 h-14 bg-surface border-b border-edge flex items-center gap-4 px-4 lg:px-6">
      <Wordmark href="/home" />
    </header>
  );
}
