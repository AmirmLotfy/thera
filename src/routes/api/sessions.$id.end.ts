import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";

export const Route = createFileRoute("/api/sessions/$id/end")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });

        const sessionRef = db.collection("sessions").doc(params.id);
        const snap = await sessionRef.get();
        if (!snap.exists) return new Response("Session not found", { status: 404 });
        const session = snap.data()!;

        const isTherapist = session.therapistId === decoded.uid;
        const isPatient = session.patientUid === decoded.uid;
        const isAdmin = (decoded as unknown as { role?: string }).role === "admin" || (decoded as unknown as { admin?: boolean }).admin === true;
        if (!isTherapist && !isPatient && !isAdmin) return new Response("Forbidden", { status: 403 });

        const endable: string[] = ["upcoming", "live"];
        if (!endable.includes(session.status)) {
          return Response.json({ error: "Session is already ended or missed" }, { status: 409 });
        }

        const now = Timestamp.now();
        await sessionRef.update({ status: "ended", endedAt: now, updatedAt: now });

        return Response.json({ ok: true });
      },
    },
  },
});
