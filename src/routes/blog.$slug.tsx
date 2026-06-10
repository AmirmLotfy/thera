import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { articleBySlug } from "@/lib/blog/articles";
import { BlogCardCover } from "@/lib/blog/covers";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const a = articleBySlug(params.slug);
    const title = a?.en?.title ?? params.slug;
    const description = a?.en?.excerpt?.slice(0, 160) ?? "";
    return {
      meta: [
        { title: `${title} — Thera Resources` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: "/og-image.svg" },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { locale, dir } = useI18n();
  const a = articleBySlug(slug);

  if (!a) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-5 py-24 md:px-8 text-center">
          <h1 className="font-display text-4xl">{locale === "ar" ? "المقال غير متاح" : "Article not found"}</h1>
          <p className="mt-3 text-ink-muted">{locale === "ar" ? "ربما تم أرشفته. جرّب استكشاف الموارد الأخرى." : "It may have been archived. Try another resource."}</p>
          <Link to="/blog" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {locale === "ar" ? "كل المقالات" : "All articles"}
          </Link>
        </section>
      </SiteShell>
    );
  }

  const content = a[locale] ?? a.en ?? a.ar ?? { title: a.slug, excerpt: "", body: "" };

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 pb-12 pt-hero-under-site-header md:px-8">
        <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {locale === "ar" ? "المقالات" : "Back to resources"}
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-muted">{a.category}</p>
        <h1 className="hero-title mt-3 font-display text-5xl leading-tight tracking-tight md:text-6xl">
          {content.title}
        </h1>
        {content.excerpt ? (
          <p className={`mt-5 text-ink-muted ${dir === "rtl" ? "text-xl leading-8" : "text-xl"}`}>{content.excerpt}</p>
        ) : null}

        <BlogCardCover
          slug={a.slug}
          category={a.category}
          aspect="16/9"
          className="mt-8 rounded-3xl"
        />

        <div className="prose prose-lg mt-10 max-w-none" dir={locale === "ar" ? "rtl" : "ltr"}>
          {content.body.split(/\n\n+/).map((p, i) => (
            <p
              key={i}
              className={`text-lg text-foreground ${dir === "rtl" ? "leading-8" : "leading-relaxed"}`}
            >
              {p}
            </p>
          ))}
        </div>

        <Link
          to="/blog"
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {locale === "ar" ? "العودة إلى الموارد" : "Back to resources"}
        </Link>

        <div className="mt-16 rounded-3xl bg-cream p-8 text-center">
          <p className="font-display text-2xl">{locale === "ar" ? "محتاج مساندة الآن؟" : "Need support now?"}</p>
          <p className="mt-2 text-sm text-ink-muted">{locale === "ar" ? "يمكنك التحدث مع ذكاء Thera أو حجز جلسة." : "Talk to the Thera AI companion or book a session."}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/therapists" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream">{locale === "ar" ? "ابحث عن معالج" : "Find a therapist"}</Link>
            <Link to="/how-it-works" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">{locale === "ar" ? "كيف تعمل Thera" : "How Thera works"}</Link>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}
