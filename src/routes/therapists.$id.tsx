import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useTherapist, useTherapistSlotsLive } from "@/lib/queries/therapists";
import { BookTherapistLink } from "@/components/therapists/BookTherapistLink";
import { openCareThread } from "@/lib/queries/care";
import { priceLabel } from "@/lib/money";
import { ArrowLeft, Heart, Globe, Award, Clock, Video, MapPin, MessageSquare, CalendarCheck, BadgeCheck, LogIn, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Locale } from "@/lib/types";
import { toast } from "sonner";
import * as React from "react";

export const Route = createFileRoute("/therapists/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Therapist — Thera` },
      { name: "description", content: `Therapist profile ${params.id} on Thera.` },
    ],
  }),
  component: TherapistDetail,
});

function slotLabel(iso: string, locale: Locale) {
  const d = new Date(iso);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const day = sameDay(d, today)
    ? (locale === "ar" ? "اليوم" : "Today")
    : sameDay(d, tomorrow)
    ? (locale === "ar" ? "غدًا" : "Tomorrow")
    : new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} · ${time}`;
}

function TherapistDetail() {
  const { id } = Route.useParams();
  const { t, locale, dir } = useI18n();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const { data: therapist, isLoading } = useTherapist(id);
  const { data: slots = [] } = useTherapistSlotsLive(id);

  if (isLoading) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-5xl px-5 py-20 md:px-8">
          <div className="grid animate-pulse gap-8 md:grid-cols-3">
            <div className="h-96 rounded-[2rem] bg-muted" />
            <div className="h-96 rounded-[2rem] bg-muted md:col-span-2" />
          </div>
        </section>
      </SiteShell>
    );
  }

  if (!therapist) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-3xl px-5 py-20 text-center md:px-8">
          <h1 className="font-display text-4xl">{t.therapists.notFound}</h1>
          <Link to="/therapists" className="mt-6 inline-block rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted">
            {t.therapists.backToListing}
          </Link>
        </section>
      </SiteShell>
    );
  }

  const initials = therapist.displayName.split(" ").slice(0, 2).map((n) => n[0]).join("");
  const currency = therapist.currency || "EGP";

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-hero-under-site-header md:px-8">
        <Link to="/therapists" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t.therapists.backToListing}
        </Link>

        {!user && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-lavender/50 bg-lavender/25 px-4 py-3 text-sm">
            <LogIn className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-ink-muted">
              {locale === "ar" ? "سجّل الدخول لحجز جلسة مع هذا المعالج." : "Sign in to book a session with this therapist."}
            </span>
            <Link to="/auth/login" search={{ redirect: `/book/${therapist.id}` }} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">
              {t.nav.login}
            </Link>
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <motion.div
              layoutId={reduced ? undefined : `therapist-avatar-${therapist.id}`}
              className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-lavender/70 via-blush/40 to-mint/35 shadow-soft"
            >
              <div className="absolute inset-0 grid place-items-center font-display text-7xl text-ink/90">{initials}</div>
              <div aria-hidden className="blob absolute -bottom-16 -right-10 h-48 w-48 bg-sky/40" />
              {therapist.approved && (
                <span className="absolute start-4 top-4 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold shadow-sm">
                  <BadgeCheck className="h-3.5 w-3.5 text-mint" />
                  {locale === "ar" ? "معتمد" : "Verified"}
                </span>
              )}
            </motion.div>

            <div className="mt-5 grid gap-3 rounded-[2rem] border border-border/60 bg-card p-5 text-sm shadow-soft">
              <Stat Icon={Globe} label={t.therapists.speaks} value={therapist.languages.map((l) => (l === "en" ? t.therapists.speaksEnglish : t.therapists.speaksArabic)).join(" · ")} />
              <Stat Icon={Award} label={t.therapists.experience} value={`${therapist.yearsExperience ?? 0} ${t.therapists.yearsExperience}`} />
              <Stat Icon={Clock} label={t.therapists.sessionLabel} value={`${therapist.sessionMinutes ?? 50} ${t.booking.minutes} · ${priceLabel(therapist.pricePerSession, currency, locale)}`} />
              <Stat
                Icon={therapist.format === "in_person" ? MapPin : Video}
                label={t.therapists.formatLabel}
                value={
                  therapist.format === "both"
                    ? `${t.therapists.formatOnline} · ${t.therapists.formatInPerson}`
                    : therapist.format === "online"
                      ? t.therapists.formatOnline
                      : t.therapists.formatInPerson
                }
              />
            </div>

            <BookTherapistLink
              therapistId={therapist.id}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-cream shadow-soft transition-transform hover:scale-[1.01]"
            >
              <CalendarCheck className="h-4 w-4" />
              {t.therapists.bookCta}
            </BookTherapistLink>
          </aside>

          <div className="lg:col-span-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.therapists.role}</p>
            <h1
              className="hero-title mt-2 font-display text-4xl leading-tight text-ink md:text-6xl"
            >
              {therapist.displayName}
            </h1>
            <p className="mt-2 text-lg text-ink-muted">{therapist.title}</p>
            {therapist.rating != null && (
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-soft">
                <Heart className="h-4 w-4 fill-ink" /> {therapist.rating.toFixed(2)}
                {therapist.ratingCount ? <span className="ms-1 font-normal text-ink-muted">· {therapist.ratingCount} {locale === "ar" ? "تقييم" : "reviews"}</span> : null}
              </div>
            )}

            <Section title={t.therapists.about}>
              <p className="leading-relaxed text-ink-muted">{therapist.bio}</p>
            </Section>

            <Section title={t.therapists.specialties}>
              <div className="flex flex-wrap gap-2">
                {therapist.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">{s.replace(/_/g, " ")}</span>
                ))}
              </div>
            </Section>

            {therapist.education && therapist.education.length > 0 && (
              <Section title={t.therapists.education}>
                <ul className="space-y-1 text-sm text-ink-muted">
                  {therapist.education.map((e) => <li key={e}>· {e}</li>)}
                </ul>
              </Section>
            )}

            {therapist.certifications && therapist.certifications.length > 0 && (
              <Section title={t.therapists.certifications}>
                <ul className="flex flex-wrap gap-2">
                  {therapist.certifications.map((c) => (
                    <li key={c} className="rounded-full border border-border px-3 py-1 text-xs">{c}</li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="mt-10 rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
              <h3 className="font-display text-2xl">{t.therapists.availabilityPreview}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                {locale === "ar" ? "اختر موعدًا — يتطلب الحجز تسجيل الدخول." : "Pick a slot — booking requires a free account."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.length === 0 && (
                  <p className="col-span-full text-sm text-ink-muted">{t.booking.noSlots}</p>
                )}
                {slots.slice(0, 12).map((s) => (
                  <BookTherapistLink
                    key={s.id}
                    therapistId={therapist.id}
                    slotId={s.id}
                    className="rounded-full border border-border bg-background px-3 py-2.5 text-center text-xs font-semibold transition-colors hover:border-ink/30 hover:bg-lavender/30"
                  >
                    {slotLabel(s.startsAt, locale)}
                  </BookTherapistLink>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <BookTherapistLink
                therapistId={therapist.id}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream"
              >
                <CalendarCheck className="h-4 w-4" />
                {t.therapists.bookCta}
              </BookTherapistLink>
              <MessageTherapistButton therapistId={therapist.id} />
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function MessageTherapistButton({ therapistId }: { therapistId: string }) {
  const { t, locale } = useI18n();
  const { user, effectiveRole, profile } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const role = (effectiveRole ?? profile?.role ?? "adult") as "adult" | "parent" | "teen" | "therapist";

  async function handleClick() {
    if (!user) {
      void nav({ to: "/auth/login", search: { redirect: `/therapists/${therapistId}` } });
      return;
    }
    if (role === "therapist" || role === "admin") return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const threadId = await openCareThread(therapistId, idToken);
      void nav({ to: "/dashboard/$role/inbox/$threadId", params: { role, threadId } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("no_booking")) {
        toast.error(locale === "ar" ? "احجز جلسة أولاً لمراسلة المعالج." : "Book a session first to message your therapist.");
      } else {
        toast.error(locale === "ar" ? "تعذّر فتح المحادثة" : "Could not open conversation");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      {t.therapists.messageFirst}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="font-display text-xl">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stat({ Icon, label, value }: { Icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted"><Icon className="h-4 w-4" /></span>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
