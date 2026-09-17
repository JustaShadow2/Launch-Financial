import { prisma } from "../lib/prisma";
import {
  COURSES,
  COURSE_MAP,
  Course,
  Lesson,
  QuizQuestion,
  ItemAnswer,
  GradeResult,
  TOTAL_LESSONS,
  findLesson,
  gradeQuestion,
  correctIndexOf,
  explanationOf,
} from "../data/learningContent";
import { countOverdue, recordReviews, ReviewOutcome } from "./spacedRepetition";
import { buildQuestViews } from "../data/quests";
import { challengeForDay } from "../data/dailyChallenges";
import {
  buildLessonSession,
  buildReviewSession,
  findQuestionById,
  ownerLessonOf,
} from "./learnSession";

/**
 * Learning service: computes course/lesson progress, handles lesson completion,
 * and manages Duolingo-style XP + daily streak logic.
 *
 * Content is static (data/learningContent.ts). This service joins it with the
 * per-user LessonProgress rows and the streak/XP fields on the User.
 */

// ── Date helpers (streak logic keys off the user's local-ish day string) ─────

export function dayString(d: Date = new Date()): string {
  // YYYY-MM-DD in UTC. Good enough for a simulated app; consistent per user.
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}

// ── View models ─────────────────────────────────────────────────────────────

export interface LessonView {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
  status: "completed" | "current" | "locked";
  correct?: number;
  total?: number;
  crownLevel: number; // 0..5; 0 for not-yet-completed lessons
}

export interface CourseView {
  id: string;
  title: string;
  description: string;
  level: string;
  icon: string;
  color: string;
  totalLessons: number;
  completedLessons: number;
  percent: number;
  lessons: LessonView[];
}

export interface Skill {
  key: string;
  label: string;
  icon: string;
  percent: number; // 0..100 mastery across this skill's courses
}

export interface LearnStats {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  completedLessons: number;
  totalLessons: number;
  dailyGoalMet: boolean; // completed a lesson today?
  lastLessonDay: string | null;
  streakFreezes: number;
  freezeUsedDay: string | null; // set when a freeze auto-saved the streak
  overdueItems: number; // items due for spaced-repetition review
  skills: Skill[]; // mastery bars across broad topic areas
  level: number; // derived player level from XP
}

// Broad skill areas, each spanning a set of course ids. Mastery is the share of
// those courses' lessons the user has completed.
const SKILL_GROUPS: { key: string; label: string; icon: string; courseIds: string[] }[] = [
  { key: "basics", label: "Money Basics", icon: "💵", courseIds: ["getting-started", "financial-literacy"] },
  { key: "investing", label: "Investing", icon: "📈", courseIds: ["building-portfolio", "stocks-deep-dive", "funds-and-income", "investing-strategies"] },
  { key: "markets", label: "Markets", icon: "🎢", courseIds: ["risk-and-markets", "market-mechanics", "macro-economy", "behavioral-finance"] },
  { key: "analysis", label: "Analysis", icon: "🔍", courseIds: ["reading-companies", "deeper-fundamentals"] },
  { key: "advanced", label: "Advanced", icon: "🚀", courseIds: ["options-from-scratch", "advanced-options", "margin-and-shorting", "crypto-alternatives"] },
  { key: "planning", label: "Planning & Tax", icon: "🗺️", courseIds: ["taxes-optimization", "planning-pitfalls", "account-tax-strategy", "managed-thematic"] },
];

// XP needed grows each level; simple curve: level n starts at 100*n*(n-1)/2 ... .
function levelForXp(xp: number): number {
  // Each level costs 100 more than the last: L1@0, L2@100, L3@300, L4@600, …
  let level = 1;
  let need = 100;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    level++;
    need += 100;
  }
  return level;
}

// ── Progress assembly ────────────────────────────────────────────────────────

interface Progress {
  correct: number;
  total: number;
  crownLevel: number;
}

async function getCompletedSet(userId: string): Promise<Map<string, Progress>> {
  const rows = await prisma.lessonProgress.findMany({ where: { userId } });
  const map = new Map<string, Progress>();
  for (const r of rows)
    map.set(r.lessonId, { correct: r.correct, total: r.total, crownLevel: r.crownLevel });
  return map;
}

function buildCourseView(
  course: Course,
  completed: Map<string, Progress>
): CourseView {
  let completedCount = 0;
  let foundCurrent = false;

  const lessons: LessonView[] = course.lessons.map((lesson) => {
    const done = completed.get(lesson.id);
    let status: LessonView["status"];
    if (done) {
      status = "completed";
      completedCount++;
    } else if (!foundCurrent) {
      // First not-yet-completed lesson in the course is the "current" one.
      status = "current";
      foundCurrent = true;
    } else {
      status = "locked";
    }
    return {
      id: lesson.id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      minutes: lesson.minutes,
      xp: lesson.xp,
      status,
      correct: done?.correct,
      total: done?.total,
      crownLevel: done?.crownLevel ?? 0,
    };
  });

  const totalLessons = course.lessons.length;
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    level: course.level,
    icon: course.icon,
    color: course.color,
    totalLessons,
    completedLessons: completedCount,
    percent: totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0,
    lessons,
  };
}

export async function getCourses(userId: string): Promise<CourseView[]> {
  const completed = await getCompletedSet(userId);
  return COURSES.map((c) => buildCourseView(c, completed));
}

export async function getStats(userId: string): Promise<LearnStats> {
  // Run the lazy "daily validation loop" first — since there's no cron, we
  // evaluate the streak/freeze state whenever stats are read.
  const user = await validateStreak(userId);
  const completed = await getCompletedSet(userId);
  const completedLessons = completed.size;
  const overdueItems = await countOverdue(userId);
  const today = dayString();

  // Skill mastery: share of each group's course lessons completed.
  const skills: Skill[] = SKILL_GROUPS.map((g) => {
    let total = 0;
    let done = 0;
    for (const cid of g.courseIds) {
      const course = COURSE_MAP[cid];
      if (!course) continue;
      total += course.lessons.length;
      done += course.lessons.filter((l) => completed.has(l.id)).length;
    }
    return {
      key: g.key,
      label: g.label,
      icon: g.icon,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  });

  const xp = user?.xp ?? 0;
  return {
    xp,
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    completedLessons,
    totalLessons: TOTAL_LESSONS,
    dailyGoalMet: user?.lastLessonDay === today,
    lastLessonDay: user?.lastLessonDay ?? null,
    streakFreezes: user?.streakFreezes ?? 0,
    freezeUsedDay: user?.freezeUsedDay ?? null,
    overdueItems,
    skills,
    level: levelForXp(xp),
  };
}

/** Today's daily money challenge (rotates by calendar day). */
export function getDailyChallenge() {
  return challengeForDay(dayString());
}

/**
 * Lazy daily-validation loop (blueprint §1A). Because we have no midnight cron,
 * we evaluate on read: if the user missed exactly the days since their last
 * lesson, spend one streak freeze per missed day to keep the streak alive
 * (bounded by how many freezes they hold). If they can't cover the gap, the
 * streak resets to 0. Returns the (possibly updated) user row.
 */
async function validateStreak(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const today = dayString();
  const last = user.lastLessonDay;
  if (!last) return user; // never practiced; nothing to validate

  const gap = daysBetween(last, today);
  // Practiced today or yesterday → streak is still valid, no action.
  if (gap <= 1) return user;

  // Missed (gap - 1) full days between the last active day and today. Each
  // missed day can be covered by one freeze.
  const missedDays = gap - 1;
  if (user.currentStreak > 0 && user.streakFreezes >= missedDays) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        streakFreezes: user.streakFreezes - missedDays,
        // Advance lastLessonDay to yesterday so the streak stays "current"
        // without falsely marking today's goal as met.
        lastLessonDay: dayString(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        freezeUsedDay: today,
      },
    });
    return updated;
  }

  // Can't cover the gap → reset the streak.
  if (user.currentStreak > 0) {
    return prisma.user.update({
      where: { id: userId },
      data: { currentStreak: 0 },
    });
  }
  return user;
}

/**
 * The recommended "1 lesson per day" — the next uncompleted lesson in course
 * order. Returns null if everything is complete.
 */
export async function getDailyLesson(userId: string): Promise<{
  courseId: string;
  courseTitle: string;
  courseIcon: string;
  lessonId: string;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
} | null> {
  const completed = await getCompletedSet(userId);
  for (const course of COURSES) {
    for (const lesson of course.lessons) {
      if (!completed.has(lesson.id)) {
        return {
          courseId: course.id,
          courseTitle: course.title,
          courseIcon: course.icon,
          lessonId: lesson.id,
          title: lesson.title,
          subtitle: lesson.subtitle,
          minutes: lesson.minutes,
          xp: lesson.xp,
        };
      }
    }
  }
  return null;
}

// ── Lesson content (with lock enforcement) ───────────────────────────────────

export class LearnError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Returns full lesson content (slides + questions). Enforces sequential unlock:
 * a lesson is accessible only if all prior lessons in its course are complete,
 * or it's already completed.
 */
export async function getLessonContent(userId: string, lessonId: string) {
  const loc = findLesson(lessonId);
  if (!loc) throw new LearnError("Lesson not found", 404);

  const completed = await getCompletedSet(userId);
  const priorLessons = loc.course.lessons.slice(0, loc.index);
  const allPriorDone = priorLessons.every((l) => completed.has(l.id));
  const alreadyDone = completed.has(lessonId);

  if (!allPriorDone && !alreadyDone) {
    throw new LearnError("Complete the earlier lessons in this course first", 403);
  }

  return {
    courseId: loc.course.id,
    courseTitle: loc.course.title,
    courseColor: loc.course.color,
    lesson: loc.lesson,
    alreadyCompleted: alreadyDone,
    crownLevel: completed.get(lessonId)?.crownLevel ?? 0,
  };
}

// ── Interactive sessions (spaced repetition + interleaving) ──────────────────

/**
 * Build an interleaved quiz session for a lesson, enforcing the same unlock
 * rules as content access. The session mixes new lesson items with spaced
 * review + recent-mistake reinforcement (see learnSession.ts).
 */
export async function getLessonSession(userId: string, lessonId: string) {
  const loc = findLesson(lessonId);
  if (!loc) throw new LearnError("Lesson not found", 404);

  const completed = await getCompletedSet(userId);
  const priorLessons = loc.course.lessons.slice(0, loc.index);
  const allPriorDone = priorLessons.every((l) => completed.has(l.id));
  const alreadyDone = completed.has(lessonId);
  if (!allPriorDone && !alreadyDone) {
    throw new LearnError("Complete the earlier lessons in this course first", 403);
  }

  const crownLevel = completed.get(lessonId)?.crownLevel ?? 0;
  const session = await buildLessonSession(userId, lessonId, crownLevel);
  if (!session) throw new LearnError("Lesson not found", 404);
  return session;
}

/** Money Quests with per-user progress derived from completed lessons. */
export async function getQuests(userId: string) {
  const completed = await getCompletedSet(userId);
  const ids = new Set(completed.keys());
  return buildQuestViews(ids);
}

/** Build a curriculum-wide review session of the user's most overdue items. */
export async function getReviewSession(userId: string) {
  const session = await buildReviewSession(userId);
  if (!session) throw new LearnError("Nothing to review right now — great job!", 404);
  return session;
}

/**
 * Grade a single item's answer authoritatively on the server. The client calls
 * this for instant right/wrong feedback during a session (needed for the
 * mistake recycler), so the correct answer never has to be shipped to the
 * client for the interactive types. Returns correctness + explanation (+ the
 * correct index for choice-style reveal).
 */
export function gradeItem(itemId: string, answer: ItemAnswer | undefined): GradeResult {
  const q = findQuestionById(itemId);
  if (!q) throw new LearnError("Item not found", 404);
  return gradeQuestion(q, answer);
}

export interface ReviewResult {
  correct: number;
  total: number;
  xpEarned: number;
  stats: LearnStats;
  freezeEarned: boolean;
}

/**
 * Complete a spaced-repetition review session. Unlike a lesson, this doesn't
 * touch crown levels or lesson-completion — it records HLM memory updates and
 * counts as daily practice (keeping the streak alive, earning modest XP).
 */
export async function completeReview({
  userId,
  responses,
}: {
  userId: string;
  responses: ItemResponse[];
}): Promise<ReviewResult> {
  const seen = new Set<string>();
  const reviewOutcomes: ReviewOutcome[] = [];
  let firstTryCorrect = 0;

  for (const r of responses) {
    if (seen.has(r.itemId)) continue;
    const q = findQuestionById(r.itemId);
    if (!q) continue;
    seen.add(r.itemId);
    const owner = ownerLessonOf(r.itemId);
    const ownerLoc = findLesson(owner);
    const correct = Boolean(r.firstTry);
    if (correct) firstTryCorrect++;
    reviewOutcomes.push({
      itemId: r.itemId,
      lessonId: owner,
      courseId: ownerLoc?.course.id ?? "",
      correct,
    });
  }

  const total = reviewOutcomes.length;
  if (total === 0) throw new LearnError("No valid review items submitted", 400);

  // Modest XP for review — encourages the habit without inflating totals.
  const xpEarned = 5 + firstTryCorrect;
  let freezeEarned = false;

  await prisma.$transaction(async (tx) => {
    await recordReviews(userId, reviewOutcomes, new Date(), tx);

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new LearnError("User not found", 404);

    const today = dayString();
    let currentStreak = user.currentStreak;
    if (user.lastLessonDay === today) {
      // Already practiced today.
    } else if (user.lastLessonDay && daysBetween(user.lastLessonDay, today) === 1) {
      currentStreak = user.currentStreak + 1;
    } else {
      currentStreak = 1;
    }
    const longestStreak = Math.max(user.longestStreak, currentStreak);

    let streakFreezes = user.streakFreezes;
    let freezeLastEarnedDay = user.freezeLastEarnedDay;
    if (
      FREEZE_MILESTONES.has(currentStreak) &&
      user.freezeLastEarnedDay !== today &&
      streakFreezes < MAX_FREEZES
    ) {
      streakFreezes = Math.min(MAX_FREEZES, streakFreezes + 1);
      freezeLastEarnedDay = today;
      freezeEarned = true;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        xp: user.xp + xpEarned,
        currentStreak,
        longestStreak,
        lastLessonDay: today,
        streakFreezes,
        freezeLastEarnedDay,
      },
    });
  });

  const stats = await getStats(userId);
  return { correct: firstTryCorrect, total, xpEarned, stats, freezeEarned };
}

// ── Completion + streak/XP ────────────────────────────────────────────────────

// A single item response submitted from a completed session. `firstTry`
// reflects whether the user got it right on the FIRST attempt (before the
// mistake recycler requeued it) — that's what drives grading, HLM, and the
// accuracy bonus. The recycler guarantees every item is eventually answered
// correctly, so raw "final correctness" would always be 100%.
export interface ItemResponse {
  itemId: string;
  firstTry: boolean;
}

interface CompleteInput {
  userId: string;
  lessonId: string;
  responses: ItemResponse[];
  // Total active answering time in seconds (for the speed bonus). Optional.
  durationSeconds?: number;
}

export interface CompleteResult {
  correct: number;
  total: number;
  passed: boolean;
  xpEarned: number;
  xpBreakdown: { base: number; accuracyBonus: number; speedBonus: number };
  crownLevel: number;
  leveledUp: boolean;
  results: Array<{ questionId: string; correct: boolean; correctAnswer: number; explanation: string }>;
  stats: LearnStats;
  firstCompletion: boolean;
  freezeEarned: boolean;
}

// Require getting most items right on the FIRST try to "pass" and earn full XP.
function passThreshold(total: number): number {
  return Math.ceil(total * 0.6);
}

// Streak milestones (in days) at which the user earns a streak freeze, capped
// so the wallet can't balloon. Mirrors Duolingo's milestone rewards.
const FREEZE_MILESTONES = new Set([7, 14, 30, 60, 100, 150, 200, 365]);
const MAX_FREEZES = 5;

/**
 * XP with speed & accuracy bonuses (blueprint §1C):
 *   - base: the lesson's XP (full on first completion, quarter on replays)
 *   - accuracy bonus: up to +5 for a flawless first-try run
 *   - speed bonus: up to +5 for finishing quickly without errors
 */
function computeXp(
  baseXp: number,
  firstCompletion: boolean,
  total: number,
  firstTryCorrect: number,
  durationSeconds: number | undefined
): { base: number; accuracyBonus: number; speedBonus: number; total: number } {
  const base = firstCompletion ? baseXp : Math.round(baseXp * 0.25);

  const accuracy = total > 0 ? firstTryCorrect / total : 0;
  // Flawless → +5, scaling down; only meaningful on strong runs.
  const accuracyBonus = accuracy >= 1 ? 5 : accuracy >= 0.9 ? 3 : accuracy >= 0.8 ? 1 : 0;

  // Speed: reward ≲8s per item with no first-try misses. Up to +5.
  let speedBonus = 0;
  if (durationSeconds != null && total > 0 && firstTryCorrect === total) {
    const perItem = durationSeconds / total;
    if (perItem <= 5) speedBonus = 5;
    else if (perItem <= 8) speedBonus = 3;
    else if (perItem <= 12) speedBonus = 1;
  }

  return { base, accuracyBonus, speedBonus, total: base + accuracyBonus + speedBonus };
}

export async function completeLesson({
  userId,
  lessonId,
  responses,
  durationSeconds,
}: CompleteInput): Promise<CompleteResult> {
  const loc = findLesson(lessonId);
  if (!loc) throw new LearnError("Lesson not found", 404);

  // Enforce unlock before grading.
  const completedBefore = await getCompletedSet(userId);
  const priorLessons = loc.course.lessons.slice(0, loc.index);
  const allPriorDone = priorLessons.every((l) => completedBefore.has(l.id));
  const alreadyDone = completedBefore.has(lessonId);
  if (!allPriorDone && !alreadyDone) {
    throw new LearnError("Complete the earlier lessons in this course first", 403);
  }

  // Grade authoritatively by itemId against the static content. The client
  // sends per-item first-try outcomes; we look up each question to build the
  // review outcomes and the explanation payload.
  const seen = new Set<string>();
  const reviewOutcomes: ReviewOutcome[] = [];
  const results: CompleteResult["results"] = [];
  let firstTryCorrect = 0;

  for (const r of responses) {
    if (seen.has(r.itemId)) continue; // ignore dupes
    const q = findQuestionById(r.itemId);
    if (!q) continue;
    seen.add(r.itemId);
    const owner = ownerLessonOf(r.itemId);
    const ownerLoc = findLesson(owner);
    const correct = Boolean(r.firstTry);
    if (correct) firstTryCorrect++;
    reviewOutcomes.push({
      itemId: r.itemId,
      lessonId: owner,
      courseId: ownerLoc?.course.id ?? loc.course.id,
      correct,
    });
    results.push({
      questionId: q.id,
      correct,
      correctAnswer: correctIndexOf(q),
      explanation: explanationOf(q),
    });
  }

  const total = results.length;
  const passed = total > 0 && firstTryCorrect >= passThreshold(total);

  if (!passed) {
    // Still record spaced-repetition memory (the attempt is real learning
    // signal), but don't complete the lesson, award XP, or touch the streak.
    await recordReviews(userId, reviewOutcomes);
    const stats = await getStats(userId);
    const prog = completedBefore.get(lessonId);
    return {
      correct: firstTryCorrect,
      total,
      passed,
      xpEarned: 0,
      xpBreakdown: { base: 0, accuracyBonus: 0, speedBonus: 0 },
      crownLevel: prog ? prog.crownLevel : 0,
      leveledUp: false,
      results,
      stats,
      firstCompletion: false,
      freezeEarned: false,
    };
  }

  const firstCompletion = !alreadyDone;
  const priorCrown = completedBefore.get(lessonId)?.crownLevel ?? 0;
  const newCrown = Math.min(5, priorCrown + 1); // level up the node, cap at 5
  const leveledUp = newCrown > priorCrown;

  const xp = computeXp(loc.lesson.xp, firstCompletion, total, firstTryCorrect, durationSeconds);

  let freezeEarned = false;

  await prisma.$transaction(async (tx) => {
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        courseId: loc.course.id,
        lessonId,
        correct: firstTryCorrect,
        total,
        xpEarned: xp.total,
        crownLevel: newCrown,
      },
      update: {
        correct: firstTryCorrect,
        total,
        completedAt: new Date(),
        crownLevel: newCrown,
      },
    });

    // Persist spaced-repetition memory for every item in the session.
    await recordReviews(userId, reviewOutcomes, new Date(), tx);

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new LearnError("User not found", 404);

    const today = dayString();
    let currentStreak = user.currentStreak;
    if (user.lastLessonDay === today) {
      // Already practiced today; streak unchanged.
    } else if (user.lastLessonDay && daysBetween(user.lastLessonDay, today) === 1) {
      currentStreak = user.currentStreak + 1;
    } else {
      currentStreak = 1;
    }
    const longestStreak = Math.max(user.longestStreak, currentStreak);

    // Earn a streak freeze at milestones (once per day, capped).
    let streakFreezes = user.streakFreezes;
    let freezeLastEarnedDay = user.freezeLastEarnedDay;
    if (
      FREEZE_MILESTONES.has(currentStreak) &&
      user.freezeLastEarnedDay !== today &&
      streakFreezes < MAX_FREEZES
    ) {
      streakFreezes = Math.min(MAX_FREEZES, streakFreezes + 1);
      freezeLastEarnedDay = today;
      freezeEarned = true;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        xp: user.xp + xp.total,
        currentStreak,
        longestStreak,
        lastLessonDay: today,
        streakFreezes,
        freezeLastEarnedDay,
      },
    });
  });

  const stats = await getStats(userId);
  return {
    correct: firstTryCorrect,
    total,
    passed,
    xpEarned: xp.total,
    xpBreakdown: { base: xp.base, accuracyBonus: xp.accuracyBonus, speedBonus: xp.speedBonus },
    crownLevel: newCrown,
    leveledUp,
    results,
    stats,
    firstCompletion,
    freezeEarned,
  };
}

export function courseExists(courseId: string): boolean {
  return Boolean(COURSE_MAP[courseId]);
}
