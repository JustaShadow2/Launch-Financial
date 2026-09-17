import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  CourseView,
  DailyChallenge,
  DailyLesson,
  LearnStats,
  LessonView,
  QuestView,
} from "../api/types";

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
  const [quests, setQuests] = useState<QuestView[]>([]);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<{ courses: CourseView[] }>("/learn/courses"),
      api.get<LearnStats>("/learn/stats"),
      api.get<{ lesson: DailyLesson | null }>("/learn/daily"),
      api.get<{ quests: QuestView[] }>("/learn/quests"),
      api.get<DailyChallenge>("/learn/daily-challenge"),
    ])
      .then(([c, s, d, q, ch]) => {
        setCourses(c.courses);
        setStats(s);
        setDaily(d.lesson);
        setQuests(q.quests);
        setChallenge(ch);
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

        {/* ── Central hub with mascot ── */}
        <div className="hub">
          <Penny mood={stats?.dailyGoalMet ? "celebrate" : "happy"} />
          <div className="hub-core" title="Your investing journey">
            <span className="hub-core-icon">🧭</span>
            <span className="hub-core-pct">{totalPct}%</span>
          </div>
          <div className="hub-level">Level {stats?.level ?? 1} · Financial Explorer</div>
          <div className="hub-label">
            {activeCourse ? "Choose a direction" : "Pick a path to begin"}
          </div>
          {daily && !activeCourse && (
            <button className="hub-continue" onClick={() => openLesson(daily.lessonId)}>
              {stats?.dailyGoalMet ? "Keep going" : "Continue"}: {daily.title}
            </button>
          )}
        </div>

        {/* ── Daily Money Challenge ── */}
        {challenge && <DailyChallengeCard challenge={challenge} />}

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

        {/* ── Money Quests ── */}
        {quests.length > 0 && (
          <section className="quests">
            <h2 className="section-heading">🗺️ Money Quests</h2>
            <p className="section-sub">Multi-lesson missions with a badge to earn.</p>
            <div className="quest-grid">
              {quests.map((q) => (
                <QuestCard key={q.id} quest={q} onOpenLesson={openLesson} />
              ))}
            </div>
          </section>
        )}

        {/* ── Skills mastery ── */}
        {stats && stats.skills.length > 0 && (
          <section className="skills">
            <h2 className="section-heading">🧠 Your Skills</h2>
            <div className="skill-list">
              {stats.skills.map((sk) => (
                <div className="skill-row" key={sk.key}>
                  <div className="skill-head">
                    <span className="skill-icon">{sk.icon}</span>
                    <span className="skill-label">{sk.label}</span>
                    <span className="skill-pct">{sk.percent}%</span>
                  </div>
                  <div className="skill-track">
                    <div className="skill-fill" style={{ width: `${sk.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Mascot: Penny the squirrel (acorns → savings → wealth) ──────────────────
function Penny({ mood }: { mood: "happy" | "celebrate" | "think" | "oops" }) {
  const face =
    mood === "celebrate" ? "🥳" : mood === "think" ? "🤔" : mood === "oops" ? "😬" : "🐿️";
  const line =
    mood === "celebrate"
      ? "Nut streak secured! 🌰"
      : mood === "think"
      ? "Hmm, let's think this through…"
      : mood === "oops"
      ? "Oops — every acorn teaches us something."
      : "Let's grow those acorns!";
  return (
    <div className={`penny penny-${mood}`}>
      <div className="penny-face">{face}</div>
      <div className="penny-speech">{line}</div>
    </div>
  );
}

// ── Daily Money Challenge card ──────────────────────────────────────────────
function DailyChallengeCard({ challenge }: { challenge: DailyChallenge }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="daily-challenge">
      <div className="daily-challenge-eyebrow">💰 DAILY MONEY CHALLENGE</div>
      <div className="daily-challenge-q">{challenge.question}</div>
      <div className="daily-challenge-options">
        {challenge.options.map((o, i) => {
          const isPicked = picked === i;
          const isBest = i === challenge.best;
          let cls = "daily-choice";
          if (picked !== null) {
            if (isBest) cls += " best";
            else if (isPicked) cls += " notbest";
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={picked !== null}
              onClick={() => setPicked(i)}
            >
              <span className="daily-choice-label">{o.label}</span>
              {picked !== null && <span className="daily-choice-result">{o.result}</span>}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="daily-takeaway">
          <strong>💡 {challenge.takeaway}</strong>
          <span className="daily-xp">+25 XP</span>
        </div>
      )}
    </div>
  );
}

// ── Money Quest card ────────────────────────────────────────────────────────
function QuestCard({
  quest,
  onOpenLesson,
}: {
  quest: QuestView;
  onOpenLesson: (id: string) => void;
}) {
  const next = quest.steps.find((s) => s.current) ?? quest.steps.find((s) => !s.completed);
  return (
    <div className={`quest-card ${quest.complete ? "complete" : ""}`} style={{ borderColor: quest.color }}>
      <div className="quest-card-head">
        <span className="quest-icon" style={{ background: `${quest.color}22` }}>
          {quest.icon}
        </span>
        <div className="quest-card-titles">
          <div className="quest-title">{quest.title}</div>
          <div className="quest-tagline">{quest.tagline}</div>
        </div>
      </div>

      <div className="quest-steps">
        {quest.steps.map((s) => (
          <span
            key={s.lessonId}
            className={`quest-step ${s.completed ? "done" : s.current ? "current" : ""}`}
            style={s.completed ? { background: quest.color } : undefined}
            title={s.title}
          />
        ))}
      </div>
      <div className="quest-progress-text">
        {quest.completedSteps}/{quest.totalSteps} steps · {quest.percent}%
      </div>

      {quest.complete ? (
        <div className="quest-badge">{quest.badge} unlocked!</div>
      ) : next ? (
        <button
          className="btn btn-sm quest-cta"
          style={{ background: quest.color }}
          onClick={() => onOpenLesson(next.lessonId)}
        >
          {quest.completedSteps === 0 ? "Start quest" : "Continue"}: {next.title}
        </button>
      ) : null}
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
