import { useState } from "react";
import { api } from "../api/client";
import { GradeResult, ItemAnswer, SessionItem } from "../api/types";

/**
 * Renders any of the four learning item types (multiple_choice, true_false,
 * decision, allocation, market_event), owns its own answer state, and grades
 * authoritatively via POST /learn/grade — so correct answers for the
 * interactive types never ship to the client up front. Signals correctness to
 * the parent (the mistake recycler) via onNext(wasCorrect).
 *
 * Mount a fresh instance per item using a React key so local state resets.
 */
export function QuizCard({
  item,
  accent,
  crownLevel = 0,
  onNext,
  submitting,
  progress,
  remaining,
  headerTitle,
  onExit,
}: {
  item: SessionItem;
  accent: string;
  crownLevel?: number;
  onNext: (wasCorrect: boolean) => void;
  submitting: boolean;
  progress: number;
  remaining: number;
  headerTitle: string;
  onExit: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (item.type === "allocation" && item.buckets) {
      const even = Math.round(100 / item.buckets.length);
      item.buckets.forEach((b, i) => {
        init[b.key] =
          i === item.buckets!.length - 1 ? 100 - even * (item.buckets!.length - 1) : even;
      });
    }
    return init;
  });

  const [locked, setLocked] = useState(false);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<GradeResult | null>(null);

  const isAllocation = item.type === "allocation";
  const allocSum = Object.values(weights).reduce((s, w) => s + w, 0);
  const canCheck = isAllocation ? Math.abs(allocSum - 100) <= 2 : selected !== null;

  async function check() {
    if (!canCheck || grading) return;
    setGrading(true);
    const answer: ItemAnswer = isAllocation
      ? { kind: "allocation", weights }
      : { kind: "choice", index: selected as number };
    try {
      const res = await api.post<GradeResult>("/learn/grade", { itemId: item.itemId, answer });
      setGrade(res);
      setLocked(true);
    } catch {
      setGrade({ correct: false, explanation: "Couldn't grade that — try again." });
      setLocked(true);
    } finally {
      setGrading(false);
    }
  }

  const originLabel =
    item.origin === "review" ? "Review" : item.origin === "reinforcement" ? "Practice" : null;
  const typeBadge =
    item.type === "decision"
      ? "Decision"
      : item.type === "allocation"
      ? "Allocate"
      : item.type === "market_event"
      ? "Simulation"
      : null;

  return (
    <div className="lesson-wrap">
      <div className="lesson-header">
        <button className="lesson-close" onClick={onExit} aria-label="Exit">
          ✕
        </button>
        <div className="progress-track" style={{ flex: 1 }}>
          <div
            className="progress-fill"
            style={{ width: `${Math.round(progress * 100)}%`, background: accent }}
          />
        </div>
        <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
          {headerTitle}
        </span>
      </div>

      <div className="card">
        <div className="row spread" style={{ alignItems: "center" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {remaining} to go
            {crownLevel > 0 && <span> · 👑 {crownLevel}</span>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {typeBadge && <span className={`pill type-${item.type}`}>{typeBadge}</span>}
            {originLabel && <span className={`pill origin-${item.origin}`}>{originLabel}</span>}
          </div>
        </div>

        {item.scenario && <div className="scenario-box">{item.scenario}</div>}
        {item.event && <div className="event-box">{item.event}</div>}

        <h2 style={{ marginTop: 10 }}>{item.prompt}</h2>

        {(item.type === "multiple_choice" || item.type === "true_false") && item.options && (
          <div className="quiz-options mt-16">
            {item.options.map((opt, i) => (
              <button
                key={i}
                className={choiceClass(i, selected, locked, grade)}
                disabled={locked}
                onClick={() => setSelected(i)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {item.type === "decision" && item.choices && (
          <div className="quiz-options mt-16">
            {item.choices.map((c, i) => (
              <button
                key={i}
                className={choiceClass(i, selected, locked, grade) + " decision-choice"}
                disabled={locked}
                onClick={() => setSelected(i)}
              >
                <span className="decision-choice-label">{c.label}</span>
                {locked && <span className="decision-choice-why">{c.rationale}</span>}
              </button>
            ))}
          </div>
        )}

        {item.type === "market_event" && item.eventOptions && (
          <div className="quiz-options mt-16">
            {item.eventOptions.map((o, i) => (
              <button
                key={i}
                className={choiceClass(i, selected, locked, grade) + " decision-choice"}
                disabled={locked}
                onClick={() => setSelected(i)}
              >
                <span className="decision-choice-label">{o.label}</span>
                {locked && <span className="decision-choice-why">→ {o.outcome}</span>}
              </button>
            ))}
          </div>
        )}

        {isAllocation && item.buckets && (
          <div className="alloc mt-16">
            {typeof item.amount === "number" && (
              <div className="alloc-total">
                Allocating <strong>${item.amount.toLocaleString()}</strong>
                <span className={`alloc-sum ${Math.abs(allocSum - 100) <= 2 ? "ok" : "off"}`}>
                  {allocSum}% used
                </span>
              </div>
            )}
            {item.buckets.map((b) => (
              <div className="alloc-row" key={b.key}>
                <div className="alloc-label">
                  <span className="alloc-icon">{b.icon}</span> {b.label}
                  <span className="alloc-value">
                    {weights[b.key] ?? 0}% · $
                    {Math.round(
                      ((weights[b.key] ?? 0) / 100) * (item.amount ?? 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={weights[b.key] ?? 0}
                  disabled={locked}
                  style={{ accentColor: accent }}
                  onChange={(e) => setWeights((w) => ({ ...w, [b.key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        )}

        {locked && grade && (
          <div className={`explanation ${grade.correct ? "good" : "bad"}`}>
            <strong>{grade.correct ? "Nice!" : "Not quite — we'll ask this again."}</strong>{" "}
            {grade.explanation}
          </div>
        )}
      </div>

      <div className="row spread mt-16">
        <button className="btn btn-ghost" onClick={onExit}>
          Exit
        </button>
        {!locked ? (
          <button
            className="btn"
            style={{ background: accent }}
            disabled={!canCheck || grading}
            onClick={check}
          >
            {grading ? "Checking…" : "Check"}
          </button>
        ) : (
          <button
            className="btn"
            style={{ background: accent }}
            disabled={submitting}
            onClick={() => onNext(Boolean(grade?.correct))}
          >
            {submitting ? "Finishing…" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}

function choiceClass(
  i: number,
  selected: number | null,
  locked: boolean,
  grade: GradeResult | null
): string {
  let cls = "quiz-option";
  if (locked && grade) {
    if (grade.correctIndex != null) {
      if (i === grade.correctIndex) cls += " correct";
      else if (i === selected) cls += " wrong";
    } else if (i === selected) {
      cls += grade.correct ? " correct" : " wrong";
    }
  } else if (i === selected) {
    cls += " selected";
  }
  return cls;
}
