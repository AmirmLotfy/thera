/// <reference types="node" />
/**
 * Firebase Admin — server-only. Import this ONLY from server routes
 * (src/routes/api/**) or server functions. Do not import from client code.
 */
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getStorage as getAdminStorage } from "firebase-admin/storage";
import { trimEnv } from "@/lib/env";

let _adminApp: App | null = null;

function resolveCredentials() {
  const raw =
    trimEnv(process.env.FIREBASE_ADMIN_KEY)
    || trimEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    || null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return cert({
        projectId: parsed.project_id ?? parsed.projectId,
        clientEmail: parsed.client_email ?? parsed.clientEmail,
        privateKey: (parsed.private_key ?? parsed.privateKey)?.replace(/\\n/g, "\n"),
      });
    } catch (err) {
      console.warn("[firebase.server] FIREBASE_ADMIN_KEY is not valid JSON", err);
    }
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  return null;
}

export function getAdminApp(): App | null {
  if (_adminApp) return _adminApp;
  if (getApps().length) {
    _adminApp = getApps()[0];
    return _adminApp;
  }
  const credential = resolveCredentials();
  if (!credential) {
    console.warn("[firebase.server] No FIREBASE_ADMIN_KEY — server writes disabled.");
    return null;
  }
  _adminApp = initializeApp({
    credential,
    projectId: trimEnv(process.env.FIREBASE_PROJECT_ID)
      || trimEnv(process.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: trimEnv(process.env.FIREBASE_STORAGE_BUCKET)
      || trimEnv(process.env.VITE_FIREBASE_STORAGE_BUCKET),
  });
  return _adminApp;
}

export function adminAuth() {
  const app = getAdminApp();
  return app ? getAdminAuth(app) : null;
}
export function adminDb() {
  const app = getAdminApp();
  return app ? getAdminFirestore(app) : null;
}
export function adminStorage() {
  const app = getAdminApp();
  return app ? getAdminStorage(app) : null;
}

/**
 * Verify the `Authorization: Bearer <idToken>` header. Returns the decoded
 * token or null if missing/invalid.
 */
export async function verifyIdToken(req: Request) {
  const auth = adminAuth();
  if (!auth) return null;
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return await auth.verifyIdToken(match[1]);
  } catch (err) {
    console.warn("[firebase.server] verifyIdToken failed", err);
    return null;
  }
}
