import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { useTherapist, useTherapistSlots } from "@/lib/queries/therapists";
import { ArrowLeft, Heart, Globe, Award, Clock, Video, MessageSquare, CalendarCheck, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Locale } from "@/lib/types";

export const Route = createFileRoute("/therapists/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Therapist · Thera` },
      { name: "description", content: `Therapist profile ${params.id} on Thera.` },
    ],
  }),
  component: TherapistDetail,
});

function priceLabel(n: number, c: string) {
  const amt = n / 100;
  if (c === "USD") return `$${amt}`;
  if (c === "EGP") return `E£${amt}`;
  if (c === "SAR") return `SAR ${amt}`;
  if (c === "AED") return `AED ${amt}`;
  return `${c} ${amt}`;
}

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
  const { t, locale } = useI18n();
  const reduced = useReducedMotion();
  const { data: therapist, isLoading } = useTherapist(id);
  const { data: slots = [] } = useTherapistSlots(id);

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

  return (
    <SiteShell>
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-hero-under-site-header md:px-8">
        <Link to="/therapists" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t.therapists.backToListing}
        </Link>

        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            <motion.div
              layoutId={reduced ? undefined : `therapist-avatar-${therapist.id}`}
              className="relative aspect-square overflow-hidden rounded-[2rem] border border-border/50 shadow-soft"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-lavender/70 via-blush/50 to-mint/40" />
              <div className="absolute inset-0 grid place-items-center font-display text-6xl text-ink">
                {initials}
              </div>
              <div aria-hidden className="blob absolute -bottom-16 -right-10 h-48 w-48 bg-sky/50" />
            </motion.div>

            <div className="mt-5 grid gap-3 rounded-[2rem] border border-border/60 bg-card p-5 text-sm shadow-soft">
              <Stat Icon={Globe} label={t.therapists.speaks} value={therapist.languages.map((l) => l === "en" ? t.therapists.speaksEnglish : t.therapists.speaksArabic).join(" · ")} />
              <Stat Icon={Award} label={t.therapists.experience} value={`${therapist.yearsExperience ?? 0} ${t.therapists.yearsExperience}`} />
              <Stat Icon={Clock} label={t.therapists.sessionLabel} value={`${therapist.sessionMinutes ?? 50} ${t.booking.minutes} · ${priceLabel(therapist.pricePerSession, therapist.currency)}`} />
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

            <Link
              to="/book/$therapistId"
              params={{ therapistId: therapist.id }}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream"
            >
              <CalendarCheck className="h-4 w-4" />
              {t.therapists.bookCta}
            </Link>
          </aside>

          {/* Main */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
              {t.therapists.role}
            </p>
            <h1 className="mt-2 font-display text-4xl md:text-6xl">{therapist.displayName}</h1>
            <p className="mt-2 text-ink-muted">{therapist.title}</p>
            {therapist.rating != null && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-semibold shadow-soft">
                <Heart className="h-3 w-3 fill-ink" /> {therapist.rating.toFixed(2)}
                {therapist.ratingCount ? <span className="ms-1 text-ink-muted">· {therapist.ratingCount}</span> : null}
              </div>
            )}

            <Section title={t.therapists.about}>
              <p className="text-ink-muted leading-relaxed">{therapist.bio}</p>
            </Section>

            <Section title={t.therapists.specialties}>
              <div className="flex flex-wrap gap-2">
                {therapist.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs">{s.replace("_", " ")}</span>
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
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.length === 0 && (
                  <p className="col-span-full text-sm text-ink-muted">{t.booking.noSlots}</p>
                )}
                {slots.slice(0, 12).map((s) => (
                  <Link
                    key={s.id}
                    to="/book/$therapistId"
                    params={{ therapistId: therapist.id }}
                    search={{ slotId: s.id }}
                    className="rounded-full border border-border bg-background px-3 py-2 text-center text-xs font-semibold hover:bg-muted"
                  >
                    {slotLabel(s.startsAt, locale)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/book/$therapistId"
                params={{ therapistId: therapist.id }}
                className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream"
              >
                {t.therapists.bookCta}
              </Link>
              <Link to="/auth/signup" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" /> {t.therapists.messageFirst}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
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
