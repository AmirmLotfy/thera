import { Navigate } from "@tanstack/react-router";
import { useRouteGate } from "@/lib/auth";
import type { Role } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nProvider";
import { isFirebaseConfigured } from "@/lib/firebase";

type Props = {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerified?: boolean;
  requireRole?: Role | Role[];
};

export function RouteGuard({
  children,
  requireAuth = true,
  requireVerified = false,
  requireRole,
}: Props) {
  const { t } = useI18n();
  const { ready, redirectTo } = useRouteGate({
    requireAuth,
    requireVerified,
    requireRole,
  });

  // In demo (not configured) we simulate a logged-in user so designers can
  // click through every route without hitting redirects.
  if (!isFirebaseConfigured) return <>{children}</>;

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-ink-muted">
        {t.common.loading}
      </div>
    );
  }
  if (redirectTo) return <Navigate to={redirectTo} />;
  return <>{children}</>;
}
