import { useEffect, useRef, useState } from "react";
import { fetchOpenAnswers, saveOpenAnswer, useStore } from "../lib/store";
import { go } from "../lib/router";
import type { OpenQuestion } from "../lib/types";

export default function OpenPage({ scope }: { scope: string }) {
  const { chapters, openQuestions } = useStore();
  const chapter = scope === "all" ? null : Number(scope);
  const [answers, setAnswers] = useState<Map<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOpenAnswers().then(setAnswers, (e: Error) => setError(e.message));
  }, []);

  const list = openQuestions.filter((o) => chapter === null || o.chapter === chapter);

  return (
    <div className="stack">
      <section className="card">
        <h1>Open-ended questions</h1>
        <p className="muted">
          Write your own answer first, then compare it with the model answer. Your answers are saved to your account
          automatically.
        </p>
        <div className="row wrap">
          <button className={chapter === null ? "primary" : ""} onClick={() => go("/open/all")}>
            All
          </button>
          {chapters
            .filter((c) => openQuestions.some((o) => o.chapter === c.chapter))
            .map((c) => (
              <button
                key={c.chapter}
                className={chapter === c.chapter ? "primary" : ""}
                onClick={() => go(`/open/${c.chapter}`)}
              >
                Ch. {c.chapter}
              </button>
            ))}
        </div>
      </section>
      {error && <p className="error">{error}</p>}
      {!answers && !error && <div className="center muted">Loading…</div>}
      {answers && list.map((o) => <OpenCard key={o.id} o={o} initial={answers.get(o.id) ?? ""} />)}
    </div>
  );
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

  return (
    <section className="card">
      <div className="q-meta">
        <span className="badge">
          Ch. {o.chapter} · Short question {o.num}
        </span>
        <span className="small muted">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved!" : ""}
        </span>
      </div>
      <p className="q-text">{o.question}</p>
      <textarea rows={7} placeholder="Your answer…" value={text} onChange={(e) => onChange(e.target.value)} />
      <button onClick={() => setShow((s) => !s)}>{show ? "Hide model answer" : "Show model answer"}</button>
      {show && (
        <div className="model">
          <p className="small muted">Possible answer</p>
          <p>{o.model_answer}</p>
        </div>
      )}
    </section>
  );
}
