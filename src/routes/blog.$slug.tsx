import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Thera Resources` }] }),
  component: ArticlePage,
});

type Article = {
  id: string; slug: string; category: string; status: "draft" | "review" | "published"; cover?: string;
  en?: { title: string; excerpt: string; body: string };
  ar?: { title: string; excerpt: string; body: string };
};

function useArticle(slug: string) {
  return useQuery({
    queryKey: ["articles", slug],
    queryFn: async (): Promise<Article | null> => {
      if (!isFirebaseConfigured || !db) {
        return demoBySlug(slug);
      }
      const q = query(collection(db, "articles"), where("slug", "==", slug), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0]; return { ...(d.data() as Article), id: d.id };
    },
  });
}

function ArticlePage() {
  const { slug } = Route.useParams();
  const { t, locale } = useI18n();
  const { data: a, isLoading } = useArticle(slug);

  if (isLoading) return <SiteShell><div className="mx-auto max-w-3xl px-5 py-16 md:px-8">{t.common.loading}</div></SiteShell>;
  if (!a) return (
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

  const content = a[locale] ?? a.en ?? a.ar ?? { title: a.slug, excerpt: "", body: "" };

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {locale === "ar" ? "المقالات" : "Back to resources"}
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-muted">{a.category}</p>
        <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">{content.title}</h1>
        {content.excerpt ? <p className="mt-5 text-xl text-ink-muted">{content.excerpt}</p> : null}

        {a.cover ? <img src={a.cover} alt="" className="mt-8 w-full rounded-3xl" /> : null}

        <div className="prose prose-lg mt-10 max-w-none" dir={locale === "ar" ? "rtl" : "ltr"}>
          {content.body.split(/\n\n+/).map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-foreground">{p}</p>
          ))}
        </div>

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

function demoBySlug(slug: string): Article | null {
  const demo: Record<string, Article> = {
    "naming-what-you-feel": {
      id: "f1", slug: "naming-what-you-feel", category: "awareness", status: "published",
      en: { title: "Naming what you feel", excerpt: "A 60-second grounding practice.", body: "Pause. Take a slow breath.\n\nName one emotion you notice — no judgement.\n\nWhere does it sit in your body? What texture? What colour?\n\nSpeak it out gently. 'I feel …'\n\nBreathe again. The feeling becomes smaller the moment it has a name." },
      ar: { title: "تسمية ما تشعر به", excerpt: "ممارسة قصيرة لمدة ٦٠ ثانية.", body: "خُذ نفسًا هادئًا.\n\nسمِّ شعورًا واحدًا تلاحظه بدون حكم.\n\nأين يستقر في جسدك؟ ما ملمسه؟ ما لونه؟\n\nقُلها بصوتٍ لطيف. \"أشعر بـ…\".\n\nتنفّس مرة أخرى. حين يجد الشعور اسمًا يصغر." },
    },
  };
  return demo[slug] ?? null;
}
