import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nProvider";
import type { Role } from "@/lib/auth";
import { getDashboardNavItems } from "@/lib/dashboard/nav";

export function DashboardSidebar() {
  const { effectiveRole, profile } = useAuth();
  const { locale } = useI18n();
  const location = useLocation();

  const role = (effectiveRole ?? profile?.role ?? "adult") as Role;
  const items = getDashboardNavItems(role);

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-[5.5rem] rounded-3xl border border-border/60 bg-card p-3 shadow-soft">
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isHome = item.to === `/dashboard/${role}` || item.to === "/dashboard/admin";
            const active = isHome
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const label = locale === "ar" ? item.labelAr : item.labelEn;
            return (
              <Link
                key={item.id}
                to={item.to}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink text-cream"
                    : "text-ink-muted hover:bg-muted/60 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
