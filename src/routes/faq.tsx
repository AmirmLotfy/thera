import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Thera" },
      { name: "description", content: "Common questions about privacy, AI, booking, families, and bilingual support on Thera." },
      { property: "og:title", content: "FAQ — Thera" },
      { property: "og:description", content: "What you might want to know before your first conversation." },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  const { t } = useI18n();
  const f = t.faq;

  const groups = [
    {
      title: f.group1title,
      items: [
        { q: f.group1q1, a: f.group1a1 },
        { q: f.group1q2, a: f.group1a2 },
        { q: f.group1q3, a: f.group1a3 },
        { q: f.group1q4, a: f.group1a4 },
      ],
    },
    {
      title: f.group2title,
      items: [
        { q: f.group2q1, a: f.group2a1 },
        { q: f.group2q2, a: f.group2a2 },
        { q: f.group2q3, a: f.group2a3 },
      ],
    },
    {
      title: f.group3title,
      items: [
        { q: f.group3q1, a: f.group3a1 },
        { q: f.group3q2, a: f.group3a2 },
        { q: f.group3q3, a: f.group3a3 },
      ],
    },
    {
      title: f.group4title,
      items: [
        { q: f.group4q1, a: f.group4a1 },
        { q: f.group4q2, a: f.group4a2 },
        { q: f.group4q3, a: f.group4a3 },
        { q: f.group4q4, a: f.group4a4 },
      ],
    },
  ];

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -left-20 -top-10 h-80 w-80 bg-lavender/60" />
        <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{f.kicker}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-7xl">{f.heroTitle}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-muted">
            {f.heroSub}{" "}
            <Link to="/contact" className="underline">{f.emailUs}</Link> — a real person replies.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-12 px-5 pb-24 md:px-8">
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="font-display text-2xl">{g.title}</h2>
            <div className="mt-4 divide-y divide-border/70 rounded-3xl border border-border/70 bg-card">
              {g.items.map((it) => (
                <details key={it.q} className="group p-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="font-display text-lg">{it.q}</span>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-lg transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-ink-muted">{it.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>
    </SiteShell>
  );
}
