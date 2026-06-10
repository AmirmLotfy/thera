import { HarmBlockThreshold, HarmCategory } from "@google/genai";

/**
 * Safety thresholds per category — see official tables:
 * https://ai.google.dev/gemini-api/docs/safety-settings
 * Policy guidance: https://ai.google.dev/gemini-api/docs/safety-guidance
 */

type SafetyEntry = { category: HarmCategory; threshold: HarmBlockThreshold };

/** Supportive chat: balanced blocking (default product stance). */
export const SAFETY_CHAT: SafetyEntry[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Crisis / safety classifiers: stricter on dangerous content; conservative on crisis detection.
 * https://ai.google.dev/gemini-api/docs/safety-settings
 */
export const SAFETY_CLASSIFIER: SafetyEntry[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

/** Structured JSON (intake, schemas): same baseline as chat. */
export const SAFETY_STRUCTURED_JSON: SafetyEntry[] = [...SAFETY_CHAT];

/** Long-form summarization for therapists — same baseline as chat. */
export const SAFETY_SUMMARIZE: SafetyEntry[] = [...SAFETY_CHAT];
