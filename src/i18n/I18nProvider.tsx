import * as React from "react";
import { dict, type Locale, type Dict, LOCALE_COOKIE, isLocale } from "./dictionary";

type Ctx = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dict;
  setLocale: (l: Locale) => void;
  toggle: () => void;
};

const I18nContext = React.createContext<Ctx | null>(null);

function getClientInitial(server: Locale | undefined): Locale {
  if (server && isLocale(server)) return server;
  if (typeof document !== "undefined") {
    const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
    if (m && isLocale(m[1])) return m[1];
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("ar")) return "ar";
  }
  return "en";
}

function writeCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(() => getClientInitial(initialLocale));

  React.useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale]);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    writeCookie(l);
    try { window.localStorage.setItem("thera.locale", l); } catch { /* ignore */ }
  }, []);

  const value = React.useMemo<Ctx>(() => ({
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    t: dict[locale] as Dict,
    setLocale,
    toggle: () => setLocale(locale === "ar" ? "en" : "ar"),
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Server-side: parse a Cookie header to extract the Thera locale, defaulting to en. */
export function parseLocaleFromCookie(cookieHeader: string | null | undefined): Locale {
  if (!cookieHeader) return "en";
  const m = cookieHeader.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  if (m && isLocale(m[1])) return m[1];
  return "en";
}
