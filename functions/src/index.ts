/**
 * Thera Cloud Functions — trigger + schedule only.
 *
 * All interactive/callable APIs now live as Vercel server routes under
 * src/routes/api/**. This file is intentionally narrow:
 *   - sendBookingEmail   (onDocumentUpdated bookings/{id}) — Resend on pending_payment -> confirmed
 *   - notifyReportReady  (onDocumentCreated reports/{id}) — notify patient when report lands
 *   - scheduledReminders (onSchedule every 15 min)        — 24h & 1h session reminders
 *   - pruneAdminLogs     (onSchedule daily)               — retention for adminLogs (60d)
 */
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";

admin.initializeApp();
const db = admin.firestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const EMAIL_FROM = defineSecret("EMAIL_FROM");
const APP_URL = defineSecret("APP_URL");

function resendClient(): Resend | null {
  try { return new Resend(RESEND_API_KEY.value()); } catch { return null; }
}

/** Look up a user's preferred locale from their /users/{uid} profile. Falls back to "en". */
async function getUserLocale(uid: string): Promise<"en" | "ar"> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    const lang = snap.data()?.language ?? snap.data()?.locale ?? "en";
    return lang === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

async function emailUser(uid: string, subject: string, html: string, text: string) {
  const resend = resendClient(); if (!resend) return;
  const from = EMAIL_FROM.value() || "Thera <notifications@wethera.site>";
  const user = await admin.auth().getUser(uid).catch(() => null);
  const to = user?.email; if (!to) return;
  await resend.emails.send({ from, to, subject, html, text });
}

// ── Booking confirmation email ──

function bookingConfirmationEmailEn(opts: { therapistName: string; startsAt: string; appUrl: string; bookingId: string }) {
  const { therapistName, startsAt, appUrl, bookingId } = opts;
  const when = new Date(startsAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#CDB4DB;padding:32px;border-radius:24px">
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px">Your Thera session is confirmed.</h1>
      <p style="margin:8px 0 0;color:#1F1B2E">You're booked with ${therapistName} on ${when}.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/adult/sessions/${bookingId}" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Open session</a>
      <p style="margin-top:18px;color:#4B5563">A calendar invite is attached. Free cancellation up to 24h prior.</p>
    </div>
  </div>`;
  const text = `Your Thera session is confirmed with ${therapistName} on ${when}. Open your dashboard: ${appUrl}/dashboard`;
  return { subject: "Your Thera session is confirmed", html, text };
}

function bookingConfirmationEmailAr(opts: { therapistName: string; startsAt: string; appUrl: string; bookingId: string }) {
  const { therapistName, startsAt, appUrl, bookingId } = opts;
  const when = new Date(startsAt).toLocaleString("ar-EG", { dateStyle: "full", timeStyle: "short" });
  const html = `
  <div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#CDB4DB;padding:32px;border-radius:24px">
      <h1 style="margin:0;font-size:28px">تم تأكيد جلستك على ثيرا.</h1>
      <p style="margin:8px 0 0">لديك موعد مع ${therapistName} في ${when}.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/adult/sessions/${bookingId}" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">فتح الجلسة</a>
      <p style="margin-top:18px;color:#4B5563">إلغاء مجاني قبل 24 ساعة من موعد الجلسة.</p>
    </div>
  </div>`;
  const text = `تم تأكيد جلستك على ثيرا مع ${therapistName} في ${when}. افتح لوحة التحكم: ${appUrl}/dashboard`;
  return { subject: "تم تأكيد جلستك على ثيرا", html, text };
}

// ── Report ready email ──

function reportReadyEmailEn(opts: { appUrl: string; reportId: string }) {
  const { appUrl, reportId } = opts;
  const html = `
  <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#F7D6E0;padding:32px;border-radius:24px">
      <h1 style="margin:0;font-family:Georgia,serif">Your session report is ready.</h1>
      <p style="margin:8px 0 0">We've written it in plain language for you.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/adult/reports?id=${reportId}" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Read report</a>
    </div>
  </div>`;
  const text = `Your Thera session report is ready: ${appUrl}/dashboard/adult/reports?id=${reportId}`;
  return { subject: "Your session report is ready on Thera", html, text };
}

function reportReadyEmailAr(opts: { appUrl: string; reportId: string }) {
  const { appUrl, reportId } = opts;
  const html = `
  <div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#F7D6E0;padding:32px;border-radius:24px">
      <h1 style="margin:0">تقرير جلستك جاهز.</h1>
      <p style="margin:8px 0 0">كتبناه بلغة بسيطة وواضحة خصيصًا لك.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/adult/reports?id=${reportId}" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">قراءة التقرير</a>
    </div>
  </div>`;
  const text = `تقرير جلستك جاهز على ثيرا: ${appUrl}/dashboard/adult/reports?id=${reportId}`;
  return { subject: "تقرير جلستك جاهز على ثيرا", html, text };
}

// ── Session reminder email ──

function sessionReminderEmailEn(opts: { appUrl: string; startsAt: string; therapistName: string; sessionId: string }) {
  const { appUrl, startsAt, therapistName, sessionId } = opts;
  const when = new Date(startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const html = `
  <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#BDE0FE;padding:32px;border-radius:24px">
      <h1 style="margin:0;font-family:Georgia,serif">Quick reminder</h1>
      <p style="margin:8px 0 0">Your session with ${therapistName} is ${when}.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/adult/sessions/${sessionId}" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Join room</a>
    </div>
  </div>`;
  const text = `Reminder: your session is ${when}. Join at ${appUrl}/dashboard/adult/sessions/${sessionId}`;
  return { subject: "Session reminder — Thera", html, text };
}

function sessionReminderEmailAr(opts: { appUrl: string; startsAt: string; therapistName: string; sessionId: string }) {
  const { appUrl, startsAt, therapistName, sessionId } = opts;
  const when = new Date(startsAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
  const html = `
  <div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#BDE0FE;padding:32px;border-radius:24px">
      <h1 style="margin:0">تذكير سريع</h1>
      <p style="margin:8px 0 0">جلستك مع ${therapistName} في ${when}.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/adult/sessions/${sessionId}" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">دخول الغرفة</a>
    </div>
  </div>`;
  const text = `تذكير: جلستك في ${when}. انضم عبر ${appUrl}/dashboard/adult/sessions/${sessionId}`;
  return { subject: "تذكير: جلستك على ثيرا", html, text };
}

// ── Bilingual notification helper (mirroring src/lib/notifications/copy.ts) ──

function bilingualNotif(uid: string, kind: string, titleEn: string, titleAr: string, bodyEn: string, bodyAr: string) {
  return {
    uid, kind,
    titleEn, titleAr,
    bodyEn, bodyAr,
    title: titleEn,
    body: bodyEn,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ── Cloud Function exports ──

export const sendBookingEmail = onDocumentUpdated(
  { document: "bookings/{id}", secrets: [RESEND_API_KEY, EMAIL_FROM, APP_URL] },
  async (event) => {
    const before = event.data?.before.data(); const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status !== "confirmed" && after.status === "confirmed") {
      const therapistSnap = await db.doc(`therapists/${after.therapistId}`).get();
      const therapistName = therapistSnap.data()?.displayName ?? "your therapist";
      const locale = await getUserLocale(after.patientUid);
      const appUrl = APP_URL.value() || "https://www.wethera.site";
      const emailOpts = { therapistName, startsAt: after.startsAt ?? new Date().toISOString(), appUrl, bookingId: event.params.id };
      const email = locale === "ar"
        ? bookingConfirmationEmailAr(emailOpts)
        : bookingConfirmationEmailEn(emailOpts);
      await emailUser(after.patientUid, email.subject, email.html, email.text);
    }
  }
);

export const notifyReportReady = onDocumentCreated(
  { document: "reports/{id}", secrets: [RESEND_API_KEY, EMAIL_FROM, APP_URL] },
  async (event) => {
    const data = event.data?.data(); if (!data) return;
    const locale = await getUserLocale(data.patientUid);
    const appUrl = APP_URL.value() || "https://www.wethera.site";
    const emailOpts = { appUrl, reportId: event.params.id };
    const email = locale === "ar"
      ? reportReadyEmailAr(emailOpts)
      : reportReadyEmailEn(emailOpts);
    await Promise.all([
      emailUser(data.patientUid, email.subject, email.html, email.text),
      db.collection("notifications").add(bilingualNotif(
        data.patientUid,
        "report.ready",
        "Your session report is ready",
        "تقرير جلستك جاهز",
        "Your therapist has submitted a plain-language summary for your last session.",
        "أرسل معالجك ملخصًا بلغة واضحة لآخر جلسة.",
      )),
    ]);
  }
);

export const scheduledReminders = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Africa/Cairo", secrets: [RESEND_API_KEY, EMAIL_FROM, APP_URL] },
  async () => {
    const now = Date.now();
    const windows = [
      { offset: 24 * 60 * 60 * 1000, label: "24h", kindSuffix: "reminder.24h" as const },
      { offset: 60 * 60 * 1000, label: "1h", kindSuffix: "reminder.1h" as const },
    ];
    for (const w of windows) {
      const startWindow = new Date(now + w.offset - 7.5 * 60 * 1000).toISOString();
      const endWindow = new Date(now + w.offset + 7.5 * 60 * 1000).toISOString();
      const snap = await db.collection("sessions")
        .where("status", "==", "upcoming")
        .where("startsAt", ">=", startWindow)
        .where("startsAt", "<=", endWindow)
        .get();
      for (const sessionDoc of snap.docs) {
        const s = sessionDoc.data();
        const flagKey = `reminded_${w.label}`;
        if (s[flagKey]) continue;
        const therapistSnap = await db.doc(`therapists/${s.therapistId}`).get();
        const therapistName = therapistSnap.data()?.displayName ?? "your therapist";
        const locale = await getUserLocale(s.patientUid);
        const appUrl = APP_URL.value() || "https://www.wethera.site";
        const emailOpts = { appUrl, startsAt: s.startsAt, therapistName, sessionId: sessionDoc.id };
        const email = locale === "ar"
          ? sessionReminderEmailAr(emailOpts)
          : sessionReminderEmailEn(emailOpts);
        const titleEn = w.label === "24h" ? "Session tomorrow" : "Session in 1 hour";
        const titleAr = w.label === "24h" ? "جلستك غدًا" : "جلستك خلال ساعة";
        const bodyEn = w.label === "24h"
          ? "You have a session scheduled for tomorrow. Log in to prepare."
          : "Your session starts in about an hour. Make sure you're in a quiet space.";
        const bodyAr = w.label === "24h"
          ? "لديك جلسة مجدولة غدًا. سجّل الدخول للاستعداد."
          : "جلستك تبدأ بعد نحو ساعة. احرص على التواجد في مكان هادئ.";
        await Promise.all([
          emailUser(s.patientUid, email.subject, email.html, email.text),
          sessionDoc.ref.update({ [flagKey]: true }),
          db.collection("notifications").add(bilingualNotif(
            s.patientUid, w.kindSuffix, titleEn, titleAr, bodyEn, bodyAr,
          )),
        ]);
      }
    }
  }
);

export const pruneAdminLogs = onSchedule({ schedule: "every day 03:00", timeZone: "Africa/Cairo" }, async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const snap = await db.collection("adminLogs").where("createdAt", "<", cutoff).limit(500).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
});

/** Release booking slots that have been in pending_payment for more than 15 minutes. */
export const releaseExpiredLocks = onSchedule({ schedule: "every 5 minutes", timeZone: "Africa/Cairo" }, async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 15 * 60 * 1000);
  const snap = await db.collection("bookings")
    .where("status", "==", "pending_payment")
    .where("createdAt", "<", cutoff)
    .limit(100)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    batch.update(doc.ref, {
      status: "cancelled",
      cancellationReason: "payment_timeout",
      updatedAt: admin.firestore.Timestamp.now(),
    });
    if (data.slotId) {
      batch.update(db.collection("availabilitySlots").doc(data.slotId), {
        status: "open",
        bookingId: null,
        lockedBy: null,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
    batch.set(db.collection("adminLogs").doc(), {
      kind: "system",
      payload: { action: "lock_expired", bookingId: doc.id },
      at: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
    });
  }
  await batch.commit();
});
