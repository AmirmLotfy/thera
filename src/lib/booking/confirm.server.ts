import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";
import { createDailyRoom } from "@/lib/video/daily.server";
import { notificationPayload, type NotificationKind } from "@/lib/notifications/copy";
import { upsertCareThread } from "@/lib/care/threads.server";
import { careThreadId } from "@/lib/care/ids";

export type ConfirmProvider = "mock" | "manual" | "instapay" | "polar";

type BookingDoc = {
  patientUid: string;
  therapistId: string;
  slotId?: string | null;
  amount?: number;
  currency?: string;
  startsAt?: FirebaseFirestore.Timestamp | string | null;
  endsAt?: FirebaseFirestore.Timestamp | string | null;
  paymentId?: string | null;
  childId?: string | null;
  childName?: string | null;
};

type ConfirmOptions = {
  patientNotificationKind?: NotificationKind;
};

/** Confirm booking after payment: book slot, session, payment record, notifications, care thread. */
export async function confirmBookingPayment(
  db: Firestore,
  bookingRef: DocumentReference,
  booking: BookingDoc,
  uid: string,
  provider: ConfirmProvider,
  options: ConfirmOptions = {},
) {
  const bookingId = bookingRef.id;
  const snap = await bookingRef.get();
  if (snap.exists && snap.data()?.status === "confirmed") {
    return {
      sessionId: snap.data()?.sessionId as string | null,
      paymentId: snap.data()?.paymentId as string | null,
      alreadyConfirmed: true,
    };
  }

  let roomUrl: string | null = null;
  let roomName: string | null = null;
  try {
    const slotSnap = booking.slotId
      ? await db.collection("availabilitySlots").doc(booking.slotId).get()
      : null;
    const starts = slotSnap?.data()?.startsAt ?? booking.startsAt;
    const startMs =
      starts instanceof Timestamp
        ? starts.toMillis()
        : typeof starts === "string"
          ? new Date(starts).getTime()
          : Date.now();
    const expMinutes = Math.max(60, Math.ceil((startMs + 2 * 60 * 60 * 1000 - Date.now()) / 60_000));
    const room = await createDailyRoom({
      name: `thera-${bookingId.slice(0, 8)}`,
      expMinutes,
    });
    roomUrl = room?.url ?? null;
    roomName = room?.name ?? null;
  } catch {
    /* session can still be created without a room URL */
  }

  let patientName: string | null = null;
  try {
    const userSnap = await db.collection("users").doc(booking.patientUid).get();
    patientName = userSnap.data()?.displayName ?? null;
  } catch {
    /* non-critical */
  }

  const sessionRef = db.collection("sessions").doc();
  const paymentRef = booking.paymentId
    ? db.collection("payments").doc(booking.paymentId)
    : db.collection("payments").doc();
  const now = Timestamp.now();
  const isMock = provider === "mock";
  const patientKind = options.patientNotificationKind ?? "booking.confirmed";

  await db.runTransaction(async (tx) => {
    tx.update(bookingRef, {
      status: "confirmed",
      paymentProvider: provider,
      sessionId: sessionRef.id,
      paymentId: paymentRef.id,
      updatedAt: now,
    });
    if (booking.slotId) {
      tx.update(db.collection("availabilitySlots").doc(booking.slotId), {
        status: "booked",
        bookingId,
        updatedAt: now,
      });
    }
    if (booking.paymentId) {
      tx.set(paymentRef, {
        status: "paid",
        paidAt: now,
        updatedAt: now,
        provider,
      }, { merge: true });
    } else {
      tx.set(paymentRef, {
        id: paymentRef.id,
        bookingId,
        uid,
        provider,
        amount: booking.amount ?? 0,
        currency: booking.currency ?? "EGP",
        status: "paid",
        paidAt: now,
        ...(isMock ? { mock: true } : {}),
        createdAt: now,
      });
    }
    tx.set(sessionRef, {
      id: sessionRef.id,
      bookingId,
      therapistId: booking.therapistId,
      patientUid: booking.patientUid,
      patientName,
      childId: booking.childId ?? null,
      childName: booking.childName ?? null,
      slotId: booking.slotId ?? null,
      startsAt: booking.startsAt ?? null,
      endsAt: booking.endsAt ?? null,
      status: "upcoming",
      videoProvider: "daily",
      roomUrl,
      roomName,
      createdAt: now,
      updatedAt: now,
    });
    tx.set(db.collection("notifications").doc(), {
      ...notificationPayload(booking.patientUid, patientKind),
      bookingId,
      createdAt: now,
    });
    tx.set(db.collection("notifications").doc(), {
      ...notificationPayload(booking.therapistId, "booking.confirmed"),
      bookingId,
      createdAt: now,
    });
  });

  await upsertCareThread(db, {
    patientUid: booking.patientUid,
    therapistId: booking.therapistId,
    bookingId,
  });

  return { sessionId: sessionRef.id, paymentId: paymentRef.id };
}
