import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { Lock, Eye, FileText, Server, UserCheck, Mail } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Thera" },
      { name: "description", content: "How Thera protects your conversations, bookings, and personal data." },
      { property: "og:title", content: "Privacy — Thera" },
      { property: "og:description", content: "Your story stays yours. Encrypted, role-scoped, never sold." },
    ],
  }),
  component: PrivacyPage,
});

const principleIcons = [Lock, UserCheck, Eye, Server, FileText, Mail] as const;

function PrivacyPage() {
  const { t, locale } = useI18n();
  const p = t.privacy;

  const principles = [
    { Icon: principleIcons[0], title: p.prin1t, body: p.prin1b },
    { Icon: principleIcons[1], title: p.prin2t, body: p.prin2b },
    { Icon: principleIcons[2], title: p.prin3t, body: p.prin3b },
    { Icon: principleIcons[3], title: p.prin4t, body: p.prin4b },
    { Icon: principleIcons[4], title: p.prin5t, body: p.prin5b },
    { Icon: principleIcons[5], title: p.prin6t, body: p.prin6b },
  ];

  const blocks = [
    { title: p.block1title, body: p.block1body },
    { title: p.block2title, body: p.block2body },
    { title: p.block3title, body: p.block3body },
    { title: p.block4title, body: p.block4body },
    { title: p.block5title, body: p.block5body },
  ];

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -left-20 -top-20 h-80 w-80 bg-aqua/50" />
        <div className="relative mx-auto max-w-4xl px-5 pb-12 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{p.kicker}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-7xl">{p.heroTitle}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-muted">{p.heroSub}</p>
        </div>
      </section>

      {locale === "ar" && (
        <div className="mx-auto max-w-5xl px-5 pb-4 md:px-8">
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 px-5 py-3 text-sm text-amber-900">
            <p className="font-semibold">{p.disclaimerAr}</p>
          </div>
        </div>
      )}

      <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-16 md:grid-cols-2 md:px-8">
        {principles.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-3xl border border-border/70 bg-card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender/60"><Icon className="h-5 w-5" /></span>
            <h3 className="mt-5 font-display text-xl">{title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl space-y-10 px-5 pb-24 md:px-8">
        {blocks.map((b) => (
          <Block key={b.title} title={b.title}>
            <p className="text-ink-muted">{b.body}</p>
          </Block>
        ))}
      </section>
    </SiteShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-7">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
