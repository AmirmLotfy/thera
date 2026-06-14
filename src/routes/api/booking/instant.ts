import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { confirmBookingPayment } from "@/lib/booking/confirm.server";

type InstantRequest = {
  therapistId: string;
  childId?: string;
  notes?: string;
};

export const Route = createFileRoute("/api/booking/instant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const uid = decoded.uid;
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });

        let body: InstantRequest;
        try {
          body = (await request.json()) as InstantRequest;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const { therapistId, childId, notes } = body ?? {};
        if (!therapistId) {
          return new Response("therapistId is required", { status: 400 });
        }

        // 1. Check child permission if provided
        let childName: string | null = null;
        if (childId) {
          const childSnap = await db.collection("children").doc(childId).get();
          if (!childSnap.exists || childSnap.data()?.parentUid !== uid) {
            return Response.json({ error: "invalid-child" }, { status: 400 });
          }
          childName = childSnap.data()?.name ?? null;
        }

        const therapistRef = db.collection("therapists").doc(therapistId);
        const bookingRef = db.collection("bookings").doc();

        try {
          const therapistSnap = await therapistRef.get();
          if (!therapistSnap.exists) {
            return Response.json({ error: "therapist-not-found" }, { status: 404 });
          }

          const therapist = therapistSnap.data()!;
          if (therapist.approved !== true) {
            return Response.json({ error: "therapist-not-approved" }, { status: 400 });
          }

          if (therapist.availableNow !== true) {
            return Response.json({ error: "therapist-offline" }, { status: 409 });
          }

          const now = Timestamp.now();
          const durationMinutes = therapist.sessionMinutes ?? 50;
          const endsAtDate = new Date(Date.now() + durationMinutes * 60 * 1000);
          const endsAt = Timestamp.fromDate(endsAtDate);

          const bookingData = {
            slotId: null, // Bypasses slots query because it is an instant session
            therapistId,
            patientUid: uid,
            childId: childId ?? null,
            childName,
            status: "pending_payment",
            amount: therapist.pricePerSession ?? 0,
            currency: therapist.currency ?? "EGP",
            notes: notes ?? null,
            sessionId: null,
            paymentId: null,
            paymentProvider: null,
            startsAt: now,
            endsAt,
            createdAt: now,
            updatedAt: now,
            isInstant: true,
          };

          // Create the booking first
          await bookingRef.set(bookingData);

          // Confirm the booking payment immediately to start the session room
          const confirmResult = await confirmBookingPayment(
            db,
            bookingRef,
            bookingData,
            uid,
            "mock",
            { patientNotificationKind: "booking.confirmed" }
          );

          return Response.json({
            ok: true,
            bookingId: bookingRef.id,
            sessionId: confirmResult.sessionId,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
