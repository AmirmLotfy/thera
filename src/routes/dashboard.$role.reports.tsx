import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useMyReports } from "@/lib/queries/dashboard";
import { FileText, Download, Loader2, Compass } from "lucide-react";
import type { ReportDoc } from "@/lib/types";

export const Route = createFileRoute("/dashboard/$role/reports")({
  head: () => ({ meta: [{ title: "Reports — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <ReportsPage />
    </RouteGuard>
  ),
});

function ReportsPage() {
  const { locale } = useI18n();
  const { user, profile, effectiveRole: claimRole } = useAuth();
  const effectiveRole = claimRole ?? profile?.role ?? "adult";
  const queryRole: "patient" | "therapist" = effectiveRole === "therapist" ? "therapist" : "patient";
  const { data: reports = [], isLoading } = useMyReports(user?.uid, queryRole);

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "لوحة تحكم" : "Dashboard"}</p>
        <h1 className="mt-2 font-display text-4xl">{locale === "ar" ? "التقارير" : "Reports"}</h1>
        <p className="mt-2 text-ink-muted">{locale === "ar" ? "ملخصات جلساتك بلغة واضحة." : "Plain-language summaries of your sessions."}</p>

        {isLoading && (
          <div className="mt-10 flex items-center gap-2 text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</span>
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <div className="mt-10 rounded-3xl border border-border/70 bg-card p-10 text-center text-ink-muted">
            {locale === "ar" ? "لا توجد تقارير بعد. ستظهر هنا بعد جلستك الأولى." : "No reports yet. They'll appear here after your first session."}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {reports.map((rep) => <ReportCard key={rep.id} report={rep} locale={locale} />)}
        </div>
      </section>
    </SiteShell>
  );
}

function ReportCard({ report, locale }: { report: ReportDoc; locale: string }) {
  const createdMs = (report.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? (report.createdAt instanceof Date ? (report.createdAt as Date).getTime() : 0);
  const dateLabel = createdMs ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" }).format(createdMs) : "—";

  const displaySummary = locale === "ar"
    ? ((report as ReportDoc & { summaryAr?: string }).summaryAr ?? report.summary ?? report.raw ?? "")
    : ((report as ReportDoc & { summaryEn?: string }).summaryEn ?? report.summary ?? report.raw ?? "");

  function printReport() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${locale === "ar" ? "تقرير ثيرا" : "Thera Session Report"}</title><style>body{font-family:sans-serif;max-width:640px;margin:auto;padding:32px;color:#1F1B2E}h1{font-size:24px}p{line-height:1.7}@media print{button{display:none}}</style></head><body><h1>${locale === "ar" ? "تقرير جلسة" : "Session Report"}</h1><p style="color:#888">${dateLabel}</p><h3>${locale === "ar" ? "ملخص" : "Summary"}</h3><p>${displaySummary}</p></body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <article className="rounded-3xl border border-border/70 bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender/60">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-lg">{locale === "ar" ? "تقرير الجلسة" : "Session report"}</p>
            <p className="text-xs text-ink-muted">{dateLabel}</p>
          </div>
        </div>
        <button
          onClick={printReport}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <Download className="h-3 w-3" />
          {locale === "ar" ? "طباعة PDF" : "Print PDF"}
        </button>
      </div>

      {displaySummary && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {locale === "ar" ? "الملخص" : "Summary"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{displaySummary}</p>
        </>
      )}

      {report.recommendations && report.recommendations.length > 0 && (
        <>
          <h3 className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <Compass className="h-3 w-3" />
            {locale === "ar" ? "الخطوات التالية" : "Next steps"}
          </h3>
          <ul className="mt-2 rounded-2xl bg-aqua/30 p-4">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-sm leading-relaxed">{r}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
