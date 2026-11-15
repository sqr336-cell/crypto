-- BEATLINK — core schema
-- Every table has RLS enabled. Sensitive writes go through SECURITY DEFINER
-- functions (see 20261115000200_functions.sql) so business rules
-- (limits, blocks, consent) cannot be bypassed from the client.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.availability as enum ('looking', 'available', 'open', 'unavailable');
create type public.collab_mode as enum ('remote', 'in_person', 'both');
create type public.swipe_decision as enum ('pass', 'interest');
create type public.connection_origin as enum ('mutual_interest', 'collab_request');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type public.collaboration_status as enum ('active', 'completed', 'archived');
create type public.message_kind as enum ('text', 'link', 'audio', 'track', 'system');
create type public.report_reason as enum ('spam', 'harassment', 'inappropriate', 'impersonation', 'copyright', 'underage', 'other');
create type public.plan_tier as enum ('free', 'plus', 'pro');
create type public.link_platform as enum ('soundcloud', 'spotify', 'youtube', 'instagram', 'beatstars', 'tiktok', 'apple_music', 'bandcamp', 'website');

-- ---------------------------------------------------------------------------
-- Taxonomy (closed lists; labels are translated client-side)
-- Keep in sync with mobile/src/domain/taxonomy.ts (a test enforces it).
-- ---------------------------------------------------------------------------
create table public.taxonomy (
  kind text not null check (kind in ('role', 'genre', 'skill', 'goal')),
  slug text not null check (slug ~ '^[a-z0-9_]{2,40}$'),
  position smallint not null default 0,
  primary key (kind, slug)
);

-- Which roles a person is looking for, derived from their goals (kind = 'goal')
-- or, when goals say nothing about roles, from their own roles (kind = 'role').
create table public.complement_rules (
  kind text not null check (kind in ('role', 'goal')),
  slug text not null,
  wanted_role text not null,
  primary key (kind, slug, wanted_role)
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_path text check (char_length(avatar_path) <= 300),
  banner_path text check (char_length(banner_path) <= 300),
  bio text check (char_length(bio) <= 300),
  looking_for text check (char_length(looking_for) <= 140),
  city text check (char_length(city) <= 60),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  languages text[] not null default '{}' check (cardinality(languages) <= 6),
  roles text[] not null default '{}' check (cardinality(roles) <= 4),
  genres text[] not null default '{}' check (cardinality(genres) <= 5),
  influences text[] not null default '{}' check (cardinality(influences) <= 10),
  skills text[] not null default '{}' check (cardinality(skills) <= 10),
  goals text[] not null default '{}' check (cardinality(goals) <= 7),
  availability public.availability not null default 'open',
  collab_mode public.collab_mode not null default 'both',
  is_discoverable boolean not null default true,
  age_confirmed_at timestamptz,
  onboarded_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_requires_age check (onboarded_at is null or age_confirmed_at is not null),
  constraint onboarding_requires_role check (onboarded_at is null or cardinality(roles) >= 1)
);

create index profiles_feed_idx on public.profiles (last_active_at desc)
  where onboarded_at is not null and is_discoverable;
create index profiles_genres_idx on public.profiles using gin (genres);
create index profiles_roles_idx on public.profiles using gin (roles);

create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform public.link_platform not null,
  url text not null check (url ~* '^https://[^[:space:]]{4,300}$'),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, platform)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  storage_path text not null unique check (char_length(storage_path) <= 300),
  duration_ms integer check (duration_ms between 500 and 600000),
  waveform smallint[] check (cardinality(waveform) <= 128),
  bpm smallint check (bpm between 40 and 250),
  musical_key text check (musical_key ~ '^[A-G](#|b)?m?$'),
  genre text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint storage_path_in_owner_folder check (storage_path like owner_id::text || '/%')
);
create index tracks_owner_idx on public.tracks (owner_id, position);

-- ---------------------------------------------------------------------------
-- Discovery & connections
-- ---------------------------------------------------------------------------
create table public.swipes (
  actor_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  decision public.swipe_decision not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, target_id),
  check (actor_id <> target_id)
);
create index swipes_target_interest_idx on public.swipes (target_id, actor_id) where decision = 'interest';

create table public.favorites (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, target_id),
  check (owner_id <> target_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct', 'group')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index conversation_members_profile_idx on public.conversation_members (profile_id);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  origin public.connection_origin not null,
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index connections_user_b_idx on public.connections (user_b);

create table public.collab_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  project_title text check (char_length(project_title) <= 80),
  track_id uuid references public.tracks (id) on delete set null,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id)
);
create unique index collab_requests_one_pending_idx
  on public.collab_requests (sender_id, recipient_id) where status = 'pending';
create index collab_requests_recipient_idx on public.collab_requests (recipient_id, status, created_at desc);

create table public.collaborations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  status public.collaboration_status not null default 'active',
  conversation_id uuid references public.conversations (id) on delete set null,
  request_id uuid references public.collab_requests (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collaboration_members (
  collaboration_id uuid not null references public.collaborations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (collaboration_id, profile_id)
);
create index collaboration_members_profile_idx on public.collaboration_members (profile_id);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Deleting an account deletes the messages that person sent.
  sender_id uuid references public.profiles (id) on delete cascade,
  kind public.message_kind not null default 'text',
  body text check (char_length(body) <= 4000),
  attachment_path text check (char_length(attachment_path) <= 300),
  -- audio: {duration_ms, waveform, filename, size_bytes, mime}
  -- track: {track_id, title, duration_ms, waveform, storage_path}
  -- link:  {platform}
  -- system: {event: 'linked' | 'project_started' | 'project_completed', title?}
  meta jsonb not null default '{}'::jsonb,
  -- clock_timestamp(): several messages written in one transaction keep their order.
  created_at timestamptz not null default clock_timestamp(),
  constraint audio_has_attachment check ((kind = 'audio') = (attachment_path is not null)),
  constraint attachment_in_conversation_folder check (
    attachment_path is null or attachment_path like conversation_id::text || '/%'
  ),
  constraint text_has_body check (kind not in ('text', 'link') or char_length(btrim(body)) >= 1),
  constraint user_messages_have_sender check (kind = 'system' or sender_id is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Safety
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_profile_id uuid references public.profiles (id) on delete set null,
  target_message_id uuid references public.messages (id) on delete set null,
  target_track_id uuid references public.tracks (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  -- Snapshot of the reported content, kept even if the author deletes it.
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  moderator_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on public.reports (status, created_at);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key check (char_length(token) <= 300),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  -- Language of notification copy (the server has no other way to know it).
  locale text not null default 'en' check (locale in ('en', 'fr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_profile_idx on public.push_tokens (profile_id);

-- ---------------------------------------------------------------------------
-- Freemium (written by the server only: payment webhooks / service role)
-- ---------------------------------------------------------------------------
create table public.plan_limits (
  plan public.plan_tier primary key,
  daily_interests integer,          -- null = unlimited
  daily_requests integer not null,  -- always capped (anti-spam)
  max_favorites integer,            -- null = unlimited
  max_tracks integer not null
);

create table public.entitlements (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  plan public.plan_tier not null default 'free',
  source text not null default 'default' check (source in ('default', 'manual', 'apple', 'google', 'stripe', 'revenuecat')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.daily_usage (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  interests integer not null default 0,
  requests integer not null default 0,
  primary key (profile_id, day)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.taxonomy enable row level security;
alter table public.complement_rules enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.tracks enable row level security;
alter table public.swipes enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.connections enable row level security;
alter table public.collab_requests enable row level security;
alter table public.collaborations enable row level security;
alter table public.collaboration_members enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.push_tokens enable row level security;
alter table public.plan_limits enable row level security;
alter table public.entitlements enable row level security;
alter table public.daily_usage enable row level security;
