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
  
  console.log("--- Therapists ---");
  const therapistsSnap = await db.collection("therapists").get();
  const therapists = [];
  therapistsSnap.forEach(doc => {
    therapists.push({ id: doc.id, ...doc.data() });
  });
  console.log(JSON.stringify(therapists, null, 2));

  console.log("\n--- Active Slots (open) ---");
  const slotsSnap = await db.collection("availabilitySlots")
    .where("status", "==", "open")
    .get();
  
  const slots = [];
  slotsSnap.forEach(doc => {
    slots.push({ id: doc.id, ...doc.data() });
  });
  console.log(`Found ${slots.length} open slots.`);
  if (slots.length > 0) {
    console.log(JSON.stringify(slots.slice(0, 10), null, 2));
  }
}

main().catch(console.error);
