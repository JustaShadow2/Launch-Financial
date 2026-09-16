import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { CourseView, DailyLesson, LearnStats, LessonView } from "../api/types";

// Difficulty drives each branch's accent color.
const LEVEL_COLORS: Record<string, string> = {
  Beginner: "#7fb5ff",
  Intermediate: "#c792ea",
  Advanced: "#ff7a3c",
};

// The three branches that fan out from the central hub, in display order.
const BRANCHES: { level: string; label: string; icon: string }[] = [
  { level: "Beginner", label: "Foundations", icon: "🌱" },
  { level: "Intermediate", label: "Builder", icon: "📈" },
  { level: "Advanced", label: "Mastery", icon: "🚀" },
];

export default function LearnPage() {
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [stats, setStats] = useState<LearnStats | null>(null);
  const [daily, setDaily] = useState<DailyLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
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

        {/* ── The skill tree: a central hub with branches fanning out. ── */}
        <div className="tree">
          {/* Central hub. */}
          <div className="tree-hub">
            <div className="hub-core" title="Your investing journey starts here">
              <span className="hub-core-icon">🧭</span>
              <span className="hub-core-pct">{totalPct}%</span>
            </div>
            <div className="hub-label">Start here</div>
            {daily && (
              <button className="hub-continue" onClick={() => openLesson(daily.lessonId)}>
                {stats?.dailyGoalMet ? "Keep going" : "Continue"}: {daily.title}
              </button>
            )}
          </div>

          {/* Branches — one column per difficulty tier, fanning outward. */}
          <div className="tree-branches">
            {BRANCHES.map((branch) => {
              const branchCourses = courses.filter((c) => c.level === branch.level);
              if (branchCourses.length === 0) return null;
              const accent = LEVEL_COLORS[branch.level];
              return (
                <div className="branch" key={branch.level}>
                  <div className="branch-header" style={{ color: accent }}>
                    <span className="branch-icon">{branch.icon}</span>
                    <div>
                      <div className="branch-label">{branch.label}</div>
                      <div className="branch-level">{branch.level}</div>
                    </div>
                  </div>
                  <div className="branch-stem" style={{ background: accent }} />
                  <div className="branch-nodes">
                    {branchCourses.map((course) => (
                      <CourseNode
                        key={course.id}
                        course={course}
                        accent={accent}
                        expanded={openCourse === course.id}
                        onToggle={() =>
                          setOpenCourse((cur) => (cur === course.id ? null : course.id))
                        }
                        onOpenLesson={openLesson}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseNode({
  course,
  accent,
  expanded,
  onToggle,
  onOpenLesson,
}: {
  course: CourseView;
  accent: string;
  expanded: boolean;
  onToggle: () => void;
  onOpenLesson: (id: string) => void;
}) {
  const done = course.completedLessons;
  const total = course.totalLessons;
  const complete = done >= total && total > 0;
  const started = done > 0;

  return (
    <div className={`course-node-wrap ${expanded ? "open" : ""}`}>
      <button
        className={`course-node ${complete ? "complete" : started ? "started" : "new"}`}
        onClick={onToggle}
        style={
          started || complete
            ? { borderColor: accent, boxShadow: `0 5px 0 ${shade(accent)}` }
            : undefined
        }
      >
        <span
          className="course-node-badge"
          style={started || complete ? { background: accent } : undefined}
        >
          {complete ? "★" : course.icon}
        </span>
        <span className="course-node-text">
          <span className="course-node-title">{course.title}</span>
          <span className="course-node-sub">
            {done}/{total} lessons · {course.percent}%
          </span>
        </span>
        <span className="course-node-chevron">{expanded ? "▾" : "▸"}</span>
      </button>

      {/* Expanded: this course's lessons as a mini winding path. */}
      {expanded && (
        <div className="course-lessons">
          {course.lessons.map((lesson, i) => (
            <LessonPill
              key={lesson.id}
              lesson={lesson}
              index={i}
              accent={accent}
              onOpen={() => onOpenLesson(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonPill({
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
  return (
    <button
      className={`lesson-pill ${lesson.status}`}
      disabled={locked}
      onClick={onOpen}
      title={`${lesson.title} — ${lesson.subtitle}`}
      style={completed || current ? { borderColor: accent } : undefined}
    >
      <span
        className="lesson-pill-badge"
        style={completed ? { background: accent } : undefined}
      >
        {completed ? "✓" : locked ? "🔒" : index + 1}
      </span>
      <span className="lesson-pill-text">
        <span className="lesson-pill-title">{lesson.title}</span>
        <span className="lesson-pill-sub">
          {completed ? `Complete · 👑 ${lesson.crownLevel}` : `${lesson.subtitle} · +${lesson.xp} XP`}
        </span>
      </span>
      {current && <span className="lesson-pill-start">START</span>}
    </button>
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
