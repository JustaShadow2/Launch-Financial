import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { CourseView, DailyLesson, LearnStats } from "../api/types";

// Crown pips: a compact 0..5 level indicator shown on completed lesson nodes,
// mirroring Duolingo's crown levels. Filled pips = current crown level.
function CrownPips({ level, accent }: { level: number; accent: string }) {
  return (
    <span className="crown-pips" title={`Crown level ${level} of 5`} aria-label={`Crown level ${level}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`crown-pip ${i < level ? "filled" : ""}`}
          style={i < level ? { background: accent } : undefined}
        />
      ))}
      <span className="crown-emoji">👑</span>
    </span>
  );
}

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

  return (
    <div>
      <h1 className="page-title">Learn</h1>
      <p className="page-sub">Build your investing knowledge — one lesson a day.</p>

      {/* Stats strip */}
      <div className="grid grid-3">
        <div className="card learn-stat">
          <div className="learn-stat-icon">🔥</div>
          <div>
            <div className="stat-value">{stats?.currentStreak ?? 0}</div>
            <div className="stat-label">day streak</div>
          </div>
        </div>
        <div className="card learn-stat">
          <div className="learn-stat-icon">⚡</div>
          <div>
            <div className="stat-value">{stats?.xp ?? 0}</div>
            <div className="stat-label">total XP</div>
          </div>
        </div>
        <div className="card learn-stat">
          <div className="learn-stat-icon">🎓</div>
          <div>
            <div className="stat-value">
              {stats?.completedLessons ?? 0}
              <span className="muted" style={{ fontSize: 18 }}>
                /{stats?.totalLessons ?? 0}
              </span>
            </div>
            <div className="stat-label">lessons done</div>
          </div>
        </div>
      </div>

      {/* Streak-freeze indicator: shows how many freezes protect the streak,
          and flags when one was just used to save it. */}
      {stats && (stats.streakFreezes > 0 || stats.freezeUsedDay) && (
        <div className="freeze-strip mt-16">
          <span className="freeze-icon">🧊</span>
          {stats.freezeUsedDay ? (
            <span>
              A <strong>Streak Freeze</strong> saved your streak.{" "}
              {stats.streakFreezes} left.
            </span>
          ) : (
            <span>
              <strong>{stats.streakFreezes}</strong> Streak Freeze
              {stats.streakFreezes === 1 ? "" : "s"} banked — they auto-protect a missed day.
            </span>
          )}
        </div>
      )}

      {/* Spaced-repetition review CTA: surfaces when items are due for review. */}
      {stats && stats.overdueItems > 0 && (
        <div className="card review-card mt-16">
          <div>
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span className="pill origin-review">Spaced review</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              🧠 {stats.overdueItems} item{stats.overdueItems === 1 ? "" : "s"} ready to review
            </div>
            <div className="muted">
              Refresh concepts before you forget them — this is how the learning sticks.
            </div>
          </div>
          <button className="btn" onClick={() => navigate("/learn/review")}>
            Review now
          </button>
        </div>
      )}

      {/* Daily plan card */}
      {daily ? (
        <div className="card daily-card mt-16">
          <div>
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span className="pill">{stats?.dailyGoalMet ? "Bonus lesson" : "Today's lesson"}</span>
              {stats?.dailyGoalMet && <span className="pill" style={{ color: "var(--gain)" }}>Daily goal met ✓</span>}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {daily.courseIcon} {daily.title}
            </div>
            <div className="muted">
              {daily.courseTitle} · {daily.minutes} min · +{daily.xp} XP
            </div>
          </div>
          <button className="btn" onClick={() => navigate(`/learn/lesson/${daily.lessonId}`)}>
            {stats?.dailyGoalMet ? "Keep going" : "Start lesson"}
          </button>
        </div>
      ) : (
        <div className="card daily-card mt-16">
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>🏆 You've completed every lesson!</div>
            <div className="muted">Amazing work. Revisit any lesson to keep your streak alive.</div>
          </div>
        </div>
      )}

      {/* Courses */}
      <h2 style={{ fontSize: 20, marginTop: 32 }}>Courses</h2>
      <div className="learn-courses">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} onOpenLesson={(id) => navigate(`/learn/lesson/${id}`)} />
        ))}
      </div>
    </div>
  );
}

// Difficulty drives the course's accent color so borders, progress, lesson
// accents, and the level pill all share one tier color.
const LEVEL_COLORS: Record<string, string> = {
  Beginner: "#7fb5ff",
  Intermediate: "#c792ea",
  Advanced: "#ff7a3c",
};

function CourseCard({
  course,
  onOpenLesson,
}: {
  course: CourseView;
  onOpenLesson: (lessonId: string) => void;
}) {
  const accent = LEVEL_COLORS[course.level] ?? course.color;
  return (
    <div className="card course-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="row spread" style={{ alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            <span style={{ marginRight: 8 }}>{course.icon}</span>
            {course.title}
          </div>
          <div className="muted" style={{ fontSize: 14, maxWidth: 460, marginTop: 4 }}>
            {course.description}
          </div>
        </div>
        <span className={`pill level-${course.level.toLowerCase()}`}>{course.level}</span>
      </div>

      {/* Progress bar */}
      <div className="progress-track mt-16">
        <div
          className="progress-fill"
          style={{ width: `${course.percent}%`, background: accent }}
        />
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
        {course.completedLessons} of {course.totalLessons} lessons · {course.percent}%
      </div>

      {/* Lesson path */}
      <div className="lesson-path mt-16">
        {course.lessons.map((lesson, i) => {
          const locked = lesson.status === "locked";
          return (
            <button
              key={lesson.id}
              className={`lesson-node ${lesson.status}`}
              disabled={locked}
              onClick={() => onOpenLesson(lesson.id)}
              title={lesson.title}
              style={
                lesson.status === "completed" || lesson.status === "current"
                  ? { borderColor: accent }
                  : undefined
              }
            >
              <span className="lesson-node-badge" style={lesson.status === "completed" ? { background: accent } : undefined}>
                {lesson.status === "completed" ? "✓" : locked ? "🔒" : i + 1}
              </span>
              <span className="lesson-node-text">
                <span className="lesson-node-title">{lesson.title}</span>
                <span className="lesson-node-sub muted">
                  {lesson.subtitle} · +{lesson.xp} XP
                </span>
              </span>
              {lesson.crownLevel > 0 && (
                <CrownPips level={lesson.crownLevel} accent={accent} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
