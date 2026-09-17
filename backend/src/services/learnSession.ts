import {
  COURSES,
  QuizQuestion,
  RenderableItem,
  findLesson,
  Lesson,
  toRenderable,
} from "../data/learningContent";
import {
  ItemMemoryLite,
  currentRecall,
  getMemories,
  isOverdue,
} from "./spacedRepetition";

/**
 * Session builder — assembles a single interactive lesson session as an
 * interleaved, deterministic-length stack of quiz items, following Duolingo's
 * mix and the mistake-recycler pattern.
 *
 * Interleaving target (from the blueprint): 60% new concepts, 20% recent
 * reinforcement (items the user recently got wrong), 20% historical spaced
 * repetition (overdue items from the wider curriculum). The nominal session
 * size is 15 items, but it adapts down to the pool actually available so short
 * lessons aren't padded with filler.
 *
 * A "new" item here means a question the user hasn't yet answered correctly in
 * a way that's still retained; the crown level raises difficulty by increasing
 * the target session size and pulling in more review items.
 */

const NOMINAL_SESSION = 15;
const MIN_SESSION = 4; // never a trivially short session if content allows

// A session item carries the full renderable payload for its type (choice,
// decision, allocation, market_event) plus session context. Correct answers
// for choice-style items are omitted (see toRenderable); grading is server-side.
export interface SessionItem extends RenderableItem {
  lessonId: string;
  courseId: string;
  // Where the item came from, for UI hinting ("Review" badge, etc.).
  origin: "new" | "reinforcement" | "review";
}

export interface LessonSession {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  courseColor: string;
  lessonTitle: string;
  crownLevel: number;
  targetCorrect: number; // pass threshold for this session
  items: SessionItem[];
}

// Fisher–Yates shuffle (returns a new array).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * All quiz questions for a lesson, flattened with their course context.
 */
function lessonQuestions(lessonId: string): {
  courseId: string;
  courseTitle: string;
  courseColor: string;
  lesson: Lesson;
  questions: QuizQuestion[];
} | null {
  const loc = findLesson(lessonId);
  if (!loc) return null;
  return {
    courseId: loc.course.id,
    courseTitle: loc.course.title,
    courseColor: loc.course.color,
    lesson: loc.lesson,
    questions: loc.lesson.questions,
  };
}

function toSessionItem(
  q: QuizQuestion,
  lessonId: string,
  courseId: string,
  origin: SessionItem["origin"]
): SessionItem {
  return {
    ...toRenderable(q),
    lessonId,
    courseId,
    origin,
  };
}

/**
 * Build a session for a lesson. `crownLevel` is the user's current crown for
 * this lesson (0 = not yet completed). Higher crowns → larger target session
 * and more review interleaving.
 */
export async function buildLessonSession(
  userId: string,
  lessonId: string,
  crownLevel: number
): Promise<LessonSession | null> {
  const lq = lessonQuestions(lessonId);
  if (!lq) return null;

  const memories = await getMemories(userId);
  const now = new Date();

  // The lesson's own questions are the "new" backbone of the session.
  const lessonPool = lq.questions;

  // Recent-mistake reinforcement: items (from any lesson) the user recently
  // got wrong and hasn't re-learned — i.e. low recall and a wrong-heavy record.
  const reinforcementCandidates: QuizQuestion[] = [];
  const reviewCandidates: { q: QuizQuestion; recall: number }[] = [];

  // Pull cross-curriculum items for review/reinforcement from other completed
  // lessons' memories. We look up the question content by id.
  for (const mem of memories.values()) {
    // Skip items belonging to the current lesson; those are the "new" pool.
    if (mem.lessonId === lessonId) continue;
    const q = findQuestionById(mem.itemId);
    if (!q) continue;
    const recall = currentRecall(mem, now);
    if (mem.timesWrong > mem.timesCorrect && recall < 0.85) {
      reinforcementCandidates.push(q);
    } else if (isOverdue(mem, now)) {
      reviewCandidates.push({ q, recall });
    }
  }

  // Sort review by lowest recall first (most in danger of being forgotten).
  reviewCandidates.sort((a, b) => a.recall - b.recall);

  // Target session size scales gently with crown level (harder = longer),
  // capped at the nominal 15 and adapted to available content.
  const crownBoost = Math.min(crownLevel, 5) * 1; // +1 item per crown, up to +5
  const desired = Math.min(NOMINAL_SESSION, lessonPool.length + crownBoost + 4);

  // Composition targets (60/20/20) computed from the desired size.
  const newCount = Math.min(lessonPool.length, Math.round(desired * 0.6) || lessonPool.length);
  const reinforceCount = Math.min(
    reinforcementCandidates.length,
    Math.max(0, Math.round(desired * 0.2))
  );
  const reviewCount = Math.min(reviewCandidates.length, Math.max(0, Math.round(desired * 0.2)));

  const items: SessionItem[] = [];

  // New: prefer lesson questions the user hasn't mastered yet, then fill.
  const newPicked = pickNewItems(lessonPool, memories, newCount, now);
  for (const q of newPicked) items.push(toSessionItem(q, lessonId, lq.courseId, "new"));

  // Reinforcement.
  for (const q of shuffle(reinforcementCandidates).slice(0, reinforceCount)) {
    const owner = findLesson(ownerLessonOf(q.id));
    items.push(
      toSessionItem(q, ownerLessonOf(q.id), owner?.course.id ?? lq.courseId, "reinforcement")
    );
  }

  // Review.
  for (const { q } of reviewCandidates.slice(0, reviewCount)) {
    const owner = findLesson(ownerLessonOf(q.id));
    items.push(toSessionItem(q, ownerLessonOf(q.id), owner?.course.id ?? lq.courseId, "review"));
  }

  // If we still fall short of a reasonable session and the lesson pool has more
  // questions, top up with remaining lesson questions (repeats allowed only if
  // the lesson genuinely has too few items).
  if (items.length < Math.min(MIN_SESSION, lessonPool.length)) {
    const already = new Set(items.map((i) => i.itemId));
    for (const q of lessonPool) {
      if (already.has(q.id)) continue;
      items.push(toSessionItem(q, lessonId, lq.courseId, "new"));
      already.add(q.id);
      if (items.length >= Math.min(MIN_SESSION, lessonPool.length)) break;
    }
  }

  // Interleave: keep the first item as a "new" concept for a gentle start, then
  // shuffle the remainder so reinforcement/review are woven through.
  const ordered = interleave(items);

  const total = ordered.length;
  const targetCorrect = Math.ceil(total * 0.6);

  return {
    lessonId,
    courseId: lq.courseId,
    courseTitle: lq.courseTitle,
    courseColor: lq.courseColor,
    lessonTitle: lq.lesson.title,
    crownLevel,
    targetCorrect,
    items: ordered,
  };
}

/**
 * Choose which lesson questions count as "new"/priority for this session,
 * favoring ones with no memory or low recall, then filling in order.
 */
function pickNewItems(
  pool: QuizQuestion[],
  memories: Map<string, ItemMemoryLite>,
  count: number,
  now: Date
): QuizQuestion[] {
  const scored = pool.map((q) => {
    const mem = memories.get(q.id);
    // Unseen items get top priority (recall 0); seen items by ascending recall.
    const recall = mem ? currentRecall(mem, now) : 0;
    return { q, recall, seen: Boolean(mem) };
  });
  scored.sort((a, b) => {
    if (a.seen !== b.seen) return a.seen ? 1 : -1; // unseen first
    return a.recall - b.recall; // then weakest recall
  });
  const picked = scored.slice(0, Math.max(count, 0)).map((s) => s.q);
  // If count exceeds the pool, just return the whole pool (no filler).
  return picked.length > 0 ? picked : pool.slice(0, count);
}

/**
 * Interleave item origins so the session isn't monolithic: lead with a "new"
 * item if present, then shuffle the rest.
 */
function interleave(items: SessionItem[]): SessionItem[] {
  if (items.length <= 2) return items;
  const firstNewIdx = items.findIndex((i) => i.origin === "new");
  if (firstNewIdx <= 0) return [items[0], ...shuffle(items.slice(1))];
  const lead = items[firstNewIdx];
  const rest = items.filter((_, idx) => idx !== firstNewIdx);
  return [lead, ...shuffle(rest)];
}

// ── Question lookup by id (content is static) ────────────────────────────────

// Build a flat id→question index once, mirroring the LESSON_INDEX pattern.
const QUESTION_INDEX: Record<string, QuizQuestion> = {};
const QUESTION_OWNER: Record<string, string> = {}; // itemId → lessonId
for (const course of COURSES) {
  for (const lesson of course.lessons) {
    for (const q of lesson.questions) {
      QUESTION_INDEX[q.id] = q;
      QUESTION_OWNER[q.id] = lesson.id;
    }
  }
}

export function findQuestionById(itemId: string): QuizQuestion | undefined {
  return QUESTION_INDEX[itemId];
}

export function ownerLessonOf(itemId: string): string {
  return QUESTION_OWNER[itemId] ?? "";
}

/**
 * Build a pure "review session" not tied to a single lesson: the user's most
 * overdue items across the whole curriculum. Used by the Review/Practice CTA.
 */
export async function buildReviewSession(userId: string): Promise<LessonSession | null> {
  const memories = await getMemories(userId);
  const now = new Date();
  const overdue = [...memories.values()]
    .filter((m) => isOverdue(m, now))
    .map((m) => ({ m, recall: currentRecall(m, now) }))
    .sort((a, b) => a.recall - b.recall);

  if (overdue.length === 0) return null;

  const picked = overdue.slice(0, NOMINAL_SESSION);
  const items: SessionItem[] = [];
  for (const { m } of picked) {
    const q = findQuestionById(m.itemId);
    if (!q) continue;
    const owner = findLesson(m.lessonId);
    items.push(toSessionItem(q, m.lessonId, owner?.course.id ?? "", "review"));
  }
  if (items.length === 0) return null;

  const total = items.length;
  return {
    lessonId: "__review__",
    courseId: "",
    courseTitle: "Review",
    courseColor: "#7fb5ff",
    lessonTitle: "Daily review",
    crownLevel: 0,
    targetCorrect: Math.ceil(total * 0.6),
    items: interleave(items),
  };
}
