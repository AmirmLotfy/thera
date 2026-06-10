import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection, doc, getDoc, onSnapshot, query, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { Plus, Loader2, Check, Copy, QrCode } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import type { AvailabilitySlot } from "@/lib/types";

export const Route = createFileRoute("/dashboard/$role/availability")({
  head: () => ({ meta: [{ title: "Availability — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="therapist">
      <AvailabilityPage />
    </RouteGuard>
  ),
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const AR_DAYS = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"] as const;
const HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];

type InstapayDraft = { link: string; handle: string; recipientName: string };

function cellKey(day: (typeof DAYS)[number], hour: string) {
  return `${day}-${hour}`;
}

function slotIdFor(userId: string, weekStart: Date, day: (typeof DAYS)[number], hour: string) {
  const dayIdx = DAYS.indexOf(day);
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + dayIdx);
  d.setHours(Number(hour), 0, 0, 0);
  return `${userId}-${d.toISOString()}`;
}

function AvailabilityPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const [schedule, setSchedule] = React.useState<Record<string, boolean>>({});
  const [weekStart, setWeekStart] = React.useState<Date>(() => startOfWeek(new Date()));
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [allSlots, setAllSlots] = React.useState<AvailabilitySlot[]>([]);
  const [instapay, setInstapay] = React.useState<InstapayDraft>({ link: "", handle: "", recipientName: "" });
  const [savingIp, setSavingIp] = React.useState(false);
  const [savedIp, setSavedIp] = React.useState(false);

  const weekSlots = React.useMemo(() => {
    const start = weekStart.getTime();
    const end = start + 7 * 24 * 60 * 60 * 1000;
    return allSlots.filter((s) => {
      const t = new Date(s.startsAt).getTime();
      return t >= start && t < end;
    });
  }, [allSlots, weekStart]);

  const slotByCell = React.useMemo(() => {
    const map: Record<string, AvailabilitySlot> = {};
    for (const s of weekSlots) {
      const d = new Date(s.startsAt);
      const day = DAYS[(d.getDay() + 6) % 7];
      const hour = d.getHours().toString().padStart(2, "0");
      map[cellKey(day, hour)] = s;
    }
    return map;
  }, [weekSlots]);

  React.useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;
    const q = query(collection(db, "availabilitySlots"), where("therapistId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setAllSlots(snap.docs.map((d) => ({ ...(d.data() as AvailabilitySlot), id: d.id })));
    });
    getDoc(doc(db, "therapists", user.uid)).then((therapistSnap) => {
      if (therapistSnap.exists()) {
        const ip = therapistSnap.data()?.instapay ?? {};
        setInstapay({ link: ip.link ?? "", handle: ip.handle ?? "", recipientName: ip.recipientName ?? "" });
      }
    }).catch((err) => console.error("instapay load", err));
    return () => unsub();
  }, [user]);

  React.useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const s of weekSlots) {
      if (s.status === "open") {
        const d = new Date(s.startsAt);
        const day = DAYS[(d.getDay() + 6) % 7];
        const hour = d.getHours().toString().padStart(2, "0");
        map[cellKey(day, hour)] = true;
      }
    }
    setSchedule(map);
  }, [weekSlots]);

  async function saveInstapay() {
    if (!user) return;
    setSavingIp(true);
    try {
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, "therapists", user.uid), { instapay });
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      setSavedIp(true);
      setTimeout(() => setSavedIp(false), 2000);
    } catch (err) {
      console.error("instapay save", err);
    } finally {
      setSavingIp(false);
    }
  }

  function toggle(day: (typeof DAYS)[number], hour: string) {
    const k = cellKey(day, hour);
    const existing = slotByCell[k];
    if (existing && (existing.status === "locked" || existing.status === "booked")) {
      toast.error(
        locale === "ar"
          ? existing.status === "booked"
            ? "هذه الفترة محجوزة. ألغِ الحجز أولاً."
            : "هذه الفترة مقفلة أثناء الدفع."
          : existing.status === "booked"
            ? "This slot is booked. Cancel the booking first."
            : "This slot is locked while payment completes.",
      );
      return;
    }
    setSchedule((s) => ({ ...s, [k]: !s[k] }));
    setSaved(false);
  }

  function copyLastWeek() {
    const map = { ...schedule };
    for (const s of allSlots) {
      if (s.status !== "open") continue;
      const d = new Date(s.startsAt);
      const day = DAYS[(d.getDay() + 6) % 7];
      const hour = d.getHours().toString().padStart(2, "0");
      map[cellKey(day, hour)] = true;
    }
    setSchedule(map);
  }

  async function persist() {
    if (!user) return;
    setSaving(true);
    try {
      if (!isFirebaseConfigured || !db) {
        await new Promise((r) => setTimeout(r, 500));
        setSaved(true);
        return;
      }
      const batch = writeBatch(db);
      for (const day of DAYS) {
        for (const hour of HOURS) {
          const k = cellKey(day, hour);
          const active = !!schedule[k];
          const dayIdx = DAYS.indexOf(day);
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + dayIdx);
          d.setHours(Number(hour), 0, 0, 0);
          const endsAt = new Date(d);
          endsAt.setHours(d.getHours() + 1);
          const id = slotIdFor(user.uid, weekStart, day, hour);
          const ref = doc(db, "availabilitySlots", id);
          const existing = slotByCell[k];
          if (existing && (existing.status === "locked" || existing.status === "booked")) {
            continue;
          }
          if (active) {
            batch.set(ref, {
              id,
              therapistId: user.uid,
              startsAt: d.toISOString(),
              endsAt: endsAt.toISOString(),
              status: "open",
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } else if (!existing || existing.status === "open") {
            batch.delete(ref);
          }
        }
      }
      await batch.commit();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error("availability save", err);
      toast.error(locale === "ar" ? "تعذّر الحفظ" : "Could not save availability");
    } finally {
      setSaving(false);
    }
  }

  const open = weekSlots.filter((s) => s.status === "open").length;
  const locked = weekSlots.filter((s) => s.status === "locked").length;
  const booked = weekSlots.filter((s) => s.status === "booked").length;
  const utilization = open + booked > 0 ? Math.round((booked / (open + booked)) * 100) : 0;
  const dayLabels = locale === "ar" ? AR_DAYS : DAYS;

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "معالج" : "Therapist"}</p>
            <h1 className="mt-2 font-display text-4xl">{locale === "ar" ? "الأوقات المتاحة" : "Availability"}</h1>
            <p className="mt-2 text-ink-muted">{locale === "ar" ? "اضغط على خلية لفتح أو إغلاق فترة ساعة. المحجوزة والمقفلة محمية." : "Tap a cell to open or close a 1-hour slot. Booked and locked slots are protected."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">{locale === "ar" ? "الأسبوع السابق" : "Prev week"}</button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">{locale === "ar" ? "الأسبوع التالي" : "Next week"}</button>
            <button onClick={copyLastWeek} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> {locale === "ar" ? "نسخ المفتوحة" : "Copy open slots"}</button>
            <button onClick={persist} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {saved ? (locale === "ar" ? "محفوظ" : "Saved") : (locale === "ar" ? "حفظ الأسبوع" : "Save week")}
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-ink-muted">
          {locale === "ar" ? "الأسبوع الذي يبدأ" : "Week starting"} <strong>{new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" }).format(weekStart)}</strong>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Stat label={locale === "ar" ? "مفتوحة" : "Open"} value={String(open)} />
          <Stat label={locale === "ar" ? "مقفلة" : "Locked"} value={String(locked)} />
          <Stat label={locale === "ar" ? "محجوزة" : "Booked"} value={String(booked)} />
          <Stat label={locale === "ar" ? "الاستخدام" : "Utilization"} value={`${utilization}%`} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-mint/70" /> {locale === "ar" ? "مفتوحة" : "Open"}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-300/80" /> {locale === "ar" ? "مقفلة" : "Locked"}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lavender/80" /> {locale === "ar" ? "محجوزة" : "Booked"}</span>
        </div>

        <div className="mt-8 overflow-x-auto rounded-3xl border border-border/70 bg-card p-2 md:p-4">
          <table className="w-full min-w-[640px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="w-12 text-xs text-ink-muted" />
                {dayLabels.map((d) => (<th key={d} className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{d}</th>))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((h) => (
                <tr key={h}>
                  <td className="text-end pr-2 align-middle text-xs text-ink-muted">{h}:00</td>
                  {DAYS.map((d) => {
                    const k = cellKey(d, h);
                    const slot = slotByCell[k];
                    const status = slot?.status;
                    const on = !!schedule[k] || status === "locked" || status === "booked";
                    const disabled = status === "locked" || status === "booked";
                    const cls = status === "booked"
                      ? "bg-lavender/80 cursor-not-allowed"
                      : status === "locked"
                        ? "bg-amber-300/70 cursor-not-allowed"
                        : on
                          ? "bg-mint/70 text-ink hover:bg-mint"
                          : "bg-muted/60 hover:bg-lavender/40";
                    return (
                      <td key={k} className="p-0">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggle(d, h)}
                          className={`block h-9 w-full rounded-md text-xs transition-colors ${cls}`}
                          title={status ?? (on ? "open" : "closed")}
                        >{on ? "·" : ""}</button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-3xl border border-border/70 bg-cream p-5 text-sm text-ink-muted">
          {locale === "ar"
            ? "تُحدَّث الفترات مباشرة عند الحجز. لا يمكن حذف الفترات المقفلة أو المحجوزة من الشبكة."
            : "Slots update live when clients reserve. Locked and booked cells cannot be removed from the grid."}
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky/40"><QrCode className="h-4 w-4" /></span>
            <div>
              <h2 className="font-display text-2xl">{locale === "ar" ? "إعدادات InstaPay" : "InstaPay settings"}</h2>
              <p className="text-xs text-ink-muted">{locale === "ar" ? "يرى المرضى رابط InstaPay كزر على الجوال، وكود QR على الكمبيوتر." : "Patients see your InstaPay link as a tap button on mobile and a QR code on desktop."}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-3xl border border-border/70 bg-card p-6 shadow-soft md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">{locale === "ar" ? "رابط InstaPay" : "InstaPay link"}</span>
              <input
                value={instapay.link}
                onChange={(e) => setInstapay((p) => ({ ...p, link: e.target.value }))}
                placeholder="https://ipn.eg/S/your.handle"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">{locale === "ar" ? "المعرّف" : "Handle"}</span>
              <input
                value={instapay.handle}
                onChange={(e) => setInstapay((p) => ({ ...p, handle: e.target.value }))}
                placeholder="your.handle"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">{locale === "ar" ? "اسم المستلم" : "Recipient name"}</span>
              <input
                value={instapay.recipientName}
                onChange={(e) => setInstapay((p) => ({ ...p, recipientName: e.target.value }))}
                placeholder="Dr. Layla Hassan"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          {instapay.link && (
            <div className="mt-4 rounded-2xl border border-sky/40 bg-sky/10 p-4 text-xs text-ink-muted">
              {locale === "ar" ? "معاينة الرابط: " : "Link preview: "}
              <a href={instapay.link} target="_blank" rel="noreferrer" className="font-semibold text-ink underline">{instapay.link}</a>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={saveInstapay}
              disabled={savingIp}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
            >
              {savingIp ? <Loader2 className="h-4 w-4 animate-spin" /> : savedIp ? <Check className="h-4 w-4" /> : null}
              {savedIp ? (locale === "ar" ? "محفوظ" : "Saved") : (locale === "ar" ? "حفظ InstaPay" : "Save InstaPay")}
            </button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + days); return x;
}
