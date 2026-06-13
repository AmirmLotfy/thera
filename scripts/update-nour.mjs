import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp, getApps } from "firebase-admin/app";
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
  bootstrap();
  const db = getFirestore();
  const docId = "3ceswsjtcjeCVIPW8EJSx4c8Hxf1";
  const therapistRef = db.collection("therapists").doc(docId);
  const snap = await therapistRef.get();
  
  if (!snap.exists) {
    console.error(`Therapist with docId ${docId} not found`);
    process.exit(1);
  }
  
  const data = snap.data();
  console.log(`Current data for Nour:`, {
    displayName: data.displayName,
    pricePerSession: data.pricePerSession,
    currency: data.currency
  });
  
  await therapistRef.update({
    pricePerSession: 200_00, // 200 EGP (stored as minor units)
    currency: "EGP",
    updatedAt: Timestamp.now()
  });
  
  console.log(`Successfully updated Dr. Nour's hourly rate to 200 EGP (20000 minor units)`);
}

main().catch(console.error);
