# MGMT 1110 Midterm Trainer

Learning app for the MGMT 1110 midterm question catalog (chapters 1–8).

- **Learn** – Anki-style spaced repetition per chapter or across all chapters (wrong → repeated in the session; right → Hard / Good / Easy).
- **Go through all** – every question of a chapter in order, without touching the schedule.
- **Test** – midterm simulation (Part A): 80 MC, 10 random per chapter, 0.75 points each = 60 points; plus a custom practice test.
- **Open-ended** – Part B short questions (midterm: only Ch. 1, 2, 5, 8; "simulate Part B" draws 3) and the Part C reflection (4 key takeaways) with an example answer.
- **Catalog** – all questions with answers; answers that differ from what was circled in class are flagged as *corrected* with the reasoning.

Every user has their own account (Supabase Auth, email + password) and their own progress.

## Stack

- React + TypeScript + Vite, deployed on Vercel
- Supabase (Postgres + Auth + Row Level Security), project `mgmt1110`

## Data

- `data/chN.json` – the questions of chapter N, word for word from the sheets.
  `a` = answer used in the app, `marked` = what was circled in class (`null` = nothing circled), `note` = reasoning.
- `data/open_answers.json` – model answers for the open-ended questions.
- `supabase/migrations/` – database schema.
- `supabase/seed/chN.sql` – generated upserts (`npm run seed`).

### Adding a chapter

1. Add `data/chN.json` in the same format and its model answers to `data/open_answers.json`.
2. Run `npm run seed` and execute `supabase/seed/chN.sql` in the Supabase SQL editor.
3. The app picks the new chapter up automatically; existing progress is kept.

## Development

```bash
npm install
npm run dev
```

`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` can override the built-in (publishable) project values.

## Deployment

Pushes to `main` deploy automatically to https://mgmt-1110-midterm.vercel.app (Vercel Hobby only builds commits authored by the project owner's GitHub account).
