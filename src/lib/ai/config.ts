/**
 * Central Gemini settings (server-only). Override via env in deployment.
 *
 * Model IDs: https://ai.google.dev/gemini-api/docs/models
 * JS client `apiVersion`: https://github.com/googleapis/js-genai
 */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** Gemini API version for @google/genai (default in SDK is v1beta). */
export const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION?.trim() || "v1beta";

const nEnv = (key: string, fallback: number): number => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/** Cap streamed chat replies for cost and runaway length. */
export const CHAT_MAX_OUTPUT_TOKENS = Math.min(
  8192,
  Math.max(256, nEnv("GEMINI_CHAT_MAX_OUTPUT_TOKENS", 2048)),
);

/** Max messages (user + assistant) sent to the model after trimming. */
export const CHAT_MESSAGE_WINDOW_MAX = Math.min(
  80,
  Math.max(8, nEnv("GEMINI_CHAT_MESSAGE_WINDOW_MAX", 40)),
);
