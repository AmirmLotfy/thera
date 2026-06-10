/// <reference types="node" />
import { GoogleGenAI, createPartFromBase64, createUserContent } from "@google/genai";
import type { Content, Schema, SafetySetting } from "@google/genai";
import { GEMINI_API_VERSION, GEMINI_MODEL } from "./config";
import { SAFETY_CHAT } from "./safety";

/**
 * Placeholder values that should be treated as "no key" — avoids crashing
 * the handler when the env slot is reserved but an operator hasn't pasted
 * a real Google AI Studio key yet.
 */
function isPlaceholderKey(key: string): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (trimmed.length < 16) return true;
  return /replace|your|example|xxxxxx|placeholder|todo/i.test(trimmed);
}

export function hasGenAIKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(apiKey && !isPlaceholderKey(apiKey));
}

let _ai: GoogleGenAI | null = null;
export function getGenAI() {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || isPlaceholderKey(apiKey)) return null;
  _ai = new GoogleGenAI({ apiKey, apiVersion: GEMINI_API_VERSION });
  return _ai;
}

export type AIMessageInput = { role: "user" | "assistant"; content: string };

export function toContents(messages: AIMessageInput[]): Content[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

const TRANSCRIBE_SYS = `You transcribe short microphone clips for a bilingual mental wellness app (Arabic and English).
Return ONLY the spoken words, in the same language(s) the speaker used. No quotation marks, labels, or commentary.
If the audio is silent, pure noise, or unintelligible, return an empty string.`;

/** Speech-to-text via Gemini multimodal input (e.g. WebM/Opus from MediaRecorder). */
export async function transcribeSpeechFromBase64(mimeType: string, base64: string): Promise<string> {
  const ai = getGenAI();
  if (!ai) throw new Error("GEMINI_API_KEY missing");
  const res = await withRetry(() => ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: createUserContent([createPartFromBase64(base64, mimeType)]),
    config: {
      systemInstruction: TRANSCRIBE_SYS,
      temperature: 0,
      maxOutputTokens: 1024,
      safetySettings: SAFETY_CHAT,
    },
  }));
  return (res.text ?? "").trim();
}

/** Exponential-backoff retry for transient Gemini errors (429 / 5xx). */
async function withRetry<T>(fn: () => Promise<T>, backoff = [250, 750, 1500]): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= backoff.length; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = /429|500|503|quota|rate.?limit/i.test(msg);
      if (!isRetryable || i === backoff.length) break;
      await new Promise((r) => setTimeout(r, backoff[i]));
    }
  }
  throw lastErr;
}

export async function generateOnce(params: {
  model?: string;
  systemInstruction: string;
  messages: AIMessageInput[];
  temperature?: number;
  /** Set to 0 for fast responses, -1 for dynamic, positive integer for fixed budget. */
  thinkingBudget?: number;
  safetySettings: SafetySetting[];
  maxOutputTokens?: number;
}): Promise<{ text: string; usage?: { totalTokens?: number; thoughtsTokens?: number } }> {
  const ai = getGenAI();
  if (!ai) throw new Error("GEMINI_API_KEY missing");
  const res = await withRetry(() => ai.models.generateContent({
    model: params.model ?? GEMINI_MODEL,
    contents: toContents(params.messages),
    config: {
      systemInstruction: params.systemInstruction,
      temperature: params.temperature ?? 0.8,
      safetySettings: params.safetySettings,
      ...(params.maxOutputTokens !== undefined ? { maxOutputTokens: params.maxOutputTokens } : {}),
      ...(params.thinkingBudget !== undefined
        ? { thinkingConfig: { thinkingBudget: params.thinkingBudget } }
        : {}),
    },
  }));
  const usage = res.usageMetadata
    ? {
        totalTokens: res.usageMetadata.totalTokenCount,
        thoughtsTokens: (res.usageMetadata as { thoughtsTokenCount?: number }).thoughtsTokenCount,
      }
    : undefined;
  return { text: res.text ?? "", usage };
}

/** Structured output variant — returns parsed JSON via SDK `responseMimeType`. */
export async function generateJson<T>(params: {
  model?: string;
  systemInstruction: string;
  messages: AIMessageInput[];
  temperature?: number;
  thinkingBudget?: number;
  safetySettings: SafetySetting[];
  schema: Schema;
  maxOutputTokens?: number;
}): Promise<{ data: T; usage?: { totalTokens?: number; thoughtsTokens?: number } }> {
  const ai = getGenAI();
  if (!ai) throw new Error("GEMINI_API_KEY missing");
  const res = await withRetry(() => ai.models.generateContent({
    model: params.model ?? GEMINI_MODEL,
    contents: toContents(params.messages),
    config: {
      systemInstruction: params.systemInstruction,
      temperature: params.temperature ?? 0,
      safetySettings: params.safetySettings,
      responseMimeType: "application/json",
      responseSchema: params.schema,
      ...(params.maxOutputTokens !== undefined ? { maxOutputTokens: params.maxOutputTokens } : {}),
      ...(params.thinkingBudget !== undefined
        ? { thinkingConfig: { thinkingBudget: params.thinkingBudget } }
        : {}),
    },
  }));
  const raw = res.text ?? "{}";
  const usage = res.usageMetadata
    ? {
        totalTokens: res.usageMetadata.totalTokenCount,
        thoughtsTokens: (res.usageMetadata as { thoughtsTokenCount?: number }).thoughtsTokenCount,
      }
    : undefined;
  try {
    return { data: JSON.parse(raw) as T, usage };
  } catch {
    throw new Error(`Gemini returned non-JSON: ${raw.slice(0, 200)}`);
  }
}

export async function generateStream(params: {
  model?: string;
  systemInstruction: string;
  messages: AIMessageInput[];
  temperature?: number;
  thinkingBudget?: number;
  safetySettings: SafetySetting[];
  signal?: AbortSignal;
  maxOutputTokens?: number;
}) {
  const ai = getGenAI();
  if (!ai) throw new Error("GEMINI_API_KEY missing");
  return ai.models.generateContentStream({
    model: params.model ?? GEMINI_MODEL,
    contents: toContents(params.messages),
    config: {
      systemInstruction: params.systemInstruction,
      temperature: params.temperature ?? 0.8,
      safetySettings: params.safetySettings,
      ...(params.signal ? { abortSignal: params.signal } : {}),
      ...(params.maxOutputTokens !== undefined ? { maxOutputTokens: params.maxOutputTokens } : {}),
      ...(params.thinkingBudget !== undefined
        ? { thinkingConfig: { thinkingBudget: params.thinkingBudget } }
        : {}),
    },
  });
}
