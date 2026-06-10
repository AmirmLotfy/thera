/**
 * Seed demo data into a live Firebase project.
 *
 * Usage (from project root):
 *   FIREBASE_ADMIN_KEY='<service-account-json>' \
 *   FIREBASE_PROJECT_ID=<id> \
 *   tsx scripts/seed.ts
 */
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEMO_THERAPISTS, demoSlotsFor } from "../src/lib/demo/therapists.js";

function bootstrap() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("FIREBASE_ADMIN_KEY env required");
  const parsed = JSON.parse(raw);
  initializeApp({
    credential: cert({
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, "\n"),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

async function seed() {
  bootstrap();
  const db = getFirestore();
  const batch = db.batch();
  for (const t of DEMO_THERAPISTS) {
    const ref = db.collection("therapists").doc(t.id);
    batch.set(ref, { ...t, createdAt: new Date() });
    for (const slot of demoSlotsFor(t.id)) {
      const slotRef = db.collection("availabilitySlots").doc(slot.id);
      batch.set(slotRef, slot);
    }
  }
  await batch.commit();
  console.log(`Seeded ${DEMO_THERAPISTS.length} therapists + availability.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
