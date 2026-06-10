import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { notificationPayload } from "@/lib/notifications/copy";

type Body = { bookingId: string; fileUrl?: string; reference?: string; note?: string };

export const Route = createFileRoute("/api/instapay/proof")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });
        const bookingRef = db.collection("bookings").doc(body.bookingId);
        const snap = await bookingRef.get();
        if (!snap.exists) return new Response("Booking not found", { status: 404 });
        const booking = snap.data()!;
        if (booking.patientUid !== decoded.uid) return new Response("Forbidden", { status: 403 });

        if (!["pending_payment", "awaiting_verification"].includes(booking.status as string)) {
          return Response.json({ ok: true, alreadySubmitted: true });
        }

        const now = Timestamp.now();
        const proofRef = db.collection("paymentProofs").doc();
        const paymentRef = booking.paymentId
          ? db.collection("payments").doc(booking.paymentId)
          : db.collection("payments").doc();

        await db.runTransaction(async (tx) => {
          tx.set(proofRef, {
            id: proofRef.id,
            bookingId: body.bookingId,
            therapistId: booking.therapistId,
            patientUid: decoded.uid,
            uid: decoded.uid,
            fileUrl: body.fileUrl ?? null,
            reference: body.reference ?? null,
            note: body.note ?? null,
            status: "pending_review",
            createdAt: now,
          });
          if (!booking.paymentId) {
            tx.set(paymentRef, {
              id: paymentRef.id,
              bookingId: body.bookingId,
              uid: decoded.uid,
              provider: "instapay",
              amount: booking.amount ?? 0,
              currency: booking.currency ?? "EGP",
              status: "pending",
              proofPath: body.fileUrl ?? null,
              createdAt: now,
            });
            tx.update(bookingRef, {
              status: "awaiting_verification",
              paymentId: paymentRef.id,
              paymentProvider: "instapay",
              updatedAt: now,
            });
          } else {
            tx.update(bookingRef, {
              status: "awaiting_verification",
              paymentProvider: "instapay",
              updatedAt: now,
            });
            tx.update(paymentRef, {
              status: "pending",
              proofPath: body.fileUrl ?? null,
              updatedAt: now,
            });
          }
          tx.set(db.collection("notifications").doc(), {
            ...notificationPayload(booking.therapistId, "instapay.proof_received"),
            bookingId: body.bookingId,
            proofId: proofRef.id,
            createdAt: now,
          });
        });

        return Response.json({
          ok: true,
          proofId: proofRef.id,
          pendingReview: true,
        });
      },
    },
  },
});
