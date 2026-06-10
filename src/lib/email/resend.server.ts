/** Minimal Resend helper for Vercel server routes (mirrors functions/src/index.ts). */
export async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.EMAIL_FROM || "Thera <notifications@wethera.site>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
  });
  return res.ok;
}

export function therapistApprovedEmailEn(appUrl: string) {
  const html = `
  <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#CDB4DB;padding:32px;border-radius:24px">
      <h1 style="margin:0;font-family:Georgia,serif">Your Thera therapist application was approved.</h1>
      <p style="margin:8px 0 0">You can now sign in and open your therapist dashboard.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/therapist" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Open dashboard</a>
    </div>
  </div>`;
  const text = `Your Thera therapist application was approved. Open your dashboard: ${appUrl}/dashboard/therapist`;
  return { subject: "Welcome to Thera — application approved", html, text };
}

export function therapistApprovedEmailAr(appUrl: string) {
  const html = `
  <div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#CDB4DB;padding:32px;border-radius:24px">
      <h1 style="margin:0">تمت الموافقة على طلب انضمامك كمعالج على ثيرا.</h1>
      <p style="margin:8px 0 0">يمكنك الآن تسجيل الدخول وفتح لوحة المعالج.</p>
    </div>
    <div style="padding:24px 0">
      <a href="${appUrl}/dashboard/therapist" style="background:#1F1B2E;color:#FFF6E9;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">فتح لوحة التحكم</a>
    </div>
  </div>`;
  const text = `تمت الموافقة على طلبك. افتح لوحة التحكم: ${appUrl}/dashboard/therapist`;
  return { subject: "مرحبًا بك في ثيرا — تمت الموافقة على طلبك", html, text };
}

export function therapistRejectedEmailEn(appUrl: string, reason?: string | null) {
  const note = reason ? `<p style="margin-top:12px;color:#4B5563"><strong>Note:</strong> ${reason}</p>` : "";
  const html = `
  <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#F7D6E0;padding:32px;border-radius:24px">
      <h1 style="margin:0;font-family:Georgia,serif">Update on your Thera application</h1>
      <p style="margin:8px 0 0">We could not approve your therapist application at this time.</p>
      ${note}
    </div>
    <p style="padding:16px 0;color:#4B5563">Questions? Contact us at ${appUrl}/contact</p>
  </div>`;
  const text = `We could not approve your Thera therapist application.${reason ? ` Note: ${reason}` : ""} Contact: ${appUrl}/contact`;
  return { subject: "Thera therapist application update", html, text };
}

export function therapistRejectedEmailAr(appUrl: string, reason?: string | null) {
  const note = reason ? `<p style="margin-top:12px;color:#4B5563"><strong>ملاحظة:</strong> ${reason}</p>` : "";
  const html = `
  <div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:auto;color:#1F1B2E">
    <div style="background:#F7D6E0;padding:32px;border-radius:24px">
      <h1 style="margin:0">تحديث بشأن طلب انضمامك لثيرا</h1>
      <p style="margin:8px 0 0">لم نتمكن من الموافقة على طلبك كمعالج في الوقت الحالي.</p>
      ${note}
    </div>
    <p style="padding:16px 0;color:#4B5563">أسئلة؟ تواصل معنا: ${appUrl}/contact</p>
  </div>`;
  const text = `لم نتمكن من الموافقة على طلبك.${reason ? ` ملاحظة: ${reason}` : ""} تواصل: ${appUrl}/contact`;
  return { subject: "تحديث طلب المعالج على ثيرا", html, text };
}
