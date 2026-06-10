import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { confirmBookingPayment } from "@/lib/booking/confirm.server";
import { Timestamp } from "firebase-admin/firestore";
import { notificationPayload } from "@/lib/notifications/copy";

type Body = { proofId: string; decision: "approve" | "reject"; reason?: string };

export const Route = createFileRoute("/api/admin/instapay/verify")({
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

        const proofRef = db.collection("paymentProofs").doc(body.proofId);
        const proofSnap = await proofRef.get();
        if (!proofSnap.exists) return new Response("Not found", { status: 404 });
        const proof = proofSnap.data()!;
        const bookingRef = db.collection("bookings").doc(proof.bookingId);
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) return new Response("Booking missing", { status: 404 });
        const booking = bookingSnap.data()!;

        const isAdmin = (decoded as unknown as { role?: string }).role === "admin" || (decoded as unknown as { admin?: boolean }).admin === true;
        const isOwnerTherapist = booking.therapistId === decoded.uid;
        if (!isAdmin && !isOwnerTherapist) return new Response("Forbidden", { status: 403 });
        const now = Timestamp.now();

        if (body.decision === "reject") {
          await db.runTransaction(async (tx) => {
            tx.update(proofRef, { status: "rejected", reviewedBy: decoded.uid, reviewedAt: now, reason: body.reason ?? null });
            tx.update(bookingRef, { status: "cancelled", updatedAt: now, cancellationReason: body.reason ?? "payment rejected" });
            if (booking.slotId) {
              tx.update(db.collection("availabilitySlots").doc(booking.slotId), {
                status: "open",
                bookingId: null,
                lockedBy: null,
                updatedAt: now,
              });
            }
            if (booking.paymentId) {
              tx.update(db.collection("payments").doc(booking.paymentId), { status: "failed", updatedAt: now });
            }
            tx.set(db.collection("notifications").doc(), {
              ...notificationPayload(booking.patientUid, "payment.rejected"),
              createdAt: now,
            });
            tx.set(db.collection("adminLogs").doc(), {
              kind: "instapay.rejected",
              reviewedBy: decoded.uid,
              bookingId: proof.bookingId,
              createdAt: now,
            });
          });
          return Response.json({ ok: true, decision: "reject" });
        }

        await db.runTransaction(async (tx) => {
          tx.update(proofRef, { status: "approved", reviewedBy: decoded.uid, reviewedAt: now });
          tx.set(db.collection("adminLogs").doc(), {
            kind: "instapay.approved",
            reviewedBy: decoded.uid,
            bookingId: proof.bookingId,
            createdAt: now,
          });
        });

        const result = await confirmBookingPayment(
          db,
          bookingRef,
          booking,
          booking.patientUid,
          "instapay",
          { patientNotificationKind: "payment.confirmed" },
        );
        return Response.json({ ok: true, decision: "approve", sessionId: result.sessionId });
      },
    },
  },
});
