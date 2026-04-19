import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { createDailyMeetingToken } from "@/lib/video/daily.server";

export const Route = createFileRoute("/api/sessions/$id/token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });
        const snap = await db.collection("sessions").doc(params.id).get();
        if (!snap.exists) return new Response("Session not found", { status: 404 });
        const session = snap.data()!;
        const isTherapist = session.therapistId === decoded.uid;
        const isPatient = session.patientUid === decoded.uid;
        if (!isTherapist && !isPatient) return new Response("Forbidden", { status: 403 });
        if (!session.roomName) {
          return Response.json({ demo: true, roomUrl: session.roomUrl ?? null, token: null });
        }
        const token = await createDailyMeetingToken({
          roomName: session.roomName,
          userId: decoded.uid,
          userName: decoded.name ?? (isTherapist ? "Therapist" : "Client"),
          isOwner: isTherapist,
        });
        // If DAILY_API_KEY is missing, createDailyMeetingToken returns null — flag as demo.
        const isDemo = !process.env.DAILY_API_KEY;
        return Response.json({ roomUrl: session.roomUrl, roomName: session.roomName, token, demo: isDemo });
      },
    },
  },
});
