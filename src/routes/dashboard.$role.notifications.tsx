import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/queries/dashboard";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, query, updateDoc, where, writeBatch, doc } from "firebase/firestore";
import { Bell, Calendar, FileText, Flame, Heart, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/$role/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <NotificationsPage />
    </RouteGuard>
  ),
});

function NotificationsPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const notifsQ = useNotifications(user?.uid);

  async function markAll() {
    if (!user || !isFirebaseConfigured || !db) return;
    try {
      const q = query(collection(db, "notifications"), where("uid", "==", user.uid), where("read", "==", false), limit(50));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
      await notifsQ.refetch();
    } catch (e) {
      console.error(e);
      toast.error(locale === "ar" ? "تعذّر تعليم الكل كمقروء." : "Couldn’t mark all as read.");
    }
  }

  async function markOne(id: string) {
    if (!isFirebaseConfigured || !db) return;
    await updateDoc(doc(db, "notifications", id), { read: true });
    await notifsQ.refetch();
  }

  const items = notifsQ.data ?? [];
  const today: typeof items = [];
  const yesterday: typeof items = [];
  const earlier: typeof items = [];
  const now = Date.now();
  for (const n of items) {
    const at = (n.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? (n.createdAt instanceof Date ? (n.createdAt as Date).getTime() : now);
    const delta = now - at;
    if (delta < 24 * 3600 * 1000) today.push(n);
    else if (delta < 48 * 3600 * 1000) yesterday.push(n);
    else earlier.push(n);
  }
  const groups: Array<{ label: string; list: typeof items }> = [
    { label: locale === "ar" ? "اليوم" : "Today", list: today },
    { label: locale === "ar" ? "الأمس" : "Yesterday", list: yesterday },
    { label: locale === "ar" ? "سابقًا" : "Earlier", list: earlier },
  ];

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.dash.notifications}</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{t.dash.notifications}</h1>
          </div>
          <button onClick={markAll} className="text-xs text-ink-muted underline">{locale === "ar" ? "تعليم الكل مقروء" : "Mark all read"}</button>
        </div>

        {notifsQ.isLoading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-muted/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-border/70 bg-cream p-10 text-center text-sm text-ink-muted">
            <Bell className="mx-auto mb-3 h-5 w-5" /> {locale === "ar" ? "لا توجد إشعارات بعد." : "You're all caught up."}
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {groups.filter((g) => g.list.length > 0).map((g) => (
              <div key={g.label}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{g.label}</h2>
                <div className="mt-3 space-y-3">
                  {g.list.map((n) => {
                    const Icon = iconFor(n.kind ?? "system");
                    const color = colorFor(n.kind ?? "system");
                    return (
                      <button
                        key={n.id}
                        onClick={() => void markOne(n.id)}
                        className="flex w-full gap-4 rounded-3xl border border-border/70 bg-card p-5 text-start shadow-soft transition-transform hover:-translate-y-0.5"
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-display text-lg">{n.title}</p>
                          </div>
                          <p className="mt-1 text-sm text-ink-muted">{n.body}</p>
                        </div>
                        {!n.read ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ink" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-3xl border border-border/70 bg-cream p-5 text-center text-xs text-ink-muted">
          {locale === "ar" ? "اضبط التنبيهات في ملفك الشخصي." : "Adjust delivery settings in your profile."}
        </div>
      </section>
    </SiteShell>
  );
}

function iconFor(kind: string) {
  if (kind.startsWith("booking")) return Calendar;
  if (kind.startsWith("report")) return FileText;
  if (kind.startsWith("session")) return Calendar;
  if (kind === "approval") return CheckCircle2;
  if (kind === "reminder") return AlertTriangle;
  if (kind === "system") return Info;
  return Bell;
}
function colorFor(kind: string) {
  if (kind.startsWith("booking")) return "bg-sky/60";
  if (kind.startsWith("report")) return "bg-blush/60";
  if (kind.startsWith("session")) return "bg-lavender/60";
  if (kind === "approval") return "bg-mint/60";
  if (kind === "reminder") return "bg-cream";
  return "bg-lavender/40";
}
