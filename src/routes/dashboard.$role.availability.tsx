import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { Plus, Loader2, Check, Copy, QrCode } from "lucide-react";
import * as React from "react";

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

type Slot = { id: string; therapistId: string; startsAt: string; endsAt: string; status: "open" | "locked" | "booked" };

type InstapayDraft = { link: string; handle: string; recipientName: string };

function AvailabilityPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const [schedule, setSchedule] = React.useState<Record<string, boolean>>({});
  const [weekStart, setWeekStart] = React.useState<Date>(() => startOfWeek(new Date()));
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [existing, setExisting] = React.useState<Slot[]>([]);
  const [instapay, setInstapay] = React.useState<InstapayDraft>({ link: "", handle: "", recipientName: "" });
  const [savingIp, setSavingIp] = React.useState(false);
  const [savedIp, setSavedIp] = React.useState(false);

  React.useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;
    let cancel = false;
    (async () => {
      try {
        const [slotsSnap, therapistSnap] = await Promise.all([
          getDocs(query(collection(db, "availabilitySlots"), where("therapistId", "==", user.uid))),
          getDoc(doc(db, "therapists", user.uid)),
        ]);
        if (cancel) return;
        const items = slotsSnap.docs.map((d) => ({ ...(d.data() as Slot), id: d.id }));
        setExisting(items);
        const map: Record<string, boolean> = {};
        for (const s of items) {
          const d = new Date(s.startsAt);
          const day = DAYS[(d.getDay() + 6) % 7];
          const hour = d.getHours().toString().padStart(2, "0");
          map[`${day}-${hour}`] = true;
        }
        setSchedule(map);
        if (therapistSnap.exists()) {
          const ip = therapistSnap.data()?.instapay ?? {};
          setInstapay({ link: ip.link ?? "", handle: ip.handle ?? "", recipientName: ip.recipientName ?? "" });
        }
      } catch (err) {
        console.error("availability load", err);
      }
    })();
    return () => { cancel = true; };
  }, [user]);

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
    const k = `${day}-${hour}`;
    setSchedule((s) => ({ ...s, [k]: !s[k] }));
    setSaved(false);
  }

  function copyLastWeek() {
    if (existing.length === 0) return;
    const map = { ...schedule };
    for (const s of existing) {
      const d = new Date(s.startsAt);
      const day = DAYS[(d.getDay() + 6) % 7];
      const hour = d.getHours().toString().padStart(2, "0");
      map[`${day}-${hour}`] = true;
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
          const k = `${day}-${hour}`;
          const active = !!schedule[k];
          const dayIdx = DAYS.indexOf(day);
          const d = new Date(weekStart); d.setDate(weekStart.getDate() + dayIdx); d.setHours(Number(hour), 0, 0, 0);
          const endsAt = new Date(d); endsAt.setHours(d.getHours() + 1);
          const id = `${user.uid}-${d.toISOString()}`;
          const ref = doc(db, "availabilitySlots", id);
          if (active) {
            batch.set(ref, {
              id,
              therapistId: user.uid,
              startsAt: d.toISOString(),
              endsAt: endsAt.toISOString(),
              status: "open",
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } else {
            batch.delete(ref);
          }
        }
      }
      await batch.commit();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error("availability save", err);
    } finally {
      setSaving(false);
    }
  }

  const open = Object.values(schedule).filter(Boolean).length;
  const booked = existing.filter((s) => s.status === "booked").length;
  const utilization = open ? Math.round((booked / open) * 100) : 0;
  const dayLabels = locale === "ar" ? AR_DAYS : DAYS;

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "معالج" : "Therapist"}</p>
            <h1 className="mt-2 font-display text-4xl">{locale === "ar" ? "الأوقات المتاحة" : "Availability"}</h1>
            <p className="mt-2 text-ink-muted">{locale === "ar" ? "اضغط على خلية لفتح أو إغلاق فترة ساعة. يرى العملاء الفترات المفتوحة فقط." : "Tap a cell to open or close a 1-hour slot. Clients see only open slots."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">{locale === "ar" ? "الأسبوع السابق" : "Prev week"}</button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">{locale === "ar" ? "الأسبوع التالي" : "Next week"}</button>
            <button onClick={copyLastWeek} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> {locale === "ar" ? "نسخ من الحالي" : "Copy existing"}</button>
            <button onClick={persist} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {saved ? (locale === "ar" ? "محفوظ" : "Saved") : (locale === "ar" ? "حفظ الأسبوع" : "Save week")}
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-ink-muted">
          {locale === "ar" ? "الأسبوع الذي يبدأ" : "Week starting"} <strong>{new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" }).format(weekStart)}</strong>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Stat label={locale === "ar" ? "فترات مفتوحة" : "Open slots"} value={String(open)} />
          <Stat label={locale === "ar" ? "محجوزة" : "Booked"} value={String(booked)} />
          <Stat label={locale === "ar" ? "الاستخدام" : "Utilization"} value={`${utilization}%`} />
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
                    const k = `${d}-${h}`;
                    const on = !!schedule[k];
                    return (
                      <td key={k} className="p-0">
                        <button
                          onClick={() => toggle(d, h)}
                          className={`block h-9 w-full rounded-md text-xs transition-colors ${on ? "bg-mint/70 text-ink" : "bg-muted/60 hover:bg-lavender/40"}`}
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
            ? "تُكتب الفترات إلى مجموعة availabilitySlots. يتم قفل الفترة عند الحجز وتُحدَّث إلى محجوزة بعد الدفع."
            : "Saved slots write to availabilitySlots. They lock when a client reserves and flip to booked once payment confirms."}
        </div>

        {/* InstaPay settings card */}
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
  const day = (x.getDay() + 6) % 7; // Monday-first
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + days); return x;
}
