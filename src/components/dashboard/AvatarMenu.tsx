"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Languages, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AvatarMenu() {
  const { user, effectiveRole, logout } = useAuth();
  const { locale, toggle } = useI18n();
  const role = effectiveRole ?? "adult";
  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/80 bg-muted text-sm font-semibold text-ink shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initial
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuItem asChild>
          <Link to="/dashboard/$role/profile" params={{ role }} className="flex cursor-pointer items-center gap-2">
            <User className="h-4 w-4" />
            {locale === "ar" ? "الملف الشخصي" : "Profile"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggle()} className="flex cursor-pointer items-center gap-2">
          <Languages className="h-4 w-4" />
          {locale === "ar" ? "English" : "العربية"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void logout()}
          className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {locale === "ar" ? "تسجيل الخروج" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
