import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

export const Route = createFileRoute("/dashboard/admin/sessions")({
  head: () => ({ meta: [{ title: "Sessions — Thera Admin" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <AdminSessionsPage />
    </RouteGuard>
  ),
});

type Row = { id: string; status?: string; startsAt?: unknown; patientUid?: string; patientName?: string; therapistId?: string; };

function useSessions() {
  return useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: async (): Promise<Row[]> => {
      if (!isFirebaseConfigured || !db) return demo();
      const q = query(collection(db, "sessions"), orderBy("startsAt", "desc"), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as Row), id: d.id }));
    },
  });
}

function AdminSessionsPage() {
  const { locale } = useI18n();
  const { data = [] } = useSessions();
  const [filter, setFilter] = React.useState<"all" | "upcoming" | "live" | "ended" | "missed">("all");
  const rows = filter === "all" ? data : data.filter((r) => r.status === filter);
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "الجلسات" : "Sessions"}</h1>
        <p className="mt-2 text-ink-muted">{locale === "ar" ? "كل الجلسات عبر المنصة." : "Every session on Thera."}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {(["all", "upcoming", "live", "ended", "missed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${filter === f ? "bg-ink text-cream" : "bg-card border border-border"}`}>{f}</button>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-border/70 bg-card shadow-soft">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "المعرف" : "ID"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "المريض" : "Patient"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "المعالج" : "Therapist"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "الوقت" : "When"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-mono text-xs">{r.id.slice(0, 10)}</td>
                  <td className="px-5 py-3">{r.patientName ?? r.patientUid?.slice(0, 8) ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{r.therapistId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-5 py-3">{formatTime(r.startsAt)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs capitalize ${r.status === "live" ? "bg-mint/60" : r.status === "ended" ? "bg-muted" : r.status === "missed" ? "bg-destructive/20 text-destructive" : "bg-lavender/50"}`}>{r.status ?? "—"}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (<tr><td colSpan={5} className="px-5 py-10 text-center text-ink-muted">{locale === "ar" ? "لا توجد جلسات." : "No sessions match."}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </SiteShell>
  );
}

function formatTime(v: unknown): string {
  if (!v) return "—";
  const ms = (v as { toMillis?: () => number } | undefined)?.toMillis?.() ?? (v instanceof Date ? (v as Date).getTime() : 0);
  if (!ms) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(ms);
}

function demo(): Row[] {
  return [
    { id: "ss_8821", status: "live", startsAt: new Date(), patientName: "Mariam K.", therapistId: "t1" },
    { id: "ss_8819", status: "ended", startsAt: new Date(Date.now() - 3600_000), patientName: "Sara B.", therapistId: "t1" },
    { id: "ss_8815", status: "upcoming", startsAt: new Date(Date.now() + 86_400_000), patientName: "Yusuf I.", therapistId: "t2" },
  ];
}
