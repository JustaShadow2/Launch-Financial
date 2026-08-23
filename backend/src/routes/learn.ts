import { Router } from "express";
import { z } from "zod";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import {
  completeLesson,
  getCourses,
  getDailyLesson,
  getLessonContent,
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

// Submit quiz answers and complete the lesson.
const completeSchema = z.object({
  answers: z.array(z.number().int().min(0)),
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
        answers: parsed.data.answers,
      });
      res.json(result);
    } catch (e) {
      if (e instanceof LearnError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);
