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
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
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
    setSelected(null);
    setLocked(false);
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

    function check() {
      if (selected === null) return;
      setLocked(true);
    }

    function advance(wasCorrect: boolean) {
      const entry = queue[0];
      const item = entry.item;

      // Record first-try outcome once (first time this item is seen).
      if (!firstTry.current.has(item.itemId)) {
        firstTry.current.set(item.itemId, wasCorrect);
      }

      setSelected(null);
      setLocked(false);

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
        session={session}
        item={current}
        accent={accent}
        selected={selected}
        locked={locked}
        onSelect={setSelected}
        onCheck={check}
        onNext={advance}
        submitting={submitting}
        progress={progress}
        remaining={queue.length}
        lessonTitle={lesson.title}
        onExit={() => navigate("/learn")}
      />
    );
  }

  // ── Results phase ──────────────────────────────────────────────────────────
  if (phase === "results" && result) {
    return (
      <div className="lesson-wrap">
        <div className="card results-card">
          <div style={{ fontSize: 48 }}>{result.passed ? "🎉" : "💪"}</div>
          <h2 style={{ margin: "8px 0" }}>
            {result.passed ? "Lesson complete!" : "Almost there"}
          </h2>
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
                  setSelected(null);
                  setLocked(false);
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

// The correct-answer index for the current item is not sent by the server. To
// give instant right/wrong feedback while keeping grading authoritative on the
// backend, the QuizCard fetches the answer key lazily per item from the lesson
// content it already has. We stash the last check's correctness in a ref shared
// with the parent so the recycler can act on it.
function QuizCard({
  session,
  item,
  accent,
  selected,
  locked,
  onSelect,
  onCheck,
  onNext,
  submitting,
  progress,
  remaining,
  lessonTitle,
  onExit,
}: {
  session: LessonSession;
  item: SessionItem;
  accent: string;
  selected: number | null;
  locked: boolean;
  onSelect: (i: number) => void;
  onCheck: () => void;
  onNext: (wasCorrect: boolean) => void;
  submitting: boolean;
  progress: number;
  remaining: number;
  lessonTitle: string;
  onExit: () => void;
}) {
  // Fetch the answer key for THIS item on demand. The lesson content endpoint
  // returns questions with answers for the owning lesson; for review items from
  // other lessons we fetch that lesson's content once and cache it.
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const answerCache = useRef<Map<string, { answer: number; explanation: string }>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setAnswerIndex(null);
    setExplanation("");

    const cached = answerCache.current.get(item.itemId);
    if (cached) {
      setAnswerIndex(cached.answer);
      setExplanation(cached.explanation);
      return;
    }
    api
      .get<LessonContent>(`/learn/lesson/${item.lessonId}`)
      .then((c) => {
        if (cancelled) return;
        for (const q of c.lesson.questions) {
          answerCache.current.set(q.id, { answer: q.answer, explanation: q.explanation });
        }
        const found = c.lesson.questions.find((q) => q.id === item.itemId);
        if (found) {
          setAnswerIndex(found.answer);
          setExplanation(found.explanation);
        }
      })
      .catch(() => {
        /* If we can't fetch the key, fall back to treating any answer as gradable server-side. */
      });
  }, [item.itemId, item.lessonId]);

  const isCorrect = locked && answerIndex !== null && selected === answerIndex;

  const originLabel =
    item.origin === "review"
      ? "Review"
      : item.origin === "reinforcement"
      ? "Practice"
      : null;

  return (
    <div className="lesson-wrap">
      <LessonHeader title={lessonTitle} onExit={onExit} progress={progress} accent={accent} />
      <div className="card">
        <div className="row spread" style={{ alignItems: "center" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {remaining} to go
            {session.crownLevel > 0 && <span> · 👑 {session.crownLevel}</span>}
          </div>
          {originLabel && <span className={`pill origin-${item.origin}`}>{originLabel}</span>}
        </div>
        <h2 style={{ marginTop: 6 }}>{item.prompt}</h2>

        <div className="quiz-options mt-16">
          {item.options.map((opt, i) => {
            let cls = "quiz-option";
            if (locked && answerIndex !== null) {
              if (i === answerIndex) cls += " correct";
              else if (i === selected) cls += " wrong";
            } else if (i === selected) {
              cls += " selected";
            }
            return (
              <button
                key={i}
                className={cls}
                disabled={locked}
                onClick={() => onSelect(i)}
              >
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
        <button className="btn btn-ghost" onClick={onExit}>
          Exit
        </button>
        {!locked ? (
          <button
            className="btn"
            style={{ background: accent }}
            disabled={selected === null || answerIndex === null}
            onClick={onCheck}
          >
            {answerIndex === null ? "Loading…" : "Check"}
          </button>
        ) : (
          <button
            className="btn"
            style={{ background: accent }}
            disabled={submitting}
            onClick={() => onNext(isCorrect)}
          >
            {submitting ? "Finishing…" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
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
