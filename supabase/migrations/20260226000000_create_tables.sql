-- ============================================================
-- Resume Matcher — initial schema
-- ============================================================
-- Run via: supabase db push  (or paste into the Supabase SQL editor)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- profiles
--
-- One row per authenticated user.
-- Tracks daily analysis usage for rate-limiting (max 5/day).
-- Created automatically via trigger when a user signs up.
-- ────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid     not null,
  email       text     not null,
  daily_count integer  not null default 0 check (daily_count >= 0),
  -- Date the daily_count was last reset; compared against CURRENT_DATE
  last_reset  date     not null default current_date,

  constraint profiles_pkey    primary key (id),
  constraint profiles_user_fk foreign key (id)
    references auth.users (id) on delete cascade
);

alter table public.profiles enable row level security;

-- Users may only see their own profile row
create policy "profiles: select own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users may create their own profile row (edge-case fallback;
-- the trigger below handles the normal path)
create policy "profiles: insert own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users may update their own profile row
-- (the API route upserts daily_count + last_reset)
create policy "profiles: update own"
  on public.profiles
  for update
  using     (auth.uid() = id)
  with check (auth.uid() = id);


-- ────────────────────────────────────────────────────────────
-- analyses
--
-- One row per resume ↔ job-description analysis.
-- score is a clamped integer 0–100 (enforced in app + DB).
-- matched_skills / missing_skills are text arrays from Claude.
-- ────────────────────────────────────────────────────────────

create table public.analyses (
  id             uuid        not null default gen_random_uuid(),
  user_id        uuid        not null,
  resume_text    text        not null,
  jd_text        text        not null,
  score          smallint    not null check (score >= 0 and score <= 100),
  matched_skills text[]      not null default '{}',
  missing_skills text[]      not null default '{}',
  summary        text        not null default '',
  created_at     timestamptz not null default now(),

  constraint analyses_pkey    primary key (id),
  constraint analyses_user_fk foreign key (user_id)
    references auth.users (id) on delete cascade
);

alter table public.analyses enable row level security;

-- Users may only read their own analyses
create policy "analyses: select own"
  on public.analyses
  for select
  using (auth.uid() = user_id);

-- Users may insert analyses for themselves only
create policy "analyses: insert own"
  on public.analyses
  for insert
  with check (auth.uid() = user_id);

-- Users may delete their own analyses (e.g. future dashboard feature)
create policy "analyses: delete own"
  on public.analyses
  for delete
  using (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────

-- Dashboard query: all analyses for a user, newest first
create index analyses_user_created_idx
  on public.analyses (user_id, created_at desc);


-- ────────────────────────────────────────────────────────────
-- Trigger: auto-create profile on sign-up
--
-- Fires after a row is inserted into auth.users so that every
-- new user immediately has a profiles row. The API rate-limit
-- logic depends on this row existing.
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, daily_count, last_reset)
  values (new.id, new.email, 0, current_date)
  on conflict (id) do nothing; -- idempotent: skip if row already exists
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
