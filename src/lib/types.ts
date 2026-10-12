export type Letter = "A" | "B" | "C" | "D";
export const LETTERS: Letter[] = ["A", "B", "C", "D"];

export interface Chapter {
  chapter: number;
  title: string;
  scenarios: Record<string, string>;
}

export interface Question {
  id: string;
  chapter: number;
  num: number;
  scenario: string | null;
  question: string;
  options: string[];
  answer: Letter;
  marked: string | null;
  note: string | null;
}

export interface OpenQuestion {
  id: string;
  chapter: number;
  num: number;
  question: string;
  model_answer: string;
}

export interface CardState {
  question_id: string;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: string;
  last_reviewed: string | null;
  last_correct: boolean | null;
}

export interface TestResult {
  id: number;
  created_at: string;
  score: number;
  total: number;
  duration_sec: number | null;
  details: { id: string; chosen: Letter | null; correct: Letter }[];
}

/** True when our answer differs from what was circled on the class sheet. */
export function isCorrected(q: Question): boolean {
  return q.marked !== null && q.marked !== q.answer;
}
