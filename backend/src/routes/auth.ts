import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";
import { asyncHandler, requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import { sendPasswordResetCode } from "../services/email";
import { validateEmail } from "../lib/emailValidation";

export const authRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeUser(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt?: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    ...(u.createdAt ? { createdAt: u.createdAt } : {}),
  };
}

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

// ── Register ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: passwordRule,
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const email = normalizeEmail(parsed.data.email);
    const { password, firstName, lastName } = parsed.data;

    // Stricter email validation: syntax, disposable domains, common typos.
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ error: emailCheck.error, suggestion: emailCheck.suggestion });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists. Try logging in instead." });
    }

    const passwordHash = await hashPassword(password);
    try {
      // New users start with NO accounts — they open their first account
      // themselves from the Move Money page.
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        },
      });
      const token = signToken({ userId: user.id, email: user.email });
      res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (e: unknown) {
      // Unique-constraint race: two signups with the same email at once.
      if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
        return res
          .status(409)
          .json({ error: "An account with this email already exists. Try logging in instead." });
      }
      throw e;
    }
  })
);

// ── Login ─────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: sanitizeUser(user) });
  })
);

// ── Current user ────────────────────────────────────────────────────────────

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  })
);

// ── Update profile (name) ─────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
});

authRouter.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    });
    res.json({ user: sanitizeUser(user) });
  })
);

// ── Change email ──────────────────────────────────────────────────────────────

const changeEmailSchema = z.object({
  newEmail: z.string().email("Enter a valid email"),
  currentPassword: z.string().min(1, "Current password is required"),
});

authRouter.patch(
  "/email",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = changeEmailSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const newEmail = normalizeEmail(parsed.data.newEmail);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    if (newEmail === user.email) {
      return res.status(400).json({ error: "That's already your email" });
    }
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) return res.status(409).json({ error: "That email is already in use" });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail },
    });
    // Issue a fresh token since the email in the JWT changed.
    const token = signToken({ userId: updated.id, email: updated.email });
    res.json({ token, user: sanitizeUser(updated) });
  })
);

// ── Change password (authenticated) ───────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordRule,
});

authRouter.patch(
  "/password",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    if (await verifyPassword(parsed.data.newPassword, user.passwordHash)) {
      return res.status(400).json({ error: "New password must be different" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    res.json({ ok: true });
  })
);

// ── Delete account ──────────────────────────────────────────────────────────

const deleteSchema = z.object({ password: z.string().min(1, "Password is required") });

authRouter.delete(
  "/account",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Password is incorrect" });
    }
    // Cascades delete accounts, holdings, transactions, orders, watchlist,
    // and lesson progress (see schema onDelete: Cascade).
    await prisma.user.delete({ where: { id: user.id } });
    res.json({ ok: true });
  })
);

// ── Forgot password: request OTP ──────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ACTIVE_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

const forgotSchema = z.object({ email: z.string().email() });

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    // Always respond the same way to avoid leaking which emails exist.
    const genericOk = {
      ok: true,
      message: "If an account exists for that email, a reset code has been sent.",
    };
    if (!parsed.success) return res.json(genericOk);

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(genericOk);

    // Rate limit: cap recent reset requests per email.
    const recent = await prisma.passwordResetToken.count({
      where: { email, createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) } },
    });
    if (recent >= MAX_ACTIVE_REQUESTS_PER_WINDOW) {
      return res.json(genericOk); // silently throttle
    }

    const code = generateOtp();
    const codeHash = await bcrypt.hash(code, 10);
    await prisma.passwordResetToken.create({
      data: { email, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await sendPasswordResetCode(email, code);

    res.json(genericOk);
  })
);

// ── Forgot password: verify OTP + set new password ────────────────────────────

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().length(6, "Enter the 6-digit code"),
  newPassword: passwordRule,
});

const MAX_OTP_ATTEMPTS = 5;

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const email = normalizeEmail(parsed.data.email);

    // Find the most recent unused, unexpired token for this email.
    const token = await prisma.passwordResetToken.findFirst({
      where: { email, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!token) {
      return res.status(400).json({ error: "This code is invalid or has expired. Request a new one." });
    }
    if (token.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: "Too many attempts. Request a new code." });
    }

    const codeOk = await bcrypt.compare(parsed.data.code, token.codeHash);
    if (!codeOk) {
      await prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: "Incorrect code. Please try again." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "This code is invalid or has expired. Request a new one." });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(parsed.data.newPassword) },
      }),
      prisma.passwordResetToken.update({ where: { id: token.id }, data: { used: true } }),
      // Invalidate any other outstanding codes for this email.
      prisma.passwordResetToken.updateMany({
        where: { email, used: false },
        data: { used: true },
      }),
    ]);

    const authToken = signToken({ userId: user.id, email: user.email });
    res.json({ token: authToken, user: sanitizeUser(user) });
  })
);
