-- Part C of the midterm: a reflection question that belongs to no single chapter
alter table public.open_questions alter column chapter drop not null;
alter table public.open_questions add column if not exists part text not null default 'B' check (part in ('B','C'));
