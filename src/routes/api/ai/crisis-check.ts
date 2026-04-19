import { createFileRoute } from "@tanstack/react-router";
import { fastCrisisCheck, crisisClassifierSystemInstruction } from "@/lib/ai/prompts";
import { generateJson, hasGenAIKey } from "@/lib/ai/genai.server";
import { SAFETY_CLASSIFIER } from "@/lib/ai/safety";
import { Type, type Schema } from "@google/genai";

type Req = { text: string; locale?: "en" | "ar" };

type CrisisResult = { crisis: boolean; confidence: number; reason: string };

const CRISIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    crisis: { type: Type.BOOLEAN, description: "true if crisis indicators present" },
    confidence: { type: Type.NUMBER, description: "0.0 to 1.0 confidence score" },
    reason: { type: Type.STRING, description: "One sentence explanation" },
  },
  required: ["crisis", "confidence", "reason"],
};

export const Route = createFileRoute("/api/ai/crisis-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Req;
        try { body = await request.json() as Req; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        const text = String(body?.text ?? "");
        const locale = body?.locale;

        // Regex fast-path — always return immediately if pattern matches
        const fast = fastCrisisCheck(text);
        if (fast) return Response.json({ crisis: true, via: "regex", confidence: 0.95, reason: "Matched crisis keyword regex." });

        if (!hasGenAIKey()) {
          return Response.json({ crisis: false, via: "no-api-key", confidence: 0.5, reason: "API key not configured." });
        }

        try {
          const { data } = await generateJson<CrisisResult>({
            systemInstruction: crisisClassifierSystemInstruction(locale, text),
            messages: [{ role: "user", content: text }],
            temperature: 0,
            thinkingBudget: 0,
            safetySettings: SAFETY_CLASSIFIER,
            maxOutputTokens: 256,
            schema: CRISIS_SCHEMA,
          });
          return Response.json({ ...data, via: "llm" });
        } catch (err) {
          console.error("[crisis-check] llm error", err);
          return Response.json({ crisis: false, via: "llm-error", confidence: 0, reason: "Model call failed." });
        }
      },
    },
  },
});
