import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { notificationPayload } from "@/lib/notifications/copy";

type Body = { threadId: string; body: string };

export const Route = createFileRoute("/api/care/messages")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const text = body?.body?.trim();
        if (!body?.threadId || !text) {
          return new Response("threadId + body required", { status: 400 });
        }

        const threadRef = db.collection("careThreads").doc(body.threadId);
        const threadSnap = await threadRef.get();
        if (!threadSnap.exists) return new Response("Thread not found", { status: 404 });
        const thread = threadSnap.data()!;
        const isParticipant = thread.patientUid === decoded.uid || thread.therapistId === decoded.uid;
        if (!isParticipant) return new Response("Forbidden", { status: 403 });

        const now = Timestamp.now();
        const msgRef = threadRef.collection("messages").doc();
        const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
        const recipientUid = thread.patientUid === decoded.uid ? thread.therapistId : thread.patientUid;

        await db.runTransaction(async (tx) => {
          tx.set(msgRef, {
            id: msgRef.id,
            threadId: body.threadId,
            senderUid: decoded.uid,
            body: text,
            readBy: [decoded.uid],
            createdAt: now,
          });
          tx.update(threadRef, {
            lastMessageAt: now,
            lastMessagePreview: preview,
            updatedAt: now,
          });
          tx.set(db.collection("notifications").doc(), {
            ...notificationPayload(recipientUid, "care.message"),
            threadId: body.threadId,
            createdAt: now,
          });
        });

        return Response.json({ messageId: msgRef.id });
      },
    },
  },
});
