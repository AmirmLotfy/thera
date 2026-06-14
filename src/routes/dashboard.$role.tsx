import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { RouteGuard } from "@/components/site/RouteGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import * as React from "react";

type Role = "adult" | "parent" | "teen" | "therapist" | "admin";

export const Route = createFileRoute("/dashboard/$role")({
  component: () => (
    <RouteGuard requireAuth>
      <DashboardRoleLayout />
    </RouteGuard>
  ),
});

function DashboardRoleLayout() {
  const { role } = Route.useParams() as { role: Role };
  const nav = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!["adult", "parent", "teen", "therapist", "admin"].includes(role)) {
      void nav({ to: "/dashboard/$role", params: { role: "adult" } });
    }
  }, [role, nav]);

  const path = location.pathname;
  const isTherapistPending = /\/dashboard\/[^/]+\/pending\/?$/.test(path);

  if (isTherapistPending) {
    return <Outlet />;
  }

  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
