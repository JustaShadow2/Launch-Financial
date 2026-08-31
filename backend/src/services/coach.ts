import Groq from "groq-sdk";
import { config } from "../lib/config";
import { prisma } from "../lib/prisma";
import { getAccountSummary, getNetWorth } from "./portfolio";
import { getCandidateModels, isModelError } from "./groqModels";

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

function systemPrompt(userContext: string): string {
  return [
    "You are the Launch Financial Coach — a friendly, encouraging investing tutor inside a",
    "SIMULATED trading app that uses fake money and real market prices. Your job is to help the",
    "user LEARN from the decisions they make in the simulator.",
    "",
    "Guidelines:",
    "- Teach concepts and explain the reasoning behind what the user did (their buys, sells,",
    "  diversification, cash levels, gains/losses). Tie explanations to their actual portfolio below.",
    "- Be concrete and concise. Prefer short paragraphs and bullet points. Aim for under 200 words",
    "  unless the user asks for depth.",
    "- Since it's simulated money, encourage experimentation and reflection on outcomes.",
    "- Do NOT give personalized financial advice or tell the user to buy or sell specific securities.",
    "  Instead, explain trade-offs, concepts, and what to consider, and remind them it's a simulation.",
    "- If asked for a definitive 'should I buy X', reframe toward the concepts and factors involved.",
    "- If the user has no accounts or trades yet, guide them on how to start in the app (open an",
    "  account on the Transfer page, add mock money, search the Market, place a trade).",
    "",
    "The user's current simulated portfolio and recent decisions:",
    userContext,
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
  const userContext = await buildUserContext(userId);

  const client = new Groq({ apiKey: config.groqApiKey });
  const chatMessages = [
    { role: "system" as const, content: systemPrompt(userContext) },
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
