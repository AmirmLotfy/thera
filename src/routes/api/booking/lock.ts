import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";

type LockRequest = {
  therapistId: string;
  slotId: string;
  childId?: string;
  notes?: string;
};

const LOCK_MINUTES = 15;

export const Route = createFileRoute("/api/booking/lock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const uid = decoded.uid;
        const db = adminDb();
        if (!db) return new Response("Firestore unavailable", { status: 500 });

        let body: LockRequest;
        try { body = await request.json() as LockRequest; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        const { therapistId, slotId, childId, notes } = body ?? {};
        if (!therapistId || !slotId) {
          return new Response("therapistId + slotId required", { status: 400 });
        }

        let childName: string | null = null;
        if (childId) {
          const childSnap = await db.collection("children").doc(childId).get();
          if (!childSnap.exists || childSnap.data()?.parentUid !== uid) {
            return Response.json({ error: "invalid-child" }, { status: 400 });
          }
          childName = childSnap.data()?.name ?? null;
        }

        const slotRef = db.collection("availabilitySlots").doc(slotId);
        const therapistRef = db.collection("therapists").doc(therapistId);
        const bookingRef = db.collection("bookings").doc();

        try {
          await db.runTransaction(async (tx) => {
            const [slot, therapist] = await Promise.all([tx.get(slotRef), tx.get(therapistRef)]);
            if (!slot.exists) throw new Error("slot-not-found");
            if (slot.data()?.status !== "open") throw new Error("slot-unavailable");
            if (!therapist.exists || therapist.data()?.approved !== true) throw new Error("therapist-unavailable");

            const slotData = slot.data()!;
            const now = Timestamp.now();
            tx.update(slotRef, { status: "locked", lockedAt: now, lockedBy: uid });
            tx.set(bookingRef, {
              slotId,
              therapistId,
              patientUid: uid,
              childId: childId ?? null,
              childName,
              status: "pending_payment",
              amount: therapist.data()?.pricePerSession ?? 0,
              currency: therapist.data()?.currency ?? "EGP",
              notes: notes ?? null,
              sessionId: null,
              paymentId: null,
              paymentProvider: null,
              startsAt: slotData.startsAt ?? null,
              endsAt: slotData.endsAt ?? null,
              createdAt: now,
              updatedAt: now,
            });
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const status = msg === "slot-unavailable" ? 409 : 400;
          return Response.json({ error: msg }, { status });
        }

        const expiresAt = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
        return Response.json({ bookingId: bookingRef.id, expiresAt, lockMinutes: LOCK_MINUTES });
      },
    },
  },
});
