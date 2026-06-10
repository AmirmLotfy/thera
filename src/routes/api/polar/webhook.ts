import { createFileRoute } from "@tanstack/react-router";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { adminDb } from "@/lib/firebase.server";
import { confirmBookingPayment } from "@/lib/booking/confirm.server";

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

          await confirmBookingPayment(db, bookingRef, booking, booking.patientUid, "polar");
        }

        return Response.json({ ok: true });
      },
    },
  },
});
