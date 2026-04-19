import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import {
  useRecentMoodLogs, useUpcomingSessions, useNotifications, useMyReports, useMyChildren, useUserProfile,
} from "@/lib/queries/dashboard";
import {
  Heart, MessageSquare, CalendarCheck, FileText, Bell, Users, Baby, Stethoscope,
  Flame, Compass, Smile, ClipboardList, Video, ArrowRight, TrendingUp,
  ShieldCheck, BarChart3, CreditCard, FileCode2, Database, Settings,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

type Role = "adult" | "parent" | "teen" | "therapist" | "admin";

type DashboardSubpath = "chat" | "mood" | "vibe" | "availability" | "bookings" | "reports" | "find";

export const Route = createFileRoute("/dashboard/$role/")({
  head: ({ params }) => ({ meta: [{ title: `${params.role} · Thera` }] }),
  component: RoleHome,
});

function RoleHome() {
  const { role } = Route.useParams() as { role: Role };
  if (role === "admin") return <AdminDashboard />;
  if (role === "therapist") return <TherapistDashboard />;
  if (role === "parent") return <ParentDashboard />;
  if (role === "teen") return <TeenDashboard />;
  return <AdultDashboard />;
}

function HeroHeader({ eyebrow, title, subtitle, color = "bg-lavender/40", Icon = Heart }: {
  eyebrow: string; title: string; subtitle: string; color?: string; Icon?: typeof Heart;
}) {
  const reduce = useReducedMotion();
  return (
    <section className={`relative overflow-hidden ${color}`}>
      <motion.div
        aria-hidden
        className="blob pointer-events-none absolute -top-24 -end-20 h-[32rem] w-[32rem] bg-blush/60"
        animate={reduce ? undefined : { y: [0, 20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-soft"><Icon className="h-5 w-5" /></span>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{eyebrow}</p>
        </div>
        <h1 className="mt-4 font-display text-4xl md:text-6xl">{title}</h1>
        <p className="mt-2 max-w-xl text-ink-muted">{subtitle}</p>
      </div>
    </section>
  );
}

function Tile({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className={`rounded-3xl border border-border/70 bg-card p-6 shadow-soft ${className}`}
    >
      {children}
    </motion.div>
  );
}

function BigCtaDashboard({
  role,
  segment,
  title,
  subtitle,
  Icon,
  tone = "ink",
}: {
  role: Exclude<Role, "admin">;
  segment: DashboardSubpath;
  title: string;
  subtitle: string;
  Icon: typeof Heart;
  tone?: "ink" | "lavender" | "mint";
}) {
  const bg = tone === "lavender" ? "bg-lavender/60" : tone === "mint" ? "bg-mint/50" : "bg-ink text-cream";
  const to =
    segment === "chat" ? "/dashboard/$role/chat"
      : segment === "mood" ? "/dashboard/$role/mood"
        : segment === "vibe" ? "/dashboard/$role/vibe"
          : segment === "availability" ? "/dashboard/$role/availability"
            : segment === "bookings" ? "/dashboard/$role/bookings"
              : segment === "find" ? "/dashboard/$role/find"
                : "/dashboard/$role/reports";
  return (
    <Link to={to} params={{ role }} className={`group flex h-full flex-col justify-between rounded-3xl p-6 shadow-soft ${bg}`}>
      <div className="flex items-start justify-between gap-4">
        <Icon className="h-7 w-7" />
        <ArrowRight className="h-5 w-5 opacity-60 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </div>
      <div className="mt-10">
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-1 text-sm opacity-80">{subtitle}</p>
      </div>
    </Link>
  );
}

function AdultDashboard() {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const moodQ = useRecentMoodLogs(user?.uid);
  const sessionsQ = useUpcomingSessions(user?.uid, "patient");
  const notifsQ = useNotifications(user?.uid);
  const reportsQ = useMyReports(user?.uid, "patient");
  const streak = profile?.streak ?? 0;
  const role = "adult" as const;

  return (
    <SiteShell>
      <HeroHeader
        eyebrow={`${t.dash.welcome}${profile?.displayName ? ` · ${profile.displayName.split(" ")[0]}` : ""}`}
        title={t.dash.howFeel}
        subtitle={locale === "ar" ? "كل شيء في مكان واحد، باللغة التي تريحك." : "Everything in one place, in the language that feels lighter."}
      />

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-6 md:px-8">
        <div className="md:col-span-3 md:row-span-2">
          <BigCtaDashboard role={role} segment="chat" title={t.dash.talkAI} subtitle={t.dash.talkAISub} Icon={MessageSquare} />
        </div>
        <Tile className="md:col-span-3">
          <UpcomingSessionsCard data={sessionsQ.data} role="patient" patientDashboardRole="adult" />
        </Tile>
        <Tile className="md:col-span-2">
          <StreakCard streak={streak} locale={locale} />
        </Tile>
        <Tile className="md:col-span-2">
          <MoodSparkCard logs={moodQ.data} moodRole="adult" />
        </Tile>
        <Tile className="md:col-span-2">
          <NotificationsPreview data={notifsQ.data} role="adult" />
        </Tile>

        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="find" title={t.dash.bookSession} subtitle={t.dash.bookSessionSub} Icon={CalendarCheck} tone="lavender" />
        </div>
        <Tile className="md:col-span-2">
          <ReportsPreview data={reportsQ.data} role="adult" />
        </Tile>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="mood" title={t.dash.mood} subtitle={t.dash.moodSub} Icon={Smile} tone="mint" />
        </div>
      </section>
    </SiteShell>
  );
}

function ParentDashboard() {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const childrenQ = useMyChildren(user?.uid);
  const sessionsQ = useUpcomingSessions(user?.uid, "patient");
  const notifsQ = useNotifications(user?.uid);
  const reportsQ = useMyReports(user?.uid, "patient");
  const [activeChild, setActiveChild] = React.useState<string | null>(null);
  const role = "parent" as const;

  React.useEffect(() => {
    if (!activeChild && childrenQ.data?.length) setActiveChild(childrenQ.data[0].id);
  }, [childrenQ.data, activeChild]);

  return (
    <SiteShell>
      <HeroHeader
        eyebrow={t.dash.family}
        title={profile?.displayName ? `${locale === "ar" ? "أهلاً" : "Hello"}, ${profile.displayName.split(" ")[0]}` : t.dash.family}
        subtitle={t.dash.familySub}
        color="bg-blush/50"
        Icon={Users}
      />

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-6 md:px-8">
        <Tile className="md:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "تبديل الطفل" : "Child switcher"}</p>
              <h3 className="mt-1 font-display text-xl">{locale === "ar" ? "من سنحجز له اليوم؟" : "Who are we caring for today?"}</h3>
            </div>
            <Link to="/dashboard/$role/children" params={{ role: "parent" }} className="text-xs font-semibold text-ink underline">
              {locale === "ar" ? "إدارة الملفات" : "Manage profiles"}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(childrenQ.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChild(c.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${activeChild === c.id ? "border-ink bg-ink text-cream" : "border-border bg-card"}`}
              >
                {c.name}
              </button>
            ))}
            {(childrenQ.data ?? []).length === 0 ? (
              <Link to="/dashboard/$role/children" params={{ role: "parent" }} className="rounded-full border border-dashed border-border px-4 py-2 text-sm">
                {locale === "ar" ? "أضف طفلاً" : "Add a child"}
              </Link>
            ) : null}
          </div>
        </Tile>

        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="find" title={t.dash.bookSession} subtitle={t.dash.bookSessionSub} Icon={CalendarCheck} tone="lavender" />
        </div>

        <Tile className="md:col-span-3">
          <UpcomingSessionsCard data={sessionsQ.data} role="patient" patientDashboardRole="parent" />
        </Tile>
        <Tile className="md:col-span-3">
          <ReportsPreview data={reportsQ.data} role="parent" />
        </Tile>
        <Tile className="md:col-span-3">
          <NotificationsPreview data={notifsQ.data} role="parent" />
        </Tile>
        <div className="md:col-span-3">
          <BigCtaDashboard role={role} segment="chat" title={t.dash.talkAI} subtitle={t.dash.talkAISub} Icon={MessageSquare} tone="mint" />
        </div>
      </section>
    </SiteShell>
  );
}

function TeenDashboard() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const moodQ = useRecentMoodLogs(user?.uid);
  const notifsQ = useNotifications(user?.uid);
  const profileQ = useUserProfile(user?.uid);
  const streak = ((profileQ.data as { streak?: number } | null)?.streak) ?? 0;
  const role = "teen" as const;

  return (
    <SiteShell>
      <HeroHeader
        eyebrow={t.dash.teen}
        title={t.dash.teenSub}
        subtitle={locale === "ar" ? "ركّز. تنفّس. اهدأ. ملك إيقاعك." : "Focus. Breathe. Reset. Your pace."}
        color="bg-sky/50"
        Icon={Compass}
      />
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-6 md:px-8">
        <div className="md:col-span-3 md:row-span-2">
          <BigCtaDashboard role={role} segment="vibe" title={t.dash.vibe} subtitle={t.dash.vibeSub} Icon={Flame} />
        </div>
        <Tile className="md:col-span-3">
          <StreakCard streak={streak} locale={locale} />
        </Tile>
        <Tile className="md:col-span-3">
          <MoodSparkCard logs={moodQ.data} moodRole="teen" />
        </Tile>
        <div className="md:col-span-3">
          <BigCtaDashboard role={role} segment="chat" title={t.dash.talkAI} subtitle={t.dash.talkAISub} Icon={MessageSquare} tone="lavender" />
        </div>
        <Tile className="md:col-span-3">
          <NotificationsPreview data={notifsQ.data} role="teen" />
        </Tile>
      </section>
    </SiteShell>
  );
}

function TherapistDashboard() {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const sessionsQ = useUpcomingSessions(user?.uid, "therapist");
  const notifsQ = useNotifications(user?.uid);
  const reportsQ = useMyReports(user?.uid, "therapist");
  const role = "therapist" as const;

  return (
    <SiteShell>
      <HeroHeader
        eyebrow={t.dash.therapistTitle}
        title={profile?.displayName ? `${locale === "ar" ? "أهلاً دكتور/ة" : "Welcome, Dr."} ${profile.displayName.split(" ").slice(-1)[0]}` : t.dash.therapistTitle}
        subtitle={t.dash.therapistSub}
        color="bg-mint/35"
        Icon={Stethoscope}
      />
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-6 md:px-8">
        <Tile className="md:col-span-4">
          <UpcomingSessionsCard data={sessionsQ.data} role="therapist" patientDashboardRole="therapist" />
        </Tile>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="availability" title={t.dash.availability} subtitle={t.dash.availabilitySub} Icon={CalendarCheck} tone="lavender" />
        </div>
        <Tile className="md:col-span-3">
          <NotificationsPreview data={notifsQ.data} role="therapist" />
        </Tile>
        <Tile className="md:col-span-3">
          <ReportsPreview data={reportsQ.data} role="therapist" />
        </Tile>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="bookings" title={t.dash.bookings} subtitle={t.dash.bookingsSub} Icon={ClipboardList} />
        </div>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="reports" title={t.dash.submitReport} subtitle={t.dash.submitReportSub} Icon={FileText} tone="mint" />
        </div>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="chat" title={t.dash.talkAI} subtitle={t.dash.talkAISub} Icon={MessageSquare} tone="lavender" />
        </div>
      </section>
    </SiteShell>
  );
}

function AdminDashboard() {
  const { t, locale } = useI18n();
  return (
    <SiteShell>
      <HeroHeader eyebrow={t.dash.admin} title={t.dash.admin} subtitle={t.dash.adminSub} color="bg-lavender/40" Icon={ShieldCheck} />
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-6 md:px-8">
        <AdminTile to="/dashboard/$role/approvals" title={t.dash.approvals} subtitle={t.dash.approvalsSub} Icon={ClipboardList} />
        <AdminTile to="/dashboard/admin/users" title={t.dash.users} subtitle={t.dash.usersSub} Icon={Users} />
        <AdminTile to="/dashboard/admin/analytics" title={t.dash.analytics} subtitle={t.dash.analyticsSub} Icon={BarChart3} />
        <AdminTile to="/dashboard/admin/sessions" title={t.dash.sessionsAdmin} subtitle={t.dash.sessionsAdminSub} Icon={Database} />
        <AdminTile to="/dashboard/admin/payments" title={t.dash.payments} subtitle={t.dash.paymentsSub} Icon={CreditCard} />
        <AdminTile to="/dashboard/admin/content" title={t.dash.content} subtitle={t.dash.contentSub} Icon={FileCode2} />
        <AdminTile to="/dashboard/admin/ai-logs" title={t.dash.moderation} subtitle={t.dash.moderationSub} Icon={ShieldCheck} />
        <AdminTile to="/dashboard/admin/settings" title={t.dash.settings} subtitle={t.dash.settingsSub} Icon={Settings} />
      </section>
      <p className="mx-auto mt-4 max-w-7xl px-5 pb-16 text-xs text-ink-muted md:px-8">
        {locale === "ar" ? "وصول المسؤول مقيد عبر مطالبات Firebase." : "Admin access is gated by Firebase custom claims."}
      </p>
    </SiteShell>
  );
}

function AdminTile({ to, title, subtitle, Icon }: { to: string; title: string; subtitle: string; Icon: typeof Heart }) {
  const isUnderRole = to.startsWith("/dashboard/$role");
  return isUnderRole ? (
    <Link to={to as "/dashboard/$role/approvals"} params={{ role: "admin" }} className="group rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-md md:col-span-2">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-6 font-display text-xl">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
    </Link>
  ) : (
    <Link to={to as "/dashboard/admin/users"} className="group rounded-3xl border border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-md md:col-span-2">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-6 font-display text-xl">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
    </Link>
  );
}

function UpcomingSessionsCard({ data, role, patientDashboardRole }: {
  data?: { id: string; startsAt: string; therapistId: string; patientUid: string; roomUrl?: string }[] | null;
  role: "patient" | "therapist";
  patientDashboardRole?: "adult" | "parent" | "teen" | "therapist";
}) {
  const { t, locale } = useI18n();
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const list = (data ?? []).slice(0, 3);
  const sessionRoleParam = role === "therapist" ? "therapist" : (patientDashboardRole ?? "adult");
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.dash.upcomingTitle}</p>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{t.dash.noUpcoming}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/50">
          {list.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">{fmt.format(new Date(s.startsAt))}</p>
                <p className="text-xs text-ink-muted">
                  {role === "therapist"
                    ? `${t.dash.clientLabel} · ${s.patientUid.slice(0, 6)}`
                    : `${t.dash.therapistLabel} · ${s.therapistId}`}
                </p>
              </div>
              <Link to="/dashboard/$role/sessions/$id" params={{ role: sessionRoleParam, id: s.id }} className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream">
                <Video className="h-3 w-3" /> {t.sessions.join}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StreakCard({ streak, locale }: { streak: number; locale: "en" | "ar" }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "تتابعك" : "Your streak"}</p>
      <div className="mt-3 flex items-center gap-4">
        <motion.span initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 160 }} className="grid h-16 w-16 place-items-center rounded-2xl bg-blush/50 text-2xl">
          <Flame className="h-7 w-7" />
        </motion.span>
        <div>
          <p className="font-display text-3xl">{streak}</p>
          <p className="text-sm text-ink-muted">{locale === "ar" ? "يوم متتابع من الرعاية الذاتية" : "days in a row of self-care"}</p>
        </div>
      </div>
    </div>
  );
}

function MoodSparkCard({ logs, moodRole }: { logs?: { date: string; score: number }[] | null; moodRole: "adult" | "parent" | "teen" }) {
  const { locale } = useI18n();
  const data = (logs ?? []).slice(0, 14).reverse();
  const w = 260, h = 80;
  const points = data.length
    ? data.map((m, i) => {
        const x = (i / Math.max(1, data.length - 1)) * w;
        const y = h - ((m.score - 1) / 4) * (h - 10) - 5;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ")
    : "";
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "المزاج هذا الأسبوع" : "Mood this week"}</p>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{locale === "ar" ? "لم تسجل مزاجك بعد. جرّب نقرة واحدة." : "No mood logs yet — one tap is all it takes."}</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-24 w-full text-lavender">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          {data.map((m, i) => {
            const x = (i / Math.max(1, data.length - 1)) * w;
            const y = h - ((m.score - 1) / 4) * (h - 10) - 5;
            return <circle key={i} cx={x} cy={y} r={3} fill="currentColor" />;
          })}
        </svg>
      )}
      <Link to="/dashboard/$role/mood" params={{ role: moodRole }} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink">
        <TrendingUp className="h-3 w-3" /> {locale === "ar" ? "عرض الأسبوع" : "View week"}
      </Link>
    </div>
  );
}

function NotificationsPreview({ data, role }: { data?: { id: string; title: string; body: string; read?: boolean }[] | null; role: Role }) {
  const { locale } = useI18n();
  const list = (data ?? []).slice(0, 3);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "آخر التحديثات" : "Latest updates"}</p>
        <Link to="/dashboard/$role/notifications" params={{ role }} className="text-xs font-semibold text-ink underline">{locale === "ar" ? "الكل" : "All"}</Link>
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{locale === "ar" ? "لا توجد إشعارات جديدة." : "Nothing new right now."}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {list.map((n) => (
            <li key={n.id} className="flex items-start gap-3">
              <span className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-muted" : "bg-lavender"}`} />
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-ink-muted line-clamp-2">{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportsPreview({ data, role }: { data?: { id: string; summary?: string; createdAt?: unknown }[] | null; role: Role }) {
  const { locale } = useI18n();
  const list = (data ?? []).slice(0, 3);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "تقارير حديثة" : "Recent reports"}</p>
        <Link to="/dashboard/$role/reports" params={{ role }} className="text-xs font-semibold text-ink underline">{locale === "ar" ? "الكل" : "All"}</Link>
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{locale === "ar" ? "لا توجد تقارير بعد." : "No reports yet."}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {list.map((r) => (
            <li key={r.id} className="rounded-2xl bg-cream p-3">
              <div className="flex items-center gap-2 text-xs text-ink-muted"><FileText className="h-3 w-3" /> {locale === "ar" ? "ملخص" : "Summary"}</div>
              <p className="mt-1 text-sm line-clamp-3">{r.summary ?? (locale === "ar" ? "ملخص مفصل قيد التحضير..." : "Detailed summary being prepared…")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
