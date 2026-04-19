import { Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { TheraMark } from "@/components/brand/TheraMark";
import { LifeBuoy } from "lucide-react";

export function ErrorState({
  code, title, body,
}: { code?: string; title?: string; body?: string }) {
  const { t } = useI18n();
  const c = code ?? "500";
  const heading = title ?? t.errors.defaultTitle;
  const desc = body ?? t.errors.defaultBody;

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-background px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob absolute -start-24 -top-24 h-[24rem] w-[24rem] bg-blush/60" />
        <div className="blob absolute -bottom-24 -end-24 h-[22rem] w-[22rem] bg-mint/60" />
      </div>
      <div className="relative z-10 max-w-lg text-center">
        <TheraMark size={56} className="mx-auto block" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">Thera</p>
        <h1 className="mt-3 font-display text-7xl">{c}</h1>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">{heading}</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">{desc}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">{t.errors.goHome}</Link>
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold">
            <LifeBuoy className="h-4 w-4" /> {t.errors.contactSupport}
          </Link>
        </div>
      </div>
    </div>
  );
}
