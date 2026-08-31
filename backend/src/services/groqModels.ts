import type Groq from "groq-sdk";
import { config } from "../lib/config";

/**
 * Dynamic Groq chat-model discovery.
 *
 * Groq deprecates model IDs over time (e.g. llama-3.3-70b-versatile was retired
 * in 2026). Rather than hardcode one, we query the account's available models
 * via GET /openai/v1/models, keep only chat-capable text models, and rank them
 * by a preference order. The coach then tries them in order with automatic
 * fallback, so a single deprecation can't take the feature down.
 */

// Substrings that indicate NON-chat models we must exclude (audio, embeddings,
// safety classifiers, TTS, vision-only, etc.).
const NON_CHAT_HINTS = [
  "whisper",
  "tts",
  "embed",
  "guard",       // llama-guard safety classifier
  "moderation",
  "distil-whisper",
  "playai",      // TTS voices
  "compound",    // agentic system, not a plain chat completion model
];

// Preference order (first match wins). Uses substring matching so specific
// versioned IDs still rank. Anything not listed still qualifies but ranks last.
const PREFERENCE: string[] = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b",
  "llama-3.1-70b",
  "llama-3.1-8b",
  "llama3-70b",
  "llama-4",
  "qwen",
  "gemma",
  "mixtral",
];

function isChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return !NON_CHAT_HINTS.some((h) => lower.includes(h));
}

function rank(id: string): number {
  const lower = id.toLowerCase();
  const idx = PREFERENCE.findIndex((p) => lower.includes(p));
  return idx === -1 ? PREFERENCE.length : idx;
}

let cache: { models: string[]; fetchedAt: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // refresh the model list hourly

/**
 * Return an ordered list of candidate chat model IDs to try, best first.
 * A configured GROQ_MODEL (if set) is always tried first. Falls back to a
 * static list if the models endpoint can't be reached.
 */
export async function getCandidateModels(client: Groq): Promise<string[]> {
  const preferred = config.groqModel ? [config.groqModel] : [];

  let discovered: string[] = [];
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    discovered = cache.models;
  } else {
    try {
      const res = await client.models.list();
      const ids = (res.data ?? [])
        .map((m) => (m as { id: string }).id)
        .filter((id) => typeof id === "string" && isChatModel(id));
      ids.sort((a, b) => rank(a) - rank(b));
      discovered = ids;
      cache = { models: ids, fetchedAt: Date.now() };
    } catch {
      // Network/permission issue — fall back to known-good IDs (best effort).
      discovered = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
    }
  }

  // De-dupe while preserving order (preferred first, then discovered).
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...preferred, ...discovered]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Heuristic: is this error the kind where trying a DIFFERENT model might help
 * (model not found / decommissioned / not permitted), vs. a fatal error like a
 * bad API key where retrying other models is pointless?
 */
export function isModelError(err: unknown): boolean {
  const e = err as { status?: number; error?: { code?: string; message?: string }; message?: string };
  const status = e?.status;
  const code = e?.error?.code || "";
  const msg = (e?.error?.message || e?.message || "").toLowerCase();
  if (status === 404) return true; // model not found
  if (status === 400 && (code === "model_not_found" || msg.includes("model") ||
      msg.includes("decommission") || msg.includes("deprecat"))) {
    return true;
  }
  return false;
}
