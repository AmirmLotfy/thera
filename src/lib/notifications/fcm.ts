import { firebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { trimEnv } from "@/lib/env";
import type { User } from "firebase/auth";

/**
 * Register the user for FCM web push. Safe to call on every sign-in; it will:
 *  - ask for Notification permission the first time
 *  - register the service worker at /firebase-messaging-sw.js
 *  - store the token under users/{uid}/fcmTokens/{token}
 *
 * Requires `VITE_FIREBASE_VAPID_KEY` to be set. Silent fail otherwise.
 */
export async function registerFcm(user: User): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured || !firebaseApp) return null;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return null;
  const vapidKey = trimEnv(import.meta.env.VITE_FIREBASE_VAPID_KEY);
  if (!vapidKey) return null;

  try {
    const permission = Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission !== "granted") return null;

    const [messagingMod, firestoreMod] = await Promise.all([
      import("firebase/messaging"),
      import("firebase/firestore"),
    ]);
    const messaging = messagingMod.getMessaging(firebaseApp);
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await messagingMod.getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return null;
    const { doc, setDoc, serverTimestamp, getFirestore } = firestoreMod;
    const db = getFirestore(firebaseApp);
    await setDoc(doc(db, `users/${user.uid}/fcmTokens/${token}`), {
      token,
      platform: "web",
      createdAt: serverTimestamp(),
    }, { merge: true });

    messagingMod.onMessage(messaging, (payload) => {
      if (!payload?.notification) return;
      const { title = "Thera", body } = payload.notification;
      try { new Notification(title, { body, icon: "/favicon.png" }); } catch { /* ignore */ }
    });

    return token;
  } catch (err) {
    console.warn("[fcm] registration failed", err);
    return null;
  }
}
