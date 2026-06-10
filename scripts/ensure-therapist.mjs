#!/usr/bin/env node
/**
 * Ensure a therapist is approved, listed, priced in EGP, with open slots.
 * Usage: node scripts/ensure-therapist.mjs tameralielsherif@gmail.com
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  for (const f of [".env.production.local", ".env.local"]) {
    const path = join(root, f);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

function bootstrap() {
  if (getApps().length) return;
  loadEnv();
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) {
    console.error("FIREBASE_ADMIN_KEY required");
    process.exit(1);
  }
  const parsed = JSON.parse(raw);
  initializeApp({
    credential: cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key?.replace(/\\n/g, "\n"),
    }),
  });
}

async function main() {
  const email = process.argv[2] ?? "tameralielsherif@gmail.com";
  bootstrap();
  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUserByEmail(email);
  const uid = user.uid;
  const now = Timestamp.now();

  await auth.setCustomUserClaims(uid, { role: "therapist" });

  const appRef = db.collection("therapistApplications").doc(uid);
  if (!(await appRef.get()).exists) {
    await appRef.set({
      id: uid,
      uid,
      displayName: user.displayName ?? "Dr. Tamer Ali",
      email,
      status: "submitted",
      specialties: ["general"],
      languages: ["en", "ar"],
      createdAt: now,
    });
  }
  await appRef.set({ status: "approved", reviewedAt: now }, { merge: true });

  await db.collection("therapists").doc(uid).set(
    {
      id: uid,
      uid,
      displayName: user.displayName ?? "Dr. Tamer Ali Elsherif",
      title: "Clinical Psychologist",
      bio: "Bilingual therapist supporting adults through anxiety, stress, and life transitions — online sessions in Arabic and English.",
      specialties: ["anxiety", "relationships", "work_stress"],
      languages: ["en", "ar"],
      pricePerSession: 400_00,
      currency: "EGP",
      format: "online",
      yearsExperience: 8,
      approved: true,
      rating: 4.9,
      ratingCount: 12,
      sessionMinutes: 50,
      updatedAt: now,
    },
    { merge: true },
  );

  await db.collection("users").doc(uid).set(
    { role: "therapist", therapistApplicationStatus: "approved", email, language: "en" },
    { merge: true },
  );

  const slotsSnap = await db.collection("availabilitySlots").where("therapistId", "==", uid).where("status", "==", "open").limit(1).get();
  if (slotsSnap.empty) {
    for (let day = 1; day <= 14; day++) {
      const d = new Date();
      d.setDate(d.getDate() + day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      for (const hour of [10, 14, 18]) {
        const start = new Date(d);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1);
        if (start <= new Date()) continue;
        const ref = db.collection("availabilitySlots").doc();
        await ref.set({
          therapistId: uid,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          status: "open",
          createdAt: now,
        });
      }
    }
    console.log("Created availability slots");
  }

  console.log(`Therapist ready: ${email} (${uid}) — EGP 400/session, approved, listed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
