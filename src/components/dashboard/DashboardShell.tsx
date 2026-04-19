import type { ReactNode } from "react";
import { CookieConsent } from "@/components/site/CookieConsent";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardBottomNav } from "@/components/dashboard/DashboardBottomNav";
import { DashboardSidebar } from "@/components/site/DashboardSidebar";
import { useDashboardUrlRoleGuard } from "@/lib/dashboard/useDashboardUrlRoleGuard";

export function DashboardShell({ children }: { children: ReactNode }) {
  useDashboardUrlRoleGuard();
  return (
    <div className="relative min-h-screen bg-background">
      <DashboardHeader />
      <div className="mx-auto flex max-w-[90rem] gap-6 px-4 py-4 md:px-6">
        <DashboardSidebar />
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>
      </div>
      <DashboardBottomNav />
      <CookieConsent />
    </div>
  );
}
