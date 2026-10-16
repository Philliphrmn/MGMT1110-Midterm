import { useMemo } from "react";
import { useStore } from "../lib/store";
import { cardStatus, isDue, type CardStatus } from "../lib/srs";
import { go } from "../lib/router";
import { EXAM, formatPoints, isPartBChapter } from "../lib/exam";

type Counts = Record<CardStatus, number> & { due: number; total: number };

export default function HomePage() {
  const { chapters, questions, cards, openQuestions } = useStore();

  const stats = useMemo(() => {
    const now = Date.now();
    const per = new Map<number | "all", Counts>();
    const blank = (): Counts => ({ new: 0, learning: 0, review: 0, mastered: 0, due: 0, total: 0 });
    per.set("all", blank());
    chapters.forEach((c) => per.set(c.chapter, blank()));
    for (const q of questions) {
      const card = cards.get(q.id);
      for (const key of [q.chapter, "all"] as const) {
        const s = per.get(key)!;
        s[cardStatus(card)]++;
        s.total++;
        if (isDue(card, now)) s.due++;
      }
    }
    return per;
  }, [chapters, questions, cards]);

  const all = stats.get("all")!;
  const seen = all.total - all.new;

  return (
    <div className="stack">
      <section className="card hero">
        <div>
          <h1>Your progress</h1>
          <p className="muted">
            {seen} of {all.total} questions studied · {all.mastered} mastered · {all.due} due for review
          </p>
          <Bar c={all} />
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={() => go("/study/all")}>
            Learn all chapters
          </button>
          <button onClick={() => go("/test")}>Midterm simulation ({chapters.length * EXAM.mcPerChapter} MC)</button>
        </div>
      </section>

      <section className="card">
        <h2>Midterm structure</h2>
        <p className="muted small">{EXAM.durationMin} minutes · 100 points in total</p>
        <div className="exam-grid">
          <button className="exam-part" onClick={() => go("/test")}>
            <h3>Part A · {formatPoints(chapters.length * EXAM.mcPerChapter * EXAM.mcPoints)} pts</h3>
            <p className="small">
              {chapters.length * EXAM.mcPerChapter} multiple choice, {EXAM.mcPerChapter} per chapter (Ch.{" "}
              {chapters.map((c) => c.chapter).join(", ")}), {EXAM.mcPoints} pts each.
            </p>
          </button>
          <button className="exam-part" onClick={() => go("/open/exam")}>
            <h3>Part B · {EXAM.partBCount * EXAM.partBPoints} pts</h3>
            <p className="small">
              {EXAM.partBCount} short questions × {EXAM.partBPoints} pts – only Ch. {EXAM.partBChapters.join(", ")}.
            </p>
          </button>
          <button className="exam-part" onClick={() => go("/open/c")}>
            <h3>Part C · {EXAM.partCPoints} pts</h3>
            <p className="small">Reflection: your 4 key takeaways and how they apply to your life. Keep it concise.</p>
          </button>
        </div>
      </section>

      <h2>Chapters</h2>
      <div className="grid">
        {chapters.map((ch) => {
          const s = stats.get(ch.chapter)!;
          const openCount = openQuestions.filter((o) => o.chapter === ch.chapter).length;
          const partB = isPartBChapter(ch.chapter);
          return (
            <section key={ch.chapter} className="card chapter">
              <div className="chapter-head">
                <span className="badge">Chapter {ch.chapter}</span>
                <span className="row">
                  {partB && <span className="pill exam">Part B</span>}
                  {s.due > 0 && <span className="pill due">{s.due} due</span>}
                </span>
              </div>
              <h3>{ch.title}</h3>
              <Bar c={s} />
              <p className="small muted">
                {s.new} new · {s.learning} learning · {s.review} review · {s.mastered} mastered
              </p>
              <div className="row wrap">
                <button className="primary" onClick={() => go(`/study/${ch.chapter}`)}>
                  Learn
                </button>
                <button onClick={() => go(`/practice/${ch.chapter}`)}>Go through all</button>
                <button className="ghost" onClick={() => go(`/browse/${ch.chapter}`)}>
                  Catalog
                </button>
                {openCount > 0 && (
                  <button className="ghost" onClick={() => go(`/open/${ch.chapter}`)}>
                    Open-ended ({openCount})
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card">
        <h3>How learning works</h3>
        <ul className="small">
          <li>
            <b>Learn</b> works like Anki: you get due reviews plus new questions. Answer wrong → the question comes back in
            the same session. Answer right → rate it <i>Hard / Good / Easy</i> and it is scheduled further into the future
            each time you get it right.
          </li>
          <li>
            <b>Go through all</b> asks every question of a chapter in order without touching your schedule – good for a
            first pass or last-minute revision.
          </li>
          <li>
            <b>Test</b> simulates Part A of the midterm: 10 random questions from every chapter, mixed, graded with{" "}
            {EXAM.mcPoints} points each.
          </li>
          <li>
            Questions marked <span className="pill corrected">corrected</span> have a different answer than what was circled
            in class – the reason is shown after you answer.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Bar({ c }: { c: Counts }) {
  const pct = (n: number) => `${(n / Math.max(1, c.total)) * 100}%`;
  return (
    <div className="bar" aria-label="progress">
      <span className="seg mastered" style={{ width: pct(c.mastered) }} />
      <span className="seg review" style={{ width: pct(c.review) }} />
      <span className="seg learning" style={{ width: pct(c.learning) }} />
    </div>
  );
}
