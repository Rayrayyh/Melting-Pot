import { claudeOrganizer } from "@/lib/organizer/claude";
import { deterministicOrganizer } from "@/lib/organizer/deterministic";
import type { OrganizerProvider } from "@/lib/organizer/types";

export type { OrganizedResult, OrganizerInput, OrganizerProvider } from "@/lib/organizer/types";
export { OrganizeError } from "@/lib/organizer/types";
export { FORCE_FAILURE_TOKEN, suggestSection } from "@/lib/organizer/deterministic";

/**
 * Provider selection is a config change, not a refactor: setting
 * NEXT_PUBLIC_ORGANIZER_PROVIDER=claude (plus a server-side key) swaps the
 * engine behind the same interface.
 */
export function getOrganizer(): OrganizerProvider {
  if (process.env.NEXT_PUBLIC_ORGANIZER_PROVIDER === "claude") {
    return claudeOrganizer;
  }
  return deterministicOrganizer;
}
