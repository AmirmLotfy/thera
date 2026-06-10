import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { upsertCareThread } from "@/lib/care/threads.server";

type Body = { therapistId: string };

export const Route = createFileRoute("/api/care/threads/open")({
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
        const { therapistId } = body ?? {};
        if (!therapistId) return new Response("therapistId required", { status: 400 });

        const bookingSnap = await db.collection("bookings")
          .where("patientUid", "==", decoded.uid)
          .where("therapistId", "==", therapistId)
          .where("status", "in", ["confirmed", "completed"])
          .limit(1)
          .get();

        if (bookingSnap.empty) {
          return Response.json({ error: "no_booking" }, { status: 403 });
        }

        const booking = bookingSnap.docs[0]!;
        const threadId = await upsertCareThread(db, {
          patientUid: decoded.uid,
          therapistId,
          bookingId: booking.id,
        });

        return Response.json({ threadId });
      },
    },
  },
});
