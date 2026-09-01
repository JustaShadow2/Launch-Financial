import { Router } from "express";
import { z } from "zod";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import {
  coachConfigured,
  coachReply,
  CoachError,
  getHistory,
  clearHistory,
} from "../services/coach";

export const coachRouter = Router();

coachRouter.use(requireAuth);

// Whether the coach is available (API key configured).
coachRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json({ available: coachConfigured() });
  })
);

// The user's persisted chat history (oldest first).
coachRouter.get(
  "/history",
  asyncHandler(async (req: AuthedRequest, res) => {
    const messages = await getHistory(req.userId!);
    res.json({ messages });
  })
);

// Clear the user's chat history.
coachRouter.delete(
  "/history",
  asyncHandler(async (req: AuthedRequest, res) => {
    await clearHistory(req.userId!);
    res.json({ ok: true });
  })
);

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
});

coachRouter.post(
  "/chat",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    try {
      const reply = await coachReply(req.userId!, parsed.data.messages);
      res.json({ reply });
    } catch (e) {
      if (e instanceof CoachError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
  })
);
