import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { BLOG_ARTICLES, type BlogArticle } from "@/lib/blog/articles";
import { BlogCardCover } from "@/lib/blog/covers";
import * as React from "react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Resources — Thera" },
      { name: "description", content: "Bilingual articles, awareness guides, and self-care tools from the Thera team." },
      { property: "og:title", content: "Resources — Thera" },
      { property: "og:description", content: "Mental wellness articles and tools, in EN and AR." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const { locale, dir } = useI18n();
  const data = BLOG_ARTICLES;
  const [search, setSearch] = React.useState("");
  const [cat, setCat] = React.useState<string>("all");

  const categories = Array.from(new Set(["all", ...data.map((a) => a.category)]));
  const filtered = data.filter((a) => (cat === "all" || a.category === cat) && include(a, search, locale));
  const [featured, ...rest] = filtered;

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -right-20 -top-10 h-96 w-96 bg-blush/60" />
        <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مصادر" : "Resources"}</p>
          <h1 className="hero-title hero-title-xl mt-4 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
            {locale === "ar" ? "قراءات هادئة للأيام الصعبة." : "Soft reading for hard days."}
          </h1>
          <p
            className={`mt-5 max-w-2xl text-ink-muted ${
              dir === "rtl" ? "text-lg leading-8 md:text-xl md:leading-9" : "text-lg leading-relaxed"
            }`}
          >
            {locale === "ar" ? "مقالات ثنائية اللغة كتبها مختصون وأعادت تحريرها يدٌ دافئة." : "Bilingual articles written by clinicians and edited for warmth — never lectures."}
          </p>

          <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === "ar" ? "ابحث عن مقال…" : "Search articles…"} className="w-full rounded-full border border-border bg-card ps-11 pe-4 py-3 text-sm" />
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${cat === c ? "bg-ink text-cream" : "bg-card border border-border text-ink-muted"}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="mx-auto max-w-7xl px-5 pb-12 md:px-8">
          <Link to="/blog/$slug" params={{ slug: featured.slug }} className="grid gap-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-transform hover:-translate-y-1 md:grid-cols-2 md:p-10">
            <BlogCardCover slug={featured.slug} category={featured.category} index={0} />
            <div className="flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{featured.category}</p>
              <h2 className="mt-3 font-display text-3xl md:text-4xl">{title(featured, locale)}</h2>
              <p className="mt-3 text-ink-muted">{excerpt(featured, locale)}</p>
              <span className="mt-6 w-fit rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">{locale === "ar" ? "قراءة المقال" : "Read article"}</span>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p, i) => (
            <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-transform hover:-translate-y-1">
              <BlogCardCover slug={p.slug} category={p.category} index={i + 1} />
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-muted">{p.category}</p>
              <h3 className="mt-2 font-display text-xl">{title(p, locale)}</h3>
              <p className="mt-2 text-sm text-ink-muted">{excerpt(p, locale)}</p>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-3xl border border-border/70 bg-cream p-10 text-center text-sm text-ink-muted">
              {locale === "ar" ? "لا توجد مقالات مطابقة." : "No articles match your filters yet."}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24 md:px-8">
        <div className="rounded-3xl bg-cream p-8 text-center md:p-10">
          <h3 className="font-display text-3xl">{locale === "ar" ? "قراءة هادئة كل أحد." : "Get one calm read every Sunday."}</h3>
          <p className="mt-2 text-sm text-ink-muted">{locale === "ar" ? "نشرة قصيرة ثنائية اللغة — بلا سبام." : "A short, bilingual newsletter. No spam, easy unsubscribe."}</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input type="email" placeholder="you@example.com" className="flex-1 rounded-full border border-border bg-background px-5 py-3 text-sm" />
            <button type="button" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">{locale === "ar" ? "اشتراك" : "Subscribe"}</button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}

function title(a: BlogArticle, locale: "en" | "ar"): string {
  return a[locale]?.title ?? a.en?.title ?? a.ar?.title ?? a.slug;
}
function excerpt(a: BlogArticle, locale: "en" | "ar"): string {
  return a[locale]?.excerpt ?? a.en?.excerpt ?? a.ar?.excerpt ?? "";
}
function include(a: BlogArticle, q: string, locale: "en" | "ar"): boolean {
  if (!q) return true;
  const h = `${title(a, locale)} ${excerpt(a, locale)} ${a.category}`.toLowerCase();
  return h.includes(q.toLowerCase());
}
