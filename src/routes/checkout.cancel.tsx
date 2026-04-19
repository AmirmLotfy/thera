import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/cancel")({
  head: () => ({ meta: [{ title: "Checkout cancelled — Thera" }] }),
  component: CancelPage,
});

function CancelPage() {
  const { t } = useI18n();
  const cc = t.checkoutCancel;

  return (
    <SiteShell>
      <section className="mx-auto max-w-xl px-5 py-20 text-center">
        <XCircle className="mx-auto h-20 w-20 text-blush-foreground" />
        <h1 className="mt-5 font-display text-5xl">{cc.title}</h1>
        <p className="mt-3 text-ink-muted">{cc.sub}</p>

        <div className="mt-10 rounded-3xl border border-border/70 bg-cream p-6 text-start">
          <h3 className="font-display text-xl">{cc.reasonsTitle}</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li>· {cc.r1}</li>
            <li>· {cc.r2}</li>
            <li>· {cc.r3}</li>
            <li>· {cc.r4}</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/therapists" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">{cc.ctaBack}</Link>
          <Link to="/dashboard/$role/chat" params={{ role: "adult" }} className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold">{cc.ctaAi}</Link>
        </div>
      </section>
    </SiteShell>
  );
}
