"use client";

import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nProvider";
import { overflowNavItems, primaryNavItems } from "@/lib/dashboard/nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DashboardBottomNav() {
  const { effectiveRole, profile } = useAuth();
  const { locale, t } = useI18n();
  const location = useLocation();
  const role = (effectiveRole ?? profile?.role ?? "adult") as Role;
  const primary = primaryNavItems(role);
  const overflow = overflowNavItems(role);
  const [moreOpen, setMoreOpen] = React.useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-start gap-0 overflow-x-auto px-2 pt-1 scrollbar-none">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const label = locale === "ar" ? item.labelAr : item.labelEn;
            return (
              <Link
                key={item.id}
                to={item.to}
                className={`flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold sm:min-w-[4.5rem] sm:text-xs ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-ink" : "text-ink-muted"}`} />
                <span className="line-clamp-1 px-0.5 text-center">{label}</span>
              </Link>
            );
          })}
          {overflow.length > 0 ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-ink-muted sm:min-w-[4.5rem] sm:text-xs"
            >
              <Menu className="h-5 w-5" />
              <span className="line-clamp-1">{t.dash.moreNav}</span>
            </button>
          ) : null}
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="bottom-0 top-auto max-w-lg translate-y-0 rounded-t-3xl border-border sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>{t.dash.moreSheetTitle}</DialogTitle>
          </DialogHeader>
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto pb-4">
            {overflow.map((item) => {
              const Icon = item.icon;
              const label = locale === "ar" ? item.labelAr : item.labelEn;
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-ink-muted" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
