import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

export const Route = createFileRoute("/blog")({
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

type Article = {
  id: string;
  slug: string;
  category: string;
  status: "draft" | "review" | "published";
  cover?: string;
  en?: { title: string; excerpt: string; body: string };
  ar?: { title: string; excerpt: string; body: string };
};

function useArticles() {
  return useQuery({
    queryKey: ["articles", "published"],
    queryFn: async (): Promise<Article[]> => {
      if (!isFirebaseConfigured || !db) return fallback();
      const q = query(collection(db, "articles"), where("status", "==", "published"), orderBy("updatedAt", "desc"), limit(60));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ ...(d.data() as Article), id: d.id }));
      return rows.length ? rows : fallback();
    },
  });
}

function BlogPage() {
  const { locale } = useI18n();
  const { data = [] } = useArticles();
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
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] md:text-7xl">{locale === "ar" ? "قراءات هادئة للأيام الصعبة." : "Soft reading for hard days."}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-muted">{locale === "ar" ? "مقالات ثنائية اللغة كتبها مختصون وأعادت تحريرها يدٌ دافئة." : "Bilingual articles written by clinicians and edited for warmth — never lectures."}</p>

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
            <div className={`aspect-[4/3] rounded-2xl ${pastel(0)}`}>
              {featured.cover ? <img src={featured.cover} alt="" className="h-full w-full rounded-2xl object-cover" /> : null}
            </div>
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
              <div className={`aspect-[4/3] rounded-2xl ${pastel(i + 1)}`}>
                {p.cover ? <img src={p.cover} alt="" className="h-full w-full rounded-2xl object-cover" /> : null}
              </div>
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
            <button className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">{locale === "ar" ? "اشتراك" : "Subscribe"}</button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}

function title(a: Article, locale: "en" | "ar"): string {
  return a[locale]?.title ?? a.en?.title ?? a.ar?.title ?? a.slug;
}
function excerpt(a: Article, locale: "en" | "ar"): string {
  return a[locale]?.excerpt ?? a.en?.excerpt ?? a.ar?.excerpt ?? "";
}
function include(a: Article, q: string, locale: "en" | "ar"): boolean {
  if (!q) return true;
  const h = `${title(a, locale)} ${excerpt(a, locale)} ${a.category}`.toLowerCase();
  return h.includes(q.toLowerCase());
}
function pastel(i: number): string {
  const set = ["bg-blush/60", "bg-lavender/60", "bg-mint/50", "bg-sky/50", "bg-cream"]; return set[i % set.length];
}

function fallback(): Article[] {
  return [
    { id: "f1", slug: "naming-what-you-feel", category: "awareness", status: "published", en: { title: "Naming what you feel: a 60-second practice", excerpt: "A tiny ritual to ground yourself when emotions get loud.", body: "" }, ar: { title: "تسمية ما تشعر به", excerpt: "طقس صغير يمنحك الأمان حين تصبح المشاعر صاخبة.", body: "" } },
    { id: "f2", slug: "box-breathing", category: "anxiety", status: "published", en: { title: "Box breathing for the school run", excerpt: "Four counts in, four out.", body: "" }, ar: { title: "تنفس الصندوق", excerpt: "أربع أنفاس داخلة، أربع خارجة.", body: "" } },
    { id: "f3", slug: "wind-down", category: "sleep", status: "published", en: { title: "Wind-down for screen-heavy days", excerpt: "Three small swaps to sleep better.", body: "" }, ar: { title: "هدوء ما قبل النوم", excerpt: "ثلاث عادات صغيرة لنوم أفضل.", body: "" } },
  ];
}
