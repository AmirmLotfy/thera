import type { Firestore } from "firebase-admin/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { careThreadId } from "@/lib/care/ids";

export { careThreadId };

export async function upsertCareThread(
  db: Firestore,
  opts: { patientUid: string; therapistId: string; bookingId: string },
) {
  const id = careThreadId(opts.patientUid, opts.therapistId);
  const ref = db.collection("careThreads").doc(id);
  const snap = await ref.get();
  const now = Timestamp.now();
  if (snap.exists) {
    await ref.update({
      bookingIds: FieldValue.arrayUnion(opts.bookingId),
      status: "active",
      updatedAt: now,
    });
  } else {
    await ref.set({
      id,
      patientUid: opts.patientUid,
      therapistId: opts.therapistId,
      bookingIds: [opts.bookingId],
      status: "active",
      lastMessageAt: now,
      lastMessagePreview: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  return id;
}
