-- Answers that could not be verified with certainty (shown with an "unsure" badge in the app)
alter table public.questions add column if not exists unsure boolean not null default false;
