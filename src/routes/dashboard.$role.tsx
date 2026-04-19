import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { RouteGuard } from "@/components/site/RouteGuard";
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
  React.useEffect(() => {
    if (!["adult", "parent", "teen", "therapist", "admin"].includes(role)) {
      void nav({ to: "/dashboard/$role", params: { role: "adult" } });
    }
  }, [role, nav]);

  return <Outlet />;
}
