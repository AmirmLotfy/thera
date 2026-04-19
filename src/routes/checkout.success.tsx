import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { CheckCircle2, Calendar, Mail, Video } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  bookingId: z.string().optional(),
  polarId: z.string().optional(),
});

export const Route = createFileRoute("/checkout/success")({
  head: () => ({ meta: [{ title: "Booking confirmed — Thera" }] }),
  validateSearch: searchSchema,
  component: SuccessPage,
});

function SuccessPage() {
  const { t, locale } = useI18n();
  const { bookingId } = Route.useSearch();
  return (
    <SiteShell>
      <section className="mx-auto max-w-xl px-5 py-20 text-center">
        <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-600" />
        <h1 className="mt-5 font-display text-5xl">{t.booking.confirmed}</h1>
        <p className="mt-3 text-ink-muted">{t.booking.confirmedSub}</p>

        <div className="mt-10 space-y-3 rounded-3xl border border-border/70 bg-card p-6 text-start shadow-soft">
          <Row Icon={Calendar} label={locale === "ar" ? "تم إضافة الموعد إلى تقويمك" : "Session added to your calendar"} sub={locale === "ar" ? "سنرسل تذكيرًا قبل الجلسة بـ 24 ساعة." : "We'll remind you 24 hours before the session."} />
          <Row Icon={Mail} label={locale === "ar" ? "تم إرسال تأكيد بالبريد" : "Confirmation emailed"} sub={locale === "ar" ? "يتضمن إيصال الدفع ورابط الجلسة." : "Includes your receipt and the session link."} />
          <Row Icon={Video} label={locale === "ar" ? "غرفة فيديو آمنة جاهزة" : "Secure video room ready"} sub={locale === "ar" ? "يمكنك الانضمام قبل 10 دقائق من الموعد." : "Join up to 10 minutes before your session."} />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard/$role" params={{ role: "adult" }} className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream shadow-soft">{t.nav.dashboard}</Link>
          <Link to="/therapists" className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold">{locale === "ar" ? "استكشف معالجين آخرين" : "Browse more therapists"}</Link>
        </div>

        {bookingId ? <p className="mt-8 text-xs text-ink-muted">{t.booking.bookingRef}{bookingId.slice(0, 8)}</p> : null}
        <p className="mt-4 text-xs text-ink-muted">
          {locale === "ar" ? "تحتاج مساعدة؟" : "Need help?"} <Link to="/contact" className="underline">{locale === "ar" ? "راسل الدعم" : "Contact support"}</Link>
        </p>
      </section>
    </SiteShell>
  );
}

function Row({ Icon, label, sub }: { Icon: typeof Calendar; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender/60"><Icon className="h-5 w-5" /></span>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-ink-muted">{sub}</p>
      </div>
    </div>
  );
}
