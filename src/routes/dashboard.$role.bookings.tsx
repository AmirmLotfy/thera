import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useMyBookings } from "@/lib/queries/dashboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, X, Loader2 } from "lucide-react";
import type { Booking } from "@/lib/types";
import * as React from "react";

export const Route = createFileRoute("/dashboard/$role/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <BookingsPage />
    </RouteGuard>
  ),
});

function useCancel(bookingId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ bookingId, reason: "user_requested" }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

function BookingsPage() {
  const { locale } = useI18n();
  const { user, profile, effectiveRole: claimRole } = useAuth();
  const { role } = useParams({ from: "/dashboard/$role/bookings" });
  const effectiveRole = claimRole ?? profile?.role ?? "adult";
  const queryRole: "patient" | "therapist" = effectiveRole === "therapist" ? "therapist" : "patient";
  const { data: bookings = [], isLoading } = useMyBookings(user?.uid, queryRole);

  const upcoming = bookings.filter((b) => ["pending_payment", "awaiting_verification", "confirmed"].includes(b.status));
  const past = bookings.filter((b) => ["cancelled", "completed", "no_show"].includes(b.status));

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "لوحة تحكم" : "Dashboard"}</p>
        <h1 className="mt-2 font-display text-4xl">{locale === "ar" ? "الحجوزات" : "Bookings"}</h1>
        <p className="mt-2 text-ink-muted">{locale === "ar" ? "جلساتك القادمة والسابقة." : "Your upcoming and past sessions."}</p>

        {isLoading && (
          <div className="mt-10 flex items-center gap-2 text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</span>
          </div>
        )}

        {!isLoading && upcoming.length === 0 && past.length === 0 && (
          <div className="mt-12 rounded-3xl border border-border/70 bg-card p-10 text-center">
            <p className="text-ink-muted">{locale === "ar" ? "لا توجد حجوزات بعد." : "No bookings yet."}</p>
            {role === "adult" || role === "parent" || role === "teen" ? (
              <Link
                to="/dashboard/$role/find"
                params={{ role }}
                className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream"
              >
                {locale === "ar" ? "احجز جلستك الأولى" : "Book your first session"}
              </Link>
            ) : (
              <Link to="/therapists" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream">
                {locale === "ar" ? "احجز جلستك الأولى" : "Book your first session"}
              </Link>
            )}
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-2xl">{locale === "ar" ? "القادمة" : "Upcoming"}</h2>
            <div className="mt-4 space-y-3">
              {upcoming.map((b) => <BookingCard key={b.id} booking={b} role={role} locale={locale} />)}
            </div>
          </>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-2xl">{locale === "ar" ? "السابقة" : "Past"}</h2>
            <div className="mt-4 space-y-3">
              {past.map((b) => <BookingCard key={b.id} booking={b} role={role} locale={locale} past />)}
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}

function BookingCard({ booking, role, locale, past = false }: { booking: Booking; role: string; locale: string; past?: boolean }) {
  const cancel = useCancel(booking.id);
  const startsAt = (booking as Booking & { startsAt?: string }).startsAt;
  const timeLabel = startsAt
    ? new Date(startsAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const statusBadge: Record<string, { label: string; cls: string }> = {
    pending_payment: { label: locale === "ar" ? "في انتظار الدفع" : "Pending payment", cls: "bg-muted text-ink-muted" },
    awaiting_verification: { label: locale === "ar" ? "قيد التحقق" : "Awaiting verification", cls: "bg-sky/30" },
    confirmed: { label: locale === "ar" ? "مؤكد" : "Confirmed", cls: "bg-mint/50 text-ink" },
    cancelled: { label: locale === "ar" ? "ملغى" : "Cancelled", cls: "bg-destructive/20 text-destructive" },
    completed: { label: locale === "ar" ? "منتهي" : "Completed", cls: "bg-muted" },
    no_show: { label: locale === "ar" ? "غياب" : "No-show", cls: "bg-destructive/20 text-destructive" },
  };
  const badge = statusBadge[booking.status] ?? { label: booking.status, cls: "bg-muted" };

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card p-5 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="font-display text-lg">{locale === "ar" ? "جلسة مع المعالج" : "Session with therapist"}</p>
        <p className="text-xs text-ink-muted">{timeLabel}</p>
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
      </div>
      {!past && (
        <div className="flex flex-wrap gap-2">
          {booking.status === "confirmed" && (booking as Booking & { sessionId?: string }).sessionId && (
            <Link
              to="/dashboard/$role/sessions/$id"
              params={{ role, id: (booking as Booking & { sessionId?: string }).sessionId ?? "" }}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream"
            >
              <Video className="h-3.5 w-3.5" />
              {locale === "ar" ? "دخول الغرفة" : "Open room"}
            </Link>
          )}
          {["pending_payment", "awaiting_verification", "confirmed"].includes(booking.status) && (
            <button
              onClick={() => { if (confirm(locale === "ar" ? "هل تريد إلغاء الحجز؟" : "Cancel this booking?")) cancel.mutate(); }}
              disabled={cancel.isPending}
              className="inline-flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
            >
              {cancel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
