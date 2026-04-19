import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { SiteShell } from "@/components/site/SiteShell";
import { ArrowRight, Leaf, Heart, Users, Baby, Stethoscope, ShieldCheck, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thera — A safe space for mental wellness · ثيرا" },
      { name: "description", content: "Bilingual (EN/AR) mental wellness for adults, parents, teens and therapists." },
      { property: "og:title", content: "Thera — A safe space for mental wellness" },
      { property: "og:description", content: "Talk to an empathetic AI, find the right therapist, book in minutes. EN / العربية." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <TrustStrip />
      <ForWho />
      <AIPreview />
      <FaqTeaser />
      <FinalCta />
    </SiteShell>
  );
}

function Hero() {
  const { t, dir } = useI18n();
  return (
    <section className="relative overflow-hidden">
      {/* Organic blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob absolute -top-24 -left-24 h-[28rem] w-[28rem] bg-lavender/70" />
        <div className="blob absolute top-40 -right-32 h-[24rem] w-[24rem] bg-blush/70" />
        <div className="blob absolute bottom-0 left-1/3 h-[22rem] w-[22rem] bg-aqua/60" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-hero-under-site-header md:px-8 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-ink-muted backdrop-blur"
          >
            <Leaf className="h-3.5 w-3.5" /> {t.home.kicker}
          </motion.div>

          <h1 className="mt-6 text-balance font-display text-[3.25rem] leading-[0.95] tracking-tight md:text-[5.5rem]">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="block"
            >
              {t.home.titleA}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="block italic text-ink/80"
              style={{ fontStyle: dir === "rtl" ? "normal" : "italic" }}
            >
              {t.home.titleB}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="block"
            >
              {t.home.titleC}
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-muted"
          >
            {t.home.sub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-cream transition-transform hover:scale-[1.02]"
            >
              {t.home.ctaPrimary}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link
              to="/therapists"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream px-6 py-3.5 text-sm font-semibold text-ink hover:bg-card"
            >
              {t.home.ctaSecondary}
            </Link>
          </motion.div>
        </div>

        {/* Editorial card cluster */}
        <div className="relative lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto max-w-md"
          >
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-[0_30px_80px_-30px_rgba(31,27,46,0.25)]">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-lavender">
                  <MessageCircle className="h-4 w-4 text-ink" />
                </span>
                <span className="text-sm font-semibold">Thera AI</span>
                <span className="ms-auto text-[10px] font-medium uppercase tracking-wider text-ink-muted">Live</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm">
                  {t.home.heroChatAI1}
                </div>
                <div className="ms-auto max-w-[85%] rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-sm text-cream">
                  {t.home.heroChatUser1}
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm">
                  {t.home.heroChatAI2}
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 hidden rotate-[-4deg] rounded-2xl border border-border/70 bg-blush/80 p-4 shadow-lg sm:block rtl:-right-6 rtl:left-auto rtl:rotate-[4deg]">
              <p className="font-display text-sm font-semibold text-ink">{t.home.heroCard1Title}</p>
              <p className="text-xs text-ink-muted">{t.home.heroCard1Sub}</p>
            </div>
            <div className="absolute -right-4 -top-6 hidden rotate-[5deg] rounded-2xl border border-border/70 bg-aqua/70 p-4 shadow-lg sm:block rtl:-left-4 rtl:right-auto rtl:rotate-[-5deg]">
              <p className="font-display text-sm font-semibold text-ink">Bilingual</p>
              <p className="text-xs text-ink-muted">EN · العربية</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const { t } = useI18n();
  return (
    <section className="relative border-y border-border/60 bg-card/50">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-5 py-5 text-xs font-medium text-ink-muted md:px-8">
        <ShieldCheck className="h-4 w-4" />
        <span>{t.home.trust}</span>
      </div>
    </section>
  );
}

function ForWho() {
  const { t } = useI18n();
  const cards = [
    { Icon: Heart, title: t.home.adultsTitle, body: t.home.adultsBody, bg: "bg-lavender/40" },
    { Icon: Users, title: t.home.parentsTitle, body: t.home.parentsBody, bg: "bg-blush/50" },
    { Icon: Baby, title: t.home.teensTitle, body: t.home.teensBody, bg: "bg-aqua/50" },
    { Icon: Stethoscope, title: t.home.therapistsTitle, body: t.home.therapistsBody, bg: "bg-cream" },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">{t.home.sectionsKicker}</p>
          <h2 className="mt-3 max-w-2xl text-balance font-display text-4xl leading-tight md:text-6xl">
            {t.home.sectionsTitle}
          </h2>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ Icon, title, body, bg }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className={`group relative overflow-hidden rounded-3xl border border-border/70 ${bg} p-7`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-sm">
              <Icon className="h-5 w-5 text-ink" />
            </span>
            <h3 className="mt-6 font-display text-2xl">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function AIPreview() {
  const { t } = useI18n();
  return (
    <section className="relative bg-ink text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-2 md:px-8 md:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cream/60">{t.home.aiKicker}</p>
          <h2 className="mt-3 text-balance font-display text-4xl leading-tight md:text-6xl">
            {t.home.aiTitle}
          </h2>
          <p className="mt-5 max-w-lg text-cream/70">{t.home.aiBody}</p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3.5 text-sm font-semibold text-ink hover:scale-[1.02] transition-transform"
          >
            {t.home.aiCta} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
        <div className="relative">
          <div className="rounded-3xl border border-cream/15 bg-cream/[0.04] p-6 backdrop-blur">
            <div className="space-y-3">
              {[t.home.heroChatUser1, "Stuck how — emotionally, at work, in relationships?", "All of it, honestly.", "Let's start small. What was today like, in three words?"].map((line, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${i % 2 ? "ms-auto bg-lavender text-ink" : "bg-cream/10 text-cream"}`}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqTeaser() {
  const { t } = useI18n();
  const items = [
    { q: t.home.faq1q, a: t.home.faq1a },
    { q: t.home.faq2q, a: t.home.faq2a },
    { q: t.home.faq3q, a: t.home.faq3a },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">{t.home.faqKicker}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.q} className="rounded-3xl border border-border/70 bg-card p-6">
            <h4 className="font-display text-lg">{it.q}</h4>
            <p className="mt-2 text-sm text-ink-muted">{it.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border/70 bg-lavender/60 p-10 md:p-16">
        <div aria-hidden className="blob absolute -right-20 -top-20 h-72 w-72 bg-blush/80" />
        <div aria-hidden className="blob absolute -bottom-20 -left-10 h-72 w-72 bg-aqua/70" />
        <div className="relative">
          <h2 className="max-w-2xl text-balance font-display text-4xl leading-tight md:text-6xl">
            {t.home.ctaFinal}
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-cream">
              {t.nav.signup}
            </Link>
            <Link to="/therapists" className="inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3.5 text-sm font-semibold text-ink">
              {t.nav.therapists}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
