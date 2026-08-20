import {
  OrganizeError,
  type OrganizedResult,
  type OrganizerInput,
  type OrganizerProvider,
} from "@/lib/organizer/types";

// Framework slot for a real model (decision 003): selected when
// ORGANIZER_PROVIDER=claude and an API key is configured. Deliberately not
// implemented in the MVP; the deterministic provider carries every flow.
export const claudeOrganizer: OrganizerProvider = {
  name: "claude",

  async organize(input: OrganizerInput): Promise<OrganizedResult> {
    void input;
    throw new OrganizeError(
      "The Claude organizer is not configured in this build.",
      "provider_failed",
    );
  },
};
