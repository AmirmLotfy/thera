#!/usr/bin/env node
/**
 * One-off bootstrap: create admin user, approve therapist by email.
 *
 * Usage:
 *   FIREBASE_ADMIN_KEY='...' node scripts/bootstrap-users.mjs
 *
 * Or with .env.local from Vercel (FIREBASE_ADMIN_KEY or service account fields).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filename) {
  const path = join(root, filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

function loadEnvLocal() {
  loadEnvFile(".env.production.local");
  loadEnvFile(".env.local");
}

function bootstrap() {
  if (getApps().length) return;
  loadEnvLocal();
  let parsed;
  const raw = process.env.FIREBASE_ADMIN_KEY ?? process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (raw) {
    parsed = JSON.parse(raw);
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    parsed = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    };
  } else {
    console.error("Need FIREBASE_ADMIN_KEY or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in env / .env.local");
    process.exit(1);
  }
  initializeApp({
    credential: cert({
      projectId: parsed.project_id ?? parsed.projectId ?? process.env.FIREBASE_PROJECT_ID,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, "\n"),
    }),
  });
}

async function ensureAdmin(auth, db, email, password) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Admin user exists: ${email} (${user.uid})`);
    if (password) {
      await auth.updateUser(user.uid, { password, emailVerified: true });
      console.log("  → password updated, email marked verified");
    }
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true, displayName: "Thera Admin" });
    console.log(`Created admin user: ${email} (${user.uid})`);
  }
  await auth.setCustomUserClaims(user.uid, { role: "admin", admin: true });
  await db.collection("users").doc(user.uid).set(
    {
      role: "admin",
      email,
      displayName: "Thera Admin",
      onboardingCompleted: true,
      language: "en",
      updatedAt: new Date(),
    },
    { merge: true },
  );
  return user.uid;
}

async function approveTherapist(auth, db, email) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    console.error(`Therapist not found in Auth: ${email}`, err.message);
    process.exit(1);
  }
  const uid = user.uid;
  const now = Timestamp.now();
  const appRef = db.collection("therapistApplications").doc(uid);
  const appSnap = await appRef.get();
  const profileSnap = await db.collection("users").doc(uid).get();
  const profile = profileSnap.data() ?? {};

  if (!appSnap.exists) {
    await appRef.set({
      id: uid,
      uid,
      displayName: profile.displayName ?? user.displayName ?? "Therapist",
      email,
      status: "submitted",
      specialties: ["general"],
      languages: profile.language ? [profile.language] : ["en", "ar"],
      createdAt: now,
    });
    console.log(`Created therapistApplications/${uid} (was missing)`);
  }

  await auth.setCustomUserClaims(uid, { role: "therapist" });
  await db.runTransaction(async (tx) => {
    tx.set(
      appRef,
      { status: "approved", reviewedAt: now, adminNote: null },
      { merge: true },
    );
    tx.set(
      db.collection("therapists").doc(uid),
      {
        id: uid,
        uid,
        displayName: profile.displayName ?? user.displayName ?? "Therapist",
        title: profile.title ?? null,
        bio: profile.bio ?? "",
        specialties: ["general"],
        languages: ["en", "ar"],
        pricePerSession: 0,
        currency: "EGP",
        format: "online",
        approved: true,
        createdAt: now,
      },
      { merge: true },
    );
    tx.set(
      db.collection("users").doc(uid),
      { role: "therapist", therapistApplicationStatus: "approved", email },
      { merge: true },
    );
  });

  console.log(`Approved therapist: ${email} (${uid})`);
  return uid;
}

async function main() {
  bootstrap();
  const auth = getAuth();
  const db = getFirestore();

  const adminEmail = process.argv[2] ?? "wethera.platform@gmail.com";
  const adminPassword = process.argv[3] ?? process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const therapistEmail = process.argv[4] ?? "tameralielsherif@gmail.com";

  if (!adminPassword) {
    console.error("Pass admin password as 3rd arg or BOOTSTRAP_ADMIN_PASSWORD env");
    process.exit(1);
  }

  const adminUid = await ensureAdmin(auth, db, adminEmail, adminPassword);
  const therapistUid = await approveTherapist(auth, db, therapistEmail);

  console.log("\nDone.");
  console.log(`  Admin uid:     ${adminUid}`);
  console.log(`  Therapist uid: ${therapistUid}`);
  console.log("\nSign in at https://www.wethera.site/auth/login");
  console.log("Admin dashboard: https://www.wethera.site/dashboard/admin");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
