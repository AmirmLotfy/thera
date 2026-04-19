import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { createDailyRoom } from "@/lib/video/daily.server";
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

        // Only the therapist who owns the booking (or an admin) may verify
        const isAdmin = (decoded as unknown as { role?: string }).role === "admin" || (decoded as unknown as { admin?: boolean }).admin === true;
        const isOwnerTherapist = booking.therapistId === decoded.uid;
        if (!isAdmin && !isOwnerTherapist) return new Response("Forbidden", { status: 403 });
        const now = Timestamp.now();

        if (body.decision === "reject") {
          await db.runTransaction(async (tx) => {
            tx.update(proofRef, { status: "rejected", reviewedBy: decoded.uid, reviewedAt: now, reason: body.reason ?? null });
            tx.update(bookingRef, { status: "cancelled", updatedAt: now, cancellationReason: body.reason ?? "payment rejected" });
            tx.update(db.collection("availabilitySlots").doc(booking.slotId), { status: "open", bookingId: null, updatedAt: now });
            if (booking.paymentId) tx.update(db.collection("payments").doc(booking.paymentId), { status: "rejected", reviewedAt: now });
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

        // Approve path: mirror the polar webhook flow
        let roomUrl: string | null = null;
        let roomName: string | null = null;
        try {
          const slotSnap = await db.collection("availabilitySlots").doc(booking.slotId).get();
          const starts: Timestamp = slotSnap.data()?.startsAt ?? Timestamp.now();
          const minutes = Math.max(60, Math.ceil((starts.toMillis() + 2 * 60 * 60 * 1000 - Date.now()) / 60_000));
          const room = await createDailyRoom({ name: `thera-${proof.bookingId.slice(0, 8)}`, expMinutes: minutes });
          roomUrl = room?.url ?? null;
          roomName = room?.name ?? null;
        } catch (err) { console.warn("[instapay.verify] daily", err); }

        // Denormalize patient name for admin UI
        let patientName: string | null = null;
        try {
          const userSnap = await db.collection("users").doc(booking.patientUid).get();
          patientName = userSnap.data()?.displayName ?? null;
        } catch { /* non-critical */ }

        const sessionRef = db.collection("sessions").doc();
        await db.runTransaction(async (tx) => {
          tx.update(proofRef, { status: "approved", reviewedBy: decoded.uid, reviewedAt: now });
          if (booking.paymentId) tx.update(db.collection("payments").doc(booking.paymentId), { status: "paid", paidAt: now });
          tx.update(bookingRef, { status: "confirmed", sessionId: sessionRef.id, updatedAt: now });
          tx.update(db.collection("availabilitySlots").doc(booking.slotId), { status: "booked", bookingId: proof.bookingId, updatedAt: now });
          tx.set(sessionRef, {
            id: sessionRef.id,
            bookingId: proof.bookingId,
            therapistId: booking.therapistId,
            patientUid: booking.patientUid,
            patientName,
            slotId: booking.slotId,
            startsAt: booking.startsAt ?? null,
            status: "upcoming",
            videoProvider: "daily",
            roomUrl,
            roomName,
            createdAt: now,
            updatedAt: now,
          });
          tx.set(db.collection("notifications").doc(), {
            ...notificationPayload(booking.patientUid, "payment.confirmed"),
            createdAt: now,
          });
          tx.set(db.collection("adminLogs").doc(), {
            kind: "instapay.approved",
            reviewedBy: decoded.uid,
            bookingId: proof.bookingId,
            createdAt: now,
          });
        });
        return Response.json({ ok: true, decision: "approve", sessionId: sessionRef.id });
      },
    },
  },
});
