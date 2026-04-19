// Firebase client initialization. Runs on both client and server (SSR);
// Firebase Admin lives in src/lib/firebase.server.ts.
// Fill .env.local with VITE_FIREBASE_* keys (see README-FIREBASE.md).
// While keys are missing the app runs in "demo mode" with mock data.

import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { trimEnv } from "@/lib/env";

const config = {
  apiKey: trimEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: trimEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trimEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: trimEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: trimEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: trimEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: trimEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
};

export const isFirebaseConfigured =
  !!config.apiKey && !!config.projectId && !!config.appId;

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

// Client-only initialization — SSR doesn't need the client SDK.
if (isFirebaseConfigured && typeof window !== "undefined") {
  app = getApps().length ? getApps()[0] : initializeApp(config as Required<typeof config>);
  _auth = getAuth(app);
  _db = getFirestore(app);
  _storage = getStorage(app);
}

export const firebaseApp = app;
export const auth = _auth;
export const db = _db;
export const storage = _storage;
export const firebaseConfig = config;
