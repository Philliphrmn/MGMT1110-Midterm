import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QuestionView from "../components/QuestionView";
import { useStore } from "../lib/store";
import { formatInterval, isDue, newCard, nextInterval, repeatsInSession, schedule, type Rating } from "../lib/srs";
import { go } from "../lib/router";
import { LETTERS, type Letter, type Question } from "../lib/types";

const NEW_PER_SESSION = 20;
const AGAIN_GAP = 3; // a missed card comes back after this many other cards

interface Props {
  scope: string; // "all" or chapter number
  mode: "srs" | "practice";
}

export default function StudyPage({ scope, mode }: Props) {
  const { questions, cards, saveCard, chapters } = useStore();
  const chapter = scope === "all" ? null : Number(scope);
  const pool = useMemo(
    () => questions.filter((q) => chapter === null || q.chapter === chapter),
    [questions, chapter],
  );

  const [extraNew, setExtraNew] = useState(0);
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [chosen, setChosen] = useState<Letter | null>(null);
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const startedRef = useRef(false);

  // Build the session queue once (or again when the user asks for more new cards).
  useEffect(() => {
    if (startedRef.current && extraNew === 0) return;
    startedRef.current = true;
    if (mode === "practice") {
      setQueue(pool);
      return;
    }
    const now = Date.now();
    const due = pool
      .filter((q) => isDue(cards.get(q.id), now))
      .sort((a, b) => cards.get(a.id)!.due_at.localeCompare(cards.get(b.id)!.due_at));
    const fresh = pool.filter((q) => !cards.get(q.id)?.last_reviewed).slice(0, NEW_PER_SESSION + extraNew);
    setQueue([...due, ...fresh]);
  }, [mode, pool, extraNew]);

  const current = queue?.[0] ?? null;
  const revealed = chosen !== null;
  const correct = current !== null && chosen === current.answer;
  const card = current ? (cards.get(current.id) ?? newCard(current.id)) : null;

  const advance = useCallback(
    (requeue: boolean, gap = AGAIN_GAP) => {
      setQueue((q) => {
        if (!q || q.length === 0) return q;
        const [head, ...rest] = q;
        if (requeue) rest.splice(Math.min(gap, rest.length), 0, head);
        return rest;
      });
      setChosen(null);
    },
    [],
  );

  const choose = useCallback(
    (l: Letter) => {
      if (!current || chosen) return;
      setChosen(l);
      setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (l === current.answer ? 1 : 0) }));
    },
    [current, chosen],
  );

  const rate = useCallback(
    (r: Rating) => {
      if (!current || !card) return;
      if (mode === "practice") {
        // wrong answers come back at the end of the round
        advance(r === "again", Number.MAX_SAFE_INTEGER);
        return;
      }
      const next = schedule(card, r);
      void saveCard(next);
      const again = repeatsInSession(next);
      advance(again, r === "again" ? AGAIN_GAP : AGAIN_GAP * 3);
    },
    [current, card, mode, saveCard, advance],
  );

  // Keyboard: 1-4 / a-d to answer; then Enter = continue/good, 1/2/3 = hard/good/easy.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (!revealed) {
        const idx = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
        if (idx >= 0 && idx < (current?.options.length ?? 0)) choose(LETTERS[idx]);
        return;
      }
      if (!correct || mode === "practice") {
        if (k === "enter" || k === " ") {
          e.preventDefault();
          rate(correct ? "good" : "again");
        }
        return;
      }
      if (k === "1") rate("hard");
      else if (k === "2" || k === "enter" || k === " ") {
        e.preventDefault();
        rate("good");
      } else if (k === "3") rate("easy");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, correct, current, mode, choose, rate]);

  const title =
    (mode === "practice" ? "Go through all · " : "Learn · ") +
    (chapter === null ? "All chapters" : `Chapter ${chapter}: ${chapters.find((c) => c.chapter === chapter)?.title ?? ""}`);

  if (!queue) return null;

  if (!current) {
    const remainingNew = pool.filter((q) => !cards.get(q.id)?.last_reviewed).length;
    const nextDue = pool
      .map((q) => cards.get(q.id))
      .filter((c) => c?.last_reviewed)
      .map((c) => new Date(c!.due_at).getTime())
      .sort((a, b) => a - b)[0];
    return (
      <div className="card done">
        <h2>{stats.answered === 0 ? "Nothing due right now 🎉" : "Session complete 🎉"}</h2>
        {stats.answered > 0 && (
          <p>
            {stats.correct} / {stats.answered} answered correctly (
            {Math.round((stats.correct / stats.answered) * 100)}%).
          </p>
        )}
        {mode === "srs" && nextDue && (
          <p className="muted">
            Next review due {new Date(nextDue).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.
          </p>
        )}
        <div className="row wrap center-row">
          {mode === "srs" && remainingNew > 0 && (
            <button className="primary" onClick={() => setExtraNew((n) => n + NEW_PER_SESSION)}>
              Learn {Math.min(NEW_PER_SESSION, remainingNew)} more new questions
            </button>
          )}
          {mode === "srs" && (
            <button onClick={() => go(`/practice/${scope}`)}>Go through all questions anyway</button>
          )}
          <button className="ghost" onClick={() => go("/")}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const newLeft = mode === "srs" ? queue.filter((q) => !cards.get(q.id)?.last_reviewed).length : 0;
  const reviewLeft = queue.length - newLeft;

  return (
    <div className="stack">
      <div className="session-head">
        <h2>{title}</h2>
        <div className="row small">
          {mode === "srs" ? (
            <>
              <span className="pill new">{newLeft} new</span>
              <span className="pill due">{reviewLeft} review</span>
            </>
          ) : (
            <span className="pill">{queue.length} left</span>
          )}
          <span className="muted">
            {stats.correct}/{stats.answered} correct
          </span>
        </div>
      </div>

      <div className="card">
        <QuestionView q={current} chosen={chosen} revealed={revealed} onChoose={revealed ? undefined : choose} />

        {revealed && (
          <div className="answer-bar">
            <p className={correct ? "ok" : "error"}>
              {correct ? "Correct!" : `Wrong – the answer is ${current.answer}.`}
            </p>
            {mode === "srs" && correct ? (
              <div className="ratings">
                {(["hard", "good", "easy"] as const).map((r, i) => (
                  <button key={r} className={r === "good" ? "primary" : ""} onClick={() => rate(r)}>
                    <span>{r[0].toUpperCase() + r.slice(1)}</span>
                    <small>
                      {formatInterval(nextInterval(card!, r))} · {i + 1}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <button className="primary" onClick={() => rate(correct ? "good" : "again")}>
                Continue <small>(Enter)</small>
              </button>
            )}
          </div>
        )}
      </div>
      {!revealed && <p className="small muted center-text desktop-only">Tip: press 1–4 or A–D to answer.</p>}
    </div>
  );
}
