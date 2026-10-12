import type { CardState } from "./types";

// Anki-style scheduling (simplified SM-2).
// A wrong answer is always "again"; a right answer is rated hard / good / easy.
export type Rating = "again" | "hard" | "good" | "easy";

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

export const MASTERED_DAYS = 21;

export function newCard(questionId: string): CardState {
  return {
    question_id: questionId,
    ease: 2.5,
    interval_days: 0,
    reps: 0,
    lapses: 0,
    due_at: new Date().toISOString(),
    last_reviewed: null,
    last_correct: null,
  };
}

/** Next interval in days for a rating (fractions of a day = learning steps). */
export function nextInterval(card: CardState, rating: Rating): number {
  if (rating === "again") return 1 / (24 * 60); // 1 minute
  if (card.reps === 0 || card.interval_days < 1) {
    // learning phase
    if (rating === "hard") return 10 / (24 * 60); // 10 minutes
    if (rating === "good") return 1;
    return 4;
  }
  const ivl = card.interval_days;
  if (rating === "hard") return Math.max(ivl * 1.2, ivl + 1);
  if (rating === "good") return Math.max(ivl * card.ease, ivl + 1);
  return Math.max(ivl * card.ease * 1.3, ivl + 2);
}

export function schedule(card: CardState, rating: Rating, now = new Date()): CardState {
  const interval = nextInterval(card, rating);
  let ease = card.ease;
  if (rating === "again") ease -= 0.2;
  if (rating === "hard") ease -= 0.15;
  if (rating === "easy") ease += 0.15;
  ease = Math.min(3.0, Math.max(1.3, ease));
  return {
    ...card,
    ease,
    interval_days: interval,
    reps: rating === "again" ? 0 : card.reps + 1,
    lapses: rating === "again" && card.reps > 0 ? card.lapses + 1 : card.lapses,
    due_at: new Date(now.getTime() + interval * DAY).toISOString(),
    last_reviewed: now.toISOString(),
    last_correct: rating !== "again",
  };
}

/** Learning steps under a day are repeated within the same session. */
export function repeatsInSession(card: CardState): boolean {
  return card.interval_days < 1;
}

export function formatInterval(days: number): string {
  const mins = Math.round(days * 24 * 60);
  if (mins < 60) return `${mins} min`;
  if (days < 1) return `${Math.round(mins / 60)} h`;
  if (days < 30) return `${Math.round(days)} d`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} y`;
}

export type CardStatus = "new" | "learning" | "review" | "mastered";

export function cardStatus(card: CardState | undefined): CardStatus {
  if (!card || !card.last_reviewed) return "new";
  if (card.interval_days < 1) return "learning";
  if (card.interval_days >= MASTERED_DAYS) return "mastered";
  return "review";
}

export function isDue(card: CardState | undefined, now = Date.now()): boolean {
  return !!card && !!card.last_reviewed && new Date(card.due_at).getTime() <= now;
}
