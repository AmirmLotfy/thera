import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { MessageSquare, Search, CalendarCheck, FileText, Heart, Users, Baby, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Thera" },
      { name: "description", content: "Talk to Thera AI, find the right therapist, book a session, and review your post-session report." },
      { property: "og:title", content: "How it works — Thera" },
      { property: "og:description", content: "Four calm steps from first message to a real session." },
    ],
  }),
  component: HowItWorksPage,
});

const stepIcons = [MessageSquare, Search, CalendarCheck, FileText] as const;
const stepColors = ["bg-lavender/60", "bg-blush/60", "bg-aqua/50", "bg-cream"] as const;
const journeyIcons = [Heart, Users, Baby, Stethoscope] as const;

function HowItWorksPage() {
  const { t } = useI18n();
  const h = t.how;

  const steps = [
    { Icon: stepIcons[0], title: h.step1t, body: h.step1b, color: stepColors[0] },
    { Icon: stepIcons[1], title: h.step2t, body: h.step2b, color: stepColors[1] },
    { Icon: stepIcons[2], title: h.step3t, body: h.step3b, color: stepColors[2] },
    { Icon: stepIcons[3], title: h.step4t, body: h.step4b, color: stepColors[3] },
  ];

  const journeys = [
    { Icon: journeyIcons[0], title: h.journey1t, lines: [h.journey1l1, h.journey1l2, h.journey1l3] },
    { Icon: journeyIcons[1], title: h.journey2t, lines: [h.journey2l1, h.journey2l2, h.journey2l3] },
    { Icon: journeyIcons[2], title: h.journey3t, lines: [h.journey3l1, h.journey3l2, h.journey3l3] },
    { Icon: journeyIcons[3], title: h.journey4t, lines: [h.journey4l1, h.journey4l2, h.journey4l3] },
  ];

  const faqs = [
    { q: h.faq1q, a: h.faq1a },
    { q: h.faq2q, a: h.faq2a },
    { q: h.faq3q, a: h.faq3a },
    { q: h.faq4q, a: h.faq4a },
  ];

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -right-20 top-10 h-96 w-96 bg-aqua/60" />
        <div aria-hidden className="blob pointer-events-none absolute -left-20 top-60 h-80 w-80 bg-lavender/50" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{h.kicker}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-7xl">{h.heroTitle}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-muted">{h.heroSub}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-20 md:grid-cols-2 md:px-8">
        {steps.map(({ Icon, title, body, color }, i) => (
          <div key={title} className={`rounded-3xl border border-border/70 ${color} p-7`}>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-card"><Icon className="h-5 w-5" /></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{h.stepLabel} {i + 1}</span>
            </div>
            <h3 className="mt-5 font-display text-3xl">{title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{h.journeysKicker}</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">{h.journeysTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {journeys.map(({ Icon, title, lines }) => (
            <div key={title} className="rounded-3xl border border-border/70 bg-card p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender/60"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-5 font-display text-2xl">{title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                {lines.map((l) => (<li key={l} className="flex gap-2"><span className="text-foreground">·</span>{l}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{h.faqsKicker}</p>
        <h2 className="mt-2 font-display text-4xl">{h.faqsTitle}</h2>
        <div className="mt-8 divide-y divide-border/70 rounded-3xl border border-border/70 bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-display text-lg">{f.q}</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-lg transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24 md:px-8">
        <div className="rounded-3xl bg-ink p-10 text-cream md:p-14">
          <h3 className="font-display text-4xl md:text-5xl">{h.ctaTitle}</h3>
          <p className="mt-4 max-w-xl text-cream/80">{h.ctaSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth/signup" className="rounded-full bg-cream px-6 py-3 text-sm font-semibold text-ink">{h.ctaPrimary}</Link>
            <Link to="/therapists" className="rounded-full border border-cream/40 px-6 py-3 text-sm font-semibold text-cream">{h.ctaSecondary}</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
