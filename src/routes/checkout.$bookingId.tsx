import { createFileRoute } from "@tanstack/react-router";
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
import { Banknote, ShieldCheck, Loader2, Check, Copy, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/money";

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
  childName?: string | null;
  instapay?: TherapistInstapay;
  lockExpiresAt?: string | null;
  slotId?: string | null;
};

function CheckoutPage() {
  const { t, locale } = useI18n();
  const { bookingId } = Route.useParams();
  const [summary, setSummary] = React.useState<BookingSummary | null>(null);
  const [lockRemainingSec, setLockRemainingSec] = React.useState<number | null>(null);

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
      const b = snap.data() as {
        therapistId: string;
        amount: number;
        currency: BookingSummary["currency"];
        startsAt?: string;
        childName?: string | null;
        slotId?: string | null;
      };
      let lockExpiresAt: string | null = null;
      if (b.slotId) {
        try {
          const slotSnap = await getDoc(doc(db, "availabilitySlots", b.slotId));
          const lockedAt = slotSnap.data()?.lockedAt;
          const lockedMs = lockedAt?.toDate?.()?.getTime?.() ?? (typeof lockedAt === "string" ? new Date(lockedAt).getTime() : null);
          if (lockedMs) lockExpiresAt = new Date(lockedMs + 15 * 60 * 1000).toISOString();
        } catch { /* ignore */ }
      }
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
        childName: b.childName ?? null,
        instapay,
        lockExpiresAt,
        slotId: b.slotId ?? null,
      });
    }
    void load();
    return () => { cancelled = true; };
  }, [bookingId, locale]);

  React.useEffect(() => {
    if (!summary?.lockExpiresAt) {
      setLockRemainingSec(null);
      return;
    }
    const tick = () => {
      const sec = Math.max(0, Math.floor((new Date(summary.lockExpiresAt!).getTime() - Date.now()) / 1000));
      setLockRemainingSec(sec);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [summary?.lockExpiresAt]);

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-hero-under-site-header md:grid-cols-5 md:px-8">
        <div className="md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.booking.review}</p>
          <h1 className="hero-title mt-2 font-display text-4xl md:text-5xl">{t.booking.pay}</h1>
          {lockRemainingSec != null && (
            <p className={`mt-2 text-sm ${lockRemainingSec <= 120 ? "font-semibold text-destructive" : "text-ink-muted"}`}>
              {locale === "ar"
                ? `الموعد محجوز لك لمدة ${Math.floor(lockRemainingSec / 60)}:${String(lockRemainingSec % 60).padStart(2, "0")}`
                : `Slot held for ${Math.floor(lockRemainingSec / 60)}:${String(lockRemainingSec % 60).padStart(2, "0")}`}
            </p>
          )}
          <p className="mt-2 text-ink-muted">
            {locale === "ar"
              ? "حوّل عبر InstaPay ثم ارفع لقطة الإيصال. سيراجع معالجك الدفع ويؤكد الحجز."
              : "Pay via InstaPay, then upload your transfer screenshot. Your therapist will verify and confirm your booking."}
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold">
            <Banknote className="h-4 w-4" />
            {locale === "ar" ? "الدفع عبر InstaPay" : "Pay with InstaPay"}
          </div>

          <div className="mt-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
            <InstaPayPanel bookingId={bookingId} instapay={summary?.instapay} />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4" />
            {locale === "ar" ? "الدفع بالبطاقة قريبًا — InstaPay متاح الآن." : "Card payments coming soon — InstaPay is available now."}
          </div>
        </div>

        <aside className="md:col-span-2">
          <div className="sticky top-20 rounded-3xl border border-border/70 bg-cream p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "ملخص الطلب" : "Order summary"}</p>
            <p className="mt-3 text-xs text-ink-muted">{t.booking.bookingRef}{bookingId.slice(0, 8)}</p>
            <div className="mt-4 space-y-3 text-sm">
              <Row label={locale === "ar" ? "المعالج" : "Therapist"} value={summary?.therapistName ?? "—"} />
              <Row label={locale === "ar" ? "الموعد" : "Session"} value={summary?.slotLabel ?? "—"} />
              {summary?.childName ? (
                <Row label={locale === "ar" ? "الطفل" : "Child"} value={summary.childName} />
              ) : null}
            </div>
            <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-sm">
              <Row label={locale === "ar" ? "المبلغ" : "Total"} value={summary ? formatPrice(summary.amount, summary.currency, locale) : "—"} bold />
            </div>
            <p className="mt-3 text-[11px] text-ink-muted">{locale === "ar" ? "إلغاء مجاني قبل 24 ساعة من الجلسة." : "Free cancellation up to 24h before your session."}</p>
          </div>
        </aside>
      </section>
    </SiteShell>
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

function InstaPayPanel({
  bookingId,
  instapay,
}: {
  bookingId: string;
  instapay?: TherapistInstapay;
}) {
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
    if (!user) {
      alert(locale === "ar" ? "يرجى تسجيل الدخول أولاً." : "Please sign in first.");
      return;
    }
    setSubmitting(true);
    try {
      let fileUrl = "";
      if (file && isFirebaseConfigured && storage) {
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
      <p className="rounded-2xl border border-mint/50 bg-mint/25 px-4 py-3 text-ink-muted">
        {t.booking.instapayBody}
      </p>

      {hasLink ? (
        isMobile ? (
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
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-sky/20 p-6">
            <QRCodeSVG value={payLink} size={200} level="H" className="rounded-xl" />
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
