import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { confirmBookingPayment } from "@/lib/booking/confirm.server";

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

        if (booking.status === "confirmed") {
          return Response.json({ ok: true, confirmed: true });
        }

        if (!["pending_payment", "awaiting_verification"].includes(booking.status as string)) {
          return Response.json({ error: "Booking is not payable" }, { status: 409 });
        }

        const now = Timestamp.now();
        const proofRef = db.collection("paymentProofs").doc();

        // 1. Record the payment proof as auto-approved in Firestore
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
            status: "approved",
            createdAt: now,
          });
        });

        try {
          // 2. Directly confirm the booking in the database using the native confirmation pipeline
          await confirmBookingPayment(db, bookingRef, booking as any, decoded.uid, "instapay");

          return Response.json({
            ok: true,
            proofId: proofRef.id,
            confirmed: true,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[api/instapay/proof-mock]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
