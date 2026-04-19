import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured, storage } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { DEMO_THERAPISTS } from "@/lib/demo/therapists";
import type { TherapistInstapay } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import * as React from "react";
import { motion } from "framer-motion";
import { CreditCard, Banknote, ShieldCheck, Loader2, Check, Copy, ExternalLink } from "lucide-react";

type Method = "polar" | "instapay";

export const Route = createFileRoute("/checkout/$bookingId")({
  head: () => ({ meta: [{ title: "Checkout — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <CheckoutPage />
    </RouteGuard>
  ),
});

type BookingSummary = {
  therapistName: string;
  therapistTitle?: string;
  amount: number;
  currency: "EGP" | "USD" | "SAR" | "AED";
  slotLabel?: string;
  instapay?: TherapistInstapay;
};

function CheckoutPage() {
  const { t, locale } = useI18n();
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [method, setMethod] = React.useState<Method>("polar");
  const [summary, setSummary] = React.useState<BookingSummary | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isFirebaseConfigured || !db || !bookingId) {
        const therapistId = bookingId.startsWith("demo-") ? bookingId.split("-")[1] : null;
        const th = DEMO_THERAPISTS.find((x) => x.id === therapistId) ?? DEMO_THERAPISTS[0];
        setSummary({
          therapistName: th.displayName,
          therapistTitle: th.title,
          amount: th.pricePerSession,
          currency: th.currency,
          slotLabel: locale === "ar" ? "الموعد التالي المتاح" : "Next available slot",
          instapay: th.instapay,
        });
        return;
      }
      const snap = await getDoc(doc(db, "bookings", bookingId));
      if (!snap.exists()) return;
      const b = snap.data() as { therapistId: string; amount: number; currency: BookingSummary["currency"]; startsAt?: string };
      let therapistName = "Therapist";
      let therapistTitle: string | undefined;
      let instapay: TherapistInstapay | undefined;
      try {
        const ts = await getDoc(doc(db, "therapists", b.therapistId));
        if (ts.exists()) {
          const td = ts.data() as { displayName: string; title?: string; instapay?: TherapistInstapay };
          therapistName = td.displayName;
          therapistTitle = td.title;
          instapay = td.instapay;
        }
      } catch { /* ignore */ }
      if (cancelled) return;
      setSummary({
        therapistName,
        therapistTitle,
        amount: b.amount,
        currency: b.currency,
        slotLabel: b.startsAt ? new Date(b.startsAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }) : undefined,
        instapay,
      });
    }
    void load();
    return () => { cancelled = true; };
  }, [bookingId, locale]);

  async function payWithPolar() {
    setSubmitting(true);
    try {
      if (!isFirebaseConfigured || !user) {
        nav({ to: "/checkout/success", search: { bookingId } });
        return;
      }
      const idToken = await user.getIdToken();
      const res = await fetch("/api/polar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json() as { checkoutUrl: string; demo?: boolean };
      if (json.demo) nav({ to: "/checkout/success", search: { bookingId } });
      else window.location.href = json.checkoutUrl;
    } catch (err) {
      console.error("polar checkout", err);
      alert("Couldn't start checkout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-5 md:px-8">
        <div className="md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.booking.review}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{t.booking.pay}</h1>
          <p className="mt-2 text-ink-muted">{locale === "ar" ? "ادفع ببطاقتك أو بتحويل مباشر. نحتفظ بموعدك خلال إتمام العملية." : "Pay by card or direct transfer. Your slot stays reserved while you finish."}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MethodButton active={method === "polar"} onClick={() => setMethod("polar")} icon={<CreditCard className="h-4 w-4" />}>
              {locale === "ar" ? "بطاقة (Polar)" : "Card via Polar"}
            </MethodButton>
            <MethodButton active={method === "instapay"} onClick={() => setMethod("instapay")} icon={<Banknote className="h-4 w-4" />}>
              {locale === "ar" ? "تحويل InstaPay" : "InstaPay transfer"}
            </MethodButton>
          </div>

          <motion.div
            key={method}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft"
          >
            {method === "polar" ? (
              <PolarPanel submitting={submitting} onPay={payWithPolar} />
            ) : (
              <InstaPayPanel bookingId={bookingId} instapay={summary?.instapay} />
            )}
          </motion.div>

          <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4" /> {locale === "ar" ? "مشفر TLS · بيانات البطاقة لا تمر عبر خوادمنا" : "TLS-encrypted · card data never touches our servers"}
          </div>
        </div>

        <aside className="md:col-span-2">
          <div className="sticky top-20 rounded-3xl border border-border/70 bg-cream p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "ملخص الطلب" : "Order summary"}</p>
            <p className="mt-3 text-xs text-ink-muted">{t.booking.bookingRef}{bookingId.slice(0, 8)}</p>
            <div className="mt-4 space-y-3 text-sm">
              <Row label={locale === "ar" ? "المعالج" : "Therapist"} value={summary?.therapistName ?? "—"} />
              <Row label={locale === "ar" ? "الموعد" : "Session"} value={summary?.slotLabel ?? "—"} />
            </div>
            <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-sm">
              <Row label={locale === "ar" ? "المبلغ" : "Total"} value={summary ? new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: summary.currency }).format(summary.amount / 100) : "—"} bold />
            </div>
            <p className="mt-3 text-[11px] text-ink-muted">{locale === "ar" ? "إلغاء مجاني قبل 24 ساعة من الجلسة." : "Free cancellation up to 24h before your session."}</p>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}

function MethodButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${active ? "border-2 border-ink bg-ink/5" : "border border-border bg-card hover:border-ink/40"}`}
    >
      {icon} {children}
    </button>
  );
}

function PolarPanel({ submitting, onPay }: { submitting: boolean; onPay: () => void }) {
  const { locale } = useI18n();
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {locale === "ar" ? "سيتم تحويلك إلى صفحة دفع آمنة مدارة بواسطة Polar. تقبل Visa / Mastercard / Apple Pay." : "You'll be redirected to a secure Polar-hosted checkout. Visa / Mastercard / Apple Pay accepted."}
      </p>
      <button
        onClick={onPay}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-soft disabled:opacity-40"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {locale === "ar" ? "المتابعة للدفع" : "Continue to payment"}
      </button>
    </div>
  );
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 768px)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

function InstaPayPanel({ bookingId, instapay }: { bookingId: string; instapay?: TherapistInstapay }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [file, setFile] = React.useState<File | null>(null);
  const [reference, setReference] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [copiedHandle, setCopiedHandle] = React.useState(false);

  const payLink = instapay?.link ?? "";
  const handle = instapay?.handle ?? "";
  const recipientName = instapay?.recipientName ?? "";
  const hasLink = !!payLink;

  async function copyHandle() {
    try { await navigator.clipboard.writeText(handle); setCopiedHandle(true); setTimeout(() => setCopiedHandle(false), 1500); } catch { /* ignore */ }
  }

  async function submitProof() {
    if (!file || !user) {
      if (!user) alert(locale === "ar" ? "يرجى تسجيل الدخول أولاً." : "Please sign in first.");
      return;
    }
    setSubmitting(true);
    try {
      let fileUrl = "";
      if (isFirebaseConfigured && storage) {
        const storageRef = ref(storage, `payments/${user.uid}/${bookingId}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
      }
      const idToken = await user.getIdToken();
      const res = await fetch("/api/instapay/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId, fileUrl, reference }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDone(true);
    } catch (err) {
      console.error("instapay proof", err);
      alert(locale === "ar" ? "تعذّر رفع الإثبات. يرجى إعادة المحاولة." : "Could not submit proof. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3 rounded-2xl bg-mint/40 p-4 text-ink">
          <Check className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{locale === "ar" ? "تم إرسال الإثبات للمعالج" : "Screenshot sent to your therapist"}</p>
            <p className="text-xs text-ink-muted">{locale === "ar" ? "سيقوم معالجك بمراجعة اللقطة وتأكيد الاستلام. ستصلك إشعارًا فور التأكيد." : "Your therapist will review the screenshot and confirm receipt. You'll get a notification once confirmed."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="font-semibold">{locale === "ar" ? "حوّل باستخدام InstaPay" : "Send via InstaPay"}</p>
        <p className="mt-1 text-ink-muted">
          {isMobile
            ? (locale === "ar" ? "اضغط الزر أدناه لفتح تطبيق InstaPay مباشرة، ثم ارفع لقطة شاشة التحويل." : "Tap the button below to open InstaPay directly, then upload a screenshot of the transfer.")
            : (locale === "ar" ? "امسح الرمز بهاتفك لفتح InstaPay مباشرةً، أو استخدم الرابط." : "Scan the QR code with your phone to open InstaPay, or use the link.")}
        </p>
      </div>

      {hasLink ? (
        isMobile ? (
          /* Mobile: full-width deep link CTA */
          <a
            href={payLink}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky/80 px-5 py-4 text-base font-semibold text-ink shadow-soft hover:bg-sky active:scale-[0.98]"
          >
            <ExternalLink className="h-5 w-5" />
            {locale === "ar" ? "افتح InstaPay" : "Open InstaPay"}
          </a>
        ) : (
          /* Desktop: QR code */
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-sky/20 p-6">
            <QRCodeSVG
              value={payLink}
              size={200}
              level="H"
              className="rounded-xl"
            />
            <p className="text-xs text-ink-muted">{locale === "ar" ? "امسح بهاتفك لفتح InstaPay" : "Scan with your phone to open InstaPay"}</p>
            <a href={payLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold hover:bg-muted">
              <ExternalLink className="h-3 w-3" /> {locale === "ar" ? "فتح الرابط" : "Open link"}
            </a>
          </div>
        )
      ) : (
        <div className="rounded-2xl bg-muted/60 p-4 text-xs text-ink-muted">
          {locale === "ar" ? "لم يُضَف رابط InstaPay لهذا المعالج بعد. يرجى التواصل مع الدعم." : "This therapist hasn't added an InstaPay link yet. Please contact support."}
        </div>
      )}

      {(handle || recipientName) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {recipientName && (
            <div className="rounded-2xl bg-lavender/30 p-4">
              <p className="text-xs uppercase tracking-wider text-ink-muted">{locale === "ar" ? "المستلم" : "Recipient"}</p>
              <p className="mt-1 font-semibold">{recipientName}</p>
            </div>
          )}
          {handle && (
            <div className="rounded-2xl bg-blush/30 p-4">
              <p className="text-xs uppercase tracking-wider text-ink-muted">{locale === "ar" ? "المعرّف" : "Handle"}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono font-semibold">{handle}</span>
                <button onClick={copyHandle} className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs">
                  <Copy className="h-3 w-3" /> {copiedHandle ? (locale === "ar" ? "تم النسخ" : "Copied") : (locale === "ar" ? "نسخ" : "Copy")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-border p-4">
        <label className="text-xs font-medium uppercase tracking-wider text-ink-muted">{locale === "ar" ? "لقطة إثبات التحويل" : "Transfer screenshot"}</label>
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
        <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-ink-muted">{t.booking.bookingRef}</label>
        <input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder={locale === "ar" ? "مثال: IP-12345" : "e.g. IP-12345"} />
      </div>

      <button
        onClick={submitProof}
        disabled={!file || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-soft disabled:opacity-40"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {locale === "ar" ? "رفع الإثبات" : "Submit proof"}
      </button>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-display text-lg" : "text-ink-muted"}`}>
      <span>{label}</span><span className={bold ? "text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
