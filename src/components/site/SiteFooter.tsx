import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { TheraMark } from "@/components/brand/TheraMark";
import { useAuth } from "@/lib/auth";

export function SiteFooter() {
  const { t, locale } = useI18n();
  const { user, effectiveRole, configured } = useAuth();
  const patientNavRole =
    configured && user && effectiveRole && ["adult", "parent", "teen"].includes(effectiveRole)
      ? (effectiveRole as "adult" | "parent" | "teen")
      : null;
  const therapistsNavTo = patientNavRole ? `/dashboard/${patientNavRole}/find` : "/therapists";
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <TheraMark size={34} className="text-ink" />
            <span className="font-display text-xl font-bold">Thera</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
            {t.home.footerNote}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <a
              href="https://instagram.com/wethera.site"
              target="_blank"
              rel="noreferrer noopener"
              aria-label={locale === "ar" ? "إنستغرام" : "Instagram"}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-lavender/40"
            >
              <Instagram className="h-3.5 w-3.5" />
              <span>@wethera.site</span>
            </a>
            <a
              href="mailto:hello@wethera.site"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-lavender/40"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>hello@wethera.site</span>
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.footer.product}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to={therapistsNavTo} className="hover:underline">{t.nav.therapists}</Link></li>
            <li><Link to="/how-it-works" className="hover:underline">{t.nav.how}</Link></li>
            <li><Link to="/blog" className="hover:underline">{t.nav.blog}</Link></li>
            <li><Link to="/faq" className="hover:underline">{t.nav.faq}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.footer.company}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/about" className="hover:underline">{t.nav.about}</Link></li>
            <li><Link to="/contact" className="hover:underline">{t.nav.contact}</Link></li>
            <li><Link to="/privacy" className="hover:underline">{t.footer.privacy}</Link></li>
            <li><Link to="/terms" className="hover:underline">{t.footer.terms}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 bg-blush/20">
        <div className="mx-auto max-w-7xl px-5 py-5 text-xs text-ink-muted md:px-8">
          <p>{t.common.crisisDisclaimer}</p>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 text-xs text-ink-muted md:px-8">
          <span>© {new Date().getFullYear()} Thera · wethera.site</span>
          <span>EN · العربية</span>
        </div>
      </div>
    </footer>
  );
}
