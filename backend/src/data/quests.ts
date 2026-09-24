import { COURSES, findLesson } from "./learningContent";

/**
 * Money Quests — themed, multi-lesson missions layered over the existing
 * curriculum. A quest is just an ordered set of lesson ids with a wrapper
 * (title, story, badge). Progress is derived from LessonProgress at request
 * time; nothing extra is persisted. Quests give the curriculum an
 * adventure-style structure ("Build a $10K emergency fund") on top of the
 * course/lesson tree.
 *
 * IMPORTANT: lessons unlock sequentially *within their course*, so a quest step
 * is only reachable once every earlier lesson in that step's course is done.
 * Quest lesson lists are therefore curated to respect that ordering, and each
 * step's `locked` state is computed so the UI can point the user at the next
 * lesson they can actually start.
 */

export interface Quest {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  /** Accent color for the quest card. */
  color: string;
  /** Badge awarded on completion (display only). */
  badge: string;
  /** Ordered lesson ids that make up the quest. */
  lessonIds: string[];
}

// NOTE: within any one course the ids must stay in lesson order (…-1, -2, -3).
// Each quest below is curated so its steps become reachable in the listed
// order as the user progresses through the relevant course(s).
export const QUESTS: Quest[] = [
  {
    id: "money-basics",
    title: "Master Money Basics",
    tagline: "The first steps of your financial journey.",
    icon: "🌱",
    color: "#7fb5ff",
    badge: "🌱 Money Rookie",
    // Getting Started, in order — fully reachable from a fresh account.
    lessonIds: ["gs-1", "gs-2", "gs-3", "gs-4"],
  },
  {
    id: "compounding-master",
    title: "Master the Magic of Compounding",
    tagline: "Understand the most powerful force in investing.",
    icon: "🪄",
    color: "#32d296",
    badge: "🪄 Compounder",
    // Financial Literacy 1→2, in order.
    lessonIds: ["fl-1", "fl-2"],
  },
  {
    id: "emergency-fund",
    title: "Build a $10K Emergency Fund",
    tagline: "Create the safety net that protects everything else.",
    icon: "🛟",
    color: "#4db6ac",
    badge: "🛟 Safety Net",
    // Financial Literacy in order — needs fl-1, fl-2 first (compounding quest).
    lessonIds: ["fl-1", "fl-2", "fl-3", "fl-4"],
  },
  {
    id: "first-portfolio",
    title: "Build Your First Portfolio",
    tagline: "Go from zero to a diversified set of holdings.",
    icon: "📈",
    color: "#c792ea",
    badge: "📈 First Portfolio",
    // Building a Portfolio, in order.
    lessonIds: ["bp-1", "bp-2", "bp-3", "bp-4"],
  },
  {
    id: "market-storms",
    title: "Weather the Market's Storms",
    tagline: "Learn to stay calm and rational when markets swing.",
    icon: "⛈️",
    color: "#ff7a3c",
    badge: "⛈️ Storm Rider",
    // Risk & Markets, in order.
    lessonIds: ["rm-1", "rm-2", "rm-3"],
  },
  {
    id: "keep-more",
    title: "Keep More of What You Earn",
    tagline: "Use accounts and taxes to your advantage.",
    icon: "🧾",
    color: "#90caf9",
    badge: "🧾 Tax Strategist",
    // Taxes & Optimization, in order.
    lessonIds: ["tx-1", "tx-2", "tx-3"],
  },
];

export interface QuestStepView {
  lessonId: string;
  title: string;
  completed: boolean;
  current: boolean; // the next startable step
  locked: boolean; // earlier lessons in its course aren't done yet
}

/** A lesson is unlocked when every earlier lesson in its own course is done. */
function isLessonUnlocked(lessonId: string, completed: Set<string>): boolean {
  const loc = findLesson(lessonId);
  if (!loc) return false;
  const priorInCourse = loc.course.lessons.slice(0, loc.index);
  return priorInCourse.every((l) => completed.has(l.id));
}

export interface QuestView {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  color: string;
  badge: string;
  steps: QuestStepView[];
  completedSteps: number;
  totalSteps: number;
  percent: number;
  complete: boolean;
}

/** Assemble quest views for a user given the set of completed lesson ids. */
export function buildQuestViews(completedLessonIds: Set<string>): QuestView[] {
  return QUESTS.map((quest) => {
    let currentAssigned = false;
    const steps: QuestStepView[] = quest.lessonIds
      .filter((id) => findLesson(id)) // guard against stale ids
      .map((lessonId) => {
        const loc = findLesson(lessonId)!;
        const completed = completedLessonIds.has(lessonId);
        const unlocked = isLessonUnlocked(lessonId, completedLessonIds);
        // The "current" step is the first incomplete step that's actually
        // startable (its course-prior lessons are done). This prevents the CTA
        // from pointing at a locked lesson.
        let current = false;
        if (!completed && unlocked && !currentAssigned) {
          current = true;
          currentAssigned = true;
        }
        return {
          lessonId,
          title: loc.lesson.title,
          completed,
          current,
          locked: !completed && !unlocked,
        };
      });

    const completedSteps = steps.filter((s) => s.completed).length;
    const totalSteps = steps.length;
    return {
      id: quest.id,
      title: quest.title,
      tagline: quest.tagline,
      icon: quest.icon,
      color: quest.color,
      badge: quest.badge,
      steps,
      completedSteps,
      totalSteps,
      percent: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
      complete: totalSteps > 0 && completedSteps === totalSteps,
    };
  });
}
