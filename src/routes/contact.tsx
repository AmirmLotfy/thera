import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { Mail, MessageCircle, Building2, Phone, MapPin, Instagram } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Thera" },
      { name: "description", content: "Get in touch with the Thera team — partnerships, press, support, or just a hello." },
      { property: "og:title", content: "Contact — Thera" },
      { property: "og:description", content: "We're here to listen — reach out any time." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();
  const c = t.contact;
  const [sent, setSent] = React.useState(false);

  const channels = [
    { Icon: Mail, label: c.channelGeneralLabel, v: "hello@wethera.site", href: "mailto:hello@wethera.site" },
    { Icon: MessageCircle, label: c.channelSupportLabel, v: "support@wethera.site", href: "mailto:support@wethera.site" },
    { Icon: Building2, label: c.channelPartnersLabel, v: "partners@wethera.site", href: "mailto:partners@wethera.site" },
    { Icon: Instagram, label: c.channelSocialLabel, v: "@wethera.site", href: "https://instagram.com/wethera.site" },
    { Icon: Phone, label: c.channelCrisisLabel, v: "Samaritans · 116 123", href: "tel:116123" },
  ];

  const topics = [c.topic1, c.topic2, c.topic3, c.topic4, c.topic5];

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -right-20 -top-10 h-80 w-80 bg-blush/60" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{c.kicker}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-7xl">{c.heroTitle}</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-muted">{c.heroSub}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-12 px-5 pb-12 md:grid-cols-2 md:px-8">
        <div className="space-y-4">
          {channels.map(({ Icon, label, v, href }) => (
            <a key={label} href={href} className="flex items-start gap-4 rounded-3xl border border-border/70 bg-card p-5 transition-colors hover:bg-muted">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender/60"><Icon className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
                <p className="mt-1 font-display text-lg">{v}</p>
              </div>
            </a>
          ))}
          <div className="flex items-start gap-4 rounded-3xl border border-border/70 bg-card p-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-aqua/50"><MapPin className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{c.studioLabel}</p>
              <p className="mt-1 text-sm">Thera Wellness Ltd · 12 Hoxton Square · London N1 6NT · UK</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="space-y-4 rounded-3xl border border-border/70 bg-card p-6"
        >
          <h2 className="font-display text-2xl">{c.formTitle}</h2>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-ink-muted">{c.nameLbl}</label>
            <input required className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder={c.namePh} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-ink-muted">{c.emailLbl}</label>
            <input required type="email" className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder={c.emailPh} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-ink-muted">{c.topicLbl}</label>
            <select className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">
              {topics.map((topic) => <option key={topic}>{topic}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-ink-muted">{c.messageLbl}</label>
            <textarea required rows={5} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder={c.messagePh} />
          </div>
          {sent && <p className="rounded-xl bg-aqua/40 px-3 py-2 text-xs">{c.sent}</p>}
          <button type="submit" className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">{c.submitBtn}</button>
        </form>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24 md:px-8">
        <div className="rounded-3xl border border-blush/70 bg-blush/30 p-8 text-center">
          <h3 className="font-display text-2xl">{c.crisisTitle}</h3>
          <p className="mt-2 text-sm text-ink-muted">{c.crisisSub}</p>
        </div>
      </section>
    </SiteShell>
  );
}
