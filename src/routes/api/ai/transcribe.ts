import { createFileRoute } from "@tanstack/react-router";
import { hasGenAIKey, transcribeSpeechFromBase64 } from "@/lib/ai/genai.server";
import { verifyIdToken } from "@/lib/firebase.server";

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_BYTES = 80;

/** Gemini accepts browser WebM/Opus clips reliably as `video/webm`. */
function normalizeAudioMime(type: string): string {
  const t = (type || "").split(";")[0].trim().toLowerCase();
  if (t.includes("webm")) return "video/webm";
  if (t.startsWith("audio/")) return t;
  return "video/webm";
}

export const Route = createFileRoute("/api/ai/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_form" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const field = formData.get("audio");
        if (!field || typeof field === "string") {
          return new Response(JSON.stringify({ ok: false, error: "missing_audio" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const blob = field as Blob;
        const buf = await blob.arrayBuffer();
        const n = buf.byteLength;
        if (n < MIN_BYTES) {
          return new Response(JSON.stringify({ ok: false, error: "audio_too_short", text: "" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (n > MAX_BYTES) {
          return new Response(JSON.stringify({ ok: false, error: "audio_too_large" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!hasGenAIKey()) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "no_api_key",
              message: "Set GEMINI_API_KEY on the server to enable transcription.",
              text: "",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const mime = normalizeAudioMime(blob.type || "audio/webm");
        const base64 = Buffer.from(buf).toString("base64");

        try {
          const text = await transcribeSpeechFromBase64(mime, base64);
          return Response.json({ ok: true, text });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[api/ai/transcribe]", msg);
          return new Response(
            JSON.stringify({ ok: false, error: "transcription_failed", message: msg, text: "" }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
