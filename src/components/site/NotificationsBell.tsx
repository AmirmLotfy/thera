import * as React from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection, onSnapshot, orderBy, query, where, updateDoc, doc, limit, getDocs, writeBatch,
} from "firebase/firestore";
import { useI18n } from "@/i18n/I18nProvider";

type Notif = {
  id: string;
  title: string; body: string;
  titleEn?: string; titleAr?: string;
  bodyEn?: string; bodyAr?: string;
  read?: boolean;
  createdAt?: { toMillis?: () => number };
};

export function NotificationsBell() {
  const { user, effectiveRole } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = React.useState<Notif[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ ...(d.data() as Notif), id: d.id })));
    });
    return () => unsub();
  }, [user]);

  const unread = items.filter((n) => !n.read).length;
  const role = effectiveRole ?? "adult";
  const ar = locale === "ar";

  function notifTitle(n: Notif) {
    return ar ? (n.titleAr ?? n.title) : (n.titleEn ?? n.title);
  }
  function notifBody(n: Notif) {
    return ar ? (n.bodyAr ?? n.body) : (n.bodyEn ?? n.body);
  }

  async function markAll() {
    if (!user || !isFirebaseConfigured || !db) return;
    const q = query(collection(db, "notifications"), where("uid", "==", user.uid), where("read", "==", false), limit(50));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  }

  async function markOne(id: string) {
    if (!isFirebaseConfigured || !db) return;
    await updateDoc(doc(db, "notifications", id), { read: true });
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.notifications.bellLabel}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-muted/60"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-blush px-1 text-[10px] font-bold text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.notifications.bellLabel}</p>
              {unread > 0 ? (
                <button onClick={markAll} className="text-xs text-ink underline">{t.notifications.bellMarkAll}</button>
              ) : null}
            </div>
            <div className="max-h-80 divide-y divide-border/60 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-muted">{t.notifications.bellEmpty}</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { void markOne(n.id); setOpen(false); }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-muted/40"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted" : "bg-lavender"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{notifTitle(n)}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{notifBody(n)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <Link
              to="/dashboard/$role/notifications"
              params={{ role }}
              onClick={() => setOpen(false)}
              className="block border-t border-border/60 px-4 py-3 text-center text-xs font-semibold hover:bg-muted/40"
            >
              {t.notifications.bellViewAll}
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
