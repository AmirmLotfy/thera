"use client";

import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { TheraMark } from "@/components/brand/TheraMark";
import { NotificationsBell } from "@/components/site/NotificationsBell";
import { AvatarMenu } from "@/components/dashboard/AvatarMenu";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nProvider";
import { getDashboardNavItems } from "@/lib/dashboard/nav";
import type { Role } from "@/lib/auth";

function titleForPath(role: Role, pathname: string, locale: "en" | "ar"): string {
  const items = getDashboardNavItems(role);
  let bestLen = -1;
  let label = locale === "ar" ? "لوحة التحكم" : "Dashboard";
  for (const i of items) {
    const hit = pathname === i.to || pathname.startsWith(`${i.to}/`);
    if (!hit) continue;
    if (i.to.length > bestLen) {
      bestLen = i.to.length;
      label = locale === "ar" ? i.labelAr : i.labelEn;
    }
  }
  return label;
}

export function DashboardHeader() {
  const { effectiveRole, profile } = useAuth();
  const { locale, toggle } = useI18n();
  const location = useLocation();
  const role = (effectiveRole ?? profile?.role ?? "adult") as Role;
  const homeHref = role === "admin" ? "/dashboard/admin" : `/dashboard/${role}`;
  const title = titleForPath(role, location.pathname, locale);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={homeHref} className="flex shrink-0 items-center gap-2" aria-label="Thera">
            <TheraMark size={28} />
          </Link>
          <h1 className="truncate font-display text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => toggle()}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-ink-muted transition-colors hover:bg-muted"
            aria-label={locale === "ar" ? "Switch language" : "تغيير اللغة"}
          >
            <span className="text-xs font-bold">{locale === "ar" ? "EN" : "ع"}</span>
          </button>
          <NotificationsBell />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}
