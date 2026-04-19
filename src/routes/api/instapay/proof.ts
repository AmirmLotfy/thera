import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { notificationPayload } from "@/lib/notifications/copy";
import { Timestamp } from "firebase-admin/firestore";

type Body = { bookingId: string; fileUrl: string; reference?: string; note?: string };

export const Route = createFileRoute("/api/instapay/proof")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        let body: Body;
        try { body = await request.json() as Body; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });
        const bookingRef = db.collection("bookings").doc(body.bookingId);
        const snap = await bookingRef.get();
        if (!snap.exists) return new Response("Booking not found", { status: 404 });
        const booking = snap.data()!;
        if (booking.patientUid !== decoded.uid) return new Response("Forbidden", { status: 403 });

        const now = Timestamp.now();
        const proofRef = db.collection("paymentProofs").doc();
        const paymentRef = db.collection("payments").doc(proofRef.id);
        await db.runTransaction(async (tx) => {
          tx.set(proofRef, {
            id: proofRef.id,
            bookingId: body.bookingId,
            therapistId: booking.therapistId,
            patientUid: decoded.uid,
            // Keep uid for backwards compat
            uid: decoded.uid,
            fileUrl: body.fileUrl,
            reference: body.reference ?? null,
            note: body.note ?? null,
            status: "pending_review",
            createdAt: now,
          });
          tx.set(paymentRef, {
            id: paymentRef.id,
            bookingId: body.bookingId,
            uid: decoded.uid,
            provider: "instapay",
            amount: booking.amount ?? 0,
            currency: booking.currency ?? "EGP",
            status: "pending",
            proofId: proofRef.id,
            createdAt: now,
          });
          tx.update(bookingRef, {
            status: "awaiting_verification",
            paymentProvider: "instapay",
            paymentId: paymentRef.id,
            updatedAt: now,
          });
          // Notify the therapist that a proof is waiting for their review
          tx.set(db.collection("notifications").doc(), {
            ...notificationPayload(booking.therapistId, "instapay.proof_received"),
            bookingId: body.bookingId,
            proofId: proofRef.id,
            createdAt: now,
          });
          tx.set(db.collection("adminLogs").doc(), {
            kind: "instapay.proof.submitted",
            uid: decoded.uid,
            bookingId: body.bookingId,
            proofId: proofRef.id,
            createdAt: now,
          });
        });

        return Response.json({ ok: true, proofId: proofRef.id });
      },
    },
  },
});
