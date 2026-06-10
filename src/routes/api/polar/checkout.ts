import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { polarClient, polarConfigured, siteUrl } from "@/lib/polar.server";
import { Timestamp } from "firebase-admin/firestore";

type Body = { bookingId: string };

export const Route = createFileRoute("/api/polar/checkout")({
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

        const bookingSnap = await db.collection("bookings").doc(body.bookingId).get();
        if (!bookingSnap.exists) return new Response("Booking not found", { status: 404 });
        const booking = bookingSnap.data()!;
        if (booking.patientUid !== decoded.uid) return new Response("Forbidden", { status: 403 });

        if (booking.status === "confirmed") {
          return Response.json({
            checkoutUrl: `${siteUrl()}/checkout/success?bookingId=${body.bookingId}`,
            alreadyConfirmed: true,
          });
        }

        if (!["pending_payment", "awaiting_verification"].includes(booking.status as string)) {
          return Response.json({ error: "Booking is not payable" }, { status: 409 });
        }

        const slotSnap = booking.slotId
          ? await db.collection("availabilitySlots").doc(booking.slotId).get()
          : null;
        if (!slotSnap?.exists || slotSnap.data()?.status !== "locked" || slotSnap.data()?.lockedBy !== decoded.uid) {
          return Response.json({ error: "Slot lock expired or invalid" }, { status: 409 });
        }

        if (!polarConfigured()) {
          return Response.json(
            { error: "Card payments are not enabled yet. Please use InstaPay.", code: "polar_deferred" },
            { status: 503 },
          );
        }

        const polar = polarClient();
        if (!polar) return new Response("Polar client unavailable", { status: 501 });

        const paymentRef = booking.paymentId
          ? db.collection("payments").doc(booking.paymentId)
          : db.collection("payments").doc();
        const now = Timestamp.now();
        const base = siteUrl();
        const successUrl = `${base}/checkout/success?bookingId=${body.bookingId}`;

        try {
          const checkout = await polar.checkouts.create({
            products: [process.env.POLAR_PRODUCT_ID!],
            amount: booking.amount ?? 0,
            currency: (booking.currency ?? "EGP").toLowerCase() as "egp",
            metadata: { bookingId: body.bookingId },
            successUrl,
            returnUrl: `${base}/checkout/${body.bookingId}`,
            allowDiscountCodes: false,
            customerEmail: decoded.email ?? undefined,
            externalCustomerId: decoded.uid,
          });

          await db.runTransaction(async (tx) => {
            if (!booking.paymentId) {
              tx.set(paymentRef, {
                id: paymentRef.id,
                bookingId: body.bookingId,
                uid: decoded.uid,
                provider: "polar",
                amount: booking.amount ?? 0,
                currency: booking.currency ?? "EGP",
                status: "pending",
                providerSessionId: checkout.id,
                createdAt: now,
              });
              tx.update(bookingSnap.ref, {
                paymentId: paymentRef.id,
                paymentProvider: "polar",
                updatedAt: now,
              });
            } else {
              tx.update(paymentRef, {
                providerSessionId: checkout.id,
                status: "pending",
                updatedAt: now,
              });
            }
          });

          return Response.json({ checkoutUrl: checkout.url });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[api/polar/checkout]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
