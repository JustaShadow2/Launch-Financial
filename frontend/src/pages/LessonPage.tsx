import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { CompleteResult, LessonContent } from "../api/types";

type Phase = "slides" | "quiz" | "results";

export default function LessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState<LessonContent | null>(null);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>("slides");

  // Slides
  const [slideIndex, setSlideIndex] = useState(0);

  // Quiz
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [locked, setLocked] = useState(false); // answer confirmed for current q

  // Results
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPhase("slides");
    setSlideIndex(0);
    setQIndex(0);
    setSelected(null);
    setAnswers([]);
    setLocked(false);
    setResult(null);
    api
      .get<LessonContent>(`/learn/lesson/${lessonId}`)
      .then(setContent)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Could not load lesson"));
  }, [lessonId]);

  const lesson = content?.lesson;
  const totalQuestions = lesson?.questions.length ?? 0;
  const currentQuestion = lesson?.questions[qIndex];
  const answeredCorrectly = useMemo(
    () => locked && currentQuestion && selected === currentQuestion.answer,
    [locked, currentQuestion, selected]
  );

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
  if (!content || !lesson) return <div className="loading">Loading lesson…</div>;

  const accent = content.courseColor;

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
            onClick={() => (isLast ? setPhase("quiz") : setSlideIndex((i) => i + 1))}
          >
            {isLast ? "Start quiz →" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz phase ───────────────────────────────────────────────────────────
  if (phase === "quiz" && currentQuestion) {
    function confirm() {
      if (selected === null) return;
      setLocked(true);
    }
    async function next() {
      const newAnswers = [...answers, selected as number];
      setAnswers(newAnswers);
      setSelected(null);
      setLocked(false);
      if (qIndex + 1 < totalQuestions) {
        setQIndex((i) => i + 1);
      } else {
        // Submit
        setSubmitting(true);
        try {
          const res = await api.post<CompleteResult>(`/learn/lesson/${lessonId}/complete`, {
            answers: newAnswers,
          });
          setResult(res);
          setPhase("results");
        } catch (e) {
          setLoadError(e instanceof ApiError ? e.message : "Could not submit answers");
        } finally {
          setSubmitting(false);
        }
      }
    }

    return (
      <div className="lesson-wrap">
        <LessonHeader
          title={lesson.title}
          onExit={() => navigate("/learn")}
          progress={
            (lesson.slides.length + qIndex + 1) / (lesson.slides.length + totalQuestions + 1)
          }
          accent={accent}
        />
        <div className="card">
          <div className="muted" style={{ fontSize: 13 }}>
            Question {qIndex + 1} of {totalQuestions}
          </div>
          <h2 style={{ marginTop: 6 }}>{currentQuestion.prompt}</h2>

          <div className="quiz-options mt-16">
            {currentQuestion.options.map((opt, i) => {
              let cls = "quiz-option";
              if (locked) {
                if (i === currentQuestion.answer) cls += " correct";
                else if (i === selected) cls += " wrong";
              } else if (i === selected) {
                cls += " selected";
              }
              return (
                <button
                  key={i}
                  className={cls}
                  disabled={locked}
                  onClick={() => setSelected(i)}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {locked && (
            <div className={`explanation ${answeredCorrectly ? "good" : "bad"}`}>
              <strong>{answeredCorrectly ? "Correct!" : "Not quite."}</strong>{" "}
              {currentQuestion.explanation}
            </div>
          )}
        </div>

        <div className="row spread mt-16">
          <button className="btn btn-ghost" onClick={() => navigate("/learn")}>
            Exit
          </button>
          {!locked ? (
            <button className="btn" style={{ background: accent }} disabled={selected === null} onClick={confirm}>
              Check
            </button>
          ) : (
            <button className="btn" style={{ background: accent }} disabled={submitting} onClick={next}>
              {qIndex + 1 < totalQuestions ? "Next" : submitting ? "Submitting…" : "Finish"}
            </button>
          )}
        </div>
      </div>
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
            You got {result.correct} of {result.total} correct.
          </div>

          {result.passed ? (
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
          ) : (
            <div className="error-banner mt-16">
              You need at least {Math.ceil(result.total * 0.6)} correct to pass. Review the lesson
              and try again — no XP lost.
            </div>
          )}

          <div className="row mt-24" style={{ gap: 12, justifyContent: "center" }}>
            {!result.passed && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setPhase("slides");
                  setSlideIndex(0);
                  setQIndex(0);
                  setSelected(null);
                  setAnswers([]);
                  setLocked(false);
                }}
              >
                Try again
              </button>
            )}
            <button className="btn" style={{ background: accent }} onClick={() => navigate("/learn")}>
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
