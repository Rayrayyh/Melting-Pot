// Generated from the Supabase project schema (supabase/migrations/*).
// Regenerate with the Supabase MCP generate_typescript_types tool after any
// schema migration and replace this file wholesale.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PotRole = "member" | "maintainer" | "owner";
export type ContributionStatus =
  | "draft"
  | "organizing"
  | "ready_to_review"
  | "shared"
  | "failed";
export type ProposalStatus =
  | "pending"
  | "accepted"
  | "revision_requested"
  | "declined";
export type ProposalEventKind =
  | "submitted"
  | "edited"
  | "resubmitted"
  | "accepted"
  | "revision_requested"
  | "declined"
  | "comment";
export type AttachmentKind = "image" | "pdf" | "file" | "link";

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          contribution_id: string | null;
          created_at: string;
          created_by: string;
          id: string;
          kind: AttachmentKind;
          name: string;
          pot_id: string;
          storage_path: string | null;
          url: string | null;
        };
        Insert: {
          contribution_id?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          kind: AttachmentKind;
          name: string;
          pot_id: string;
          storage_path?: string | null;
          url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["attachments"]["Insert"]>;
        Relationships: [];
      };
      contributions: {
        Row: {
          author_id: string;
          created_at: string;
          id: string;
          organized: Json | null;
          pot_id: string;
          raw_text: string;
          section_id: string | null;
          shared_note_id: string | null;
          status: ContributionStatus;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          organized?: Json | null;
          pot_id: string;
          raw_text?: string;
          section_id?: string | null;
          shared_note_id?: string | null;
          status?: ContributionStatus;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contributions"]["Insert"]>;
        Relationships: [];
      };
      memberships: {
        Row: {
          created_at: string;
          last_seen_note_id: string | null;
          pot_id: string;
          role: PotRole;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          last_seen_note_id?: string | null;
          pot_id: string;
          role?: PotRole;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Insert"]>;
        Relationships: [];
      };
      note_versions: {
        Row: {
          body: Json;
          body_text: string;
          change_summary: string | null;
          contributor_id: string;
          correction_contributor_id: string | null;
          created_at: string;
          id: string;
          note_id: string;
          proposal_id: string | null;
          reviewed_by: string | null;
          source: string | null;
          summary: string;
          takeaways: string[];
          title: string;
          version_number: number;
        };
        Insert: {
          body: Json;
          body_text: string;
          change_summary?: string | null;
          contributor_id: string;
          correction_contributor_id?: string | null;
          created_at?: string;
          id?: string;
          note_id: string;
          proposal_id?: string | null;
          reviewed_by?: string | null;
          source?: string | null;
          summary: string;
          takeaways?: string[];
          title: string;
          version_number: number;
        };
        Update: Partial<Database["public"]["Tables"]["note_versions"]["Insert"]>;
        Relationships: [];
      };
      pots: {
        Row: {
          archived_at: string | null;
          class_code: string;
          created_at: string;
          description: string | null;
          id: string;
          owner_id: string;
          title: string;
        };
        Insert: {
          archived_at?: string | null;
          class_code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          owner_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["pots"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      proposal_events: {
        Row: {
          actor_id: string;
          body: string | null;
          created_at: string;
          id: string;
          kind: ProposalEventKind;
          proposal_id: string;
        };
        Insert: {
          actor_id: string;
          body?: string | null;
          created_at?: string;
          id?: string;
          kind: ProposalEventKind;
          proposal_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["proposal_events"]["Insert"]>;
        Relationships: [];
      };
      revision_proposals: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          diff_summary: string | null;
          explanation: string | null;
          id: string;
          note_id: string;
          pot_id: string;
          proposed_text: string;
          proposer_id: string;
          reason: string | null;
          selected_text: string;
          source: string | null;
          status: ProposalStatus;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          diff_summary?: string | null;
          explanation?: string | null;
          id?: string;
          note_id: string;
          pot_id: string;
          proposed_text: string;
          proposer_id: string;
          reason?: string | null;
          selected_text: string;
          source?: string | null;
          status?: ProposalStatus;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["revision_proposals"]["Insert"]>;
        Relationships: [];
      };
      sections: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          pot_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          position?: number;
          pot_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["sections"]["Insert"]>;
        Relationships: [];
      };
      shared_notes: {
        Row: {
          contribution_id: string;
          contributor_id: string;
          current_version_id: string | null;
          id: string;
          pot_id: string;
          section_id: string | null;
          shared_at: string;
        };
        Insert: {
          contribution_id: string;
          contributor_id: string;
          current_version_id?: string | null;
          id?: string;
          pot_id: string;
          section_id?: string | null;
          shared_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shared_notes"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_pot: {
        Args: { p_description?: string; p_title: string };
        Returns: Json;
      };
      decide_proposal: {
        Args: {
          p_change_summary?: string;
          p_decision: string;
          p_new_body?: Json;
          p_new_body_text?: string;
          p_new_summary?: string;
          p_new_takeaways?: string[];
          p_new_title?: string;
          p_note?: string;
          p_proposal_id: string;
        };
        Returns: undefined;
      };
      join_pot_with_code: { Args: { p_code: string }; Returns: string };
      lookup_pot_by_code: { Args: { p_code: string }; Returns: Json };
      regenerate_class_code: { Args: { p_pot_id: string }; Returns: string };
      register_student: {
        Args: { p_display_name: string; p_email: string; p_password: string };
        Returns: string;
      };
      remove_member: {
        Args: { p_pot_id: string; p_user_id: string };
        Returns: undefined;
      };
      resubmit_proposal: {
        Args: {
          p_diff_summary?: string;
          p_explanation?: string;
          p_proposal_id: string;
          p_proposed_text: string;
          p_selected_text: string;
          p_source?: string;
        };
        Returns: undefined;
      };
      set_member_role: {
        Args: { p_pot_id: string; p_role: PotRole; p_user_id: string };
        Returns: undefined;
      };
      share_contribution: {
        Args: {
          p_body: Json;
          p_body_text: string;
          p_contribution_id: string;
          p_section_id?: string;
          p_summary: string;
          p_takeaways: string[];
          p_title: string;
        };
        Returns: string;
      };
    };
    Enums: {
      attachment_kind: AttachmentKind;
      contribution_status: ContributionStatus;
      pot_role: PotRole;
      proposal_event_kind: ProposalEventKind;
      proposal_status: ProposalStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
