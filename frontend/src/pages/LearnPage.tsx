import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { CourseView, DailyLesson, LearnStats, LessonView } from "../api/types";

// Difficulty drives each branch's accent color.
const LEVEL_COLORS: Record<string, string> = {
  Beginner: "#7fb5ff",
  Intermediate: "#c792ea",
  Advanced: "#ff7a3c",
};

// The directions that fan out from the central hub, grouped by tier.
const BRANCHES: { level: string; label: string; icon: string; dir: string }[] = [
  { level: "Beginner", label: "Foundations", icon: "🌱", dir: "◀ West" },
  { level: "Intermediate", label: "Builder", icon: "📈", dir: "▲ North" },
  { level: "Advanced", label: "Mastery", icon: "🚀", dir: "▶ East" },
];

export default function LearnPage() {
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [stats, setStats] = useState<LearnStats | null>(null);
  const [daily, setDaily] = useState<DailyLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
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

  const activeCourse = useMemo(
    () => courses.find((c) => c.id === activeCourseId) ?? null,
    [courses, activeCourseId]
  );

  if (loading) return <div className="loading">Loading your academy…</div>;

  const openLesson = (id: string) => navigate(`/learn/lesson/${id}`);
  const totalPct =
    stats && stats.totalLessons > 0
      ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
      : 0;

  return (
    <div className="learn-page">
      {/* Sticky gamified HUD. */}
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
        {stats?.freezeUsedDay && (
          <div className="freeze-strip">
            <span className="freeze-icon">🧊</span>
            <span>
              A <strong>Streak Freeze</strong> saved your streak. {stats.streakFreezes} left.
            </span>
          </div>
        )}

        {stats && stats.overdueItems > 0 && (
          <button className="review-banner" onClick={() => navigate("/learn/review")}>
            <div className="review-banner-left">
              <span className="review-banner-icon">🧠</span>
              <div>
                <div className="review-banner-title">
                  {stats.overdueItems} item{stats.overdueItems === 1 ? "" : "s"} ready to review
                </div>
                <div className="review-banner-sub">Refresh concepts before you forget them.</div>
              </div>
            </div>
            <span className="review-banner-cta">Review →</span>
          </button>
        )}

        {/* ── Central hub ── */}
        <div className="hub">
          <div className="hub-core" title="Your investing journey">
            <span className="hub-core-icon">🧭</span>
            <span className="hub-core-pct">{totalPct}%</span>
          </div>
          <div className="hub-label">
            {activeCourse ? "Choose a direction" : "Pick a path to begin"}
          </div>
          {daily && !activeCourse && (
            <button className="hub-continue" onClick={() => openLesson(daily.lessonId)}>
              {stats?.dailyGoalMet ? "Keep going" : "Continue"}: {daily.title}
            </button>
          )}
        </div>

        {/* ── Direction chooser: the branches you can head toward ── */}
        <div className="directions">
          {BRANCHES.map((branch) => {
            const branchCourses = courses.filter((c) => c.level === branch.level);
            if (branchCourses.length === 0) return null;
            const accent = LEVEL_COLORS[branch.level];
            return (
              <div className="direction" key={branch.level}>
                <div className="direction-header" style={{ color: accent }}>
                  <span className="direction-icon">{branch.icon}</span>
                  <div>
                    <div className="direction-label">{branch.label}</div>
                    <div className="direction-dir">{branch.dir}</div>
                  </div>
                </div>
                <div className="direction-courses">
                  {branchCourses.map((course) => {
                    const complete = course.completedLessons >= course.totalLessons;
                    const active = course.id === activeCourseId;
                    return (
                      <button
                        key={course.id}
                        className={`direction-chip ${active ? "active" : ""}`}
                        style={
                          active
                            ? { borderColor: accent, background: `${accent}22` }
                            : undefined
                        }
                        onClick={() =>
                          setActiveCourseId((cur) => (cur === course.id ? null : course.id))
                        }
                      >
                        <span className="direction-chip-icon">
                          {complete ? "★" : course.icon}
                        </span>
                        <span className="direction-chip-text">
                          <span className="direction-chip-title">{course.title}</span>
                          <span className="direction-chip-sub">
                            {course.completedLessons}/{course.totalLessons} · {course.percent}%
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── The chosen path: a winding gamified trail of that topic's lessons ── */}
        {activeCourse && (
          <TopicPath
            course={activeCourse}
            accent={LEVEL_COLORS[activeCourse.level] ?? activeCourse.color}
            onOpenLesson={openLesson}
          />
        )}
      </div>
    </div>
  );
}

// Serpentine offsets so the path winds left → center → right → center …
const OFFSETS = [0, 0.34, 0.5, 0.34, 0, -0.34, -0.5, -0.34];

function TopicPath({
  course,
  accent,
  onOpenLesson,
}: {
  course: CourseView;
  accent: string;
  onOpenLesson: (id: string) => void;
}) {
  return (
    <section className="topic-path">
      <div className="topic-path-header" style={{ background: accent }}>
        <span className="topic-path-icon">{course.icon}</span>
        <div>
          <div className="topic-path-title">{course.title}</div>
          <div className="topic-path-sub">
            {course.completedLessons}/{course.totalLessons} lessons · {course.percent}%
          </div>
        </div>
      </div>

      <div className="topic-trail">
        {course.lessons.map((lesson, i) => (
          <PathNode
            key={lesson.id}
            lesson={lesson}
            index={i}
            accent={accent}
            onOpen={() => onOpenLesson(lesson.id)}
          />
        ))}
        <div className="topic-trail-goal">
          <span className="topic-trail-goal-icon">🏆</span>
          <span>Finish the path</span>
        </div>
      </div>
    </section>
  );
}

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
    <div className="path-row" style={{ transform: `translateX(${offset * 150}px)` }}>
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

      <div className={`path-label ${locked ? "muted" : ""}`}>
        <span className="path-label-title">{lesson.title}</span>
        <span className="path-label-sub">
          {completed ? `Complete · 👑 ${lesson.crownLevel}` : `+${lesson.xp} XP`}
        </span>
      </div>
    </div>
  );
}

// Darken a hex color for a node's 3D "lip" shadow.
function shade(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "rgba(0,0,0,0.3)";
  const r = Math.max(0, parseInt(m[1], 16) - 55);
  const g = Math.max(0, parseInt(m[2], 16) - 55);
  const b = Math.max(0, parseInt(m[3], 16) - 55);
  return `rgb(${r}, ${g}, ${b})`;
}
