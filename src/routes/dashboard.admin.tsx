import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteGuard } from "@/components/site/RouteGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import * as React from "react";

export const Route = createFileRoute("/dashboard/admin")({
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <DashboardAdminLayout />
    </RouteGuard>
  ),
});

function DashboardAdminLayout() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
