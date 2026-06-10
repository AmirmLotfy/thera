import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";

/** Placeholder for future 2FA / security settings. */
export const Route = createFileRoute("/settings/security")({
  head: () => ({ meta: [{ title: "Security — Thera" }] }),
  component: SecurityPlaceholder,
});

function SecurityPlaceholder() {
  const { locale } = useI18n();
  return (
    <SiteShell>
      <section className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display text-3xl">{locale === "ar" ? "إعدادات الأمان" : "Security settings"}</h1>
        <p className="mt-3 text-sm text-ink-muted">
          {locale === "ar" ? "المصادقة الثنائية والمزيد — قريبًا." : "Two-factor authentication and more — coming soon."}
        </p>
        <Link to="/auth/login" className="mt-6 inline-block text-sm font-semibold underline">
          {locale === "ar" ? "العودة" : "Back"}
        </Link>
      </section>
    </SiteShell>
  );
}
