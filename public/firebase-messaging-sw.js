/* Thera FCM service worker. Loaded only when Firebase is configured. */
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

// These values are populated from env at deploy-time via Vercel rewrite
// or baked as placeholders here — clients only use this for showing pushes
// so project scoping is the only thing that matters.
self.__WB_MANIFEST = self.__WB_MANIFEST || [];

try {
  firebase.initializeApp({
    apiKey: "REPLACE_ME_API_KEY",
    authDomain: "REPLACE_ME_AUTH_DOMAIN",
    projectId: "REPLACE_ME_PROJECT_ID",
    storageBucket: "REPLACE_ME_STORAGE_BUCKET",
    messagingSenderId: "REPLACE_ME_SENDER_ID",
    appId: "REPLACE_ME_APP_ID",
  });
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload && payload.notification && payload.notification.title) || "Thera";
    const body = (payload && payload.notification && payload.notification.body) || "";
    self.registration.showNotification(title, { body, icon: "/favicon.svg" });
  });
} catch (err) {
  // SW installs even if the app hasn't been configured yet — no fatal throws.
  console.warn("[fcm-sw] init skipped", err);
}
