import { prisma } from "../lib/prisma";

/**
 * Half-Life Regression (HLM) spaced-repetition engine.
 *
 * Models human forgetting after Duolingo's HLM (an optimization of Leitner /
 * SuperMemo). For a given item we estimate a half-life `h` (hours) describing
 * how long the user retains it. The probability the user still recalls the item
 * after `dt` hours is:
 *
 *     p = 2^(-dt / h)
 *
 * When p drops below OVERDUE_THRESHOLD the item is "overdue" and should be
 * pulled into the next review session. On each answer we update the half-life:
 * correct answers lengthen it (retention grows), wrong answers shrink it back
 * toward the floor so the item resurfaces soon.
 *
 * State is persisted per (userId, itemId) in the ItemMemory table. Pure math
 * lives in exported functions so it can be reasoned about and unit-tested in
 * isolation; persistence helpers wrap them.
 */

// Recall probability below which an item is considered due for review.
export const OVERDUE_THRESHOLD = 0.7;

// Half-life bounds (hours). Floor keeps freshly-missed items resurfacing within
// a session/day; the cap avoids items effectively never being reviewed again.
const MIN_HALF_LIFE = 0.25; // 15 minutes
const MAX_HALF_LIFE = 24 * 30 * 9; // ~9 months
const INITIAL_HALF_LIFE = 24; // first sighting: assume ~1 day retention

/** Recall probability p = 2^(-dt/h). Clamped to [0,1]. dt & h in hours. */
export function recallProbability(elapsedHours: number, halfLifeHours: number): number {
  if (halfLifeHours <= 0) return 0;
  const dt = Math.max(0, elapsedHours);
  const p = Math.pow(2, -dt / halfLifeHours);
  return Math.min(1, Math.max(0, p));
}

/** Hours between two dates (a before b). Negative clamped to 0. */
export function hoursBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
}

/**
 * Update an item's half-life after an answer.
 *
 * Correct: grow the half-life multiplicatively with the correct-streak, so
 * well-known items spread out quickly (spacing effect). Wrong: collapse it
 * toward the floor so the item comes back almost immediately.
 */
export function nextHalfLife(
  currentHalfLife: number,
  correct: boolean,
  correctStreak: number
): number {
  if (!correct) {
    // Reset toward the floor — a missed item is due again very soon.
    return clampHalfLife(Math.max(MIN_HALF_LIFE, currentHalfLife * 0.25));
  }
  // Growth factor increases with the consecutive-correct streak (2x, 2.4x, …),
  // capped so a lucky run can't explode the interval.
  const factor = Math.min(4, 2 + correctStreak * 0.4);
  return clampHalfLife(Math.max(INITIAL_HALF_LIFE, currentHalfLife * factor));
}

function clampHalfLife(h: number): number {
  return Math.min(MAX_HALF_LIFE, Math.max(MIN_HALF_LIFE, h));
}

// ── Persistence helpers ──────────────────────────────────────────────────────

export interface ItemMemoryLite {
  itemId: string;
  lessonId: string;
  halfLifeHours: number;
  lastReviewed: Date;
  timesSeen: number;
  timesCorrect: number;
  timesWrong: number;
  streak: number;
}

/** All memory rows for a user, keyed by itemId. */
export async function getMemories(userId: string): Promise<Map<string, ItemMemoryLite>> {
  const rows = await prisma.itemMemory.findMany({ where: { userId } });
  const map = new Map<string, ItemMemoryLite>();
  for (const r of rows) {
    map.set(r.itemId, {
      itemId: r.itemId,
      lessonId: r.lessonId,
      halfLifeHours: r.halfLifeHours,
      lastReviewed: r.lastReviewed,
      timesSeen: r.timesSeen,
      timesCorrect: r.timesCorrect,
      timesWrong: r.timesWrong,
      streak: r.streak,
    });
  }
  return map;
}

/** Memory rows for a specific lesson's items, keyed by itemId. */
export async function getLessonMemories(
  userId: string,
  lessonId: string
): Promise<Map<string, ItemMemoryLite>> {
  const rows = await prisma.itemMemory.findMany({ where: { userId, lessonId } });
  const map = new Map<string, ItemMemoryLite>();
  for (const r of rows) {
    map.set(r.itemId, {
      itemId: r.itemId,
      lessonId: r.lessonId,
      halfLifeHours: r.halfLifeHours,
      lastReviewed: r.lastReviewed,
      timesSeen: r.timesSeen,
      timesCorrect: r.timesCorrect,
      timesWrong: r.timesWrong,
      streak: r.streak,
    });
  }
  return map;
}

/**
 * Is this item overdue for review right now? Unseen items are never "overdue"
 * (they're "new", handled separately by the session builder).
 */
export function isOverdue(mem: ItemMemoryLite, now: Date = new Date()): boolean {
  const dt = hoursBetween(mem.lastReviewed, now);
  return recallProbability(dt, mem.halfLifeHours) < OVERDUE_THRESHOLD;
}

/** Current recall probability for an item (for sorting / display). */
export function currentRecall(mem: ItemMemoryLite, now: Date = new Date()): number {
  return recallProbability(hoursBetween(mem.lastReviewed, now), mem.halfLifeHours);
}

export interface ReviewOutcome {
  itemId: string;
  lessonId: string;
  courseId: string;
  correct: boolean;
}

/**
 * Record a batch of answer outcomes, updating (or creating) each item's HLM
 * state. Runs inside a transaction so a session's updates are atomic. Should be
 * called with a transaction client when part of a larger commit; falls back to
 * the shared prisma client otherwise.
 */
export async function recordReviews(
  userId: string,
  outcomes: ReviewOutcome[],
  now: Date = new Date(),
  tx: Pick<typeof prisma, "itemMemory"> = prisma
): Promise<void> {
  for (const o of outcomes) {
    const existing = await tx.itemMemory.findUnique({
      where: { userId_itemId: { userId, itemId: o.itemId } },
    });

    if (!existing) {
      const streak = o.correct ? 1 : 0;
      const halfLife = o.correct
        ? nextHalfLife(INITIAL_HALF_LIFE, true, 0)
        : MIN_HALF_LIFE;
      await tx.itemMemory.create({
        data: {
          userId,
          itemId: o.itemId,
          lessonId: o.lessonId,
          courseId: o.courseId,
          halfLifeHours: halfLife,
          lastReviewed: now,
          timesSeen: 1,
          timesCorrect: o.correct ? 1 : 0,
          timesWrong: o.correct ? 0 : 1,
          streak,
        },
      });
      continue;
    }

    const newStreak = o.correct ? existing.streak + 1 : 0;
    const newHalfLife = nextHalfLife(existing.halfLifeHours, o.correct, existing.streak);
    await tx.itemMemory.update({
      where: { userId_itemId: { userId, itemId: o.itemId } },
      data: {
        halfLifeHours: newHalfLife,
        lastReviewed: now,
        timesSeen: existing.timesSeen + 1,
        timesCorrect: existing.timesCorrect + (o.correct ? 1 : 0),
        timesWrong: existing.timesWrong + (o.correct ? 0 : 1),
        streak: newStreak,
      },
    });
  }
}

/** Count of items currently overdue for a user (for the "review" CTA). */
export async function countOverdue(userId: string, now: Date = new Date()): Promise<number> {
  const mems = await getMemories(userId);
  let n = 0;
  for (const m of mems.values()) if (isOverdue(m, now)) n++;
  return n;
}
