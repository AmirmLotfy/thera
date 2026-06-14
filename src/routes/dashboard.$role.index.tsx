import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteGuard } from "@/components/site/RouteGuard";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import {
  useRecentMoodLogs, useUpcomingSessionsLive, useNotifications, useMyReports, useMyChildren, useUserProfile, usePastTherapists,
  type PastTherapist,
} from "@/lib/queries/dashboard";
import {
  Heart, MessageSquare, CalendarCheck, FileText, Bell, Users, Baby, Stethoscope,
  Flame, Compass, Smile, ClipboardList, Video, ArrowRight, TrendingUp,
  ShieldCheck, BarChart3, CreditCard, FileCode2, Database, Settings, Activity, Sparkles,
  PhoneOff, Volume2, VolumeX
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateDoc, doc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { useTherapist } from "@/lib/queries/therapists";

type Role = "adult" | "parent" | "teen" | "therapist" | "admin";

type DashboardSubpath = "chat" | "mood" | "vibe" | "availability" | "bookings" | "reports" | "find";

export const Route = createFileRoute("/dashboard/$role/")({
  head: ({ params }) => ({ meta: [{ title: `${params.role} · Thera` }] }),
  component: RoleHome,
});

function RoleHome() {
  const { role } = Route.useParams() as { role: Role };
  if (role === "admin") return <AdminDashboard />;
  if (role === "therapist") {
    return (
      <RouteGuard requireAuth requireRole="therapist">
        <TherapistDashboard />
      </RouteGuard>
    );
  }
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
  const sessionsQ = useUpcomingSessionsLive(user?.uid, "patient");
  const pastTherapistsQ = usePastTherapists(user?.uid);
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
        <Tile className="md:col-span-6">
          <YourTherapistsCard data={pastTherapistsQ.data} role={role} locale={locale} />
        </Tile>
      </section>
    </SiteShell>
  );
}

function ParentDashboard() {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const childrenQ = useMyChildren(user?.uid);
  const sessionsQ = useUpcomingSessionsLive(user?.uid, "patient");
  const pastTherapistsQ = usePastTherapists(user?.uid);
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
        <Tile className="md:col-span-6">
          <YourTherapistsCard data={pastTherapistsQ.data} role={role} locale={locale} />
        </Tile>
      </section>
    </SiteShell>
  );
}

function TeenDashboard() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const moodQ = useRecentMoodLogs(user?.uid);
  const notifsQ = useNotifications(user?.uid);
  const pastTherapistsQ = usePastTherapists(user?.uid);
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
        <Tile className="md:col-span-6">
          <YourTherapistsCard data={pastTherapistsQ.data} role={role} locale={locale} />
        </Tile>
      </section>
    </SiteShell>
  );
}

function TherapistLiveStatusCard() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const therapistQ = useTherapist(user?.uid);
  const [toggling, setToggling] = React.useState(false);

  if (!user) return null;
  const th = therapistQ.data;
  const active = !!th?.availableNow;

  async function handleToggle() {
    if (!isFirebaseConfigured || !db) return;
    setToggling(true);
    try {
      const ref = doc(db, "therapists", user.uid);
      await updateDoc(ref, {
        availableNow: !active,
        updatedAt: new Date().toISOString(),
      });
      await qc.invalidateQueries({ queryKey: ["therapist", user.uid] });
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  }

  return (
    <Tile className="md:col-span-2 overflow-hidden relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-ink-muted"}`} />
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {locale === "ar" ? "حالة الاتصال الفوري" : "Live Status"}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          type="button"
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${active ? "bg-emerald-500" : "bg-muted"}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${active ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      <div className="mt-4">
        <h3 className="font-display text-2xl">
          {active 
            ? (locale === "ar" ? "أنت أونلاين الآن" : "You are Live Now") 
            : (locale === "ar" ? "أنت أوفلاين" : "You are Offline")}
        </h3>
        <p className="mt-1 text-xs text-ink-muted leading-relaxed">
          {active 
            ? (locale === "ar" ? "مستعد لاستقبال الجلسات الفورية من المرضى مباشرة." : "Ready to receive instant session requests immediately.") 
            : (locale === "ar" ? "اضغط لتفعيل الاتصال الفوري واستقبال المرضى الآن." : "Toggle to go live and accept instant clients right now.")}
        </p>
      </div>
    </Tile>
  );
}

function TherapistDashboard() {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const sessionsQ = useUpcomingSessionsLive(user?.uid, "therapist");
  const notifsQ = useNotifications(user?.uid);
  const reportsQ = useMyReports(user?.uid, "therapist");
  const role = "therapist" as const;

  return (
    <SiteShell>
      <IncomingCallOverlay sessions={sessionsQ.data} />
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
        <TherapistLiveStatusCard />
        
        <Tile className="md:col-span-3">
          <NotificationsPreview data={notifsQ.data} role="therapist" />
        </Tile>
        <Tile className="md:col-span-3">
          <ReportsPreview data={reportsQ.data} role="therapist" />
        </Tile>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="availability" title={t.dash.availability} subtitle={t.dash.availabilitySub} Icon={CalendarCheck} tone="lavender" />
        </div>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="bookings" title={t.dash.bookings} subtitle={t.dash.bookingsSub} Icon={ClipboardList} />
        </div>
        <div className="md:col-span-2">
          <BigCtaDashboard role={role} segment="reports" title={t.dash.submitReport} subtitle={t.dash.submitReportSub} Icon={FileText} tone="mint" />
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
                <p className="font-semibold">{fmt.format(toDate(s.startsAt))}</p>
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

function YourTherapistsCard({ data, role, locale }: { data?: PastTherapist[] | null; role: "adult" | "parent" | "teen"; locale: "en" | "ar" }) {
  const list = data ?? [];
  
  if (list.length === 0) {
    return (
      <div className="flex flex-col">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {locale === "ar" ? "معالجوك" : "Your therapists"}
        </p>
        <div className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-cream/30 p-8 text-center sm:p-12">
          <div className="relative flex h-20 w-24 items-center justify-center">
            {/* Pulsing glow background */}
            <div className="absolute h-16 w-16 rounded-full bg-lavender/10 animate-pulse duration-1000" />
            
            {/* Compass in background */}
            <Compass className="h-12 w-12 text-lavender/60 transition-transform duration-700 hover:rotate-45" />
            
            {/* Heart popping up in corner */}
            <div className="absolute bottom-1 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-cream shadow-sm">
              <Heart className="h-4 w-4 fill-blush text-blush" />
            </div>
          </div>
          
          <h3 className="mt-4 text-base font-bold text-ink">
            {locale === "ar" ? "ابدأ رحلة التعافي النفسي" : "Start Your Healing Journey"}
          </h3>
          
          <p className="mt-1 max-w-sm text-xs text-ink-muted leading-relaxed">
            {locale === "ar" 
              ? "تواصل مع معالجين نفسيين مرخصين ومتعاطفين مخصصين لرحلتك. جلستك الأولى في انتظارك." 
              : "Connect with certified, compassionate therapists dedicated to your journey. Your first session is waiting."}
          </p>
          
          <Link
            to="/dashboard/$role/find"
            params={{ role }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-cream transition-all duration-300 hover:scale-105 hover:bg-ink-muted active:scale-95 shadow-md hover:shadow-lg"
          >
            <span>{locale === "ar" ? "ابحث عن معالجك المثالي" : "Find Your Perfect Therapist"}</span>
            <ArrowRight className={`h-3 w-3 ${locale === "ar" ? "rotate-180" : ""}`} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {locale === "ar" ? "معالجوك" : "Your therapists"}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((item) => (
          <li key={item.therapistId} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-cream p-4">
            <div>
              <p className="font-semibold">{item.therapist?.displayName ?? item.therapistId}</p>
              <p className="text-xs text-ink-muted">
                {new Date(item.lastBookingAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
              </p>
            </div>
            <Link
              to="/book/$therapistId"
              params={{ therapistId: item.therapistId }}
              className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream"
            >
              {locale === "ar" ? "احجز مجددًا" : "Book again"}
            </Link>
          </li>
        ))}
      </ul>
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

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val === "string") return new Date(val);
  if (val instanceof Date) return val;
  if (typeof val.toDate === "function") return val.toDate();
  if (typeof val.toMillis === "function") return new Date(val.toMillis());
  if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
  return new Date(val);
}

function playRingtone() {
  if (typeof window === "undefined") return () => {};
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return () => {};
    const ctx = new AudioCtx();
    
    const interval = setInterval(() => {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      frequencies.forEach((f, index) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, now + index * 0.08);
        g.gain.setValueAtTime(0, now + index * 0.08);
        g.gain.linearRampToValueAtTime(0.15, now + index * 0.08 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.4);
        
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + index * 0.08);
        o.stop(now + index * 0.08 + 0.4);
      });
    }, 1500);

    return () => {
      clearInterval(interval);
      ctx.close().catch(() => {});
    };
  } catch (err) {
    console.warn("Ringtone error", err);
    return () => {};
  }
}

function IncomingCallOverlay({ sessions }: { sessions: any[] | null }) {
  const { locale } = useI18n();
  const [ignoredIds, setIgnoredIds] = React.useState<string[]>([]);
  const [isMuted, setIsMuted] = React.useState(false);

  const incomingCall = React.useMemo(() => {
    if (!sessions) return null;
    const nowMs = Date.now();
    return sessions.find((s) => {
      if (s.status !== "upcoming") return false;
      if (ignoredIds.includes(s.id)) return false;
      
      const start = toDate(s.startsAt).getTime();
      const diffMinutes = (nowMs - start) / 60000;
      return diffMinutes >= -1 && diffMinutes <= 5;
    });
  }, [sessions, ignoredIds]);

  React.useEffect(() => {
    if (!incomingCall || isMuted) return;
    const stopAudio = playRingtone();
    return () => {
      stopAudio();
    };
  }, [incomingCall, isMuted]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/95 p-6 text-cream text-center backdrop-blur-md">
      <div className="relative flex items-center justify-center h-48 w-48 mb-8">
        <motion.div
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute h-32 w-32 rounded-full border-2 border-emerald-500/40"
        />
        <motion.div
          animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
          className="absolute h-32 w-32 rounded-full border-2 border-emerald-500/30"
        />
        <motion.div
          animate={{ scale: [1, 1.4], opacity: [0.9, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1.2 }}
          className="absolute h-32 w-32 rounded-full border border-emerald-500/20"
        />
        <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500 text-cream shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse">
          <Video className="h-12 w-12 animate-[bounce_1.5s_infinite]" />
        </div>
      </div>

      <div className="max-w-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider animate-pulse border border-emerald-500/20 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {locale === "ar" ? "اتصال فوري وارد" : "Incoming Instant Session"}
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight">
          {locale === "ar" ? "جلسة فورية جديدة!" : "Incoming Session Call!"}
        </h2>
        <p className="mt-2 text-ink-muted text-sm md:text-base">
          {incomingCall.childName 
            ? (locale === "ar" ? `الجلسة من أجل الطفل: ${incomingCall.childName}` : `Session requested for: ${incomingCall.childName}`)
            : (incomingCall.patientName 
                ? (locale === "ar" ? `المريض: ${incomingCall.patientName}` : `Patient: ${incomingCall.patientName}`)
                : (locale === "ar" ? "طلب جلسة فورية من مريض مجهول الاسم" : "Requested by patient"))}
        </p>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
        <Link
          to="/dashboard/$role/sessions/$id"
          params={{ role: "therapist", id: incomingCall.id }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-4 font-semibold text-cream shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Video className="h-5 w-5" />
          {locale === "ar" ? "دخول الجلسة الفورية الآن" : "Join Instant Session Now"}
        </Link>
        
        <div className="flex gap-3 w-full">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex-1 flex items-center justify-center gap-2 rounded-full border border-border/40 bg-card/10 px-4 py-3 text-sm font-semibold hover:bg-card/20 transition-colors"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isMuted ? (locale === "ar" ? "تشغيل الصوت" : "Unmute") : (locale === "ar" ? "كتم الصوت" : "Mute")}
          </button>

          <button
            onClick={() => setIgnoredIds([...ignoredIds, incomingCall.id])}
            className="flex-1 flex items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm font-semibold hover:bg-red-500/20 transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            {locale === "ar" ? "تجاهل" : "Ignore"}
          </button>
        </div>
      </div>
    </div>
  );
}
