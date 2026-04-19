import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useRecentMoodLogs } from "@/lib/queries/dashboard";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, increment, updateDoc } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Loader2, Check } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/$role/mood")({
  head: () => ({ meta: [{ title: "Mood check-in — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <MoodPage />
    </RouteGuard>
  ),
});

function MoodPage() {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const moodsQ = useRecentMoodLogs(user?.uid);
  const reduce = useReducedMotion();
  const [score, setScore] = React.useState<number | null>(null);
  const [tags, setTags] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  function toggleTag(tag: string) {
    setTags((arr) => arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag]);
  }

  async function save() {
    if (!score || !user) return;
    setSaving(true);
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      if (isFirebaseConfigured && db) {
        const id = `${user.uid}_${dateKey}`;
        await setDoc(doc(db, "moodLogs", id), {
          id, uid: user.uid, date: dateKey, score, tags, note,
          createdAt: serverTimestamp(),
        }, { merge: true });
        await updateDoc(doc(db, "users", user.uid), {
          xp: increment(10),
          streak: increment(1),
          lastCheckIn: dateKey,
        });
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }
      setSaved(true);
      await moodsQ.refetch();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("mood save", err);
      toast.error(locale === "ar" ? "تعذّر حفظ المزاج." : "Couldn’t save your mood check-in.");
    } finally {
      setSaving(false);
    }
  }

  const faces = ["😞", "😕", "😐", "🙂", "😊"];
  const history = (moodsQ.data ?? []).slice(0, 14).reverse();

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.dash.mood}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{t.mood.title}</h1>
        <p className="mt-2 text-ink-muted">{t.mood.sub}</p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-3xl border border-border/70 bg-card p-6 shadow-soft"
        >
          <div className="flex flex-wrap justify-between gap-2">
            {faces.map((f, i) => (
              <motion.button
                key={i}
                whileHover={reduce ? undefined : { scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setScore(i + 1)}
                aria-label={`Mood ${i + 1}`}
                className={`h-16 w-16 rounded-2xl text-3xl transition-colors ${score === i + 1 ? "bg-mint/70" : "bg-muted/60 hover:bg-lavender/40"}`}
              >
                {f}
              </motion.button>
            ))}
          </div>

          <p className="mt-8 text-sm font-semibold">{t.mood.tagsLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.mood.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${tags.includes(tag) ? "border-ink bg-ink text-cream" : "border-border bg-card"}`}
              >
                {tag}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm font-semibold">{t.mood.noteLabel}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          />

          <button
            onClick={save}
            disabled={!score || saving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream shadow-soft disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? t.mood.saved : t.common.save}
          </button>
        </motion.div>

        <div className="mt-8 rounded-3xl border border-border/70 bg-cream p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.mood.historyTitle}</p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">{locale === "ar" ? "ابدأ اليوم بنقرة واحدة." : "Start today with one tap."}</p>
          ) : (
            <div className="mt-4 flex items-end gap-1">
              {history.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-xl bg-lavender/40" style={{ height: `${m.score * 18}px` }} />
                  <span className="text-[10px] text-ink-muted">{m.date.slice(8, 10)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-5 text-xs text-ink-muted flex items-center gap-2">
            <Flame className="h-3 w-3 text-blush" /> {t.achv.xp}: {profile?.xp ?? 0} · {t.achv.streak}: {profile?.streak ?? 0}
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
