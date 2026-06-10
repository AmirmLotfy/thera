import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useCareThreadsLive } from "@/lib/queries/care";
import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Loader2, MessageSquare } from "lucide-react";
import * as React from "react";
import type { TherapistDoc, UserDoc } from "@/lib/types";

export const Route = createFileRoute("/dashboard/$role/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <InboxListPage />
    </RouteGuard>
  ),
});

function InboxListPage() {
  const { locale } = useI18n();
  const { user, effectiveRole } = useAuth();
  const { role } = useParams({ from: "/dashboard/$role/inbox" });
  const queryRole: "patient" | "therapist" = effectiveRole === "therapist" ? "therapist" : "patient";
  const { data: threads = [], loading } = useCareThreadsLive(user?.uid, queryRole);
  const [labels, setLabels] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!isFirebaseConfigured || !db || threads.length === 0) return;
    let cancel = false;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(threads.map(async (t) => {
        const otherId = queryRole === "therapist" ? t.patientUid : t.therapistId;
        try {
          const coll = queryRole === "therapist" ? "users" : "therapists";
          const snap = await getDoc(doc(db, coll, otherId));
          if (snap.exists()) {
            const d = snap.data() as UserDoc | TherapistDoc;
            next[t.id] = ("displayName" in d ? d.displayName : otherId) ?? otherId;
          }
        } catch { /* ignore */ }
      }));
      if (!cancel) setLabels(next);
    })();
    return () => { cancel = true; };
  }, [threads, queryRole]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "الرسائل" : "Messages"}</p>
        <h1 className="mt-2 font-display text-4xl">{locale === "ar" ? "صندوق الوارد" : "Inbox"}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {locale === "ar" ? "رسائل غير متزامنة مع معالجك بعد تأكيد الحجز." : "Async messages with your therapist after a confirmed booking."}
        </p>

        {loading && (
          <div className="mt-10 flex items-center gap-2 text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</span>
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div className="mt-12 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-ink-muted" />
            <p className="mt-4 text-ink-muted">
              {locale === "ar" ? "لا توجد محادثات بعد." : "No conversations yet."}
            </p>
            {queryRole === "patient" && (
              <Link to="/dashboard/$role/find" params={{ role }} className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream">
                {locale === "ar" ? "احجز جلسة" : "Book a session"}
              </Link>
            )}
          </div>
        )}

        <ul className="mt-8 space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                to="/dashboard/$role/inbox/$threadId"
                params={{ role, threadId: t.id }}
                className="block rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-soft transition-colors hover:border-ink/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{labels[t.id] ?? (locale === "ar" ? "محادثة" : "Conversation")}</p>
                  {t.lastMessageAt ? (
                    <span className="text-xs text-ink-muted">
                      {new Date(String(t.lastMessageAt)).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
                  {t.lastMessagePreview ?? (locale === "ar" ? "ابدأ المحادثة" : "Start the conversation")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
