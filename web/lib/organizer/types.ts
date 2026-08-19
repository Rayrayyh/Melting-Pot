import type { NoteBlock } from "@/lib/data/pot";

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
  suggestedSectionId: string | null;
  /** 0..1; how confident the placement suggestion is. */
  sectionConfidence: number;
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
