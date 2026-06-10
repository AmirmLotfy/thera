import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";

const KEY = "thera.cookie.consent";
type Consent = "granted" | "denied" | null;

export function CookieConsent() {
  const { locale } = useI18n();
  const [state, setState] = React.useState<Consent>(null);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem(KEY);
      setState(v === "granted" ? "granted" : v === "denied" ? "denied" : null);
    } catch { setState(null); }
  }, []);

  function decide(choice: Exclude<Consent, null>) {
    try { localStorage.setItem(KEY, choice); } catch { /* ignore */ }
    setState(choice);
    document.cookie = `thera_consent=${choice}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  const show = state === null;
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-3xl border border-border/70 bg-card/95 p-5 shadow-soft-lg backdrop-blur-xl md:bottom-6 md:p-6"
        >
          <div className="flex flex-col items-start gap-4 text-sm md:flex-row md:items-center md:justify-between">
            <p className="flex-1 text-ink-muted">
              {locale === "ar"
                ? "نستخدم ملفات تعريف ضرورية لتشغيل Thera. بموافقتك على التحليلات الاختيارية، ستساعدنا على تحسين التجربة. اطّلع على "
                : "We use essential cookies to run Thera. With your consent, optional analytics help us improve the experience. See our "}
              <Link to="/privacy" className="underline">{locale === "ar" ? "سياسة الخصوصية" : "privacy policy"}</Link>.
            </p>
            <div className="flex w-full gap-2 md:w-auto">
              <button onClick={() => decide("denied")} className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold md:flex-none">{locale === "ar" ? "الأساسية فقط" : "Essential only"}</button>
              <button onClick={() => decide("granted")} className="flex-1 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream md:flex-none">{locale === "ar" ? "قبول الكل" : "Accept all"}</button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
