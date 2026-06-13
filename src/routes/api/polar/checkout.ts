import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { siteUrl } from "@/lib/polar.server";
import { confirmBookingPayment } from "@/lib/booking/confirm.server";

type Body = { bookingId: string };

export const Route = createFileRoute("/api/polar/checkout")({
  server: {
    handlers: {
      GET: async () => {
        // Always enabled for mock bookings
        return Response.json({ enabled: true });
      },
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

        try {
          // Confirm booking instantly and return mock success URL
          await confirmBookingPayment(db, bookingSnap.ref, booking as any, decoded.uid, "mock");

          const successUrl = `${siteUrl()}/checkout/success?bookingId=${body.bookingId}`;
          return Response.json({ checkoutUrl: successUrl });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[api/polar/checkout-mock]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
