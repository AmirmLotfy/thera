#!/usr/bin/env node
/**
 * Grant admin role to a user.
 *
 * This is the ONLY supported way to create an admin — the web app never
 * exposes an admin self-elevation path (see src/lib/auth.tsx: `setRole`
 * explicitly throws for role === "admin").
 *
 * What this does:
 *   1. Look up the Firebase Auth user by email.
 *   2. Set the custom claim { role: "admin", admin: true } so the ID-token
 *      carries the claim (verifyIdToken on the server + effectiveRole in the
 *      UI both read this).
 *   3. Mirror role: "admin" onto users/{uid} in Firestore so the web profile
 *      agrees with the claim.
 *
 * Usage (from project root):
 *   FIREBASE_ADMIN_KEY='<service-account-json>' \
 *   node scripts/grant-admin.mjs user@example.com
 *
 * To revoke admin:
 *   node scripts/grant-admin.mjs user@example.com --revoke
 *
 * After running this, the user must sign out + sign back in (or call
 * refreshClaims() from the client) for the new claim to land in the
 * browser's ID token.
 */
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function bootstrap() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) {
    console.error("FIREBASE_ADMIN_KEY env required (paste the Firebase service-account JSON).");
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("FIREBASE_ADMIN_KEY is not valid JSON:", err.message);
    process.exit(1);
  }
  initializeApp({
    credential: cert({
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, "\n"),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID ?? parsed.project_id ?? parsed.projectId,
  });
}

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!email) {
    console.error("Usage: node scripts/grant-admin.mjs <email> [--revoke]");
    process.exit(1);
  }

  bootstrap();
  const auth = getAuth();
  const db = getFirestore();

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    console.error(`Could not find a Firebase Auth user for ${email}:`, err.message);
    process.exit(1);
  }

  const nextRole = revoke ? "adult" : "admin";
  const claims = revoke
    ? { role: "adult" }
    : { role: "admin", admin: true };

  await auth.setCustomUserClaims(user.uid, claims);
  await db
    .collection("users")
    .doc(user.uid)
    .set({ role: nextRole }, { merge: true });

  console.log(
    `${revoke ? "Revoked admin from" : "Granted admin to"} ${email} (uid: ${user.uid}).`
  );
  console.log("Ask the user to sign out and back in — or call refreshClaims() — to see the new claim.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
