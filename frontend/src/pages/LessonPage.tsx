import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import {
  CompleteResult,
  ItemResponse,
  LessonContent,
  LessonSession,
  SessionItem,
} from "../api/types";
import { QuizCard } from "../components/QuizCard";

type Phase = "slides" | "quiz" | "results";

// An item queued in the working session. The mistake recycler pushes missed
// items back to the end of this queue until every one is answered correctly.
interface QueueEntry {
  item: SessionItem;
  attempt: number; // how many times it's been shown (1-based once dequeued)
}

export default function LessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState<LessonContent | null>(null);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>("slides");

  // Slides
  const [slideIndex, setSlideIndex] = useState(0);

  // Quiz (session-driven with a mistake-recycler queue)
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [correctCount, setCorrectCount] = useState(0); // items cleared (answered right)
  // First-try outcomes per itemId (recorded once, on first appearance).
  const firstTry = useRef<Map<string, boolean>>(new Map());
  const totalItems = useRef(0);
  const startedAt = useRef<number>(0);

  // Results
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load teaching content + the interactive session together.
  useEffect(() => {
    setPhase("slides");
    setSlideIndex(0);
    setCorrectCount(0);
    setQueue([]);
    setResult(null);
    setLoadError("");
    firstTry.current = new Map();

    Promise.all([
      api.get<LessonContent>(`/learn/lesson/${lessonId}`),
      api.get<LessonSession>(`/learn/lesson/${lessonId}/session`),
    ])
      .then(([c, s]) => {
        setContent(c);
        setSession(s);
        totalItems.current = s.items.length;
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Could not load lesson"));
  }, [lessonId]);

  const lesson = content?.lesson;
  const accent = content?.courseColor ?? "#7fb5ff";

  const current = queue[0]?.item;

  if (loadError) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/learn")}>
          ← Back to Learn
        </button>
        <div className="card empty mt-16">{loadError}</div>
      </div>
    );
  }
  if (!content || !lesson || !session) return <div className="loading">Loading lesson…</div>;

  // ── Slides phase ───────────────────────────────────────────────────────────
  if (phase === "slides") {
    const slide = lesson.slides[slideIndex];
    const isLast = slideIndex === lesson.slides.length - 1;
    return (
      <div className="lesson-wrap">
        <LessonHeader
          title={lesson.title}
          onExit={() => navigate("/learn")}
          progress={(slideIndex + 1) / (lesson.slides.length + 1)}
          accent={accent}
        />
        <div className="card lesson-slide">
          <div className="muted" style={{ fontSize: 13 }}>
            {content.courseTitle}
            {content.crownLevel > 0 && (
              <span className="crown-inline" title={`Crown level ${content.crownLevel}`}>
                {" "}
                · 👑 {content.crownLevel}
              </span>
            )}
          </div>
          <h2 style={{ marginTop: 6 }}>{slide.title}</h2>
          {slide.body.map((p, i) => (
            <p key={i} style={{ lineHeight: 1.6, fontSize: 16 }}>
              {p}
            </p>
          ))}
          {slide.keyTakeaway && (
            <div className="takeaway" style={{ borderColor: accent }}>
              <span style={{ fontWeight: 700, color: accent }}>Key takeaway</span>
              <div>{slide.keyTakeaway}</div>
            </div>
          )}
        </div>
        <div className="row spread mt-16">
          <button
            className="btn btn-ghost"
            onClick={() => (slideIndex === 0 ? navigate("/learn") : setSlideIndex((i) => i - 1))}
          >
            {slideIndex === 0 ? "Exit" : "Back"}
          </button>
          <button
            className="btn"
            style={{ background: accent }}
            onClick={() => {
              if (isLast) {
                // Seed the quiz queue from the session items.
                setQueue(session.items.map((item) => ({ item, attempt: 0 })));
                startedAt.current = Date.now();
                setPhase("quiz");
              } else {
                setSlideIndex((i) => i + 1);
              }
            }}
          >
            {isLast ? "Start practice →" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz phase (session + mistake recycler) ─────────────────────────────────
  if (phase === "quiz" && current) {
    // Progress: cleared items out of total distinct items.
    const progress =
      totalItems.current > 0 ? correctCount / totalItems.current : 0;

    async function submitSession(responses: ItemResponse[]) {
      setSubmitting(true);
      try {
        const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
        const res = await api.post<CompleteResult>(`/learn/lesson/${lessonId}/complete`, {
          responses,
          durationSeconds,
        });
        setResult(res);
        setPhase("results");
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : "Could not submit your session");
      } finally {
        setSubmitting(false);
      }
    }

    function advance(wasCorrect: boolean) {
      const entry = queue[0];
      const item = entry.item;

      // Record first-try outcome once (first time this item is seen).
      if (!firstTry.current.has(item.itemId)) {
        firstTry.current.set(item.itemId, wasCorrect);
      }

      if (wasCorrect) {
        // Clear this item from the queue.
        const nextQueue = queue.slice(1);
        setCorrectCount((c) => c + 1);
        if (nextQueue.length === 0) {
          // Session complete — every item answered correctly. Build responses.
          const responses: ItemResponse[] = [];
          firstTry.current.forEach((ft, itemId) => responses.push({ itemId, firstTry: ft }));
          void submitSession(responses);
        } else {
          setQueue(nextQueue);
        }
      } else {
        // Requeue the missed item to the back (mistake recycler).
        const [, ...rest] = queue;
        setQueue([...rest, { item, attempt: entry.attempt + 1 }]);
      }
    }

    return (
      <QuizCard
        key={current.itemId + "-" + queue[0].attempt}
        item={current}
        accent={accent}
        crownLevel={session.crownLevel}
        onNext={advance}
        submitting={submitting}
        progress={progress}
        remaining={queue.length}
        headerTitle={lesson.title}
        onExit={() => navigate("/learn")}
      />
    );
  }

  // ── Results phase ──────────────────────────────────────────────────────────
  if (phase === "results" && result) {
    const accuracy = result.total > 0 ? result.correct / result.total : 0;
    const stars = accuracy >= 1 ? 3 : accuracy >= 0.8 ? 2 : 1;
    return (
      <div className="lesson-wrap">
        <div className="card results-card results-celebrate">
          <div className="results-mascot">{result.passed ? "🐿️🎉" : "🐿️💪"}</div>
          <div className="results-eyebrow">
            {result.passed ? "MISSION COMPLETE" : "KEEP GOING"}
          </div>
          <h2 style={{ margin: "6px 0" }}>
            {result.passed ? lesson.title : "Almost there"}
          </h2>

          {result.passed && (
            <div className="results-stars" aria-label={`${stars} of 3 stars`}>
              {[0, 1, 2].map((s) => (
                <span key={s} className={`results-star ${s < stars ? "on" : ""}`}>
                  ★
                </span>
              ))}
            </div>
          )}

          <div className="muted">
            You got {result.correct} of {result.total} right on the first try.
          </div>

          {result.passed ? (
            <>
              {result.leveledUp && (
                <div className="crown-banner mt-16" style={{ borderColor: accent }}>
                  <span style={{ fontSize: 22 }}>👑</span> Crown level {result.crownLevel}
                  {result.crownLevel >= 5 ? " — maxed out!" : " reached"}
                </div>
              )}
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

              {(result.xpBreakdown.accuracyBonus > 0 || result.xpBreakdown.speedBonus > 0) && (
                <div className="xp-breakdown mt-16">
                  <div>Base: +{result.xpBreakdown.base} XP</div>
                  {result.xpBreakdown.accuracyBonus > 0 && (
                    <div className="gain">Accuracy bonus: +{result.xpBreakdown.accuracyBonus} XP</div>
                  )}
                  {result.xpBreakdown.speedBonus > 0 && (
                    <div className="gain">Speed bonus: +{result.xpBreakdown.speedBonus} XP</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="error-banner mt-16">
              You need at least {Math.ceil(result.total * 0.6)} correct on the first try to pass.
              Review the lesson and try again — no XP lost.
            </div>
          )}

          <div className="row mt-24" style={{ gap: 12, justifyContent: "center" }}>
            {!result.passed && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setPhase("slides");
                  setSlideIndex(0);
                  setCorrectCount(0);
                  setQueue([]);
                  firstTry.current = new Map();
                }}
              >
                Try again
              </button>
            )}
            <button
              className="btn"
              style={{ background: accent }}
              onClick={() => navigate("/learn")}
            >
              {result.passed ? "Continue" : "Back to Learn"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="loading">Loading…</div>;
}

function LessonHeader({
  title,
  onExit,
  progress,
  accent,
}: {
  title: string;
  onExit: () => void;
  progress: number;
  accent: string;
}) {
  return (
    <div className="lesson-header">
      <button className="lesson-close" onClick={onExit} aria-label="Exit lesson">
        ✕
      </button>
      <div className="progress-track" style={{ flex: 1 }}>
        <div
          className="progress-fill"
          style={{ width: `${Math.round(progress * 100)}%`, background: accent }}
        />
      </div>
      <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
        {title}
      </span>
    </div>
  );
}
