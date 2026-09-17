import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { ItemResponse, LessonSession, ReviewResult, SessionItem } from "../api/types";
import { QuizCard } from "../components/QuizCard";

/**
 * Spaced-repetition review session. Reuses the shared QuizCard + mistake
 * recycler, pulling the user's most overdue items across the whole curriculum
 * (GET /learn/review/session) and submitting to /learn/review/complete.
 */
export default function ReviewPage() {
  const navigate = useNavigate();
  const accent = "#7fb5ff";

  const [session, setSession] = useState<LessonSession | null>(null);
  const [loadError, setLoadError] = useState("");
  const [queue, setQueue] = useState<{ item: SessionItem; attempt: number }[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const firstTry = useRef<Map<string, boolean>>(new Map());
  const totalItems = useRef(0);

  useEffect(() => {
    api
      .get<LessonSession>("/learn/review/session")
      .then((s) => {
        setSession(s);
        setQueue(s.items.map((item) => ({ item, attempt: 0 })));
        totalItems.current = s.items.length;
      })
      .catch((e) =>
        setLoadError(e instanceof ApiError ? e.message : "Nothing to review right now.")
      );
  }, []);

  const current = queue[0]?.item;

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

  function advance(wasCorrect: boolean) {
    const entry = queue[0];
    const item = entry.item;
    if (!firstTry.current.has(item.itemId)) {
      firstTry.current.set(item.itemId, wasCorrect);
    }
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
      setQueue([...rest, { item, attempt: entry.attempt + 1 }]);
    }
  }

  return (
    <QuizCard
      key={current.itemId + "-" + queue[0].attempt}
      item={current}
      accent={accent}
      onNext={advance}
      submitting={submitting}
      progress={progress}
      remaining={queue.length}
      headerTitle="Daily review"
      onExit={() => navigate("/learn")}
    />
  );
}
