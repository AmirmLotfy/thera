import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useMyAchievements } from "@/lib/queries/dashboard";
import { Footprints, Flame, Wind, Calendar, BookOpen, Lock } from "lucide-react";
import * as React from "react";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/dashboard/$role/achievements")({
  head: () => ({ meta: [{ title: "Achievements — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <AchievementsPage />
    </RouteGuard>
  ),
});

function AchievementsPage() {
  const { t } = useI18n();
  const { profile, user } = useAuth();
  const { data: achievements = [] } = useMyAchievements(user?.uid);
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.streak ?? 0;
  const unlockedKeys = new Set(achievements.map((a) => a.key));

  const badges = [
    { Icon: Footprints, key: "firstStep", got: xp > 0 || unlockedKeys.has("first_check_in") || unlockedKeys.has("firstStep") },
    { Icon: Flame, key: "sevenStreak", got: streak >= 7 || unlockedKeys.has("streak_7") || unlockedKeys.has("sevenStreak") },
    { Icon: Wind, key: "calmBreather", got: xp >= 50 || unlockedKeys.has("calm_breather") || unlockedKeys.has("calmBreather") },
    { Icon: Calendar, key: "braveBooking", got: unlockedKeys.has("brave_booking") || unlockedKeys.has("braveBooking") },
    { Icon: BookOpen, key: "reflective", got: unlockedKeys.has("reflective") },
  ] as const;

  const gotSignature = badges.filter((b) => b.got).map((b) => b.key).join("|");

  React.useEffect(() => {
    if (!user) return;
    const gotKeys = badges.filter((b) => b.got).map((b) => b.key);
    const storageKey = `thera.ach.seen.${user.uid}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(gotKeys));
      return;
    }
    let seen: string[] = [];
    try {
      seen = JSON.parse(raw) as string[];
    } catch {
      seen = [];
    }
    const newly = gotKeys.filter((k) => !seen.includes(k));
    if (newly.length > 0) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.3 }, colors: ["#CDB4DB", "#FFD6E7", "#A8DADC"] });
    }
    localStorage.setItem(storageKey, JSON.stringify([...new Set([...seen, ...gotKeys])]));
  }, [user, gotSignature]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.dash.achievements}</p>
        <h1 className="mt-2 font-display text-4xl">{t.achv.title}</h1>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label={t.achv.level} value={String(level)} />
          <Stat label={t.achv.xp} value={String(xp)} />
          <Stat label={t.achv.streak} value={String(streak)} />
        </div>

        <h2 className="mt-10 font-display text-2xl">{t.achv.badges}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {badges.map(({ Icon, key, got }) => {
            const title = t.achv[key as keyof typeof t.achv] as string;
            const body = t.achv[`${key}Body` as keyof typeof t.achv] as string;
            return (
              <div key={key} className={`rounded-3xl border border-border/70 p-5 ${got ? "bg-card" : "bg-muted/40 opacity-70"}`}>
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${got ? "bg-aqua" : "bg-card"}`}>
                  {got ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </span>
                <h3 className="mt-4 font-display text-lg">{title}</h3>
                <p className="mt-1 text-xs text-ink-muted">{body}</p>
                {!got && <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-muted">{t.achv.locked}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 text-center">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
