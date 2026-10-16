import { useEffect, useMemo, useState } from "react";
import QuestionView from "../components/QuestionView";
import { saveTest, shuffle, useStore } from "../lib/store";
import { newCard, schedule } from "../lib/srs";
import { go } from "../lib/router";
import { LETTERS, type Letter, type Question } from "../lib/types";
import { EXAM, formatPoints, MC_POINTS_LABEL } from "../lib/exam";

const DEFAULT_COUNT = 30;

/** 10 random questions from every chapter, shuffled – like the real midterm (80 MC). */
function buildMidterm(questions: Question[], chapters: number[]): Question[] {
  const picked = chapters.flatMap((c) => shuffle(questions.filter((q) => q.chapter === c)).slice(0, EXAM.mcPerChapter));
  return shuffle(picked);
}

export default function TestPage() {
  const { chapters, questions } = useStore();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(chapters.map((c) => c.chapter)));
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [test, setTest] = useState<{ qs: Question[]; midterm: boolean } | null>(null);

  const available = questions.filter((q) => selected.has(q.chapter)).length;
  const midtermCount = chapters.length * EXAM.mcPerChapter;

  if (test)
    return (
      <RunningTest
        key={test.qs.map((q) => q.id).join()}
        questions={test.qs}
        midterm={test.midterm}
        onRestart={() => setTest(null)}
      />
    );

  return (
    <div className="stack">
      <section className="card">
        <h1>Midterm simulation</h1>
        <p className="muted">
          Part A exactly like the real midterm: {midtermCount} multiple-choice questions, {EXAM.mcPerChapter} from each
          chapter ({chapters.map((c) => c.chapter).join(", ")}), mixed. Each correct answer is worth {EXAM.mcPoints} points
          → {formatPoints(midtermCount * EXAM.mcPoints)} points in total. The real exam takes {EXAM.durationMin} minutes for
          Parts A–C together.
        </p>
        <div className="row wrap">
          <button className="primary" onClick={() => setTest({ qs: buildMidterm(questions, chapters.map((c) => c.chapter)), midterm: true })}>
            Start midterm simulation ({midtermCount} questions)
          </button>
          <button className="ghost" onClick={() => go("/test/history")}>
            Past results
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Custom practice test</h2>
        <p className="muted">Pick chapters and a number of random questions.</p>
        <div className="checks">
          {chapters.map((c) => (
            <label key={c.chapter} className="check">
              <input
                type="checkbox"
                checked={selected.has(c.chapter)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(c.chapter);
                  else next.delete(c.chapter);
                  setSelected(next);
                }}
              />
              Ch. {c.chapter} – {c.title}
            </label>
          ))}
        </div>
        <label className="inline">
          Number of questions
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[10, 20, 30, 40, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="row wrap">
          <button
            disabled={available === 0}
            onClick={() =>
              setTest({ qs: shuffle(questions.filter((q) => selected.has(q.chapter))).slice(0, count), midterm: false })
            }
          >
            Start practice test ({Math.min(count, available)} questions)
          </button>
        </div>
      </section>
    </div>
  );
}

function RunningTest({
  questions,
  midterm,
  onRestart,
}: {
  questions: Question[];
  midterm: boolean;
  onRestart: () => void;
}) {
  const { cards, saveCard } = useStore();
  const [answers, setAnswers] = useState<(Letter | null)[]>(() => questions.map(() => null));
  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [submitted, startedAt]);

  const score = useMemo(() => answers.filter((a, i) => a === questions[i].answer).length, [answers, questions]);
  const unanswered = answers.filter((a) => a === null).length;
  const q = questions[idx];

  async function submit() {
    if (unanswered > 0 && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    setSubmitted(true);
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    setElapsed(duration);
    // Missed questions go back into the learning queue.
    questions.forEach((qq, i) => {
      if (answers[i] !== qq.answer) void saveCard(schedule(cards.get(qq.id) ?? newCard(qq.id), "again"));
    });
    try {
      await saveTest({
        score,
        total: questions.length,
        duration_sec: duration,
        details: questions.map((qq, i) => ({ id: qq.id, chosen: answers[i], correct: qq.answer })),
      });
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  useEffect(() => {
    if (submitted) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const n = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
      if (n >= 0) setAnswers((a) => a.map((v, i) => (i === idx ? LETTERS[n] : v)));
      else if (k === "arrowright" || k === "enter") setIdx((i) => Math.min(questions.length - 1, i + 1));
      else if (k === "arrowleft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitted, idx, questions.length]);

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  if (submitted) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="stack">
        <section className="card result">
          {midterm && <span className="badge">Midterm simulation · Part A</span>}
          <h1>
            {MC_POINTS_LABEL(score, questions.length)} <span className="muted">({pct}%)</span>
          </h1>
          <p className="muted">
            {score} of {questions.length} correct · {EXAM.mcPoints} points each · Time: {mmss}. Wrong answers were added
            back to your learning queue.
          </p>
          <ChapterBreakdown questions={questions} answers={answers} />
          {saveError && <p className="error">Result could not be saved: {saveError}</p>}
          <div className="row wrap">
            <button className="primary" onClick={onRestart}>
              New test
            </button>
            <button onClick={() => go("/test/history")}>All results</button>
          </div>
        </section>
        <TestReview questions={questions} answers={answers} />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="session-head">
        <h2>
          {midterm ? "Midterm · " : ""}Question {idx + 1} / {questions.length}
        </h2>
        <div className="row small">
          <span className="pill">⏱ {mmss}</span>
          <span className="muted">{questions.length - unanswered} answered</span>
        </div>
      </div>
      <div className="card">
        <QuestionView
          q={q}
          chosen={answers[idx]}
          revealed={false}
          hideHints
          onChoose={(l) => setAnswers((a) => a.map((v, i) => (i === idx ? l : v)))}
        />
        <div className="row between">
          <button disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            ← Back
          </button>
          {idx < questions.length - 1 ? (
            <button className="primary" onClick={() => setIdx(idx + 1)}>
              Next →
            </button>
          ) : (
            <button className="primary" onClick={() => void submit()}>
              Submit test
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <div className="qgrid">
          {questions.map((_, i) => (
            <button
              key={i}
              className={`${i === idx ? "current" : ""} ${answers[i] ? "answered" : ""}`}
              onClick={() => setIdx(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button className="wide" onClick={() => void submit()}>
          Submit test
        </button>
      </div>
    </div>
  );
}

function ChapterBreakdown({ questions, answers }: { questions: Question[]; answers: (Letter | null)[] }) {
  const byChapter = new Map<number, { right: number; total: number }>();
  questions.forEach((q, i) => {
    const e = byChapter.get(q.chapter) ?? { right: 0, total: 0 };
    e.total++;
    if (answers[i] === q.answer) e.right++;
    byChapter.set(q.chapter, e);
  });
  const rows = [...byChapter.entries()].sort((a, b) => a[0] - b[0]);
  if (rows.length < 2) return null;
  return (
    <div className="breakdown">
      {rows.map(([c, e]) => (
        <div key={c} className="breakdown-row">
          <span className="small">Ch. {c}</span>
          <div className="bar grow">
            <span className="seg mastered" style={{ width: `${(e.right / e.total) * 100}%` }} />
          </div>
          <span className="small muted">
            {e.right}/{e.total}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TestReview({ questions, answers }: { questions: Question[]; answers: (Letter | null)[] }) {
  const [onlyWrong, setOnlyWrong] = useState(true);
  const items = questions.map((q, i) => ({ q, a: answers[i] })).filter(({ q, a }) => !onlyWrong || a !== q.answer);
  return (
    <section className="stack">
      <div className="row between">
        <h2>Review</h2>
        <label className="check">
          <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} /> only mistakes
        </label>
      </div>
      {items.length === 0 && <p className="muted">No mistakes – well done!</p>}
      {items.map(({ q, a }) => (
        <div key={q.id} className="card">
          <QuestionView q={q} chosen={a} revealed />
          {a === null && <p className="small error">Not answered.</p>}
        </div>
      ))}
    </section>
  );
}
