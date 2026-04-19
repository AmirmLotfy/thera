import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";

export const Route = createFileRoute("/500")({
  head: () => ({ meta: [{ title: "Error — Thera" }] }),
  component: ErrorPage,
});

function ErrorPage() {
  const { t } = useI18n();
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -left-20 top-10 h-80 w-80 bg-blush/60" />
        <div className="relative mx-auto max-w-md px-5 py-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blush/70"><AlertTriangle className="h-7 w-7" /></span>
          <h1 className="mt-6 font-display text-7xl">500</h1>
          <h2 className="mt-3 font-display text-2xl">{t.errors.crashTitle}</h2>
          <p className="mt-2 text-sm text-ink-muted">{t.errors.crashBody}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => location.reload()} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream">
              <RefreshCw className="h-4 w-4" /> {t.common.retry}
            </button>
            <Link to="/" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold">{t.errors.goHome}</Link>
          </div>

          <Link to="/contact" className="mt-8 inline-flex items-center gap-2 text-xs text-ink-muted underline">
            <Mail className="h-3 w-3" /> {t.errors.supportLink}
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
