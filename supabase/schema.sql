-- PadhleBeta Study Rooms — full schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → Run).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / ON CONFLICT).

-- ── Rooms (static catalog) ──────────────────────────────────────────────
create table if not exists pb_rooms (
  id text primary key,
  title text not null,
  created_at timestamptz not null default now()
);

insert into pb_rooms (id, title) values
  ('iitjee', 'IIT-JEE'),
  ('neet', 'NEET'),
  ('board10', 'Boards · Class 10'),
  ('board12', 'Boards · Class 12'),
  ('lakshya', 'Lakshya · Open Focus')
on conflict (id) do update set title = excluded.title;

-- ── Users (anonymous, device-scoped — no login) ─────────────────────────
-- id is a UUID generated client-side on first visit (crypto.randomUUID(),
-- stored in localStorage) — there is no auth, so this identifies a browser,
-- not a verified person. name_type records whether they typed a name or
-- used the "random name" picker (added to cut down on spammy custom names).
create table if not exists pb_users (
  id uuid primary key,
  display_name text not null,
  name_type text not null check (name_type in ('custom', 'random')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ── Room sessions (one row per join→leave) ──────────────────────────────
create table if not exists pb_room_sessions (
  id uuid primary key,
  user_id uuid not null references pb_users (id) on delete cascade,
  room_id text not null references pb_rooms (id),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists pb_room_sessions_user_idx on pb_room_sessions (user_id);
create index if not exists pb_room_sessions_room_idx on pb_room_sessions (room_id, joined_at);

-- ── Generic event log (the "track everything" table) ────────────────────
-- Every meaningful client action lands here: page views, name chosen,
-- room join/leave, poll answered, pomodoro phase seen, track played, etc.
-- Not selectable by the anon key — this is for the site owner to query via
-- the SQL editor / a dashboard, not for other visitors to read.
create table if not exists pb_events (
  id bigserial primary key,
  user_id uuid references pb_users (id) on delete set null,
  device_session_id uuid,
  event_name text not null,
  room_id text references pb_rooms (id),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pb_events_name_idx on pb_events (event_name, created_at);
create index if not exists pb_events_room_idx on pb_events (room_id, created_at);

-- ── Pomodoro cycle helper ────────────────────────────────────────────────
-- 30 min focus + 3 min break = 1980s cycle. cycle_key is the same number
-- for every client on Earth at the same moment — no per-room "start time"
-- needs to be stored, so every device just derives it from wall-clock time.
create or replace function pb_current_cycle_key()
returns bigint
language sql
stable
as $$
  select floor(extract(epoch from now()) / 1980)::bigint;
$$;

-- ── Chat (break-only, auto-deleted after each break) ────────────────────
-- Chat is only meant to be open during the 3-minute break window; the
-- client hides the input during focus blocks. Messages are tagged with the
-- cycle they were sent in, and the delete policy below only allows removing
-- rows from a cycle that has already ended (i.e. the client clearing out
-- the *previous* break's chat once a new focus block starts) — never the
-- live one.
create table if not exists pb_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references pb_rooms (id),
  user_id uuid not null references pb_users (id) on delete cascade,
  display_name text not null,
  body text not null check (char_length(body) between 1 and 240),
  cycle_key bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists pb_chat_messages_room_cycle_idx on pb_chat_messages (room_id, cycle_key, created_at);

-- ── Poll responses ("did you focus the last 30 minutes?") ───────────────
-- One vote per user per cycle, enforced by the unique constraint —
-- resubmitting just changes the vote (client uses upsert).
create table if not exists pb_poll_responses (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references pb_rooms (id),
  user_id uuid not null references pb_users (id) on delete cascade,
  cycle_key bigint not null,
  response text not null check (response in ('yes', 'partial', 'no')),
  created_at timestamptz not null default now(),
  unique (room_id, user_id, cycle_key)
);

create index if not exists pb_poll_responses_room_cycle_idx on pb_poll_responses (room_id, cycle_key);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table pb_rooms enable row level security;
alter table pb_users enable row level security;
alter table pb_room_sessions enable row level security;
alter table pb_events enable row level security;
alter table pb_chat_messages enable row level security;
alter table pb_poll_responses enable row level security;

-- Rooms: public read-only catalog.
drop policy if exists "rooms are publicly readable" on pb_rooms;
create policy "rooms are publicly readable" on pb_rooms
  for select using (true);

-- Users: anyone can create/update their own device row. There's no auth to
-- scope this to "your own row only" — accepted trade-off of a login-free
-- app; the data here is just a chosen display name, nothing sensitive.
drop policy if exists "anyone can upsert a user row" on pb_users;
create policy "anyone can upsert a user row" on pb_users
  for insert with check (true);

drop policy if exists "anyone can update a user row" on pb_users;
create policy "anyone can update a user row" on pb_users
  for update using (true);

drop policy if exists "users are publicly readable" on pb_users;
create policy "users are publicly readable" on pb_users
  for select using (true);

-- Room sessions: public insert/update (start/stop a session), public read
-- (used for headcounts / future "studied the most" features).
drop policy if exists "anyone can log a session" on pb_room_sessions;
create policy "anyone can log a session" on pb_room_sessions
  for insert with check (true);

drop policy if exists "anyone can close a session" on pb_room_sessions;
create policy "anyone can close a session" on pb_room_sessions
  for update using (true);

drop policy if exists "sessions are publicly readable" on pb_room_sessions;
create policy "sessions are publicly readable" on pb_room_sessions
  for select using (true);

-- Events: write-only from the client. No public select — keeps the event
-- stream from being scraped by other visitors' anon keys.
drop policy if exists "anyone can log an event" on pb_events;
create policy "anyone can log an event" on pb_events
  for insert with check (true);

-- Chat: public read + insert (constrained by the CHECK on body length).
-- Delete is restricted to rows from a cycle that has already ended, so a
-- client can only clear out a *finished* break's chat, never the live one.
drop policy if exists "chat is publicly readable" on pb_chat_messages;
create policy "chat is publicly readable" on pb_chat_messages
  for select using (true);

drop policy if exists "anyone can send a chat message" on pb_chat_messages;
create policy "anyone can send a chat message" on pb_chat_messages
  for insert with check (true);

drop policy if exists "only past-cycle chat can be deleted" on pb_chat_messages;
create policy "only past-cycle chat can be deleted" on pb_chat_messages
  for delete using (cycle_key < pb_current_cycle_key());

-- Poll responses: public read + insert/update (upsert-your-vote).
drop policy if exists "poll results are publicly readable" on pb_poll_responses;
create policy "poll results are publicly readable" on pb_poll_responses
  for select using (true);

drop policy if exists "anyone can vote" on pb_poll_responses;
create policy "anyone can vote" on pb_poll_responses
  for insert with check (true);

drop policy if exists "anyone can change their vote" on pb_poll_responses;
create policy "anyone can change their vote" on pb_poll_responses
  for update using (true);

-- ── Realtime ──────────────────────────────────────────────────────────
-- Broadcast/Presence need no publication setup, but table-backed live chat
-- and poll tallies need their tables added to the realtime publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pb_chat_messages'
  ) then
    alter publication supabase_realtime add table pb_chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pb_poll_responses'
  ) then
    alter publication supabase_realtime add table pb_poll_responses;
  end if;
end $$;
