import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { AlertTriangle, ShieldAlert, MessageSquare, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

export const Route = createFileRoute("/dashboard/admin/ai-logs")({
  head: () => ({ meta: [{ title: "AI moderation — Thera Admin" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <AILogsPage />
    </RouteGuard>
  ),
});

type Log = { id: string; kind?: string; uid?: string; text?: string; severity?: "high" | "medium" | "low"; payload?: Record<string, unknown>; createdAt?: unknown };

function useLogs() {
  return useQuery({
    queryKey: ["adminLogs", "crisis"],
    queryFn: async (): Promise<Log[]> => {
      if (!isFirebaseConfigured || !db) return demoLogs();
      const ref = collection(db, "adminLogs");
      const q = query(ref, where("kind", "==", "crisis_flag"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as Log), id: d.id }));
    },
  });
}

function AILogsPage() {
  const { locale } = useI18n();
  const { data = [] } = useLogs();
  const [filter, setFilter] = React.useState<"all" | "high" | "medium" | "low">("all");
  const filtered = filter === "all" ? data : data.filter((d) => d.severity === filter);

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "رقابة الذكاء" : "AI moderation"}</h1>
        <p className="mt-2 text-ink-muted">{locale === "ar" ? "إشارات مصنف الأزمة وتدقيق استدعاءات Gemini. هوية المستخدم مشفرة." : "Crisis classifier flags and Gemini call audit. User identity is hashed."}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label={locale === "ar" ? "إشارات الأزمة (24س)" : "Crisis flags (24h)"} value={String(data.filter((d) => isRecent(d, 24)).length)} Icon={AlertTriangle} />
          <Stat label={locale === "ar" ? "إجمالي السجلات" : "Total logged"} value={String(data.length)} Icon={ShieldAlert} />
          <Stat label={locale === "ar" ? "عيّنة النظام" : "Sample size"} value={String(data.length)} Icon={MessageSquare} />
          <Stat
            label={locale === "ar" ? "متوسط الكمون" : "Avg latency (ms)"}
            value={avgLatencyMs(data)}
            Icon={Eye}
          />
        </div>

        <div className="mt-8 overflow-x-auto rounded-3xl border border-border/70 bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <h3 className="font-display text-xl">{locale === "ar" ? "آخر الإشارات" : "Recent flags"}</h3>
            <div className="flex gap-2">
              {(["all", "high", "medium", "low"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-ink text-cream" : "bg-muted"}`}>{f}</button>
              ))}
            </div>
          </div>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "الوقت" : "Time"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "المستخدم" : "User"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "مقتطف" : "Snippet"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "الخطورة" : "Severity"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-muted">{locale === "ar" ? "لا توجد إشارات بعد." : "No flags yet."}</td></tr>
              ) : filtered.map((f) => (
                <tr key={f.id}>
                  <td className="px-5 py-3 text-ink-muted">{formatTime(f.createdAt)}</td>
                  <td className="px-5 py-3 font-mono text-xs">{(f.uid ?? "—").slice(0, 8)}</td>
                  <td className="px-5 py-3 text-ink-muted line-clamp-2 max-w-lg">{f.text ?? (f.payload?.snippet as string) ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs capitalize ${f.severity === "high" ? "bg-destructive/20 text-destructive" : f.severity === "medium" ? "bg-blush/60" : "bg-muted"}`}>{f.severity ?? "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-3xl border border-blush/70 bg-blush/30 p-6 text-sm">
          <h3 className="font-display text-lg">{locale === "ar" ? "سياسة السلامة" : "Safety policy"}</h3>
          <p className="mt-2 text-ink-muted">
            {locale === "ar"
              ? "الإشارات عالية الخطورة تفتح لوحة الطوارئ فورياً، وتوقف المحادثة، وتنبه فريق السلامة. كل الإجراءات تسجل في adminLogs وتحتفظ لمدة 60 يومًا."
              : "High-severity flags open the emergency panel immediately, pause the AI conversation, and alert the on-call safety team. All actions log to adminLogs and are retained 60 days."}
          </p>
        </div>
      </section>
    </SiteShell>
  );
}

function Stat({ label, value, Icon }: { label: string; value: string; Icon: typeof AlertTriangle }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-blush/60"><Icon className="h-4 w-4" /></span>
      <p className="mt-3 text-xs uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}

function formatTime(v: unknown): string {
  if (!v) return "—";
  const ms = (v as { toMillis?: () => number } | undefined)?.toMillis?.() ?? (v instanceof Date ? (v as Date).getTime() : 0);
  if (!ms) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(ms);
}

function avgLatencyMs(data: Log[]): string {
  const ms = data
    .map((d) => (d.payload?.latencyMs as number | undefined) ?? (d.payload?.durationMs as number | undefined))
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (!ms.length) return "—";
  return String(Math.round(ms.reduce((a, b) => a + b, 0) / ms.length));
}

function isRecent(log: Log, hours: number): boolean {
  const ms = (log.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? (log.createdAt instanceof Date ? (log.createdAt as Date).getTime() : 0);
  return !!ms && Date.now() - ms < hours * 3600 * 1000;
}

function demoLogs(): Log[] {
  const now = new Date();
  return [
    { id: "l1", kind: "crisis_flag", uid: "u_8a2k", severity: "high", text: "Self-harm ideation detected in English message.", createdAt: now },
    { id: "l2", kind: "crisis_flag", uid: "u_92mp", severity: "medium", text: "Panic indicators — Arabic.", createdAt: now },
    { id: "l3", kind: "crisis_flag", uid: "u_44xb", severity: "low", text: "Elevated anxiety, monitored.", createdAt: new Date(Date.now() - 8.64e7) },
  ];
}
