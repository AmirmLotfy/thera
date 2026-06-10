import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { notificationPayload } from "@/lib/notifications/copy";

type Body = { bookingId: string; reason?: string };

export const Route = createFileRoute("/api/booking/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });

        let body: Body;
        try { body = await request.json() as Body; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        const { bookingId, reason } = body ?? {};
        if (!bookingId) return new Response("bookingId required", { status: 400 });

        const bookingRef = db.collection("bookings").doc(bookingId);
        const snap = await bookingRef.get();
        if (!snap.exists) return new Response("Booking not found", { status: 404 });
        const booking = snap.data()!;

        const isOwner = booking.patientUid === decoded.uid || booking.therapistId === decoded.uid;
        const isAdmin = (decoded as unknown as { role?: string }).role === "admin" || (decoded as unknown as { admin?: boolean }).admin === true;
        if (!isOwner && !isAdmin) return new Response("Forbidden", { status: 403 });

        const cancellable: string[] = ["pending_payment", "awaiting_verification", "confirmed"];
        if (!cancellable.includes(booking.status)) {
          return Response.json({ error: "Booking cannot be cancelled in its current state" }, { status: 409 });
        }

        const now = Timestamp.now();
        await db.runTransaction(async (tx) => {
          tx.update(bookingRef, {
            status: "cancelled",
            cancellationReason: reason ?? "user_requested",
            cancelledBy: decoded.uid,
            updatedAt: now,
          });

          if (booking.slotId) {
            tx.update(db.collection("availabilitySlots").doc(booking.slotId), {
              status: "open",
              bookingId: null,
              lockedBy: null,
              updatedAt: now,
            });
          }

          if (booking.paymentId && booking.status !== "pending_payment") {
            tx.update(db.collection("payments").doc(booking.paymentId), {
              status: "refunded",
              updatedAt: now,
              adminNote: "Cancelled by user/therapist — manual reconciliation required.",
            });
          }

          // Notify patient if therapist or admin cancelled
          if (decoded.uid !== booking.patientUid) {
            tx.set(db.collection("notifications").doc(), {
              ...notificationPayload(booking.patientUid, "booking.cancelled"),
              createdAt: now,
            });
          }

          // Notify therapist if patient cancelled
          if (decoded.uid !== booking.therapistId && booking.therapistId) {
            tx.set(db.collection("notifications").doc(), {
              ...notificationPayload(booking.therapistId, "booking.cancelled"),
              createdAt: now,
            });
          }

          tx.set(db.collection("adminLogs").doc(), {
            kind: "system",
            payload: { action: "booking_cancelled", bookingId, by: decoded.uid, reason: reason ?? null },
            at: now, createdAt: now,
          });
        });

        return Response.json({ ok: true });
      },
    },
  },
});
