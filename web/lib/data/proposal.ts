import { supabaseServer } from "@/lib/supabase/server";
import { parseBlocks, type NoteBlock } from "@/lib/data/pot";
import type { ProposalEventKind, ProposalStatus } from "@/lib/database.types";

export type ProposalDetail = {
  id: string;
  potId: string;
  noteId: string;
  noteTitle: string;
  noteContributorName: string;
  currentBlocks: NoteBlock[];
  currentBodyText: string;
  currentTitle: string;
  currentSummary: string;
  currentTakeaways: string[];
  status: ProposalStatus;
  selectedText: string;
  proposedText: string;
  reason: string | null;
  explanation: string | null;
  source: string | null;
  diffSummary: string | null;
  proposerId: string;
  proposerName: string;
  decidedByName: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  events: Array<{
    id: string;
    kind: ProposalEventKind;
    actorName: string;
    body: string | null;
    createdAt: string;
  }>;
};

export async function getProposalDetail(
  potId: string,
  proposalId: string,
): Promise<ProposalDetail | null> {
  const supabase = await supabaseServer();
  const { data: proposal } = await supabase
    .from("revision_proposals")
    .select(
      `id, pot_id, note_id, status, selected_text, proposed_text, reason,
       explanation, source, diff_summary, proposer_id, decision_note,
       decided_at, created_at,
       proposer:profiles!revision_proposals_proposer_id_fkey(display_name),
       decider:profiles!revision_proposals_decided_by_fkey(display_name),
       note:shared_notes!revision_proposals_note_id_fkey(
         id,
         contributor:profiles!shared_notes_contributor_id_fkey(display_name),
         current:note_versions!shared_notes_current_version_fk(
           title, summary, body, body_text, takeaways
         )
       )`,
    )
    .eq("id", proposalId)
    .eq("pot_id", potId)
    .maybeSingle();
  if (!proposal?.note?.current) return null;

  const { data: events } = await supabase
    .from("proposal_events")
    .select("id, kind, body, created_at, actor:profiles!proposal_events_actor_id_fkey(display_name)")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });

  return {
    id: proposal.id,
    potId: proposal.pot_id,
    noteId: proposal.note.id,
    noteTitle: proposal.note.current.title,
    noteContributorName: proposal.note.contributor?.display_name ?? "Unknown",
    currentBlocks: parseBlocks(proposal.note.current.body),
    currentBodyText: proposal.note.current.body_text,
    currentTitle: proposal.note.current.title,
    currentSummary: proposal.note.current.summary,
    currentTakeaways: proposal.note.current.takeaways,
    status: proposal.status,
    selectedText: proposal.selected_text,
    proposedText: proposal.proposed_text,
    reason: proposal.reason,
    explanation: proposal.explanation,
    source: proposal.source,
    diffSummary: proposal.diff_summary,
    proposerId: proposal.proposer_id,
    proposerName: proposal.proposer?.display_name ?? "A member",
    decidedByName: proposal.decider?.display_name ?? null,
    decisionNote: proposal.decision_note,
    decidedAt: proposal.decided_at,
    createdAt: proposal.created_at,
    events: (events ?? []).map((event) => ({
      id: event.id,
      kind: event.kind,
      actorName: event.actor?.display_name ?? "Someone",
      body: event.body,
      createdAt: event.created_at,
    })),
  };
}
