import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { QueryClientProvider } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import { I18nProvider, useI18n, parseLocaleFromCookie } from "@/i18n/I18nProvider";
import { AuthProvider } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getQueryClient } from "@/lib/query-client";
import { ErrorState } from "@/components/site/ErrorState";
import { Toaster } from "@/components/ui/sonner";
import { dict } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/dictionary";

type RootLoaderData = { locale: Locale };

const detectLocale = createIsomorphicFn()
  .client((): Locale => {
    if (typeof document === "undefined") return "en";
    return parseLocaleFromCookie(document.cookie);
  })
  .server(async (): Promise<Locale> => {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest?.();
      const cookie = req?.headers.get("cookie");
      return parseLocaleFromCookie(cookie);
    } catch {
      return "en";
    }
  });

function NotFoundComponent() {
  return <ErrorState code="404" />;
}

function GlobalErrorComponent({ error }: { error: Error }) {
  if (typeof window !== "undefined") {
    console.error("[root error]", error);
  }
  return <ErrorState />;
}

export const Route = createRootRoute({
  beforeLoad: async (): Promise<RootLoaderData> => {
    const locale = (await detectLocale()) ?? "en";
    return { locale };
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  head: (ctx: any) => {
    const locale: Locale = (ctx?.context as RootLoaderData | undefined)?.locale ?? "en";
    const seo = dict[locale].seo;
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: seo.rootTitle },
      { name: "description", content: seo.rootDesc },
      { name: "author", content: "Thera" },
      { name: "theme-color", content: "#FFF6E9" },
      { property: "og:title", content: seo.rootOgTitle },
      { property: "og:description", content: seo.rootOgDesc },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.svg" },
      { property: "og:locale", content: locale === "ar" ? "ar_EG" : "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-image.svg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Zain:wght@400;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" },
      { rel: "alternate", hrefLang: "en", href: "https://www.wethera.site/" },
      { rel: "alternate", hrefLang: "ar", href: "https://www.wethera.site/" },
      { rel: "alternate", hrefLang: "x-default", href: "https://www.wethera.site/" },
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: GlobalErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const { locale } = Route.useRouteContext();
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function DemoBanner() {
  const { t } = useI18n();
  if (isFirebaseConfigured) return null;
  return (
    <div className="sticky top-0 z-50 border-b border-border/60 bg-lavender/70 px-4 py-2 text-center text-xs font-medium text-ink">
      {t.common.demoBanner}{" "}
      <a href="/README-FIREBASE.md" className="ms-1 underline">{t.common.seeDocs}</a>
    </div>
  );
}

function RootComponent() {
  const { locale } = Route.useRouteContext();
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <AuthProvider>
          <DemoBanner />
          <Toaster richColors position="top-center" />
          <Outlet />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
