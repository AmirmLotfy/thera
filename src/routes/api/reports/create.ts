import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";

type Body = {
  sessionId: string;
  raw: string;
  recommendations?: string[];
};

export const Route = createFileRoute("/api/reports/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        let body: Body;
        try { body = await request.json() as Body; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        if (!body.sessionId || !body.raw) return new Response("Missing fields", { status: 400 });
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });

        const sessionSnap = await db.collection("sessions").doc(body.sessionId).get();
        if (!sessionSnap.exists) return new Response("Session not found", { status: 404 });
        const session = sessionSnap.data()!;
        if (session.therapistId !== decoded.uid) return new Response("Forbidden", { status: 403 });

        const now = Timestamp.now();
        const reportRef = db.collection("reports").doc();
        await db.runTransaction(async (tx) => {
          tx.set(reportRef, {
            id: reportRef.id,
            sessionId: body.sessionId,
            therapistId: decoded.uid,
            patientUid: session.patientUid,
            raw: body.raw,
            recommendations: body.recommendations ?? [],
            createdAt: now,
          });
          tx.update(sessionSnap.ref, {
            status: "ended",
            reportId: reportRef.id,
            updatedAt: now,
          });
          // Notification is handled by the notifyReportReady Cloud Function trigger.
          // Do NOT add it here to avoid duplicate notifications.
        });

        return Response.json({ reportId: reportRef.id });
      },
    },
  },
});
