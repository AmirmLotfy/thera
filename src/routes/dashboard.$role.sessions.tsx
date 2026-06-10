import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useTherapistSessionsIndex } from "@/lib/queries/dashboard";
import { Calendar, Video, Loader2 } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/dashboard/$role/sessions")({
  head: () => ({ meta: [{ title: "Sessions — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="therapist">
      <TherapistSessionsIndexPage />
    </RouteGuard>
  ),
});

function TherapistSessionsIndexPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const q = useTherapistSessionsIndex(user?.uid);
  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const [patientFilter, setPatientFilter] = React.useState("");

  const now = Date.now();
  const rows = (q.data ?? []).filter((s) => {
    const pid = (s.patientUid ?? "").toLowerCase();
    if (patientFilter.trim() && !pid.includes(patientFilter.trim().toLowerCase())) return false;
    const start = new Date(s.startsAt).getTime();
    const isPast = start < now;
    return tab === "past" ? isPast : !isPast;
  });

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.dash.upcomingTitle}</p>
            <h1 className="mt-2 font-display text-3xl">{locale === "ar" ? "جلساتك" : "Your sessions"}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("upcoming")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "upcoming" ? "bg-ink text-cream" : "border border-border bg-card"}`}
            >
              {locale === "ar" ? "القادمة" : "Upcoming"}
            </button>
            <button
              type="button"
              onClick={() => setTab("past")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "past" ? "bg-ink text-cream" : "border border-border bg-card"}`}
            >
              {locale === "ar" ? "السابقة" : "Past"}
            </button>
          </div>
        </div>

        <label className="mt-6 block text-sm text-ink-muted">
          {locale === "ar" ? "تصفية برقم المريض" : "Filter by patient ID"}
          <input
            className="input mt-1 max-w-md"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            placeholder="uid…"
          />
        </label>

        {q.isLoading ? (
          <div className="mt-10 flex justify-center text-ink-muted">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-10 text-sm text-ink-muted">{locale === "ar" ? "لا توجد جلسات في هذا القسم." : "No sessions in this tab."}</p>
        ) : (
          <ul className="mt-8 divide-y divide-border/60 rounded-3xl border border-border/70 bg-card">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{fmt.format(new Date(s.startsAt))}</p>
                    <p className="text-xs text-ink-muted">
                      {t.dash.clientLabel} · <span className="font-mono">{s.patientUid.slice(0, 10)}…</span>
                    </p>
                  </div>
                </div>
                <Link
                  to="/dashboard/$role/sessions/$id"
                  params={{ role: "therapist", id: s.id }}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream"
                >
                  <Video className="h-4 w-4" />
                  {tab === "past" ? (locale === "ar" ? "التفاصيل" : "Details") : t.sessions.join}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteShell>
  );
}
