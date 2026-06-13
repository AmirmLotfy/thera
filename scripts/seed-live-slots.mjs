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
  
  const nourId = "3ceswsjtcjeCVIPW8EJSx4c8Hxf1";
  const tamerId = "iI9YVCMfm9XtaVXOLVlKdLRXi2X2";
  
  // Current local time: 2026-06-14T02:36:12+03:00.
  // We'll seed starting from 2026-06-14T00:00:00Z.
  const baseDate = new Date("2026-06-14T00:00:00Z");
  
  console.log("Seeding slots starting from:", baseDate.toISOString());
  
  let batch = db.batch();
  let count = 0;
  const batchLimit = 400; // Firestore batch limit is 500
  
  // Seed for 14 days
  for (let d = 0; d < 14; d++) {
    const currentDay = new Date(baseDate.getTime() + d * 24 * 60 * 60 * 1000);
    const dayStr = currentDay.toISOString().split("T")[0];
    
    // Nour's hours: 09:00, 11:00, 13:00, 15:00, 17:00 UTC
    const nourHours = [9, 11, 13, 15, 17];
    for (const h of nourHours) {
      const startsAt = new Date(`${dayStr}T${h.toString().padStart(2, "0")}:00:00.000Z`);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      
      const id = `${nourId}-${startsAt.toISOString()}`;
      const ref = db.collection("availabilitySlots").doc(id);
      
      batch.set(ref, {
        id,
        therapistId: nourId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: "open",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;
      
      if (count % batchLimit === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    
    // Tamer's hours: 10:00, 12:00, 14:00, 16:00, 18:00 UTC
    const tamerHours = [10, 12, 14, 16, 18];
    for (const h of tamerHours) {
      const startsAt = new Date(`${dayStr}T${h.toString().padStart(2, "0")}:00:00.000Z`);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      
      const id = `${tamerId}-${startsAt.toISOString()}`;
      const ref = db.collection("availabilitySlots").doc(id);
      
      batch.set(ref, {
        id,
        therapistId: tamerId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: "open",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;
      
      if (count % batchLimit === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }
  
  if (count % batchLimit !== 0) {
    await batch.commit();
  }
  
  console.log(`Successfully seeded/updated ${count} upcoming availability slots in Firestore!`);
}

main().catch(console.error);
