import Groq from "groq-sdk";
import { config } from "../lib/config";
import { prisma } from "../lib/prisma";
import { getAccountSummary, getNetWorth } from "./portfolio";
import { getCandidateModels, isModelError } from "./groqModels";
import { COURSES } from "../data/learningContent";

/**
 * "Coach" — a learning chatbot powered by Groq (same GROQ_API_KEY setup as the
 * AI-Chef project). The chat model is discovered dynamically from Groq's
 * /models endpoint (model IDs get deprecated over time), and requests fall back
 * across available models automatically if one is unavailable.
 *
 * It's tailored to each user: every request is grounded in that user's actual
 * holdings and recent buy/sell decisions. It teaches and explains — it does NOT
 * give personalized financial advice or tell the user what to buy/sell.
 */

export function coachConfigured(): boolean {
  return Boolean(config.groqApiKey);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 12; // cap conversation turns sent upstream

/** Build a compact, readable snapshot of the user's simulated portfolio. */
async function buildUserContext(userId: string): Promise<string> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (accounts.length === 0) {
    return "The user has no investment accounts yet and hasn't started investing.";
  }

  const lines: string[] = [];
  const net = await getNetWorth(userId);
  lines.push(
    `Net worth: $${net.total.toFixed(2)} (cash $${net.cash.toFixed(2)}, investments $${net.investments.toFixed(
      2
    )}).`
  );

  for (const acc of accounts) {
    const summary = await getAccountSummary(acc.id, userId);
    const posText =
      summary.positions.length === 0
        ? "no positions"
        : summary.positions
            .map(
              (p) =>
                `${p.quantity} ${p.symbol} (avg $${p.avgCost.toFixed(2)}, now $${p.currentPrice.toFixed(
                  2
                )}, P/L ${p.unrealizedPL >= 0 ? "+" : ""}$${p.unrealizedPL.toFixed(2)} / ${p.unrealizedPLPercent.toFixed(
                  1
                )}%)`
            )
            .join("; ");
    lines.push(`${acc.name} [${acc.type}]: cash $${summary.cashBalance.toFixed(2)}; ${posText}.`);
  }

  // Recent trade decisions across all accounts.
  const accountIds = accounts.map((a) => a.id);
  const orders = await prisma.order.findMany({
    where: { accountId: { in: accountIds } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (orders.length > 0) {
    const orderText = orders
      .map(
        (o) =>
          `${o.side} ${o.quantity} ${o.symbol} @ $${(o.filledPrice ?? 0).toFixed(2)} on ${o.createdAt
            .toISOString()
            .slice(0, 10)}`
      )
      .join("; ");
    lines.push(`Recent trades (most recent first): ${orderText}.`);
  } else {
    lines.push("The user hasn't placed any trades yet.");
  }

  return lines.join("\n");
}

/**
 * Build a snapshot of what the user has learned and what's available next in
 * the Learn academy. This lets the Coach ground its explanations in concepts
 * the user has already covered, and suggest relevant lessons to learn next.
 *
 * Lessons are referenced to the model with a stable `id` so it can emit
 * clickable links using the `[Title](lesson:<id>)` convention (see the system
 * prompt). The frontend turns those into in-app navigation.
 */
async function buildLearningContext(userId: string): Promise<string> {
  const rows = await prisma.lessonProgress.findMany({
    where: { userId },
    orderBy: { completedAt: "asc" },
  });
  const completedIds = new Set(rows.map((r) => r.lessonId));

  const completedLines: string[] = [];
  const nextLines: string[] = [];

  for (const course of COURSES) {
    for (const lesson of course.lessons) {
      const label = `"${lesson.title}" (${course.title}) [id: ${lesson.id}]`;
      if (completedIds.has(lesson.id)) {
        completedLines.push(`- ${label}: ${lesson.subtitle}`);
      } else {
        // Only surface lessons that are unlocked-ish, i.e. the next handful the
        // user could realistically take. Keep the catalog compact.
        if (nextLines.length < 12) {
          nextLines.push(`- ${label}: ${lesson.subtitle}`);
        }
      }
    }
  }

  const parts: string[] = [];
  if (completedLines.length > 0) {
    parts.push(
      `Lessons the user has completed in the Learn academy (${completedLines.length} total):\n` +
        completedLines.join("\n")
    );
  } else {
    parts.push("The user hasn't completed any Learn lessons yet.");
  }

  if (nextLines.length > 0) {
    parts.push(
      "Lessons available to suggest next (not yet completed):\n" + nextLines.join("\n")
    );
  } else {
    parts.push("The user has completed every available lesson.");
  }

  return parts.join("\n\n");
}

function systemPrompt(userContext: string, learningContext: string): string {
  return [
    "You are the Launch Financial Coach — a friendly, encouraging investing tutor inside a",
    "SIMULATED trading app that uses fake money and real market prices. Your job is to help the",
    "user LEARN from the decisions they make in the simulator.",
    "",
    "## Content guidelines",
    "- Teach concepts and explain the reasoning behind what the user did (their buys, sells,",
    "  diversification, cash levels, gains/losses). Tie explanations to their actual portfolio below.",
    "- Since it's simulated money, encourage experimentation and reflection on outcomes.",
    "- Do NOT give personalized financial advice or tell the user to buy or sell specific securities.",
    "  Instead, explain trade-offs, concepts, and what to consider, and remind them it's a simulation.",
    "- If asked for a definitive 'should I buy X', reframe toward the concepts and factors involved.",
    "- If the user has no accounts or trades yet, guide them on how to start in the app (open an",
    "  account on the Transfer page, add mock money, search the Market, place a trade).",
    "",
    "## Using the user's learning progress",
    "- The user's completed and available Learn lessons are listed below. When you explain a concept",
    "  the user has already studied, briefly connect it to that lesson so it reinforces their learning.",
    "- When the user asks what to do or learn next, or when a concept in your answer maps to an",
    "  available (not-yet-completed) lesson, SUGGEST that lesson. Only suggest lessons from the",
    "  'available to suggest next' list — never invent lesson titles or ids, and don't re-suggest",
    "  completed ones as if they were new.",
    "- Link a lesson using this exact markdown format: [Lesson Title](lesson:<id>) using the id shown",
    "  in brackets for that lesson. Example: [Diversification](lesson:bp-1). The app turns these into",
    "  clickable links that open the lesson. Do not show the raw id to the user.",
    "",
    "## Output format (IMPORTANT — always follow)",
    "- Respond in clean, well-structured Markdown. Keep it scannable.",
    "- Open with one short sentence (1–2 lines) that directly addresses the question. No heading before it.",
    "- Then use `###` headings to group the rest into short labeled sections when there's more than one idea.",
    "- Use `-` bullet points for lists; keep each bullet to one idea. Use **bold** for key terms and numbers.",
    "- Prefer short paragraphs (1–3 sentences). Avoid walls of text.",
    "- If you suggest lessons, put them under a `### Learn next` section as a bulleted list of lesson links.",
    "- Aim for under ~200 words unless the user asks for depth.",
    "- End with a brief one-line reminder that it's all simulated when giving trade-related guidance.",
    "",
    "## The user's current simulated portfolio and recent decisions",
    userContext,
    "",
    "## The user's Learn academy progress",
    learningContext,
  ].join("\n");
}

export class CoachError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

// The last model that successfully answered — useful for logs/diagnostics.
let lastGoodModel: string | null = null;
export function getLastGoodModel(): string | null {
  return lastGoodModel;
}

export async function coachReply(userId: string, messages: ChatMessage[]): Promise<string> {
  if (!coachConfigured()) {
    throw new CoachError(
      "The Coach is not configured yet (GROQ_API_KEY is not set).",
      503
    );
  }

  const trimmed = messages.slice(-MAX_HISTORY);
  const [userContext, learningContext] = await Promise.all([
    buildUserContext(userId),
    buildLearningContext(userId),
  ]);

  const client = new Groq({ apiKey: config.groqApiKey });
  const chatMessages = [
    { role: "system" as const, content: systemPrompt(userContext, learningContext) },
    ...trimmed.map((m) => ({ role: m.role, content: m.content })),
  ];

  const candidates = await getCandidateModels(client);
  if (candidates.length === 0) {
    throw new CoachError("No Groq chat models are available for this API key.", 502);
  }

  let lastErr: unknown = null;
  for (const model of candidates) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.7,
        max_tokens: 900,
        messages: chatMessages,
      });
      lastGoodModel = model;
      return (
        completion.choices[0]?.message?.content?.trim() ||
        "Sorry, I couldn't generate a response."
      );
    } catch (err) {
      lastErr = err;
      // If it's a model-availability problem, try the next candidate.
      // Any other error (auth, rate limit, network) is fatal — stop.
      if (isModelError(err)) {
        console.warn(`[coach] Model "${model}" unavailable, trying next candidate…`);
        continue;
      }
      break;
    }
  }

  const e = lastErr as { status?: number; error?: { message?: string }; message?: string };
  const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 502;
  const detail = e?.error?.message || e?.message || "the model provider returned an error";
  throw new CoachError(`The Coach couldn't respond right now (${detail}).`, status);
}
