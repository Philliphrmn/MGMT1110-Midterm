-- Content tables (readable by signed-in users only)
create table public.chapters (
  chapter int primary key,
  title text not null,
  scenarios jsonb not null default '{}'::jsonb
);

create table public.questions (
  id text primary key,                -- e.g. "c1-q07"
  chapter int not null references public.chapters(chapter) on delete cascade,
  num int not null,
  scenario text,
  question text not null,
  options jsonb not null,             -- ["...", "...", "...", "..."] = A-D
  answer char(1) not null check (answer in ('A','B','C','D')),
  marked text,                        -- what was circled on the class sheet (null = nothing)
  note text,
  unique (chapter, num)
);

create table public.open_questions (
  id text primary key,                -- e.g. "c1-o1"
  chapter int not null references public.chapters(chapter) on delete cascade,
  num int not null,
  question text not null,
  model_answer text not null,
  unique (chapter, num)
);

-- Per-user learning state
create table public.card_state (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  ease real not null default 2.5,
  interval_days real not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed timestamptz,
  last_correct boolean,
  primary key (user_id, question_id)
);

create table public.test_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  score int not null,
  total int not null,
  duration_sec int,
  details jsonb not null default '[]'::jsonb   -- [{id, chosen, correct}]
);

create table public.open_answers (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  open_id text not null references public.open_questions(id) on delete cascade,
  answer text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, open_id)
);

create index on public.card_state (user_id, due_at);
create index on public.card_state (question_id);
create index on public.test_results (user_id, created_at desc);
create index on public.open_answers (open_id);
create index on public.questions (chapter);
create index on public.open_questions (chapter);

alter table public.chapters enable row level security;
alter table public.questions enable row level security;
alter table public.open_questions enable row level security;
alter table public.card_state enable row level security;
alter table public.test_results enable row level security;
alter table public.open_answers enable row level security;

create policy "read chapters" on public.chapters for select to authenticated using (true);
create policy "read questions" on public.questions for select to authenticated using (true);
create policy "read open questions" on public.open_questions for select to authenticated using (true);

create policy "own cards select" on public.card_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "own cards insert" on public.card_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own cards update" on public.card_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own cards delete" on public.card_state for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own tests select" on public.test_results for select to authenticated using ((select auth.uid()) = user_id);
create policy "own tests insert" on public.test_results for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own tests delete" on public.test_results for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own open select" on public.open_answers for select to authenticated using ((select auth.uid()) = user_id);
create policy "own open insert" on public.open_answers for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own open update" on public.open_answers for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own open delete" on public.open_answers for delete to authenticated using ((select auth.uid()) = user_id);
