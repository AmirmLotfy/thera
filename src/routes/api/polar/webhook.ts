import { createFileRoute } from "@tanstack/react-router";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { adminDb } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { createDailyRoom } from "@/lib/video/daily.server";
import { notificationPayload } from "@/lib/notifications/copy";

export const Route = createFileRoute("/api/polar/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.POLAR_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 501 });
        const raw = await request.text();
        const headers: Record<string, string> = {};
        request.headers.forEach((v, k) => { headers[k] = v; });

        let event: Awaited<ReturnType<typeof validateEvent>>;
        try {
          event = validateEvent(raw, headers, secret);
        } catch (err) {
          if (err instanceof WebhookVerificationError) return new Response("Invalid signature", { status: 401 });
          return new Response("Invalid payload", { status: 400 });
        }

        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });

        if (event.type === "checkout.updated" || event.type === "order.paid" || event.type === "order.created") {
          const data = event.data as Record<string, unknown> & { metadata?: Record<string, string>; status?: string };
          const bookingId = data?.metadata?.bookingId;
          if (!bookingId) return Response.json({ ok: true, skipped: "no bookingId" });
          const bookingRef = db.collection("bookings").doc(bookingId);
          const snap = await bookingRef.get();
          if (!snap.exists) return Response.json({ ok: true, skipped: "booking missing" });
          const booking = snap.data()!;
          const paid = event.type === "order.paid" || event.type === "order.created" || (event.type === "checkout.updated" && data.status === "succeeded");
          if (!paid) return Response.json({ ok: true, skipped: "not paid yet" });
          if (booking.status === "confirmed") return Response.json({ ok: true, skipped: "already confirmed" });

          // Attempt to create a Daily.co room; fall back gracefully in demo.
          let roomUrl: string | null = null;
          let roomName: string | null = null;
          try {
            const slotSnap = await db.collection("availabilitySlots").doc(booking.slotId).get();
            const starts: Timestamp = slotSnap.data()?.startsAt ?? Timestamp.now();
            const expSec = Math.floor(starts.toMillis() / 1000) + 2 * 60 * 60;
            const room = await createDailyRoom({
              name: `thera-${bookingId.slice(0, 8)}`,
              expMinutes: Math.max(60, Math.ceil((expSec * 1000 - Date.now()) / 60_000)),
            });
            roomUrl = room?.url ?? null;
            roomName = room?.name ?? null;
          } catch (err) { console.warn("[polar.webhook] daily room", err); }

          const sessionRef = db.collection("sessions").doc();
          const now = Timestamp.now();
          // Denormalize patient display name for admin UI
          let patientName: string | null = null;
          try {
            const userSnap = await db.collection("users").doc(booking.patientUid).get();
            patientName = userSnap.data()?.displayName ?? null;
          } catch { /* non-critical */ }

          await db.runTransaction(async (tx) => {
            tx.update(bookingRef, {
              status: "confirmed",
              sessionId: sessionRef.id,
              updatedAt: now,
            });
            tx.update(db.collection("availabilitySlots").doc(booking.slotId), {
              status: "booked",
              bookingId,
              updatedAt: now,
            });
            if (booking.paymentId) {
              tx.set(db.collection("payments").doc(booking.paymentId), {
                status: "paid",
                paidAt: now,
                updatedAt: now,
              }, { merge: true });
            }
            tx.set(sessionRef, {
              id: sessionRef.id,
              bookingId,
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
              ...notificationPayload(booking.patientUid, "booking.confirmed"),
              createdAt: now,
            });
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
