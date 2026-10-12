import { useEffect, useState } from "react";
import { fetchTests, useStore } from "../lib/store";
import { go } from "../lib/router";
import type { Question, TestResult } from "../lib/types";
import { TestReview } from "./TestPage";

export default function TestHistoryPage({ openId }: { openId?: string }) {
  const { questions } = useStore();
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTests().then(setTests, (e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!tests) return <div className="center muted">Loading…</div>;

  const open = tests.find((t) => String(t.id) === openId);
  if (open) {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const qs = open.details.map((d) => byId.get(d.id)).filter((q): q is Question => !!q);
    const answers = open.details.filter((d) => byId.has(d.id)).map((d) => d.chosen);
    return (
      <div className="stack">
        <button className="ghost" onClick={() => go("/test/history")}>
          ← All results
        </button>
        <h1>
          {open.score} / {open.total}
        </h1>
        <TestReview questions={qs} answers={answers} />
      </div>
    );
  }

  const avg = tests.length ? Math.round((tests.reduce((s, t) => s + t.score / t.total, 0) / tests.length) * 100) : 0;

  return (
    <div className="stack">
      <section className="card">
        <div className="row between">
          <h1>Test results</h1>
          <button className="primary" onClick={() => go("/test")}>
            New test
          </button>
        </div>
        {tests.length === 0 ? (
          <p className="muted">No tests taken yet.</p>
        ) : (
          <p className="muted">
            {tests.length} test(s) · average {avg}%
          </p>
        )}
      </section>
      {tests.map((t) => {
        const pct = Math.round((t.score / t.total) * 100);
        return (
          <button key={t.id} className="card result-row" onClick={() => go(`/test/history/${t.id}`)}>
            <span>{new Date(t.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
            <span className={pct >= 80 ? "ok" : pct >= 60 ? "" : "error"}>
              <b>
                {t.score}/{t.total}
              </b>{" "}
              ({pct}%)
            </span>
          </button>
        );
      })}
    </div>
  );
}
