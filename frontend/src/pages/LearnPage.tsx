import { useEffect, useMemo, useRef, useState } from "react";
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

// Difficulty drives each unit's accent color.
const LEVEL_COLORS: Record<string, string> = {
  Beginner: "#7fb5ff",
  Intermediate: "#c792ea",
  Advanced: "#ff7a3c",
};

// Tier "directions" used for the jump-to-section chips. The path itself is one
// continuous scroll; these just scroll you to the first unit of that tier.
const SECTIONS: { level: string; label: string; icon: string }[] = [
  { level: "Beginner", label: "Foundations", icon: "🌱" },
  { level: "Intermediate", label: "Builder", icon: "📈" },
  { level: "Advanced", label: "Mastery", icon: "🚀" },
];

type Tab = "path" | "more";

export default function LearnPage() {
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [stats, setStats] = useState<LearnStats | null>(null);
  const [daily, setDaily] = useState<DailyLesson | null>(null);
  const [quests, setQuests] = useState<QuestView[]>([]);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("path");
  const navigate = useNavigate();

  // Refs for auto-scroll: the current lesson node, and each tier's first unit.
  const currentNodeRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // On first load of the path, scroll to the current lesson so a returning
  // user's "continue" point is front and center (Duolingo behavior).
  const didAutoScroll = useRef(false);
  useEffect(() => {
    if (loading || tab !== "path" || didAutoScroll.current) return;
    if (currentNodeRef.current) {
      didAutoScroll.current = true;
      // Delay a frame so layout is settled.
      requestAnimationFrame(() =>
        currentNodeRef.current?.scrollIntoView({ behavior: "auto", block: "center" })
      );
    }
  }, [loading, tab, courses]);

  // The single global "current" lesson across the whole path (first incomplete).
  const currentLessonId = useMemo(() => {
    for (const c of courses) {
      const cur = c.lessons.find((l) => l.status === "current");
      if (cur) return cur.id;
    }
    return null;
  }, [courses]);

  if (loading) return <div className="loading">Loading your academy…</div>;

  const openLesson = (id: string) => navigate(`/learn/lesson/${id}`);

  function jumpTo(level: string) {
    sectionRefs.current[level]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // First course index per tier, so we can attach the section ref for jumps.
  const firstOfLevel: Record<string, string> = {};
  for (const c of courses) if (!(c.level in firstOfLevel)) firstOfLevel[c.level] = c.id;

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
        <div className="hud-stat hud-stat-progress" title="Level">
          <span className="hud-icon">🎓</span>
          <span className="hud-value">Lvl {stats?.level ?? 1}</span>
        </div>
      </div>

      {/* Tabs: the path is the star; everything else lives under "More". */}
      <div className="learn-tabs">
        <button className={`learn-tab ${tab === "path" ? "active" : ""}`} onClick={() => setTab("path")}>
          🗺️ Path
        </button>
        <button className={`learn-tab ${tab === "more" ? "active" : ""}`} onClick={() => setTab("more")}>
          ⭐ Challenges & Quests
        </button>
      </div>

      {tab === "path" ? (
        <div className="learn-body">
          {/* Jump-to-section chips (directional nav without leaving the path). */}
          <div className="section-jump">
            {SECTIONS.map((s) => {
              const has = courses.some((c) => c.level === s.level);
              if (!has) return null;
              return (
                <button
                  key={s.level}
                  className="section-chip"
                  style={{ color: LEVEL_COLORS[s.level] }}
                  onClick={() => jumpTo(s.level)}
                >
                  {s.icon} {s.label}
                </button>
              );
            })}
          </div>

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

          {/* One continuous scrolling path — every course is a unit section. */}
          {courses.map((course) => (
            <UnitSection
              key={course.id}
              course={course}
              accent={LEVEL_COLORS[course.level] ?? course.color}
              currentLessonId={currentLessonId}
              currentNodeRef={currentNodeRef}
              sectionRef={
                firstOfLevel[course.level] === course.id
                  ? (el) => (sectionRefs.current[course.level] = el)
                  : undefined
              }
              onOpenLesson={openLesson}
            />
          ))}

          <div className="path-end">
            <div className="path-end-icon">🏁</div>
            <div className="path-end-text">
              {stats && stats.completedLessons >= stats.totalLessons
                ? "You've reached the summit — every lesson complete!"
                : "Keep going — new ground awaits."}
            </div>
          </div>
        </div>
      ) : (
        <div className="learn-body">
          {challenge && <DailyChallengeCard challenge={challenge} />}

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
      )}
    </div>
  );
}

// ── A unit = one course section on the continuous path ──────────────────────
// Serpentine offsets so the trail winds left → center → right → center …
const OFFSETS = [0, 0.34, 0.5, 0.34, 0, -0.34, -0.5, -0.34];

function UnitSection({
  course,
  accent,
  currentLessonId,
  currentNodeRef,
  sectionRef,
  onOpenLesson,
}: {
  course: CourseView;
  accent: string;
  currentLessonId: string | null;
  currentNodeRef: React.RefObject<HTMLDivElement>;
  sectionRef?: (el: HTMLDivElement | null) => void;
  onOpenLesson: (id: string) => void;
}) {
  return (
    <section className="unit-section">
      {/* Full-width colored unit-header banner (Duolingo style). */}
      <div className="unit-banner" ref={sectionRef} style={{ background: accent }}>
        <div className="unit-banner-eyebrow">{course.level}</div>
        <div className="unit-banner-title">
          <span className="unit-banner-icon">{course.icon}</span>
          {course.title}
        </div>
        <div className="unit-banner-progress">
          {course.completedLessons}/{course.totalLessons} · {course.percent}%
        </div>
      </div>

      <div className="unit-trail">
        {course.lessons.map((lesson, i) => (
          <PathNode
            key={lesson.id}
            lesson={lesson}
            index={i}
            accent={accent}
            isGlobalCurrent={lesson.id === currentLessonId}
            nodeRef={lesson.id === currentLessonId ? currentNodeRef : undefined}
            onOpen={() => onOpenLesson(lesson.id)}
          />
        ))}
      </div>
    </section>
  );
}

function PathNode({
  lesson,
  index,
  accent,
  isGlobalCurrent,
  nodeRef,
  onOpen,
}: {
  lesson: LessonView;
  index: number;
  accent: string;
  isGlobalCurrent: boolean;
  nodeRef?: React.RefObject<HTMLDivElement>;
  onOpen: () => void;
}) {
  const locked = lesson.status === "locked";
  const completed = lesson.status === "completed";
  const current = lesson.status === "current";
  const offset = OFFSETS[index % OFFSETS.length];

  return (
    <div className="path-row" ref={nodeRef} style={{ transform: `translateX(${offset * 150}px)` }}>
      {/* Penny sits beside the single global current node. */}
      {isGlobalCurrent && <Penny mood="happy" beside />}
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
        <span className="path-node-face">{completed ? "★" : locked ? "🔒" : index + 1}</span>
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

// ── Mascot: Penny the squirrel ──────────────────────────────────────────────
function Penny({
  mood,
  beside = false,
}: {
  mood: "happy" | "celebrate" | "think" | "oops";
  beside?: boolean;
}) {
  const face =
    mood === "celebrate" ? "🥳" : mood === "think" ? "🤔" : mood === "oops" ? "😬" : "🐿️";
  const line =
    mood === "celebrate"
      ? "Nut streak secured! 🌰"
      : mood === "think"
      ? "Hmm, let's think…"
      : mood === "oops"
      ? "Every acorn teaches us something."
      : "You're here! Let's go 🌰";
  return (
    <div className={`penny ${beside ? "penny-beside" : ""} penny-${mood}`}>
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
            <button key={i} className={cls} disabled={picked !== null} onClick={() => setPicked(i)}>
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

// Darken a hex color for a node's 3D "lip" shadow.
function shade(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "rgba(0,0,0,0.3)";
  const r = Math.max(0, parseInt(m[1], 16) - 55);
  const g = Math.max(0, parseInt(m[2], 16) - 55);
  const b = Math.max(0, parseInt(m[3], 16) - 55);
  return `rgb(${r}, ${g}, ${b})`;
}
