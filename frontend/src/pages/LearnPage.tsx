import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { CourseView, DailyLesson, LearnStats, LessonView } from "../api/types";

// Difficulty drives each unit's accent color so the path, headers, and nodes
// all share one tier color.
const LEVEL_COLORS: Record<string, string> = {
  Beginner: "#7fb5ff",
  Intermediate: "#c792ea",
  Advanced: "#ff7a3c",
};

export default function LearnPage() {
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [stats, setStats] = useState<LearnStats | null>(null);
  const [daily, setDaily] = useState<DailyLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<{ courses: CourseView[] }>("/learn/courses"),
      api.get<LearnStats>("/learn/stats"),
      api.get<{ lesson: DailyLesson | null }>("/learn/daily"),
    ])
      .then(([c, s, d]) => {
        setCourses(c.courses);
        setStats(s);
        setDaily(d.lesson);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading your academy…</div>;

  const openLesson = (id: string) => navigate(`/learn/lesson/${id}`);

  return (
    <div className="learn-page">
      {/* Sticky gamified HUD — persistent streak / XP / freezes / progress. */}
      <div className="learn-hud">
        <div className="hud-stat" title="Day streak">
          <span className="hud-icon">🔥</span>
          <span className="hud-value">{stats?.currentStreak ?? 0}</span>
        </div>
        <div className="hud-stat" title="Total XP">
          <span className="hud-icon">⚡</span>
          <span className="hud-value">{stats?.xp ?? 0}</span>
        </div>
        <div className="hud-stat" title="Streak freezes">
          <span className="hud-icon">🧊</span>
          <span className="hud-value">{stats?.streakFreezes ?? 0}</span>
        </div>
        <div className="hud-stat hud-stat-progress" title="Lessons completed">
          <span className="hud-icon">🎓</span>
          <span className="hud-value">
            {stats?.completedLessons ?? 0}
            <span className="hud-total">/{stats?.totalLessons ?? 0}</span>
          </span>
        </div>
      </div>

      <div className="learn-body">
        {/* A freeze just saved the streak — reassure the user. */}
        {stats?.freezeUsedDay && (
          <div className="freeze-strip">
            <span className="freeze-icon">🧊</span>
            <span>
              A <strong>Streak Freeze</strong> saved your streak.{" "}
              {stats.streakFreezes} left.
            </span>
          </div>
        )}

        {/* Spaced-repetition review CTA. */}
        {stats && stats.overdueItems > 0 && (
          <button className="review-banner" onClick={() => navigate("/learn/review")}>
            <div className="review-banner-left">
              <span className="review-banner-icon">🧠</span>
              <div>
                <div className="review-banner-title">
                  {stats.overdueItems} item{stats.overdueItems === 1 ? "" : "s"} ready to review
                </div>
                <div className="review-banner-sub">
                  Refresh concepts before you forget them.
                </div>
              </div>
            </div>
            <span className="review-banner-cta">Review →</span>
          </button>
        )}

        {/* Continue banner — the daily lesson, prominent like Duolingo's. */}
        {daily ? (
          <div className="continue-banner">
            <div>
              <div className="continue-eyebrow">
                {stats?.dailyGoalMet ? "BONUS LESSON" : "CONTINUE LEARNING"}
              </div>
              <div className="continue-title">
                {daily.courseIcon} {daily.title}
              </div>
              <div className="continue-sub">
                {daily.courseTitle} · {daily.minutes} min · +{daily.xp} XP
                {stats?.dailyGoalMet && <span className="goal-met"> · Daily goal met ✓</span>}
              </div>
            </div>
            <button className="btn continue-btn" onClick={() => openLesson(daily.lessonId)}>
              {stats?.dailyGoalMet ? "Keep going" : "Start"}
            </button>
          </div>
        ) : (
          <div className="continue-banner done">
            <div>
              <div className="continue-title">🏆 You've completed every lesson!</div>
              <div className="continue-sub">
                Amazing work. Revisit any lesson or run a review to keep your streak alive.
              </div>
            </div>
          </div>
        )}

        {/* The winding path — one section per course/unit. */}
        {courses.map((course) => (
          <UnitPath key={course.id} course={course} onOpenLesson={openLesson} />
        ))}
      </div>
    </div>
  );
}

function UnitPath({
  course,
  onOpenLesson,
}: {
  course: CourseView;
  onOpenLesson: (lessonId: string) => void;
}) {
  const accent = LEVEL_COLORS[course.level] ?? course.color;

  return (
    <section className="unit">
      {/* Unit header banner (Duolingo-style colored bar). */}
      <div className="unit-header" style={{ background: accent }}>
        <div className="unit-header-text">
          <div className="unit-header-eyebrow">
            {course.level} · {course.completedLessons}/{course.totalLessons}
          </div>
          <div className="unit-header-title">
            <span className="unit-header-icon">{course.icon}</span>
            {course.title}
          </div>
        </div>
      </div>

      {/* Winding vertical path of lesson nodes. */}
      <div className="unit-path">
        {course.lessons.map((lesson, i) => (
          <PathNode
            key={lesson.id}
            lesson={lesson}
            index={i}
            accent={accent}
            onOpen={() => onOpenLesson(lesson.id)}
          />
        ))}
      </div>
    </section>
  );
}

// Serpentine horizontal offsets (as a fraction of the path width), repeating
// so the trail winds left → center → right → center → left …
const OFFSETS = [0, 0.22, 0.32, 0.22, 0, -0.22, -0.32, -0.22];

function PathNode({
  lesson,
  index,
  accent,
  onOpen,
}: {
  lesson: LessonView;
  index: number;
  accent: string;
  onOpen: () => void;
}) {
  const locked = lesson.status === "locked";
  const completed = lesson.status === "completed";
  const current = lesson.status === "current";
  const offset = OFFSETS[index % OFFSETS.length];

  return (
    <div className="path-row" style={{ transform: `translateX(${offset * 120}px)` }}>
      {current && <div className="path-start-bubble">START</div>}
      <button
        className={`path-node ${lesson.status}`}
        disabled={locked}
        onClick={onOpen}
        title={`${lesson.title} — ${lesson.subtitle}`}
        style={
          completed || current
            ? { background: accent, boxShadow: `0 6px 0 ${shade(accent)}` }
            : undefined
        }
      >
        <span className="path-node-face">
          {completed ? "★" : locked ? "🔒" : index + 1}
        </span>
      </button>

      {/* Crown pips under completed nodes. */}
      {completed && lesson.crownLevel > 0 && (
        <div className="path-crowns" aria-label={`Crown level ${lesson.crownLevel}`}>
          {Array.from({ length: 5 }).map((_, p) => (
            <span
              key={p}
              className={`path-crown-pip ${p < lesson.crownLevel ? "filled" : ""}`}
              style={p < lesson.crownLevel ? { background: accent } : undefined}
            />
          ))}
        </div>
      )}

      {/* Label — title + XP. */}
      <div className={`path-label ${locked ? "muted" : ""}`}>
        <span className="path-label-title">{lesson.title}</span>
        <span className="path-label-sub">
          {completed ? `Complete · 👑 ${lesson.crownLevel}` : `+${lesson.xp} XP`}
        </span>
      </div>
    </div>
  );
}

// Darken a hex color for the node's 3D "lip" shadow.
function shade(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "rgba(0,0,0,0.3)";
  const r = Math.max(0, parseInt(m[1], 16) - 55);
  const g = Math.max(0, parseInt(m[2], 16) - 55);
  const b = Math.max(0, parseInt(m[3], 16) - 55);
  return `rgb(${r}, ${g}, ${b})`;
}
