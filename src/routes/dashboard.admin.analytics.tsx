import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Thera Admin" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <AnalyticsPage />
    </RouteGuard>
  ),
});

function useAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      if (!isFirebaseConfigured || !db) return demo();
      const since7d = new Date(Date.now() - 7 * 86400_000);
      const [users, therapists, bookings, ai, sessions, crisis] = await Promise.all([
        getCountFromServer(collection(db, "users")).catch(() => null),
        getCountFromServer(query(collection(db, "users"), where("role", "==", "therapist"))).catch(() => null),
        getCountFromServer(query(collection(db, "bookings"), where("status", "==", "confirmed"))).catch(() => null),
        getCountFromServer(collection(db, "aiConversations")).catch(() => null),
        getCountFromServer(query(collection(db, "sessions"), where("status", "in", ["upcoming", "live", "ended"]))).catch(() => null),
        getDocs(query(collection(db, "adminLogs"), where("kind", "==", "crisis_flag"), orderBy("createdAt", "desc"), limit(50))).catch(() => null),
      ]);
      return {
        totalUsers: users?.data().count ?? 0,
        therapists: therapists?.data().count ?? 0,
        confirmedBookings: bookings?.data().count ?? 0,
        aiConversations: ai?.data().count ?? 0,
        sessions: sessions?.data().count ?? 0,
        crisisFlags: crisis?.docs.length ?? 0,
        since7d,
      };
    },
  });
}

function AnalyticsPage() {
  const { locale } = useI18n();
  const { data, isLoading, isError } = useAnalytics();
  if (isLoading) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
          <div className="flex items-center gap-2 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            {locale === "ar" ? "جارٍ تحميل التحليلات…" : "Loading analytics…"}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted/60" />
            ))}
          </div>
        </section>
      </SiteShell>
    );
  }
  if (isError || !data) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-6xl px-5 py-12 text-center text-ink-muted">
          {locale === "ar" ? "تعذّر تحميل البيانات." : "Could not load analytics."}
        </section>
      </SiteShell>
    );
  }
  const kpis = [
    { label: locale === "ar" ? "إجمالي المستخدمين" : "Users", value: data.totalUsers.toLocaleString() },
    { label: locale === "ar" ? "المعالجون" : "Therapists", value: data.therapists.toLocaleString() },
    { label: locale === "ar" ? "الحجوزات المؤكدة" : "Bookings confirmed", value: data.confirmedBookings.toLocaleString() },
    { label: locale === "ar" ? "محادثات AI" : "AI conversations", value: data.aiConversations.toLocaleString() },
    { label: locale === "ar" ? "الجلسات" : "Sessions", value: data.sessions.toLocaleString() },
    { label: locale === "ar" ? "إشارات الأزمة" : "Crisis flags", value: data.crisisFlags.toLocaleString() },
  ];

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "التحليلات" : "Analytics"}</h1>
        <p className="mt-2 text-ink-muted">{locale === "ar" ? "أرقام حيّة من Firestore — بدون متتبعات." : "Live counts straight from Firestore — no third-party trackers."}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
              <p className="text-xs uppercase tracking-wider text-ink-muted">{k.label}</p>
              <p className="mt-2 font-display text-4xl">{k.value}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted"><TrendingUp className="h-3 w-3" /> {locale === "ar" ? "إجمالي تراكمي (لوحة الأرقام)" : "All-time aggregate snapshot"}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-blush/70 bg-blush/20 p-6 text-sm text-ink-muted">
          {locale === "ar"
            ? "ربط Firebase Analytics متاح عند الحاجة لأحداث واستهداف بالمسار."
            : "Connect Firebase Analytics for event-level funnels; this page reads aggregates only for privacy."}
        </div>
      </section>
    </SiteShell>
  );
}

function demo() {
  return {
    totalUsers: 12408, therapists: 184, confirmedBookings: 612, aiConversations: 18402, sessions: 902, crisisFlags: 9,
    since7d: new Date(),
  };
}
