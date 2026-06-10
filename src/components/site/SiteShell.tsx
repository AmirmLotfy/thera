import { useLocation } from "@tanstack/react-router";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { CookieConsent } from "./CookieConsent";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname;
  const isTherapistPending = /\/dashboard\/[^/]+\/pending\/?$/.test(path);
  const useDashboardShell = path.startsWith("/dashboard") && !isTherapistPending;

  if (useDashboardShell) {
    return <DashboardShell>{children}</DashboardShell>;
  }

  return (
    <div className="relative min-h-screen">
      <SiteHeader />
      <main className="relative">{children}</main>
      <SiteFooter />
      <CookieConsent />
    </div>
  );
}
