import { createFileRoute } from "@tanstack/react-router";
import { Polar } from "@polar-sh/sdk";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { createDailyRoom } from "@/lib/video/daily.server";
import { notificationPayload } from "@/lib/notifications/copy";

type Body = { bookingId: string };

export const Route = createFileRoute("/api/polar/checkout")({
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

        const bookingSnap = await db.collection("bookings").doc(body.bookingId).get();
        if (!bookingSnap.exists) return new Response("Booking not found", { status: 404 });
        const booking = bookingSnap.data()!;
        if (booking.patientUid !== decoded.uid) return new Response("Forbidden", { status: 403 });

        const polarToken = process.env.POLAR_ACCESS_TOKEN;
        const productId = process.env.POLAR_PRODUCT_ID;
        if (!polarToken || !productId) {
          // Demo mode: mirror production confirm flow exactly
          let roomUrl: string | null = null;
          let roomName: string | null = null;
          try {
            const slotSnap = booking.slotId ? await db.collection("availabilitySlots").doc(booking.slotId).get() : null;
            const starts: Timestamp = slotSnap?.data()?.startsAt ?? Timestamp.now();
            const expSec = Math.floor(starts.toMillis() / 1000) + 2 * 60 * 60;
            const room = await createDailyRoom({
              name: `thera-demo-${body.bookingId.slice(0, 8)}`,
              expMinutes: Math.max(60, Math.ceil((expSec * 1000 - Date.now()) / 60_000)),
            });
            roomUrl = room?.url ?? null;
            roomName = room?.name ?? null;
          } catch { /* demo OK without room */ }

          const sessionRef = db.collection("sessions").doc();
          const paymentRef = db.collection("payments").doc();
          const now = Timestamp.now();
          await db.runTransaction(async (tx) => {
            tx.update(bookingSnap.ref, {
              status: "confirmed",
              paymentProvider: "manual",
              sessionId: sessionRef.id,
              paymentId: paymentRef.id,
              updatedAt: now,
            });
            if (booking.slotId) {
              tx.update(db.collection("availabilitySlots").doc(booking.slotId), {
                status: "booked", bookingId: body.bookingId, updatedAt: now,
              });
            }
            tx.set(paymentRef, {
              id: paymentRef.id, bookingId: body.bookingId, uid: decoded.uid,
              provider: "manual", amount: booking.amount ?? 0, currency: booking.currency ?? "USD",
              status: "paid", paidAt: now, createdAt: now,
            });
            tx.set(sessionRef, {
              id: sessionRef.id, bookingId: body.bookingId,
              therapistId: booking.therapistId, patientUid: booking.patientUid,
              slotId: booking.slotId ?? null,
              startsAt: booking.startsAt ?? null, endsAt: booking.endsAt ?? null,
              status: "upcoming", videoProvider: "daily", roomUrl, roomName,
              createdAt: now, updatedAt: now,
            });
            tx.set(db.collection("notifications").doc(), {
              ...notificationPayload(booking.patientUid, "booking.confirmed"),
              createdAt: now,
            });
          });
          return Response.json({
            demo: true,
            checkoutUrl: `/checkout/success?bookingId=${body.bookingId}`,
          });
        }

        const polar = new Polar({
          accessToken: polarToken,
          server: (process.env.POLAR_SERVER as "sandbox" | "production" | undefined) ?? "production",
        });

        const origin = request.headers.get("origin") ?? "";
        const successUrl = `${origin}/checkout/success?bookingId=${body.bookingId}&polarId={CHECKOUT_ID}`;

        try {
          const checkout = await polar.checkouts.create({
            products: [productId],
            successUrl,
            customerEmail: decoded.email,
            metadata: {
              bookingId: body.bookingId,
              patientUid: decoded.uid,
              therapistId: booking.therapistId,
            },
          });

          // Persist a pending payment record.
          await db.collection("payments").doc(checkout.id).set({
            id: checkout.id,
            bookingId: body.bookingId,
            uid: decoded.uid,
            provider: "polar",
            amount: booking.amount ?? 0,
            currency: booking.currency ?? "USD",
            status: "pending",
            providerSessionId: checkout.id,
            createdAt: Timestamp.now(),
          });
          await bookingSnap.ref.update({
            paymentId: checkout.id,
            paymentProvider: "polar",
            updatedAt: Timestamp.now(),
          });
          return Response.json({ checkoutUrl: checkout.url, checkoutId: checkout.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[api/polar/checkout]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
