import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useTherapist, useTherapistSlots } from "@/lib/queries/therapists";
import { intakeAnalyze } from "@/lib/ai/client";
import { isFirebaseConfigured } from "@/lib/firebase";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2, Lightbulb, ShieldCheck, Check } from "lucide-react";

const searchSchema = z.object({
  slotId: z.string().optional(),
});

export const Route = createFileRoute("/book/$therapistId")({
  head: () => ({ meta: [{ title: "Book a session — Thera" }] }),
  validateSearch: searchSchema,
  component: () => (
    <RouteGuard requireAuth>
      <BookingWizard />
    </RouteGuard>
  ),
});

function BookingWizard() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { therapistId } = Route.useParams();
  const { slotId: initialSlot } = Route.useSearch();
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const therapistQ = useTherapist(therapistId);
  const slotsQ = useTherapistSlots(therapistId);

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState({
    concern: "",
    urgency: "this_week" as "today" | "this_week" | "exploring",
    preferredLanguage: locale,
  });
  const [slotId, setSlotId] = React.useState<string | null>(initialSlot ?? null);
  const [intakeSummary, setIntakeSummary] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [bookingId, setBookingId] = React.useState<string | null>(null);

  const steps = [t.booking.intake, t.booking.chooseSlot, t.booking.review];
  const therapist = therapistQ.data;
  const slots = slotsQ.data ?? [];
  const groups = React.useMemo(() => groupByDay(slots, locale), [slots, locale]);
  const selectedSlot = slots.find((s) => s.id === slotId) ?? null;

  async function analyzeIntake() {
    setAnalyzing(true);
    try {
      const result = await intakeAnalyze({
        locale,
        answers: {
          concern: answers.concern,
          urgency: answers.urgency,
          language: answers.preferredLanguage,
        },
        idToken: user ? await user.getIdToken() : undefined,
      });
      setIntakeSummary(result.summary ?? null);
    } catch (err) {
      console.error("intake analyze", err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function lockBooking() {
    if (!slotId) return;
    setSubmitting(true);
    try {
      if (!isFirebaseConfigured || !user) {
        const demoId = `demo-${therapistId}-${slotId.slice(-6)}`;
        setBookingId(demoId);
        nav({ to: "/checkout/$bookingId", params: { bookingId: demoId } });
        return;
      }
      const idToken = await user.getIdToken();
      const res = await fetch("/api/booking/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ therapistId, slotId, notes: answers.concern }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json() as { bookingId: string };
      setBookingId(json.bookingId);
      nav({ to: "/checkout/$bookingId", params: { bookingId: json.bookingId } });
    } catch (err) {
      console.error("booking lock", err);
      alert("Could not reserve this slot. Please try another.");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (step === 0) {
      if (!intakeSummary && answers.concern.trim().length > 10) {
        void analyzeIntake();
      }
      setStep(1);
      return;
    }
    if (step === 1) { setStep(2); return; }
    void lockBooking();
  }

  return (
    <SiteShell>
      <section className="relative mx-auto max-w-3xl px-5 py-12 md:px-8">
        <motion.div
          aria-hidden
          className="blob pointer-events-none absolute -top-20 -start-12 h-64 w-64 bg-lavender/70"
          animate={reduce ? undefined : { y: [0, 18, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.booking.title}</p>
        <div className="mt-4 flex gap-2">
          {steps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-ink" : "bg-muted"}`} />
          ))}
        </div>
        <h1 className="mt-6 font-display text-4xl md:text-5xl">{steps[step]}</h1>
        {therapist ? (
          <p className="mt-2 text-sm text-ink-muted">
            {locale === "ar" ? "الحجز مع" : "Booking with"} <span className="font-semibold text-foreground">{therapist.displayName}</span>
            {therapist.title ? ` · ${therapist.title}` : null}
          </p>
        ) : null}

        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 rounded-3xl border border-border/70 bg-card p-6 shadow-soft"
        >
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-ink-muted">{t.booking.intakeSub}</label>
                <textarea
                  value={answers.concern}
                  onChange={(e) => setAnswers({ ...answers, concern: e.target.value })}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed"
                  placeholder={locale === "ar" ? "ما الذي تود التحدث عنه؟ لا بأس إن كانت الإجابة قصيرة." : "What's on your mind? A sentence is enough."}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice label={locale === "ar" ? "مدى الإلحاح" : "Urgency"}>
                  {[
                    { v: "today", en: "Today", ar: "اليوم" },
                    { v: "this_week", en: "This week", ar: "هذا الأسبوع" },
                    { v: "exploring", en: "Just exploring", ar: "أستكشف فقط" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setAnswers({ ...answers, urgency: o.v as typeof answers.urgency })}
                      className={`rounded-full px-3 py-1.5 text-sm ${answers.urgency === o.v ? "bg-ink text-cream" : "border border-border bg-card"}`}
                    >{locale === "ar" ? o.ar : o.en}</button>
                  ))}
                </Choice>
                <Choice label={locale === "ar" ? "لغة الجلسة" : "Session language"}>
                  {([["en", "English"], ["ar", "العربية"]] as const).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAnswers({ ...answers, preferredLanguage: v })}
                      className={`rounded-full px-3 py-1.5 text-sm ${answers.preferredLanguage === v ? "bg-ink text-cream" : "border border-border bg-card"}`}
                    >{label}</button>
                  ))}
                </Choice>
              </div>
              {intakeSummary ? (
                <div className="rounded-2xl border border-border/70 bg-blush/40 p-4 text-sm">
                  <div className="flex items-center gap-2 text-ink"><Lightbulb className="h-4 w-4" /> {locale === "ar" ? "ملخص ذكي" : "Thera summary"}</div>
                  <p className="mt-2 text-ink-muted">{intakeSummary}</p>
                </div>
              ) : null}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              {slotsQ.isLoading ? (
                <div className="grid gap-2">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-muted/60" />)}
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-ink-muted">
                  {locale === "ar" ? "لا توجد مواعيد شاغرة خلال الأسبوعين القادمين." : "No open slots in the next two weeks."}
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groups).map(([dayLabel, daySlots]) => (
                    <div key={dayLabel}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{dayLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {daySlots.map((s) => {
                          const active = slotId === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSlotId(s.id)}
                              className={`rounded-full border px-4 py-2 text-sm transition-colors ${active ? "border-ink bg-ink text-cream" : "border-border bg-card hover:border-ink/40"}`}
                            >
                              {formatSlotTime(s.startsAt, locale)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-sm">
              <Row label={locale === "ar" ? "المعالج" : "Therapist"} value={therapist?.displayName ?? "—"} />
              <Row label={locale === "ar" ? "الموعد" : "Slot"} value={selectedSlot ? formatSlotFull(selectedSlot.startsAt, locale) : "—"} />
              <Row label={locale === "ar" ? "اللغة" : "Language"} value={answers.preferredLanguage === "ar" ? "العربية" : "English"} />
              <Row
                label={t.booking.price}
                value={therapist ? formatPrice(therapist.pricePerSession, therapist.currency, locale) : "—"}
                bold
              />
              <div className="rounded-2xl bg-sky/40 p-4 text-sm text-ink">
                <ShieldCheck className="inline h-4 w-4 me-2" />
                {locale === "ar" ? "ستختار طريقة الدفع في الخطوة التالية (بطاقة عبر Polar أو تحويل InstaPay)." : "You'll choose your payment method next — card via Polar or InstaPay transfer."}
              </div>
              {analyzing ? <p className="text-xs text-ink-muted">{locale === "ar" ? "جاري تحليل الإجابات..." : "Summarizing your intake..."}</p> : null}
            </div>
          )}
        </motion.div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm"
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" /> {t.common.back}
          </button>
          <button
            onClick={next}
            disabled={(step === 1 && !slotId) || submitting}
            className="flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream shadow-soft disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {step === steps.length - 1 ? t.booking.pay : t.common.continue}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>

        <ProgressDots bookingId={bookingId} />
      </section>
    </SiteShell>
  );
}

function groupByDay(slots: Array<{ id: string; startsAt: string }>, locale: "en" | "ar") {
  const out: Record<string, Array<{ id: string; startsAt: string }>> = {};
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { weekday: "long", day: "numeric", month: "short" });
  for (const s of slots) {
    const d = new Date(s.startsAt);
    const key = fmt.format(d);
    (out[key] ??= []).push(s);
  }
  return out;
}

function formatSlotTime(iso: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatSlotFull(iso: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatPrice(amount: number, currency: "EGP" | "USD" | "SAR" | "AED", locale: "en" | "ar") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency }).format(amount / 100);
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-display text-lg" : "text-ink-muted"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

function ProgressDots({ bookingId }: { bookingId: string | null }) {
  const { t } = useI18n();
  if (!bookingId) return null;
  return (
    <div className="mt-6 flex items-center gap-2 text-xs text-ink-muted">
      <Check className="h-3 w-3 text-emerald-600" /> {t.booking.draftSaved} #{bookingId.slice(0, 6)}
    </div>
  );
}
