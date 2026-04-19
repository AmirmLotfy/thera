import { createFileRoute } from "@tanstack/react-router";
import { generateOnce, hasGenAIKey } from "@/lib/ai/genai.server";
import { SESSION_SUMMARY_SYS } from "@/lib/ai/prompts";
import { SAFETY_SUMMARIZE } from "@/lib/ai/safety";
import { verifyIdToken, adminDb } from "@/lib/firebase.server";


type SummarizeRequest = {
  raw: string;
  sessionId?: string;
  uidPatient?: string;
};

export const Route = createFileRoute("/api/ai/summarize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        let body: SummarizeRequest;
        try { body = await request.json() as SummarizeRequest; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        const { raw, sessionId } = body ?? {};
        if (!raw || raw.length < 20) return new Response("raw too short", { status: 400 });

        if (!hasGenAIKey()) {
          return Response.json({
            summaryEn: "(Demo mode — set GEMINI_API_KEY to generate real summaries.)",
            summaryAr: "(وضع تجريبي — أضف GEMINI_API_KEY لتوليد ملخصات حقيقية.)",
          });
        }

        const { text, usage } = await generateOnce({
          systemInstruction: SESSION_SUMMARY_SYS,
          messages: [{ role: "user", content: raw }],
          temperature: 0.5,
          thinkingBudget: 1024,
          safetySettings: SAFETY_SUMMARIZE,
          maxOutputTokens: 8192,
        });
        const [summaryEn, summaryAr] = text.split(/\n---+\n/).map((s) => s.trim());

        // Optionally write back onto the report doc.
        if (sessionId) {
          const db = adminDb();
          if (db) {
            try {
              const q = await db.collection("reports").where("sessionId", "==", sessionId).limit(1).get();
              if (!q.empty) {
                await q.docs[0].ref.update({
                  summaryEn: summaryEn ?? null,
                  summaryAr: summaryAr ?? null,
                  summary: text,
                  updatedAt: new Date(),
                });
              }
            } catch (err) { console.warn("[api/ai/summarize] persist failed", err); }
          }
        }

        const db2 = adminDb();
        if (db2 && usage?.totalTokens) {
          db2.collection("adminLogs").add({
            kind: "system",
            payload: { route: "summarize", totalTokens: usage.totalTokens, thoughtsTokens: usage.thoughtsTokens ?? 0 },
            at: new Date(), createdAt: new Date(),
          }).catch(() => {});
        }

        return Response.json({ summary: text, summaryEn, summaryAr });
      },
    },
  },
});
