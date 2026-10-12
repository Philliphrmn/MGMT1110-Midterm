import { useState } from "react";
import { useStore } from "../lib/store";
import { isCorrected, LETTERS, type Letter, type Question } from "../lib/types";

interface Props {
  q: Question;
  chosen: Letter | null;
  /** When true, the correct answer is shown. */
  revealed: boolean;
  onChoose?: (l: Letter) => void;
  /** Hide the "corrected" badge (e.g. during a test). */
  hideHints?: boolean;
}

export default function QuestionView({ q, chosen, revealed, onChoose, hideHints }: Props) {
  const { chapters } = useStore();
  const scenarioText = q.scenario ? chapters.find((c) => c.chapter === q.chapter)?.scenarios[q.scenario] : null;
  const [showScenario, setShowScenario] = useState(true);

  return (
    <div className="question">
      <div className="q-meta">
        <span className="badge">
          Ch. {q.chapter} · Q{q.num}
        </span>
        <span className="row">
          {!hideHints && revealed && q.unsure && <span className="pill unsure">unsure</span>}
          {!hideHints && revealed && isCorrected(q) && <span className="pill corrected">corrected</span>}
        </span>
      </div>

      {scenarioText && (
        <div className="scenario">
          <button className="link small" onClick={() => setShowScenario((s) => !s)}>
            {showScenario ? "▾" : "▸"} Scenario: {q.scenario}
          </button>
          {showScenario && <p>{scenarioText}</p>}
        </div>
      )}

      <p className="q-text">{q.question}</p>

      <div className="options">
        {q.options.map((opt, i) => {
          const l = LETTERS[i];
          let cls = "option";
          if (chosen === l) cls += " chosen";
          if (revealed && l === q.answer) cls += " correct";
          if (revealed && chosen === l && l !== q.answer) cls += " wrong";
          return (
            <button key={l} className={cls} disabled={!onChoose} onClick={() => onChoose?.(l)}>
              <span className="letter">{l})</span>
              <span className="grow">{opt}</span>
              {revealed && l === q.answer && <span className="mark ok">✓</span>}
              {revealed && chosen === l && l !== q.answer && <span className="mark error">✗</span>}
            </button>
          );
        })}
      </div>

      {revealed && !hideHints && (q.note || isCorrected(q)) && (
        <div className={`note ${isCorrected(q) ? "warn" : ""}`}>
          {isCorrected(q) && (
            <p className="small">
              <b>Circled in class:</b> {q.marked} · <b>Answer used here:</b> {q.answer}
            </p>
          )}
          {q.note && <p className="small">{q.note}</p>}
        </div>
      )}
    </div>
  );
}
