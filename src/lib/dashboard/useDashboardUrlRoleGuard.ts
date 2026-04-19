import * as React from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth, type Role } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

const VALID_ROLES: Role[] = ["adult", "parent", "teen", "therapist", "admin"];

/**
 * Ensures `/dashboard/:urlRole/...` matches the signed-in user's `effectiveRole`.
 * Skips pending-approval routes and demo mode. Redirects unauthenticated users
 * are handled by RouteGuard; users with no role go to `/auth/role`.
 */
export function useDashboardUrlRoleGuard() {
  const location = useLocation();
  const nav = useNavigate();
  const { effectiveRole, loading } = useAuth();

  React.useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (loading) return;
    const path = location.pathname;
    if (!path.startsWith("/dashboard")) return;
    if (path.includes("/pending")) return;

    const m = path.match(/^\/dashboard\/([^/]+)/);
    if (!m) return;
    const urlRole = m[1] as Role;
    if (!VALID_ROLES.includes(urlRole)) return;

    if (!effectiveRole) {
      void nav({ to: "/auth/role" });
      return;
    }
    if (urlRole !== effectiveRole) {
      void nav({ to: "/dashboard/$role", params: { role: effectiveRole } });
    }
  }, [location.pathname, effectiveRole, loading, nav]);
}
