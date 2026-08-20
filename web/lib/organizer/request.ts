import type { ProposedNote } from "@/lib/organizer/types";

export type OrganizeRequestResult =
  | { note: ProposedNote }
  | { error: "rate_limited" | "failed" };

/**
 * Asks the organizer to rebuild a note from raw words, from the browser.
 *
 * Whole-note corrections go through here before they are sent rather than
 * after they are accepted. Someone editing a whole note types the way people
 * type, so the headings and the key points have to be rebuilt from that: doing
 * it at send time means the proposer sees the tidy note, the maintainer
 * reviews that same note, and accepting publishes what both of them read.
 *
 * The route falls back to the deterministic organizer when the model is
 * unavailable, so an error here means the request itself failed.
 */
export async function organizeNote(
  potId: string,
  rawText: string,
): Promise<OrganizeRequestResult> {
  try {
    const response = await fetch("/api/ai/organize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ potId, rawText }),
    });
    const payload = (await response.json().catch(() => null)) as {
      result?: ProposedNote;
      error?: string;
    } | null;
    if (response.status === 429 || payload?.error === "rate_limited") {
      return { error: "rate_limited" };
    }
    if (!response.ok || !payload?.result?.blocks?.length) return { error: "failed" };
    const { title, summary, blocks, takeaways } = payload.result;
    return { note: { title, summary, blocks, takeaways: takeaways ?? [] } };
  } catch {
    return { error: "failed" };
  }
}

/** The message a person should read when organizing did not happen. */
export function organizeErrorMessage(error: "rate_limited" | "failed"): string {
  return error === "rate_limited"
    ? "You have organized a lot of writing just now. Wait a moment and try again."
    : "The note could not be organized just now. Try again in a moment.";
}
