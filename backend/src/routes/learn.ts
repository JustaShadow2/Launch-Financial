import { Router } from "express";
import { z } from "zod";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import {
  completeLesson,
  completeReview,
  getCourses,
  getDailyLesson,
  getLessonContent,
  getLessonSession,
  getReviewSession,
  getStats,
  LearnError,
} from "../services/learning";

export const learnRouter = Router();

learnRouter.use(requireAuth);

// All courses with the user's progress + lock states.
learnRouter.get(
  "/courses",
  asyncHandler(async (req: AuthedRequest, res) => {
    const courses = await getCourses(req.userId!);
    res.json({ courses });
  })
);

// Learning stats: XP, streak, completion, daily goal.
learnRouter.get(
  "/stats",
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getStats(req.userId!));
  })
);

// The recommended lesson for today (next uncompleted in order).
learnRouter.get(
  "/daily",
  asyncHandler(async (req: AuthedRequest, res) => {
    const lesson = await getDailyLesson(req.userId!);
    res.json({ lesson });
  })
);

// Full lesson content (slides + quiz). Enforces sequential unlock.
learnRouter.get(
  "/lesson/:lessonId",
  asyncHandler(async (req: AuthedRequest, res) => {
    try {
      const content = await getLessonContent(req.userId!, req.params.lessonId);
      res.json(content);
    } catch (e) {
      if (e instanceof LearnError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);

// Interleaved spaced-repetition session for a lesson (the quiz item stack).
learnRouter.get(
  "/lesson/:lessonId/session",
  asyncHandler(async (req: AuthedRequest, res) => {
    try {
      const session = await getLessonSession(req.userId!, req.params.lessonId);
      res.json(session);
    } catch (e) {
      if (e instanceof LearnError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);

// A curriculum-wide review session of the user's most overdue items.
learnRouter.get(
  "/review/session",
  asyncHandler(async (req: AuthedRequest, res) => {
    try {
      const session = await getReviewSession(req.userId!);
      res.json(session);
    } catch (e) {
      if (e instanceof LearnError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);

// Submit a completed review session (records spaced-repetition memory + streak).
const reviewCompleteSchema = z.object({
  responses: z
    .array(
      z.object({
        itemId: z.string().min(1).max(64),
        firstTry: z.boolean(),
      })
    )
    .min(1)
    .max(60),
});

learnRouter.post(
  "/review/complete",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = reviewCompleteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    try {
      const result = await completeReview({
        userId: req.userId!,
        responses: parsed.data.responses,
      });
      res.json(result);
    } catch (e) {
      if (e instanceof LearnError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);

// Submit a completed session and complete the lesson. The client sends one
// entry per item with whether it was correct on the FIRST try (before the
// mistake recycler requeued it), plus the total active answering time.
const completeSchema = z.object({
  responses: z
    .array(
      z.object({
        itemId: z.string().min(1).max(64),
        firstTry: z.boolean(),
      })
    )
    .min(1)
    .max(60),
  durationSeconds: z.number().int().min(0).max(60 * 60).optional(),
});

learnRouter.post(
  "/lesson/:lessonId/complete",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    try {
      const result = await completeLesson({
        userId: req.userId!,
        lessonId: req.params.lessonId,
        responses: parsed.data.responses,
        durationSeconds: parsed.data.durationSeconds,
      });
      res.json(result);
    } catch (e) {
      if (e instanceof LearnError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);
