import { useState } from "react";
import { useStore } from "../lib/store";
import { cardStatus } from "../lib/srs";
import { go } from "../lib/router";
import { isCorrected, LETTERS } from "../lib/types";

export default function BrowsePage({ scope }: { scope: string }) {
  const { chapters, questions, cards, resetChapter } = useStore();
  const chapter = scope === "all" ? null : Number(scope);
  const [filter, setFilter] = useState<"all" | "corrected" | "unmarked">("all");
  const [hideAnswers, setHideAnswers] = useState(false);

  const list = questions
    .filter((q) => chapter === null || q.chapter === chapter)
    .filter((q) => filter === "all" || (filter === "corrected" ? isCorrected(q) : q.marked === null));

  async function reset() {
    const label = chapter === null ? "ALL chapters" : `chapter ${chapter}`;
    if (!confirm(`Reset your learning progress for ${label}? This cannot be undone.`)) return;
    try {
      await resetChapter(chapter);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h1>Question catalog</h1>
        <p className="muted">
          All questions with the answers used in this app.{" "}
          <span className="pill corrected">corrected</span> = differs from what was circled in class;{" "}
          <span className="pill">not marked</span> = nothing was circled, answer researched.
        </p>
        <div className="row wrap">
          <button className={chapter === null ? "primary" : ""} onClick={() => go("/browse/all")}>
            All
          </button>
          {chapters.map((c) => (
            <button
              key={c.chapter}
              className={chapter === c.chapter ? "primary" : ""}
              onClick={() => go(`/browse/${c.chapter}`)}
            >
              Ch. {c.chapter}
            </button>
          ))}
        </div>
        <div className="row wrap">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All questions</option>
            <option value="corrected">Only corrected answers</option>
            <option value="unmarked">Only not-marked-in-class</option>
          </select>
          <label className="check">
            <input type="checkbox" checked={hideAnswers} onChange={(e) => setHideAnswers(e.target.checked)} /> hide answers
          </label>
          <button className="ghost small" onClick={() => void reset()}>
            Reset progress{chapter === null ? "" : ` (Ch. ${chapter})`}
          </button>
        </div>
        <p className="small muted">{list.length} questions</p>
      </section>

      {list.map((q) => {
        const sc = q.scenario ? chapters.find((c) => c.chapter === q.chapter)?.scenarios[q.scenario] : null;
        return (
          <details key={q.id} className="card browse-item">
            <summary>
              <span className="badge">
                {q.chapter}.{q.num}
              </span>
              <span className="grow">{q.question}</span>
              {isCorrected(q) && <span className="pill corrected">corrected</span>}
              {q.marked === null && <span className="pill">not marked</span>}
              <span className={`dot ${cardStatus(cards.get(q.id))}`} title={cardStatus(cards.get(q.id))} />
            </summary>
            {sc && (
              <p className="small muted scenario-inline">
                <b>Scenario – {q.scenario}:</b> {sc}
              </p>
            )}
            <ol className="browse-options">
              {q.options.map((o, i) => (
                <li key={i} className={!hideAnswers && LETTERS[i] === q.answer ? "correct" : ""}>
                  <b>{LETTERS[i]})</b> {o}
                </li>
              ))}
            </ol>
            {!hideAnswers && q.note && <p className={`note small ${isCorrected(q) ? "warn" : ""}`}>{q.note}</p>}
          </details>
        );
      })}
    </div>
  );
}
