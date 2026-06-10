import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Account — Thera" }] }),
  component: AuthLayout,
});

function AuthLayout() {
  const { t } = useI18n();
  const loc = useLocation();
  const tabs = [
    { to: "/auth/login", label: t.nav.login },
    { to: "/auth/signup", label: t.nav.signup },
  ];
  const isAuthRoot = loc.pathname === "/auth" || loc.pathname === "/auth/";
  return (
    <SiteShell>
      <section className="mx-auto max-w-md px-5 pb-24 pt-hero-under-site-header">
        <div className="mb-8 flex gap-2 rounded-full border border-border/70 bg-card p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold text-ink-muted transition-colors [&.active]:bg-ink [&.active]:text-cream"
              activeProps={{ className: "active" }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {isAuthRoot ? (
          <div className="rounded-3xl border border-border/70 bg-card p-6 text-center text-sm text-ink-muted">
            {t.auth.welcomeBack}
          </div>
        ) : (
          <Outlet />
        )}
      </section>
    </SiteShell>
  );
}
