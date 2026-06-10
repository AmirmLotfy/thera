import { createFileRoute } from "@tanstack/react-router";
import { generateJson, hasGenAIKey } from "@/lib/ai/genai.server";
import { INTAKE_ANALYSIS_SYS } from "@/lib/ai/prompts";
import { SAFETY_STRUCTURED_JSON } from "@/lib/ai/safety";
import { verifyIdToken, adminDb } from "@/lib/firebase.server";
import { Type, type Schema } from "@google/genai";

type IntakeRequest = {
  answers: Record<string, string>;
  role?: "adult" | "parent" | "teen" | "therapist";
  locale?: "en" | "ar";
};

type IntakeResult = {
  summary: string;
  suggestedSpecialties: string[];
  languageMatch: string[];
  format: string;
  tone: string;
};

const INTAKE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "3-4 sentence plain-language summary in the user locale" },
    suggestedSpecialties: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: ["anxiety","depression","relationships","trauma","children","teens","parenting","sleep","work_stress","self_esteem","grief","adhd","addictions","eating","couples","general"] },
    },
    languageMatch: { type: Type.ARRAY, items: { type: Type.STRING, enum: ["en", "ar"] } },
    format: { type: Type.STRING, enum: ["online", "in_person", "both"] },
    tone: { type: Type.STRING, description: "Suggested therapeutic tone" },
  },
  required: ["summary", "suggestedSpecialties", "languageMatch", "format", "tone"],
};

export const Route = createFileRoute("/api/ai/intake")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        let body: IntakeRequest;
        try { body = await request.json() as IntakeRequest; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        const { answers, role = "adult", locale = "en" } = body ?? {};
        if (!answers || typeof answers !== "object") {
          return new Response("answers required", { status: 400 });
        }

        if (!hasGenAIKey()) {
          return Response.json({
            summary: locale === "ar"
              ? "ملخص تجريبي — أضف GEMINI_API_KEY للتحليل الحقيقي."
              : "Demo summary — set GEMINI_API_KEY to enable real analysis.",
            suggestedSpecialties: ["general"],
            languageMatch: [locale],
            format: "online",
            tone: "gentle",
          });
        }

        const payload = JSON.stringify({ role, locale, answers });
        const { data, usage } = await generateJson<IntakeResult>({
          systemInstruction: INTAKE_ANALYSIS_SYS,
          messages: [{ role: "user", content: payload }],
          temperature: 0.4,
          thinkingBudget: 0,
          safetySettings: SAFETY_STRUCTURED_JSON,
          maxOutputTokens: 2048,
          schema: INTAKE_SCHEMA,
        });

        const db = adminDb();
        if (db && usage) {
          db.collection("adminLogs").add({
            kind: "system",
            payload: { route: "intake", totalTokens: usage.totalTokens },
            at: new Date(),
            createdAt: new Date(),
          }).catch(() => {});
        }

        return Response.json(data);
      },
    },
  },
});
