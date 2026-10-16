import { useEffect, useMemo, useRef, useState } from "react";
import { fetchOpenAnswers, saveOpenAnswer, shuffle, useStore } from "../lib/store";
import { go } from "../lib/router";
import { EXAM, isPartBChapter } from "../lib/exam";
import type { OpenQuestion } from "../lib/types";

export default function OpenPage({ scope }: { scope: string }) {
  const { chapters, openQuestions } = useStore();
  const chapter = scope === "all" || scope === "exam" || scope === "c" ? null : Number(scope);
  const [answers, setAnswers] = useState<Map<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<string[] | null>(null);

  useEffect(() => {
    fetchOpenAnswers().then(setAnswers, (e: Error) => setError(e.message));
  }, []);

  const partB = openQuestions.filter((o) => o.part === "B");
  const partC = openQuestions.filter((o) => o.part === "C");
  const examPool = partB.filter((o) => isPartBChapter(o.chapter));

  const list = useMemo(() => {
    if (drawn) return drawn.map((id) => partB.find((o) => o.id === id)!).filter(Boolean);
    if (scope === "c") return [];
    if (scope === "exam") return examPool;
    return partB.filter((o) => chapter === null || o.chapter === chapter);
  }, [drawn, scope, chapter, partB, examPool]);

  const showPartC = !drawn && (scope === "c" || scope === "exam" || scope === "all");
  const nav = (path: string) => {
    setDrawn(null);
    go(path);
  };

  return (
    <div className="stack">
      <section className="card">
        <h1>Open-ended questions</h1>
        <p className="muted">
          Write your own answer first, then compare it with the model answer. Your answers are saved to your account
          automatically.
        </p>
        <div className="exam-grid">
          <div className="exam-part">
            <h3>Part B · {EXAM.partBCount * EXAM.partBPoints} points</h3>
            <p className="small">
              {EXAM.partBCount} short questions × {EXAM.partBPoints} points – only from chapters{" "}
              {EXAM.partBChapters.join(", ")}.
            </p>
          </div>
          <div className="exam-part">
            <h3>Part C · {EXAM.partCPoints} points</h3>
            <p className="small">1 reflection: your 4 key takeaways + how they apply to your life. Word limit – be concise.</p>
          </div>
        </div>
        <div className="row wrap">
          <button className={scope === "exam" && !drawn ? "primary" : ""} onClick={() => nav("/open/exam")}>
            Midterm-relevant (Ch. {EXAM.partBChapters.join(", ")} + Part C)
          </button>
          <button
            className={drawn ? "primary" : ""}
            onClick={() => setDrawn(shuffle(examPool).slice(0, EXAM.partBCount).map((o) => o.id))}
          >
            🎲 Simulate Part B ({EXAM.partBCount} random)
          </button>
          <button className={scope === "c" && !drawn ? "primary" : ""} onClick={() => nav("/open/c")}>
            Part C
          </button>
        </div>
        <div className="row wrap">
          <button className={scope === "all" && !drawn ? "primary small" : "small"} onClick={() => nav("/open/all")}>
            All
          </button>
          {chapters
            .filter((c) => partB.some((o) => o.chapter === c.chapter))
            .map((c) => (
              <button
                key={c.chapter}
                className={chapter === c.chapter && !drawn ? "primary small" : "small"}
                onClick={() => nav(`/open/${c.chapter}`)}
              >
                Ch. {c.chapter}
                {isPartBChapter(c.chapter) ? " ★" : ""}
              </button>
            ))}
        </div>
        <p className="small muted">★ = can come up in the midterm (Part B).</p>
      </section>
      {error && <p className="error">{error}</p>}
      {!answers && !error && <div className="center muted">Loading…</div>}
      {answers && showPartC && partC.map((o) => <OpenCard key={o.id} o={o} initial={answers.get(o.id) ?? ""} />)}
      {answers && list.map((o) => <OpenCard key={o.id} o={o} initial={answers.get(o.id) ?? ""} />)}
    </div>
  );
}

function words(t: string): number {
  return t.trim() ? t.trim().split(/\s+/).length : 0;
}

function OpenCard({ o, initial }: { o: OpenQuestion; initial: string }) {
  const [text, setText] = useState(initial);
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setText(v);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveOpenAnswer(o.id, v).then(
        () => setStatus("saved"),
        () => setStatus("error"),
      );
    }, 800);
  }

  const isC = o.part === "C";

  return (
    <section className="card">
      <div className="q-meta">
        <span className="row">
          <span className="badge">{isC ? "Part C · Reflection" : `Ch. ${o.chapter} · Short question ${o.num}`}</span>
          {!isC && isPartBChapter(o.chapter) && <span className="pill exam">midterm Part B</span>}
          {!isC && !isPartBChapter(o.chapter) && <span className="pill">not in midterm</span>}
        </span>
        <span className="small muted">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved!" : ""}
        </span>
      </div>
      <p className="q-text">{o.question}</p>
      <textarea
        rows={isC ? 12 : 7}
        placeholder={isC ? "Takeaway 1 – concept – how it applies to my life…" : "Your answer…"}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="small muted wordcount">{words(text)} words</p>
      <button onClick={() => setShow((s) => !s)}>
        {show ? "Hide model answer" : isC ? "Show example answer" : "Show model answer"}
      </button>
      {show && (
        <div className="model">
          <p className="small muted">{isC ? "Example answer" : "Possible answer"}</p>
          <p>{o.model_answer}</p>
        </div>
      )}
    </section>
  );
}
