/**
 * Therapist pending-approval page.
 *
 * Shown after a therapist submits their application via onboarding. Polls
 * Firebase ID token claims every 30 s (and on window focus) so the page
 * auto-advances to the therapist dashboard as soon as an admin approves.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Clock, CheckCircle2, Loader2, RefreshCw, MailOpen } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/dashboard/$role/pending")({
  head: () => ({ meta: [{ title: "Application pending — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <PendingPage />
    </RouteGuard>
  ),
});

type AppStatus = "submitted" | "under_review" | "approved" | "rejected";

function PendingPage() {
  const { locale } = useI18n();
  const { user, effectiveRole, refreshClaims } = useAuth();
  const nav = useNavigate();
  const [appStatus, setAppStatus] = React.useState<AppStatus>("submitted");
  const [rejectionNote, setRejectionNote] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);

  async function checkStatus() {
    setChecking(true);
    try {
      // Refresh ID token claims first
      await refreshClaims();

      // If the claim was updated, effectiveRole will now be "therapist"
      // (the useEffect below handles the redirect)

      // Also read the application document for display purposes
      if (user && isFirebaseConfigured && db) {
        const snap = await getDoc(doc(db, "therapistApplications", user.uid));
        if (snap.exists()) {
          const data = snap.data() as { status: AppStatus; adminNote?: string };
          setAppStatus(data.status);
          if (data.status === "rejected") setRejectionNote(data.adminNote ?? null);
        }
      }
    } catch (err) {
      console.warn("pending check", err);
    } finally {
      setChecking(false);
    }
  }

  // Auto-redirect when approved.
  React.useEffect(() => {
    if (effectiveRole === "therapist") {
      void nav({ to: "/dashboard/$role", params: { role: "therapist" } });
    }
  }, [effectiveRole, nav]);

  // Poll every 30 s and on window focus
  React.useEffect(() => {
    void checkStatus();
    const interval = setInterval(() => void checkStatus(), 30_000);
    const onFocus = () => void checkStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ar = locale === "ar";

  if (appStatus === "rejected") {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-5 py-20 text-center md:px-8">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-destructive/20">
            <MailOpen className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-display text-4xl">{ar ? "لم يتم قبول طلبك" : "Application not approved"}</h1>
          <p className="mt-3 text-ink-muted">
            {ar
              ? "نشكرك على تقديم طلبك. للأسف لا يمكننا القبول في الوقت الحالي."
              : "Thank you for applying. Unfortunately we're unable to approve your application at this time."}
          </p>
          {rejectionNote && (
            <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-ink-muted">
              {rejectionNote}
            </div>
          )}
          <p className="mt-4 text-sm text-ink-muted">
            {ar ? "تواصل مع " : "Contact "}<a href="mailto:support@wethera.site" className="underline">support@wethera.site</a>{ar ? " للاستفسار." : " for details."}
          </p>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-5 py-20 text-center md:px-8">
        {/* Animated clock icon */}
        <div className="mx-auto mb-6 relative grid h-20 w-20 place-items-center rounded-full bg-lavender/40">
          {appStatus === "under_review" ? (
            <CheckCircle2 className="h-10 w-10 text-ink" />
          ) : (
            <Clock className="h-10 w-10 text-ink" />
          )}
        </div>

        <h1 className="font-display text-4xl md:text-5xl">
          {ar
            ? (appStatus === "under_review" ? "جارٍ المراجعة" : "طلبك قيد الانتظار")
            : (appStatus === "under_review" ? "Under review" : "Application submitted")}
        </h1>

        <p className="mt-4 max-w-md mx-auto text-ink-muted">
          {ar
            ? "فريق ثيرا سيراجع طلبك خلال 24–48 ساعة. ستصلك رسالة بريد إلكتروني وإشعار فور اتخاذ القرار."
            : "The Thera team will review your application within 24–48 hours. You'll receive an email and in-app notification once a decision is made."}
        </p>

        {/* Status badge */}
        <div className={`mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${appStatus === "under_review" ? "bg-sky/30 text-ink" : "bg-muted text-ink-muted"}`}>
          <span className={`h-2 w-2 rounded-full ${appStatus === "under_review" ? "bg-sky animate-pulse" : "bg-ink-muted"}`} />
          {ar
            ? (appStatus === "under_review" ? "قيد المراجعة" : "تم الإرسال")
            : (appStatus === "under_review" ? "Under review" : "Submitted")}
        </div>

        {/* What happens next */}
        <div className="mt-10 rounded-3xl border border-border/70 bg-card p-6 text-start shadow-soft">
          <h2 className="font-display text-lg">{ar ? "ما الذي يحدث بعد ذلك؟" : "What happens next?"}</h2>
          <ol className="mt-4 space-y-3">
            {[
              ar ? ["✅", "استلام الطلب", "تلقّينا طلبك وسيُراجع قريبًا."]
                 : ["✅", "Application received", "We have your application and it's queued for review."],
              ar ? [appStatus === "under_review" ? "🔍" : "⏳", "المراجعة", "يتحقق فريقنا من بياناتك ومؤهلاتك."]
                 : [appStatus === "under_review" ? "🔍" : "⏳", "Review", "Our team checks your credentials and qualifications."],
              ar ? ["📩", "القرار", "سنرسل لك البريد الإلكتروني فور صدور القرار."]
                 : ["📩", "Decision", "You'll be notified by email and notification as soon as the decision is made."],
            ].map(([icon, title, body]) => (
              <li key={title} className="flex items-start gap-3 text-sm">
                <span className="text-lg leading-tight">{icon}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Manual refresh */}
        <button
          onClick={() => void checkStatus()}
          disabled={checking}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {ar ? "تحقق من الحالة" : "Check status"}
        </button>

        <p className="mt-3 text-xs text-ink-muted">
          {ar ? "يتم التحقق تلقائيًا كل 30 ثانية." : "Auto-checks every 30 seconds."}
        </p>
      </section>
    </SiteShell>
  );
}
