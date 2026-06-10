import { orderBy, where } from "firebase/firestore";
import { useFirestoreLive } from "@/lib/queries/realtime";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { CareMessage, CareThread } from "@/lib/types";
import { careThreadId } from "@/lib/care/ids";

export function useCareThreadsLive(uid: string | undefined | null, role: "patient" | "therapist") {
  const field = role === "therapist" ? "therapistId" : "patientUid";
  const live = useFirestoreLive<CareThread>({
    queryKey: ["careThreads", uid, role],
    pathSegments: ["careThreads"],
    constraints: uid
      ? [where(field, "==", uid), orderBy("lastMessageAt", "desc")]
      : [],
    mapDoc: (id, data) => ({ ...(data as CareThread), id }),
    enabled: !!uid && isFirebaseConfigured,
    fallback: [],
  });
  if (!uid) return { data: [] as CareThread[], loading: false, error: null };
  return live;
}

export function useCareMessagesLive(threadId: string | undefined | null) {
  const live = useFirestoreLive<CareMessage>({
    queryKey: ["careMessages", threadId],
    pathSegments: threadId ? ["careThreads", threadId, "messages"] : [],
    constraints: threadId ? [orderBy("createdAt", "asc")] : [],
    mapDoc: (id, data) => ({ ...(data as CareMessage), id }),
    enabled: !!threadId && isFirebaseConfigured,
    fallback: [],
  });
  if (!threadId) return { data: [] as CareMessage[], loading: false, error: null };
  return live;
}

export { careThreadId };

export async function openCareThread(therapistId: string, idToken: string): Promise<string> {
  const res = await fetch("/api/care/threads/open", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ therapistId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "open-thread-failed");
  }
  const json = await res.json() as { threadId: string };
  return json.threadId;
}

export async function sendCareMessage(threadId: string, body: string, idToken: string) {
  const res = await fetch("/api/care/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ threadId, body }),
  });
  if (!res.ok) throw new Error(await res.text());
}
