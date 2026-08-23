import { prisma } from "../lib/prisma";
import {
  COURSES,
  COURSE_MAP,
  Course,
  Lesson,
  QuizQuestion,
  TOTAL_LESSONS,
  findLesson,
} from "../data/learningContent";

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

export interface LearnStats {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  completedLessons: number;
  totalLessons: number;
  dailyGoalMet: boolean; // completed a lesson today?
  lastLessonDay: string | null;
}

// ── Progress assembly ────────────────────────────────────────────────────────

async function getCompletedSet(userId: string): Promise<Map<string, { correct: number; total: number }>> {
  const rows = await prisma.lessonProgress.findMany({ where: { userId } });
  const map = new Map<string, { correct: number; total: number }>();
  for (const r of rows) map.set(r.lessonId, { correct: r.correct, total: r.total });
  return map;
}

function buildCourseView(
  course: Course,
  completed: Map<string, { correct: number; total: number }>
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const completedLessons = await prisma.lessonProgress.count({ where: { userId } });
  const today = dayString();
  return {
    xp: user?.xp ?? 0,
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    completedLessons,
    totalLessons: TOTAL_LESSONS,
    dailyGoalMet: user?.lastLessonDay === today,
    lastLessonDay: user?.lastLessonDay ?? null,
  };
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
  };
}

// ── Completion + streak/XP ────────────────────────────────────────────────────

interface CompleteInput {
  userId: string;
  lessonId: string;
  answers: number[]; // selected option index per question, in order
}

export interface CompleteResult {
  correct: number;
  total: number;
  passed: boolean;
  xpEarned: number;
  results: Array<{ questionId: string; correct: boolean; correctAnswer: number; explanation: string }>;
  stats: LearnStats;
  firstCompletion: boolean;
}

// Require getting most questions right to "pass" and earn full XP.
function passThreshold(total: number): number {
  // Need at least ceil(total * 0.6) correct.
  return Math.ceil(total * 0.6);
}

export async function completeLesson({ userId, lessonId, answers }: CompleteInput): Promise<CompleteResult> {
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

  const questions = loc.lesson.questions;
  const results = questions.map((q: QuizQuestion, i: number) => {
    const selected = answers[i];
    const isCorrect = selected === q.answer;
    return {
      questionId: q.id,
      correct: isCorrect,
      correctAnswer: q.answer,
      explanation: q.explanation,
    };
  });

  const correct = results.filter((r) => r.correct).length;
  const total = questions.length;
  const passed = correct >= passThreshold(total);

  if (!passed) {
    // Don't record completion or award XP; let them retry.
    const stats = await getStats(userId);
    return { correct, total, passed, xpEarned: 0, results, stats, firstCompletion: false };
  }

  const firstCompletion = !alreadyDone;
  const xpEarned = firstCompletion ? loc.lesson.xp : Math.round(loc.lesson.xp * 0.25); // reduced XP on repeats

  await prisma.$transaction(async (tx) => {
    // Upsert the progress row (records latest score).
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        courseId: loc.course.id,
        lessonId,
        correct,
        total,
        xpEarned,
      },
      update: { correct, total, completedAt: new Date() },
    });

    // Update XP + streak on the user.
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new LearnError("User not found", 404);

    const today = dayString();
    let currentStreak = user.currentStreak;

    if (user.lastLessonDay === today) {
      // Already practiced today; streak unchanged.
    } else if (user.lastLessonDay && daysBetween(user.lastLessonDay, today) === 1) {
      // Consecutive day: extend streak.
      currentStreak = user.currentStreak + 1;
    } else {
      // First ever, or a gap: (re)start streak at 1.
      currentStreak = 1;
    }
    const longestStreak = Math.max(user.longestStreak, currentStreak);

    await tx.user.update({
      where: { id: userId },
      data: {
        xp: user.xp + xpEarned,
        currentStreak,
        longestStreak,
        lastLessonDay: today,
      },
    });
  });

  const stats = await getStats(userId);
  return { correct, total, passed, xpEarned, results, stats, firstCompletion };
}

export function courseExists(courseId: string): boolean {
  return Boolean(COURSE_MAP[courseId]);
}
