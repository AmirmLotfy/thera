import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Languages, X, LogOut, LayoutDashboard, ArrowUpRight } from "lucide-react";
import { TheraMark } from "@/components/brand/TheraMark";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nProvider";
import { NotificationsBell } from "@/components/site/NotificationsBell";

/**
 * Thera 2026 header.
 *
 * At rest (top of page) the header is completely transparent and lives
 * *inside* the hero — same background, no border, no pill. Once the user
 * scrolls past the hero threshold, it fades to a subtle solid bar that
 * matches the page background so it reads as one continuous surface
 * rather than a floating capsule.
 *
 * No entry / load animation — the header renders in its resting state on
 * first paint and only reacts to scroll.
 */

const SCROLL_THRESHOLD = 48;

export function SiteHeader() {
  const { t, toggle, locale } = useI18n();
  const { user, effectiveRole, logout, configured } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > SCROLL_THRESHOLD);
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const dashHref = `/dashboard/${effectiveRole ?? "adult"}`;
  const showAuthed = configured && !!user;

  const patientNavRole =
    showAuthed && effectiveRole && ["adult", "parent", "teen"].includes(effectiveRole)
      ? (effectiveRole as "adult" | "parent" | "teen")
      : null;
  const therapistsNavTo = patientNavRole ? `/dashboard/${patientNavRole}/find` : "/therapists";

  // Trimmed nav: four essentials. Home is the logo. Secondary pages
  // (blog, FAQ) live in the footer where they won't crowd the header.
  const links = [
    { to: therapistsNavTo, label: t.nav.therapists },
    { to: "/how-it-works", label: t.nav.how },
    { to: "/about", label: t.nav.about },
    { to: "/contact", label: t.nav.contact },
  ] as const;

  // Shared scroll-state classes. No framer layout animation — pure CSS
  // transitions on background/border/shadow so the bar never "loads in".
  const barStateClasses = scrolled
    ? "bg-background/90 border-b border-border/60 shadow-[0_10px_30px_-20px_rgba(31,27,46,0.25)] backdrop-blur-xl"
    : "bg-transparent border-b border-transparent";

  return (
    <>
      {/* ── Desktop header ─────────────────────────────────────────────── */}
      <header
        className={[
          "fixed inset-x-0 top-0 z-40 hidden lg:block",
          "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out",
          barStateClasses,
        ].join(" ")}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Thera">
            <TheraMark size={30} />
            <span className="font-display text-xl font-bold tracking-tight">Thera</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {links.map((l) => {
              const isActive = l.to.startsWith("/dashboard/")
                ? location.pathname === l.to
                : location.pathname === l.to || location.pathname.startsWith(`${l.to}/`);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={[
                    "relative rounded-full px-3.5 py-1.5 font-medium transition-colors",
                    isActive ? "text-foreground" : "text-ink-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-lavender/55"
                      aria-hidden
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label={locale === "en" ? "Switch to Arabic" : "التبديل للإنجليزية"}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-lavender/40"
            >
              <Languages className="h-3.5 w-3.5" />
              <span>{locale === "en" ? "العربية" : "English"}</span>
            </button>

            {showAuthed ? (
              <>
                <NotificationsBell />
                <Link
                  to={dashHref}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-3.5 py-1.5 text-xs font-medium hover:bg-lavender/40"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> {t.nav.dashboard}
                </Link>
                <button
                  onClick={() => void logout()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-cream transition-transform hover:scale-[1.03]"
                >
                  <LogOut className="h-3.5 w-3.5 rtl:rotate-180" /> {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="inline-flex rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-lavender/40"
                >
                  {t.nav.login}
                </Link>
                <Link
                  to="/auth/signup"
                  className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-cream transition-transform hover:scale-[1.03]"
                >
                  {t.nav.signup}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:rotate-180" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile header ─────────────────────────────────────────────── */}
      <MobileHeader
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        scrolled={scrolled}
        showAuthed={showAuthed}
      />

      {/* ── Mobile fullscreen menu (clip-path reveal) ─────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            onClose={() => setMenuOpen(false)}
            onToggleLang={() => {
              toggle();
              setMenuOpen(false);
            }}
            locale={locale}
            links={[...links]}
            showAuthed={showAuthed}
            dashHref={dashHref}
            onLogout={() => {
              setMenuOpen(false);
              void logout();
            }}
            t={t}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Mobile header — fixed (survives overflow-x-hidden ancestors, unlike sticky) */
/* ────────────────────────────────────────────────────────────────────────── */

function MobileHeader({
  menuOpen,
  setMenuOpen,
  scrolled,
  showAuthed,
}: {
  menuOpen: boolean;
  setMenuOpen: (b: boolean) => void;
  scrolled: boolean;
  showAuthed: boolean;
}) {
  const { t } = useI18n();

  const barStateClasses = scrolled
    ? "bg-background/92 border-b border-border/60 shadow-[0_8px_24px_-20px_rgba(31,27,46,0.3)] backdrop-blur-xl"
    : "bg-transparent border-b border-transparent";

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 lg:hidden",
        "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out",
        barStateClasses,
      ].join(" ")}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Thera">
          <TheraMark size={28} />
          <span className="font-display text-lg font-bold tracking-tight">Thera</span>
        </Link>

        <div className="flex items-center gap-2">
          {showAuthed && <NotificationsBell />}
          <BurgerButton
            open={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            labelOpen={t.common.menu}
            labelClose={t.common.close}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * Distinctive 2026 burger: three lines → morphs into an X via spring.
 */
function BurgerButton({
  open,
  onClick,
  labelOpen,
  labelClose,
}: {
  open: boolean;
  onClick: () => void;
  labelOpen: string;
  labelClose: string;
}) {
  const variants = {
    closedTop: { rotate: 0, y: -7 },
    openTop: { rotate: 45, y: 0 },
    closedMid: { opacity: 1, scale: 1 },
    openMid: { opacity: 0, scale: 0.6 },
    closedBot: { rotate: 0, y: 7 },
    openBot: { rotate: -45, y: 0 },
  };
  return (
    <button
      onClick={onClick}
      aria-label={open ? labelClose : labelOpen}
      aria-expanded={open}
      className={[
        "relative grid h-10 w-10 place-items-center rounded-full border transition-colors",
        open ? "border-ink bg-ink text-cream" : "border-border bg-card/70 text-foreground backdrop-blur",
      ].join(" ")}
    >
      <svg width="18" height="18" viewBox="-12 -12 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <motion.line x1="-7" x2="7" y1="0" y2="0" initial={false} animate={open ? variants.openTop : variants.closedTop} transition={{ type: "spring", stiffness: 380, damping: 28 }} />
        <motion.line x1="-7" x2="7" y1="0" y2="0" initial={false} animate={open ? variants.openMid : variants.closedMid} transition={{ duration: 0.15 }} />
        <motion.line x1="-7" x2="7" y1="0" y2="0" initial={false} animate={open ? variants.openBot : variants.closedBot} transition={{ type: "spring", stiffness: 380, damping: 28 }} />
      </svg>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Mobile menu — fullscreen clip-path reveal                                  */
/* ────────────────────────────────────────────────────────────────────────── */

type MobileMenuProps = {
  onClose: () => void;
  onToggleLang: () => void;
  onLogout: () => void;
  locale: "en" | "ar";
  links: { to: string; label: string }[];
  showAuthed: boolean;
  dashHref: string;
  t: ReturnType<typeof useI18n>["t"];
};

function MobileMenu({
  onClose,
  onToggleLang,
  onLogout,
  locale,
  links,
  showAuthed,
  dashHref,
  t,
}: MobileMenuProps) {
  return (
    <motion.div
      aria-modal
      role="dialog"
      className="fixed inset-0 z-50 lg:hidden"
      initial={{ clipPath: "circle(0% at calc(100% - 36px) 36px)" }}
      animate={{ clipPath: "circle(140% at calc(100% - 36px) 36px)" }}
      exit={{ clipPath: "circle(0% at calc(100% - 36px) 36px)" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 overflow-hidden bg-cream">
        <div aria-hidden className="blob absolute -left-24 -top-24 h-[28rem] w-[28rem] bg-lavender/70" />
        <div aria-hidden className="blob absolute bottom-10 right-0 h-[22rem] w-[22rem] bg-blush/70" />
        <div aria-hidden className="blob absolute bottom-[-4rem] left-1/4 h-[22rem] w-[22rem] bg-sky/60" />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        exit="hidden"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.045, delayChildren: 0.18 } },
        }}
        className="relative mx-auto flex h-full max-w-md flex-col px-6 pt-20 pb-8"
      >
        <motion.div
          variants={itemVariants}
          className="absolute inset-x-6 top-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <TheraMark size={28} />
            <span className="font-display text-lg font-bold tracking-tight">Thera</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="grid h-10 w-10 place-items-center rounded-full bg-ink text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-muted"
        >
          {t.nav.home} · {locale === "en" ? "EN" : "AR"}
        </motion.p>

        <motion.nav variants={itemVariants} className="mt-3 flex flex-col">
          {links.map((l) => (
            <motion.div key={l.to} variants={itemVariants}>
              <Link
                to={l.to}
                onClick={onClose}
                className="group block border-b border-ink/10 py-4 font-display text-3xl tracking-tight text-ink transition-colors hover:text-ink/70"
              >
                <span className="inline-flex items-center gap-3">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink/30 transition-all group-hover:w-6 group-hover:bg-ink" />
                  {l.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.nav>

        <motion.div variants={itemVariants} className="mt-6 flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleLang}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card px-4 py-2 text-sm font-medium"
          >
            <Languages className="h-4 w-4" />
            {locale === "en" ? "العربية" : "English"}
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-auto grid grid-cols-2 gap-2 pt-8">
          {showAuthed ? (
            <>
              <Link
                to={dashHref}
                onClick={onClose}
                className="rounded-full border border-ink/15 bg-card px-4 py-3 text-center text-sm font-medium"
              >
                {t.nav.dashboard}
              </Link>
              <button
                onClick={onLogout}
                className="rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-cream"
              >
                {t.nav.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                onClick={onClose}
                className="rounded-full border border-ink/15 bg-card px-4 py-3 text-center text-sm font-medium"
              >
                {t.nav.login}
              </Link>
              <Link
                to="/auth/signup"
                onClick={onClose}
                className="rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-cream"
              >
                {t.nav.signup}
              </Link>
            </>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 420, damping: 34 },
  },
};
