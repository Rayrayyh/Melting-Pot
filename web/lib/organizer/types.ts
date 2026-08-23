import type { NoteBlock } from "@/lib/data/pot";
import type { NoteCheck } from "@/lib/mix/contracts";

export type OrganizerInput = {
  rawText: string;
  sections: Array<{ id: string; title: string }>;
};

export type OrganizedResult = {
  title: string;
  summary: string;
  blocks: NoteBlock[];
  bodyText: string;
  takeaways: string[];
  /**
   * Claims in the writing that look wrong, with the reason. Always empty from
   * the deterministic organizer, which rearranges text and knows nothing about
   * the world, so an empty list means "nothing raised", never "all correct".
   */
  checks: NoteCheck[];
  suggestedSectionId: string | null;
  /** 0..1; how confident the placement suggestion is. */
  sectionConfidence: number;
};

/**
 * The organized note carried on a whole-note correction: what the proposer saw
 * before sending it, what the maintainer reads, and what accepting publishes.
 * Narrower than OrganizedResult because a correction never moves a note between
 * sections, so the placement suggestion has nothing to say here.
 */
export type ProposedNote = {
  title: string;
  summary: string;
  blocks: NoteBlock[];
  takeaways: string[];
};

export interface OrganizerProvider {
  readonly name: string;
  organize(input: OrganizerInput): Promise<OrganizedResult>;
}

export class OrganizeError extends Error {
  constructor(
    message: string,
    readonly reason: "empty" | "too_short" | "provider_failed",
  ) {
    super(message);
    this.name = "OrganizeError";
  }
}
