import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Thera" },
      { name: "description", content: "The agreement that governs how you use Thera." },
      { property: "og:title", content: "Terms of Service — Thera" },
      { property: "og:description", content: "Plain-language terms — what we promise, what we ask of you." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t, locale } = useI18n();
  const tr = t.terms;

  const sections = [
    { t: tr.sec1t, b: tr.sec1b },
    { t: tr.sec2t, b: tr.sec2b },
    { t: tr.sec3t, b: tr.sec3b },
    { t: tr.sec4t, b: tr.sec4b },
    { t: tr.sec5t, b: tr.sec5b },
    { t: tr.sec6t, b: tr.sec6b },
    { t: tr.sec7t, b: tr.sec7b },
    { t: tr.sec8t, b: tr.sec8b },
    { t: tr.sec9t, b: tr.sec9b },
    { t: tr.sec10t, b: tr.sec10b },
    { t: tr.sec11t, b: tr.sec11b },
    { t: tr.sec12t, b: tr.sec12b },
  ];

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -right-24 top-10 h-80 w-80 bg-blush/60" />
        <div className="relative mx-auto max-w-4xl px-5 pb-10 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{tr.kicker}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-7xl">{tr.heroTitle}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-muted">{tr.heroSub}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-5 pb-24 md:px-8">
        {locale === "ar" && (
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 px-5 py-3 text-sm text-amber-900">
            <p className="font-semibold">{tr.disclaimerAr}</p>
          </div>
        )}

        {sections.map((s) => (
          <div key={s.t} className="rounded-3xl border border-border/70 bg-card p-6">
            <h2 className="font-display text-xl">{s.t}</h2>
            <p className="mt-2 text-sm text-ink-muted">{s.b}</p>
          </div>
        ))}

        <p className="pt-6 text-center text-xs text-ink-muted">
          {tr.lastUpdated} · {tr.questionsPrefix}{" "}
          <a href="mailto:legal@wethera.site" className="underline">legal@wethera.site</a>
        </p>
      </section>
    </SiteShell>
  );
}
