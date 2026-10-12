import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { CardState, Chapter, OpenQuestion, Question, TestResult } from "./types";

interface Store {
  loading: boolean;
  error: string | null;
  chapters: Chapter[];
  questions: Question[];
  openQuestions: OpenQuestion[];
  cards: Map<string, CardState>;
  saveCard: (card: CardState) => Promise<void>;
  resetChapter: (chapter: number | null) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const CARD_COLS = "question_id, ease, interval_days, reps, lapses, due_at, last_reviewed, last_correct";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [cards, setCards] = useState<Map<string, CardState>>(new Map());

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ch, qs, oq, cs] = await Promise.all([
      supabase.from("chapters").select("*").order("chapter"),
      supabase.from("questions").select("*").order("chapter").order("num"),
      supabase.from("open_questions").select("*").order("chapter").order("num"),
      supabase.from("card_state").select(CARD_COLS),
    ]);
    const err = ch.error ?? qs.error ?? oq.error ?? cs.error;
    if (err) {
      setError(err.message);
    } else {
      setChapters(ch.data as Chapter[]);
      setQuestions(qs.data as Question[]);
      setOpenQuestions(oq.data as OpenQuestion[]);
      setCards(new Map((cs.data as CardState[]).map((c) => [c.question_id, c])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveCard = useCallback(async (card: CardState) => {
    setCards((prev) => new Map(prev).set(card.question_id, card));
    const { error } = await supabase.from("card_state").upsert(card, { onConflict: "user_id,question_id" });
    if (error) console.error("saving card failed", error);
  }, []);

  const resetChapter = useCallback(
    async (chapter: number | null) => {
      const ids = questions.filter((q) => chapter === null || q.chapter === chapter).map((q) => q.id);
      const { error } = await supabase.from("card_state").delete().in("question_id", ids);
      if (error) throw error;
      setCards((prev) => {
        const next = new Map(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    },
    [questions],
  );

  const value = useMemo(
    () => ({ loading, error, chapters, questions, openQuestions, cards, saveCard, resetChapter, reload }),
    [loading, error, chapters, questions, openQuestions, cards, saveCard, resetChapter, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export async function fetchTests(): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("id, created_at, score, total, duration_sec, details")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as TestResult[];
}

export async function saveTest(r: Omit<TestResult, "id" | "created_at">): Promise<void> {
  const { error } = await supabase.from("test_results").insert(r);
  if (error) throw error;
}

export async function fetchOpenAnswers(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("open_answers").select("open_id, answer");
  if (error) throw error;
  return new Map(data.map((r) => [r.open_id as string, r.answer as string]));
}

export async function saveOpenAnswer(openId: string, answer: string): Promise<void> {
  const { error } = await supabase
    .from("open_answers")
    .upsert({ open_id: openId, answer, updated_at: new Date().toISOString() }, { onConflict: "user_id,open_id" });
  if (error) throw error;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
