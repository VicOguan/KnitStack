-- KnitStack: one row of saved progress per user.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  done       jsonb not null default '{}'::jsonb,   -- {"RF-1@js": true, "KS-101@py": true, ...}
  drafts     jsonb not null default '{}'::jsonb,   -- lab drafts, keyed by "KS-101/cart.js"
  rf_drafts  jsonb not null default '{}'::jsonb,   -- refresher drafts, keyed by "RF-1@js"
  lang       text,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Each person can read and write only their own row.
create policy "read own progress"   on public.progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own progress" on public.progress for delete using (auth.uid() = user_id);

-- Keep rows a sensible size (drafts are small text files).
alter table public.progress add constraint progress_size check (pg_column_size(drafts) + pg_column_size(rf_drafts) < 512000);
