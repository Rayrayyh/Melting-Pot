-- MeltingPot core schema.
-- Raw and organized content are both always stored; titles are never
-- identifiers; pot titles may duplicate while ids and class codes are unique.

create extension if not exists pgcrypto;

-- Roles and statuses -------------------------------------------------------

create type public.pot_role as enum ('member', 'maintainer', 'owner');
create type public.contribution_status as enum
  ('draft', 'organizing', 'ready_to_review', 'shared', 'failed');
create type public.proposal_status as enum
  ('pending', 'accepted', 'revision_requested', 'declined');
create type public.proposal_event_kind as enum
  ('submitted', 'edited', 'resubmitted', 'accepted', 'revision_requested', 'declined', 'comment');
create type public.attachment_kind as enum ('image', 'pdf', 'file', 'link');

-- Tables -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.pots (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  class_code text not null unique check (class_code ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.memberships (
  pot_id uuid not null references public.pots (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.pot_role not null default 'member',
  last_seen_note_id uuid,
  created_at timestamptz not null default now(),
  primary key (pot_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index sections_pot_idx on public.sections (pot_id, position);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  status public.contribution_status not null default 'draft',
  raw_text text not null default '' check (char_length(raw_text) <= 20000),
  section_id uuid references public.sections (id) on delete set null,
  organized jsonb,
  shared_note_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contributions_author_idx on public.contributions (author_id, status);
create index contributions_pot_idx on public.contributions (pot_id, status);

create table public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  section_id uuid references public.sections (id) on delete set null,
  contribution_id uuid not null references public.contributions (id),
  contributor_id uuid not null references public.profiles (id),
  current_version_id uuid,
  shared_at timestamptz not null default now()
);
create index shared_notes_pot_idx on public.shared_notes (pot_id, shared_at desc);
create index shared_notes_section_idx on public.shared_notes (section_id);

create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.shared_notes (id) on delete cascade,
  version_number int not null,
  title text not null,
  summary text not null,
  body jsonb not null,
  body_text text not null,
  takeaways text[] not null default '{}',
  contributor_id uuid not null references public.profiles (id),
  correction_contributor_id uuid references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  proposal_id uuid,
  source text,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (note_id, version_number)
);
create index note_versions_note_idx on public.note_versions (note_id, version_number desc);
create index note_versions_search_idx on public.note_versions
  using gin (to_tsvector('english', title || ' ' || summary || ' ' || body_text));

alter table public.shared_notes
  add constraint shared_notes_current_version_fk
  foreign key (current_version_id) references public.note_versions (id);

alter table public.contributions
  add constraint contributions_shared_note_fk
  foreign key (shared_note_id) references public.shared_notes (id) on delete set null;

alter table public.memberships
  add constraint memberships_last_seen_fk
  foreign key (last_seen_note_id) references public.shared_notes (id) on delete set null;

create table public.revision_proposals (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.shared_notes (id) on delete cascade,
  pot_id uuid not null references public.pots (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  status public.proposal_status not null default 'pending',
  selected_text text not null,
  proposed_text text not null,
  reason text,
  explanation text,
  source text,
  diff_summary text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index revision_proposals_pot_idx on public.revision_proposals (pot_id, status);
create index revision_proposals_note_idx on public.revision_proposals (note_id);
create index revision_proposals_proposer_idx on public.revision_proposals (proposer_id, status);

create table public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.revision_proposals (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  kind public.proposal_event_kind not null,
  body text,
  created_at timestamptz not null default now()
);
create index proposal_events_proposal_idx on public.proposal_events (proposal_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  contribution_id uuid references public.contributions (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 300),
  kind public.attachment_kind not null,
  url text,
  storage_path text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (url is not null or storage_path is not null)
);
create index attachments_contribution_idx on public.attachments (contribution_id);

-- updated_at maintenance ---------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contributions_updated_at
  before update on public.contributions
  for each row execute function public.set_updated_at();

create trigger revision_proposals_updated_at
  before update on public.revision_proposals
  for each row execute function public.set_updated_at();

-- Profile auto-creation on signup -----------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
