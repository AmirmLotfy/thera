import { createFileRoute } from "@tanstack/react-router";
import { CHAT_MAX_OUTPUT_TOKENS, CHAT_MESSAGE_WINDOW_MAX } from "@/lib/ai/config";
import { generateStream, generateJson, hasGenAIKey } from "@/lib/ai/genai.server";
import {
  fastCrisisCheck,
  affectHeuristicCheck,
  systemPromptFor,
  crisisReplyFor,
  crisisClassifierSystemInstruction,
} from "@/lib/ai/prompts";
import { SAFETY_CHAT, SAFETY_CLASSIFIER } from "@/lib/ai/safety";
import { verifyIdToken, adminDb } from "@/lib/firebase.server";
import type { Role } from "@/lib/auth";
import { Type, type Schema } from "@google/genai";

type ChatRequest = {
  messages: { role: "user" | "assistant"; content: string }[];
  role?: Role;
  locale?: "en" | "ar";
  conversationId?: string;
};

function trimChatWindow(messages: ChatRequest["messages"]): ChatRequest["messages"] {
  if (messages.length <= CHAT_MESSAGE_WINDOW_MAX) return messages;
  let slice = messages.slice(-CHAT_MESSAGE_WINDOW_MAX);
  while (slice.length > 0 && slice[0].role !== "user") {
    slice = slice.slice(1);
  }
  return slice.length > 0 ? slice : messages.slice(-1);
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

function sseEvent(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

const CRISIS_CLASSIFIER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    crisis: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    reason: { type: Type.STRING },
  },
  required: ["crisis", "confidence", "reason"],
};

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequest;
        try { body = await request.json() as ChatRequest; }
        catch { return new Response("Bad JSON", { status: 400 }); }

        const { messages, role = "adult", locale, conversationId } = body ?? {};
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("messages[] required", { status: 400 });
        }

        const decoded = await verifyIdToken(request);
        const uid = decoded?.uid ?? null;

        const latestUser = [...messages].reverse().find((m) => m.role === "user");
        const userText = latestUser?.content ?? "";

        async function logCrisis(via: string) {
          const db = adminDb();
          if (db && uid) {
            try {
              await db.collection("adminLogs").add({
                kind: "crisis_flag",
                uid, text: userText.slice(0, 500), severity: "high",
                payload: { via },
                at: new Date(), createdAt: new Date(),
              });
            } catch (err) { console.warn("[api/ai/chat] log failed", err); }
          }
        }

        // Stage 1: Regex fast-path — bypass the model entirely
        if (fastCrisisCheck(userText)) {
          await logCrisis("regex");
          const reply = crisisReplyFor(locale, userText);
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(enc.encode(sseEvent("crisis", { hotlines: true })));
              controller.enqueue(enc.encode(sseEvent("delta", { text: reply })));
              controller.enqueue(enc.encode(sseEvent("done", { crisis: true })));
              controller.close();
            },
          });
          return new Response(stream, { headers: sseHeaders() });
        }

        // Stage 2: Affect heuristic + LLM classifier for ambiguous messages
        const hasAffectHeuristic = affectHeuristicCheck(userText);
        const aiReady = hasGenAIKey();
        if (hasAffectHeuristic && aiReady) {
          try {
            const { data } = await generateJson<{ crisis: boolean; confidence: number; reason: string }>({
              systemInstruction: crisisClassifierSystemInstruction(locale, userText),
              messages: [{ role: "user", content: userText }],
              temperature: 0,
              thinkingBudget: 0,
              safetySettings: SAFETY_CLASSIFIER,
              maxOutputTokens: 256,
              schema: CRISIS_CLASSIFIER_SCHEMA,
            });
            if (data.crisis && data.confidence >= 0.7) {
              await logCrisis("llm");
              const reply = crisisReplyFor(locale, userText);
              const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                  const enc = new TextEncoder();
                  controller.enqueue(enc.encode(sseEvent("crisis", { hotlines: true })));
                  controller.enqueue(enc.encode(sseEvent("delta", { text: reply })));
                  controller.enqueue(enc.encode(sseEvent("done", { crisis: true })));
                  controller.close();
                },
              });
              return new Response(stream, { headers: sseHeaders() });
            }
          } catch (err) {
            console.warn("[api/ai/chat] classifier error", err);
          }
        }

        // No API key configured (or placeholder) — graceful demo reply so the
        // chat UI works end-to-end before an operator adds GEMINI_API_KEY.
        if (!aiReady) {
          const demoReply = locale === "ar"
            ? "أنا هنا معك. أخبرني المزيد. (وضع تجريبي — أضف GEMINI_API_KEY لتفعيل الردود الحقيقية.)"
            : "I hear you. Tell me more. (Demo mode — set GEMINI_API_KEY to enable real replies.)";
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(enc.encode(sseEvent("delta", { text: demoReply })));
              controller.enqueue(enc.encode(sseEvent("done", { crisis: false, demo: true })));
              controller.close();
            },
          });
          return new Response(stream, { headers: sseHeaders() });
        }

        const systemInstruction = systemPromptFor(role, locale);
        const trimmedMessages = trimChatWindow(messages);
        let streamIter: Awaited<ReturnType<typeof generateStream>>;
        try {
          streamIter = await generateStream({
            systemInstruction,
            messages: trimmedMessages,
            thinkingBudget: -1,
            signal: request.signal,
            safetySettings: SAFETY_CHAT,
            maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
          });
        } catch (err) {
          // Gemini rejected the setup (bad key / quota) — surface a clean SSE
          // error to the client instead of returning an opaque 500.
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[api/ai/chat] generateStream setup failed", msg);
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const enc = new TextEncoder();
              controller.enqueue(enc.encode(sseEvent("error", { message: msg })));
              controller.close();
            },
          });
          return new Response(stream, { headers: sseHeaders(), status: 200 });
        }

        const enc = new TextEncoder();
        let full = "";
        let totalTokens = 0;
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of streamIter) {
                if (request.signal?.aborted) break;
                const text = chunk.text ?? "";
                if (!text) continue;
                full += text;
                controller.enqueue(enc.encode(sseEvent("delta", { text })));
                if (chunk.usageMetadata?.totalTokenCount) {
                  totalTokens = chunk.usageMetadata.totalTokenCount;
                }
              }
              controller.enqueue(enc.encode(sseEvent("done", { crisis: false })));

              // Persist conversation + messages via Admin SDK.
              const db = adminDb();
              if (db && uid) {
                try {
                  const convRef = conversationId
                    ? db.collection("aiConversations").doc(conversationId)
                    : db.collection("aiConversations").doc();
                  const convSnap = await convRef.get();
                  const now = new Date();
                  const firstUser = trimmedMessages.find((m) => m.role === "user")?.content?.slice(0, 80) ?? "New conversation";
                  if (!convSnap.exists) {
                    await convRef.set({
                      uid, role,
                      title: firstUser,
                      lastMessage: full.slice(0, 240),
                      messageCount: trimmedMessages.length + 1,
                      createdAt: now, updatedAt: now,
                    });
                  } else {
                    await convRef.update({
                      lastMessage: full.slice(0, 240),
                      messageCount: trimmedMessages.length + 1,
                      updatedAt: now,
                    });
                  }
                  await convRef.collection("messages").add({ uid, role: "user", content: userText, createdAt: now });
                  await convRef.collection("messages").add({ uid, role: "assistant", content: full, createdAt: now });

                  if (totalTokens > 0) {
                    await db.collection("adminLogs").add({
                      kind: "system",
                      payload: { route: "chat", totalTokens, uid },
                      at: now, createdAt: now,
                    });
                  }
                } catch (err) {
                  console.warn("[api/ai/chat] persist failed", err);
                }
              }
            } catch (err) {
              if (!request.signal?.aborted) {
                const msg = err instanceof Error ? err.message : String(err);
                controller.enqueue(enc.encode(sseEvent("error", { message: msg })));
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, { headers: sseHeaders() });
      },
    },
  },
});
