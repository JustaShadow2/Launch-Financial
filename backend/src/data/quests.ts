import { findLesson } from "./learningContent";

/**
 * Money Quests — themed, multi-lesson missions layered over the existing
 * curriculum. A quest is just an ordered set of lesson ids with a wrapper
 * (title, story, badge). Progress is derived from LessonProgress at request
 * time; nothing extra is persisted. Quests give the curriculum an
 * adventure-style structure ("Build a $10K emergency fund") on top of the
 * course/lesson tree.
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

export const QUESTS: Quest[] = [
  {
    id: "emergency-fund",
    title: "Build a $10K Emergency Fund",
    tagline: "Create the safety net that protects everything else.",
    icon: "🛟",
    color: "#7fb5ff",
    badge: "🛟 Safety Net",
    lessonIds: ["fl-2", "fl-3", "fl-4"],
  },
  {
    id: "first-portfolio",
    title: "Build Your First Portfolio",
    tagline: "Go from zero to a diversified set of holdings.",
    icon: "📈",
    color: "#c792ea",
    badge: "📈 First Portfolio",
    lessonIds: ["gs-1", "gs-2", "bp-1", "bp-2", "bp-3"],
  },
  {
    id: "market-storms",
    title: "Weather the Market's Storms",
    tagline: "Learn to stay calm and rational when markets swing.",
    icon: "⛈️",
    color: "#ff7a3c",
    badge: "⛈️ Storm Rider",
    lessonIds: ["rm-1", "rm-2", "rm-3", "bf-1"],
  },
  {
    id: "compounding-master",
    title: "Master the Magic of Compounding",
    tagline: "Understand the most powerful force in investing.",
    icon: "🪄",
    color: "#32d296",
    badge: "🪄 Compounder",
    lessonIds: ["fl-1", "gs-1", "bp-4"],
  },
  {
    id: "keep-more",
    title: "Keep More of What You Earn",
    tagline: "Use accounts and taxes to your advantage.",
    icon: "🧾",
    color: "#90caf9",
    badge: "🧾 Tax Strategist",
    lessonIds: ["gs-4", "tx-1", "tx-2", "at-1"],
  },
];

export interface QuestStepView {
  lessonId: string;
  title: string;
  completed: boolean;
  current: boolean; // the next incomplete step
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
        let current = false;
        if (!completed && !currentAssigned) {
          current = true;
          currentAssigned = true;
        }
        return { lessonId, title: loc.lesson.title, completed, current };
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
