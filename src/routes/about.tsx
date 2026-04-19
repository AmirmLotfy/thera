import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { Heart, Globe, ShieldCheck, Compass } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Thera" },
      { name: "description", content: "Thera is a bilingual mental wellness platform built to make support easy, calm, and trusted." },
      { property: "og:title", content: "About — Thera" },
      { property: "og:description", content: "Our mission, our values, and the people building Thera." },
    ],
  }),
  component: AboutPage,
});

const valueIcons = [Heart, Globe, ShieldCheck, Compass] as const;

const teamMembers = [
  { name: "Mariam Khalifa", roleEn: "Co-founder · Clinical lead", color: "bg-lavender/60" },
  { name: "Yusuf Idris", roleEn: "Co-founder · Product", color: "bg-blush/60" },
  { name: "Dr. Hala Mansour", roleEn: "Head of clinical safety", color: "bg-aqua/50" },
  { name: "Tariq Al-Amin", roleEn: "Head of engineering", color: "bg-cream" },
] as const;

function AboutPage() {
  const { t } = useI18n();
  const a = t.about;

  const stats = [
    { n: a.stat1n, l: a.stat1l },
    { n: a.stat2n, l: a.stat2l },
    { n: a.stat3n, l: a.stat3l },
    { n: a.stat4n, l: a.stat4l },
  ];

  const values = [
    { Icon: valueIcons[0], title: a.val1t, body: a.val1b },
    { Icon: valueIcons[1], title: a.val2t, body: a.val2b },
    { Icon: valueIcons[2], title: a.val3t, body: a.val3b },
    { Icon: valueIcons[3], title: a.val4t, body: a.val4b },
  ];

  const story = [
    { year: a.story1year, title: a.story1title, body: a.story1body },
    { year: a.story2year, title: a.story2title, body: a.story2body },
    { year: a.story3year, title: a.story3title, body: a.story3body },
  ];

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -left-24 -top-20 h-96 w-96 bg-lavender/60" />
        <div aria-hidden className="blob pointer-events-none absolute -right-20 top-40 h-80 w-80 bg-aqua/50" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.kicker}</p>
          <h1 className="mt-4 max-w-3xl text-balance font-display text-5xl leading-[1.05] md:text-7xl">{a.heroTitle}</h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-muted">{a.heroSub}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
        <div className="grid gap-5 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-3xl border border-border/70 bg-card p-6">
              <p className="font-display text-4xl">{s.n}</p>
              <p className="mt-2 text-sm text-ink-muted">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.valuesKicker}</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">{a.valuesTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {values.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-border/70 bg-card p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blush/60"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-5 font-display text-2xl">{title}</h3>
              <p className="mt-2 text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.storyKicker}</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">{a.storyTitle}</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {story.map((s) => (
            <div key={s.year} className="rounded-3xl border border-border/70 bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{s.year}</p>
              <h3 className="mt-3 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.teamKicker}</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">{a.teamTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
          {teamMembers.map((m) => (
            <div key={m.name} className="rounded-3xl border border-border/70 bg-card p-5">
              <div className={`aspect-square rounded-2xl ${m.color}`} />
              <h3 className="mt-4 font-display text-lg">{m.name}</h3>
              <p className="text-xs text-ink-muted">{m.roleEn}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-border/70 bg-cream p-8 text-center md:p-10">
          <h3 className="font-display text-3xl">{a.joinTitle}</h3>
          <p className="mt-2 text-sm text-ink-muted">{a.joinSub}</p>
          <Link to="/contact" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">{a.joinCta}</Link>
        </div>
      </section>
    </SiteShell>
  );
}
