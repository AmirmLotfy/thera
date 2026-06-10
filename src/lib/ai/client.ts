import { auth } from "@/lib/firebase";
import type { Role } from "@/lib/auth";

export type ClientMessage = { role: "user" | "assistant"; content: string };

type StreamCallbacks = {
  onDelta?: (text: string) => void;
  onCrisis?: (payload: { hotlines?: boolean }) => void;
  onDone?: (payload: { crisis?: boolean; demo?: boolean }) => void;
  onError?: (err: Error) => void;
};

async function bearerHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) h["Authorization"] = `Bearer ${token}`;
  } catch { /* ignore */ }
  return h;
}

export async function streamChat(
  input: { messages: ClientMessage[]; role?: Role; locale?: "en" | "ar"; conversationId?: string },
  cb: StreamCallbacks = {},
  signal?: AbortSignal,
): Promise<void> {
  const headers = await bearerHeaders();
  let res: Response;
  try {
    res = await fetch("/api/ai/chat", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    cb.onError?.(err as Error);
    return;
  }
  if (!res.ok || !res.body) {
    const msg = `Chat request failed (${res.status})`;
    cb.onError?.(new Error(msg));
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const eventMatch = raw.match(/^event:\s*(.+)$/m);
        const dataMatch  = raw.match(/^data:\s*(.+)$/m);
        if (!eventMatch || !dataMatch) continue;
        const event = eventMatch[1].trim();
        let data: unknown = {};
        try { data = JSON.parse(dataMatch[1]); } catch { /* ignore */ }
        if (event === "delta")  cb.onDelta?.((data as { text?: string }).text ?? "");
        if (event === "crisis") cb.onCrisis?.(data as { hotlines?: boolean });
        if (event === "done")   cb.onDone?.(data as { crisis?: boolean; demo?: boolean });
        if (event === "error")  cb.onError?.(new Error((data as { message?: string }).message ?? "stream error"));
      }
    }
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") cb.onError?.(err as Error);
  } finally {
    reader.releaseLock();
  }
}

export async function summarizeReport(raw: string, sessionId?: string) {
  const headers = await bearerHeaders();
  const res = await fetch("/api/ai/summarize", {
    method: "POST",
    headers,
    body: JSON.stringify({ raw, sessionId }),
  });
  if (!res.ok) throw new Error(`summarize failed (${res.status})`);
  return res.json() as Promise<{ summary?: string; summaryEn?: string; summaryAr?: string }>;
}

export async function intakeAnalyze(input: {
  answers: Record<string, string>;
  role?: Role;
  locale?: "en" | "ar";
  idToken?: string;
}): Promise<{
  summary?: string;
  suggestedSpecialties?: string[];
  languageMatch?: "en" | "ar" | "either";
  format?: "online" | "in_person" | "either";
  tone?: string;
}> {
  const headers = await bearerHeaders();
  if (input.idToken) headers["Authorization"] = `Bearer ${input.idToken}`;
  const res = await fetch("/api/ai/intake", {
    method: "POST",
    headers,
    body: JSON.stringify({ answers: input.answers, role: input.role, locale: input.locale }),
  });
  if (!res.ok) throw new Error(`intake failed (${res.status})`);
  return res.json();
}
