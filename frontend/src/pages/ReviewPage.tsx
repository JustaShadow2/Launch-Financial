import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import {
  ItemResponse,
  LessonContent,
  LessonSession,
  ReviewResult,
  SessionItem,
} from "../api/types";

/**
 * Spaced-repetition review session. Reuses the mistake-recycler flow from the
 * lesson quiz, but pulls the user's most overdue items across the whole
 * curriculum (GET /learn/review/session) and submits to /learn/review/complete.
 */
export default function ReviewPage() {
  const navigate = useNavigate();
  const accent = "#7fb5ff";

  const [session, setSession] = useState<LessonSession | null>(null);
  const [loadError, setLoadError] = useState("");
  const [queue, setQueue] = useState<{ item: SessionItem }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const firstTry = useRef<Map<string, boolean>>(new Map());
  const totalItems = useRef(0);

  // Answer-key cache: fetched per owning lesson for instant feedback.
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState("");
  const answerCache = useRef<Map<string, { answer: number; explanation: string }>>(new Map());

  useEffect(() => {
    api
      .get<LessonSession>("/learn/review/session")
      .then((s) => {
        setSession(s);
        setQueue(s.items.map((item) => ({ item })));
        totalItems.current = s.items.length;
      })
      .catch((e) =>
        setLoadError(e instanceof ApiError ? e.message : "Nothing to review right now.")
      );
  }, []);

  const current = queue[0]?.item;

  // Load the answer key for the current item (cached per lesson).
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setAnswerIndex(null);
    setExplanation("");

    const cached = answerCache.current.get(current.itemId);
    if (cached) {
      setAnswerIndex(cached.answer);
      setExplanation(cached.explanation);
      return;
    }
    api
      .get<LessonContent>(`/learn/lesson/${current.lessonId}`)
      .then((c) => {
        if (cancelled) return;
        for (const q of c.lesson.questions) {
          answerCache.current.set(q.id, { answer: q.answer, explanation: q.explanation });
        }
        const found = c.lesson.questions.find((q) => q.id === current.itemId);
        if (found) {
          setAnswerIndex(found.answer);
          setExplanation(found.explanation);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [current]);

  if (loadError) {
    return (
      <div className="lesson-wrap">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/learn")}>
          ← Back to Learn
        </button>
        <div className="card empty mt-16">{loadError}</div>
      </div>
    );
  }
  if (!session) return <div className="loading">Building your review…</div>;

  // ── Results ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="lesson-wrap">
        <div className="card results-card">
          <div style={{ fontSize: 48 }}>🧠</div>
          <h2 style={{ margin: "8px 0" }}>Review complete!</h2>
          <div className="muted">
            {result.correct} of {result.total} right on the first try.
          </div>
          {result.freezeEarned && (
            <div className="freeze-banner mt-16">
              <span style={{ fontSize: 20 }}>🧊</span> You earned a Streak Freeze!
            </div>
          )}
          <div className="results-badges mt-16">
            <div className="result-badge">
              <div className="result-badge-value gain">+{result.xpEarned}</div>
              <div className="stat-label">XP earned</div>
            </div>
            <div className="result-badge">
              <div className="result-badge-value">🔥 {result.stats.currentStreak}</div>
              <div className="stat-label">day streak</div>
            </div>
            <div className="result-badge">
              <div className="result-badge-value">{result.stats.xp}</div>
              <div className="stat-label">total XP</div>
            </div>
          </div>
          <div className="row mt-24" style={{ justifyContent: "center" }}>
            <button className="btn" style={{ background: accent }} onClick={() => navigate("/learn")}>
              Back to Learn
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return <div className="loading">Loading…</div>;

  const isCorrect = locked && answerIndex !== null && selected === answerIndex;
  const progress = totalItems.current > 0 ? correctCount / totalItems.current : 0;

  async function submitReview(responses: ItemResponse[]) {
    setSubmitting(true);
    try {
      const res = await api.post<ReviewResult>("/learn/review/complete", { responses });
      setResult(res);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Could not submit your review");
    } finally {
      setSubmitting(false);
    }
  }

  function advance() {
    const item = queue[0].item;
    const wasCorrect = answerIndex !== null && selected === answerIndex;
    if (!firstTry.current.has(item.itemId)) {
      firstTry.current.set(item.itemId, wasCorrect);
    }
    setSelected(null);
    setLocked(false);

    if (wasCorrect) {
      const nextQueue = queue.slice(1);
      setCorrectCount((c) => c + 1);
      if (nextQueue.length === 0) {
        const responses: ItemResponse[] = [];
        firstTry.current.forEach((ft, itemId) => responses.push({ itemId, firstTry: ft }));
        void submitReview(responses);
      } else {
        setQueue(nextQueue);
      }
    } else {
      const [, ...rest] = queue;
      setQueue([...rest, { item }]);
    }
  }

  return (
    <div className="lesson-wrap">
      <div className="lesson-header">
        <button className="lesson-close" onClick={() => navigate("/learn")} aria-label="Exit review">
          ✕
        </button>
        <div className="progress-track" style={{ flex: 1 }}>
          <div
            className="progress-fill"
            style={{ width: `${Math.round(progress * 100)}%`, background: accent }}
          />
        </div>
        <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
          Daily review
        </span>
      </div>

      <div className="card">
        <div className="row spread" style={{ alignItems: "center" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {queue.length} to go
          </div>
          <span className="pill origin-review">Review</span>
        </div>
        <h2 style={{ marginTop: 6 }}>{current.prompt}</h2>

        <div className="quiz-options mt-16">
          {current.options.map((opt, i) => {
            let cls = "quiz-option";
            if (locked && answerIndex !== null) {
              if (i === answerIndex) cls += " correct";
              else if (i === selected) cls += " wrong";
            } else if (i === selected) {
              cls += " selected";
            }
            return (
              <button key={i} className={cls} disabled={locked} onClick={() => setSelected(i)}>
                {opt}
              </button>
            );
          })}
        </div>

        {locked && (
          <div className={`explanation ${isCorrect ? "good" : "bad"}`}>
            <strong>{isCorrect ? "Correct!" : "Not quite — we'll ask this again."}</strong>{" "}
            {explanation}
          </div>
        )}
      </div>

      <div className="row spread mt-16">
        <button className="btn btn-ghost" onClick={() => navigate("/learn")}>
          Exit
        </button>
        {!locked ? (
          <button
            className="btn"
            style={{ background: accent }}
            disabled={selected === null || answerIndex === null}
            onClick={() => setLocked(true)}
          >
            {answerIndex === null ? "Loading…" : "Check"}
          </button>
        ) : (
          <button
            className="btn"
            style={{ background: accent }}
            disabled={submitting}
            onClick={advance}
          >
            {submitting ? "Finishing…" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
