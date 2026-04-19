/**
 * Bilingual notification copy.
 *
 * Each notification kind ships both EN and AR strings so the Firestore
 * document is locale-independent. The client picks the right field based on
 * the user's active locale.
 */

export type NotificationKind =
  | "booking.confirmed"
  | "booking.cancelled"
  | "report.ready"
  | "payment.rejected"
  | "payment.confirmed"
  | "instapay.proof_received"
  | "approval.granted"
  | "approval.rejected"
  | "reminder.24h"
  | "reminder.1h";

export type BilingualNotification = {
  kind: NotificationKind;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
};

const COPY: Record<NotificationKind, Omit<BilingualNotification, "kind">> = {
  "booking.confirmed": {
    titleEn: "Booking confirmed",
    titleAr: "تم تأكيد الحجز",
    bodyEn: "Your session is confirmed. Check your email for details.",
    bodyAr: "تم تأكيد جلستك. تحقّق من بريدك للاطلاع على التفاصيل.",
  },
  "booking.cancelled": {
    titleEn: "Booking cancelled",
    titleAr: "تم إلغاء الحجز",
    bodyEn: "Your booking has been cancelled. The slot has been released.",
    bodyAr: "تم إلغاء حجزك وتحرير الموعد.",
  },
  "report.ready": {
    titleEn: "Your session report is ready",
    titleAr: "تقرير جلستك جاهز",
    bodyEn: "Your therapist has submitted a plain-language summary for your last session.",
    bodyAr: "أرسل معالجك ملخصًا بلغة واضحة لآخر جلسة.",
  },
  "payment.rejected": {
    titleEn: "Payment could not be verified",
    titleAr: "تعذّر التحقق من الدفع",
    bodyEn: "Your therapist could not confirm your InstaPay transfer. Please re-upload your proof or contact support.",
    bodyAr: "لم يتمكّن معالجك من تأكيد التحويل. يرجى إعادة رفع الإيصال أو التواصل مع الدعم.",
  },
  "payment.confirmed": {
    titleEn: "Payment confirmed",
    titleAr: "تم تأكيد الدفع",
    bodyEn: "Your therapist confirmed your InstaPay transfer. Your session is now booked.",
    bodyAr: "أكّد معالجك استلام تحويل InstaPay. جلستك محجوزة الآن.",
  },
  "instapay.proof_received": {
    titleEn: "New payment proof to review",
    titleAr: "إثبات دفع جديد للمراجعة",
    bodyEn: "A patient sent an InstaPay transfer screenshot. Open your dashboard to confirm or reject.",
    bodyAr: "أرسل مريض لقطة تحويل InstaPay. افتح لوحة التحكم للتأكيد أو الرفض.",
  },
  "approval.granted": {
    titleEn: "Welcome to Thera",
    titleAr: "مرحبًا في ثيرا",
    bodyEn: "Your therapist application has been approved. You can now set your availability and start accepting bookings.",
    bodyAr: "تمت الموافقة على طلب انضمامك كمعالج. يمكنك الآن تحديد أوقاتك وبدء قبول الحجوزات.",
  },
  "approval.rejected": {
    titleEn: "Application update",
    titleAr: "تحديث على طلبك",
    bodyEn: "Thank you for applying. Unfortunately we're unable to approve your application at this time. Please contact support for details.",
    bodyAr: "شكرًا لتقديمك. للأسف لم نتمكّن من قبول طلبك في الوقت الحالي. تواصل مع الدعم للاستفسار.",
  },
  "reminder.24h": {
    titleEn: "Session tomorrow",
    titleAr: "جلستك غدًا",
    bodyEn: "You have a session scheduled for tomorrow. Log in to prepare.",
    bodyAr: "لديك جلسة مجدولة غدًا. سجّل الدخول للاستعداد.",
  },
  "reminder.1h": {
    titleEn: "Session in 1 hour",
    titleAr: "جلستك خلال ساعة",
    bodyEn: "Your session starts in about an hour. Make sure you're in a quiet space.",
    bodyAr: "جلستك تبدأ بعد نحو ساعة. احرص على التواجد في مكان هادئ.",
  },
};

/**
 * Returns a Firestore-ready bilingual notification payload.
 * Store `titleEn`, `titleAr`, `bodyEn`, `bodyAr` so the client picks the
 * right language without a round-trip.
 */
export function notificationPayload(
  uid: string,
  kind: NotificationKind,
  overrideBodyEn?: string,
  overrideBodyAr?: string,
) {
  const copy = COPY[kind];
  return {
    uid,
    kind,
    titleEn: copy.titleEn,
    titleAr: copy.titleAr,
    bodyEn: overrideBodyEn ?? copy.bodyEn,
    bodyAr: overrideBodyAr ?? copy.bodyAr,
    // Legacy single-language fields kept for backward compat with older clients.
    title: copy.titleEn,
    body: overrideBodyEn ?? copy.bodyEn,
    read: false,
  };
}
