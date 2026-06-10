import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { Timer, Wind, Music, Target, Heart, Play, Pause, RotateCcw, Flame, Volume2, VolumeX } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/$role/vibe")({
  head: () => ({ meta: [{ title: "Teen Vibe — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <VibePage />
    </RouteGuard>
  ),
});

function VibePage() {
  const { t, locale } = useI18n();
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.dash.vibe}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{t.teen.vibeTitle}</h1>
        <p className="mt-2 text-ink-muted">{t.teen.vibeSub}</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Pomodoro />
          <Breathing />
          <CalmSounds />
          <QuickCheckIn />
          <MicroQuest />
          <EscapeHatch />
        </div>
      </section>
    </SiteShell>
  );
}

function Pomodoro() {
  const { t, locale } = useI18n();
  const [mode, setMode] = React.useState<"focus" | "short" | "long">("focus");
  const durations = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const [remaining, setRemaining] = React.useState(durations.focus);
  const [running, setRunning] = React.useState(false);
  const [completed, setCompleted] = React.useState(0);
  const ctxRef = React.useRef<AudioContext | null>(null);

  React.useEffect(() => { setRemaining(durations[mode]); }, [mode]);
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);
  React.useEffect(() => {
    if (!running) return;
    if (remaining === 0) {
      playChime();
      setRunning(false);
      if (mode === "focus") setCompleted((c) => c + 1);
      setMode(mode === "focus" ? (completed + 1) % 4 === 0 ? "long" : "short" : "focus");
    }
  }, [remaining, running, mode, completed]);

  function playChime() {
    try {
      const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!ctxRef.current) ctxRef.current = new AC();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 660;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch { /* ignore */ }
  }

  const total = durations[mode];
  const pct = 1 - remaining / total;

  return (
    <div className="col-span-1 rounded-3xl border border-border/70 bg-card p-6 shadow-soft md:col-span-1 lg:col-span-1">
      <div className="flex items-center gap-2"><Timer className="h-4 w-4" /> <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.teen.pomodoro}</p></div>
      <div className="mt-4 flex gap-2">
        {(["focus", "short", "long"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setRunning(false); }}
            className={`rounded-full px-3 py-1.5 text-xs ${mode === m ? "bg-ink text-cream" : "border border-border bg-card"}`}
          >
            {m === "focus" ? t.teen.focus : m === "short" ? t.teen.short : t.teen.long}
          </button>
        ))}
      </div>
      <div className="mt-6 grid place-items-center">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx={50} cy={50} r={44} stroke="var(--color-muted)" strokeWidth={8} fill="none" />
            <circle
              cx={50} cy={50} r={44}
              stroke="var(--color-lavender)" strokeWidth={8} fill="none"
              strokeDasharray={`${pct * 276} 276`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-display text-3xl tabular-nums">{formatTime(remaining)}</div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? t.teen.pause : (remaining < total ? t.teen.resume : t.teen.start)}
        </button>
        <button onClick={() => { setRemaining(total); setRunning(false); }} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
          <RotateCcw className="h-3.5 w-3.5" /> {t.teen.reset}
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-ink-muted">{completed} {t.teen.session}{completed === 1 ? "" : "s"} · {locale === "ar" ? "اليوم" : "today"}</p>
    </div>
  );
}

function Breathing() {
  const { t, locale } = useI18n();
  const [running, setRunning] = React.useState(false);
  const [phase, setPhase] = React.useState<"inhale" | "hold" | "exhale">("inhale");
  const [seconds, setSeconds] = React.useState(4);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!running) return;
    let t = 4;
    setPhase("inhale"); setSeconds(t);
    const order: Array<{ p: "inhale" | "hold" | "exhale"; d: number }> = [
      { p: "inhale", d: 4 },
      { p: "hold", d: 4 },
      { p: "exhale", d: 4 },
      { p: "hold", d: 4 },
    ];
    let i = 0;
    const id = setInterval(() => {
      t -= 1;
      if (t === 0) {
        i = (i + 1) % order.length;
        t = order[i].d;
        setPhase(order[i].p);
      }
      setSeconds(t);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const label = phase === "inhale" ? t.teen.inhale : phase === "hold" ? t.teen.hold : t.teen.exhale;

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2"><Wind className="h-4 w-4" /> <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.teen.breathing}</p></div>
      <div className="mt-6 grid place-items-center">
        <motion.div
          className="relative h-40 w-40 rounded-full bg-sky/60"
          animate={reduce ? undefined : running ? { scale: phase === "inhale" ? 1.2 : phase === "exhale" ? 0.75 : 1.0 } : { scale: 1 }}
          transition={{ duration: seconds, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-sm text-ink-muted">{running ? label : locale === "ar" ? "ابدأ" : "Ready?"}</p>
              {running ? <p className="mt-1 font-display text-3xl tabular-nums">{seconds}</p> : null}
            </div>
          </div>
        </motion.div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream">
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? t.teen.pause : t.teen.start}
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-ink-muted">{locale === "ar" ? "صندوق 4 · 4 · 4 · 4" : "Box · 4 · 4 · 4 · 4"}</p>
    </div>
  );
}

function CalmSounds() {
  const { t, locale } = useI18n();
  const tracks = [
    { key: "brown", label: locale === "ar" ? "ضجيج بني" : "Brown noise", kind: "noise" as const },
    { key: "white", label: locale === "ar" ? "ضجيج أبيض" : "White noise", kind: "noise" as const },
    { key: "rain", label: locale === "ar" ? "مطر" : "Rain", kind: "rain" as const },
    { key: "drone", label: locale === "ar" ? "طيف هادئ" : "Ambient drone", kind: "drone" as const },
  ];
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [volume, setVolume] = React.useState(0.3);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const nodesRef = React.useRef<{ source?: AudioNode; gain?: GainNode; extra?: AudioNode[] }>({});

  function ensureCtx() {
    const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    return ctxRef.current;
  }

  function stopAll() {
    const n = nodesRef.current;
    try { (n.source as unknown as { stop?: () => void })?.stop?.(); } catch { /* ignore */ }
    try { n.extra?.forEach((node) => (node as unknown as { stop?: () => void })?.stop?.()); } catch { /* ignore */ }
    nodesRef.current = {};
  }

  React.useEffect(() => () => { stopAll(); void ctxRef.current?.close(); }, []);

  function play(kind: "noise" | "rain" | "drone") {
    const ctx = ensureCtx(); if (!ctx) return;
    stopAll();
    const gain = ctx.createGain(); gain.gain.value = volume; gain.connect(ctx.destination);
    if (kind === "noise") {
      const bufferSize = 2 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(gain); src.start();
      nodesRef.current = { source: src, gain };
    } else if (kind === "rain") {
      const bufferSize = 2 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 0.6 - 0.3;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 1500;
      src.connect(filter); filter.connect(gain); src.start();
      nodesRef.current = { source: src, gain, extra: [filter] };
    } else {
      const o1 = ctx.createOscillator(); o1.frequency.value = 110; o1.type = "sine";
      const o2 = ctx.createOscillator(); o2.frequency.value = 165; o2.type = "sine";
      const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 450;
      o1.connect(filter); o2.connect(filter); filter.connect(gain); o1.start(); o2.start();
      nodesRef.current = { source: o1, gain, extra: [o2, filter] };
    }
  }

  function toggle(key: string, kind: "noise" | "rain" | "drone") {
    if (activeKey === key) { stopAll(); setActiveKey(null); return; }
    play(kind); setActiveKey(key);
  }

  React.useEffect(() => { if (nodesRef.current.gain) nodesRef.current.gain.gain.value = volume; }, [volume]);

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2"><Music className="h-4 w-4" /> <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.teen.music}</p></div>
      <div className="mt-4 space-y-2">
        {tracks.map((track) => (
          <button
            key={track.key}
            onClick={() => toggle(track.key, track.kind)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors ${activeKey === track.key ? "border-ink bg-ink text-cream" : "border-border bg-card"}`}
          >
            <span>{track.label}</span>
            {activeKey === track.key ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        {volume > 0.02 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1" />
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">{locale === "ar" ? "توليد صوتي بالكامل في المتصفح — بلا تتبع." : "Generated in-browser — no tracking, no streaming."}</p>
    </div>
  );
}

function QuickCheckIn() {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const [picked, setPicked] = React.useState<number | null>(null);
  const [saved, setSaved] = React.useState(false);
  const moods = [
    { score: 5, label: locale === "ar" ? "هادئ" : "Calm", emoji: "😌" },
    { score: 4, label: locale === "ar" ? "مرتاح" : "Good", emoji: "🙂" },
    { score: 3, label: locale === "ar" ? "متعب" : "Tired", emoji: "🥱" },
    { score: 2, label: locale === "ar" ? "متوتر" : "Stressed", emoji: "😣" },
    { score: 1, label: locale === "ar" ? "محبط" : "Down", emoji: "😢" },
  ];

  async function pick(score: number) {
    setPicked(score); setSaved(false);
    if (!user) return;
    const dateKey = new Date().toISOString().slice(0, 10);
    try {
      if (isFirebaseConfigured && db) {
        const id = `${user.uid}_${dateKey}`;
        await setDoc(doc(db, "moodLogs", id), {
          id, uid: user.uid, date: dateKey, score, tags: [], createdAt: serverTimestamp(),
        }, { merge: true });
        await updateDoc(doc(db, "users", user.uid), {
          xp: increment(5), streak: increment(1), lastCheckIn: dateKey,
        });
      }
      setSaved(true);
    } catch (err) {
      console.error(err);
      toast.error(locale === "ar" ? "تعذّر حفظ الشعور." : "Couldn’t save your check-in.");
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2"><Heart className="h-4 w-4" /> <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.teen.checkIn}</p></div>
      <p className="mt-1 text-sm text-ink-muted">{t.teen.checkInSub}</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {moods.map((m) => (
          <button
            key={m.score}
            onClick={() => pick(m.score)}
            aria-label={m.label}
            className={`grid place-items-center rounded-2xl p-3 text-2xl transition-colors ${picked === m.score ? "bg-mint/70" : "bg-muted/60 hover:bg-lavender/40"}`}
          >{m.emoji}</button>
        ))}
      </div>
      {saved ? <p className="mt-4 rounded-2xl bg-blush/50 px-4 py-2 text-sm flex items-center gap-2"><Flame className="h-3 w-3" /> {locale === "ar" ? "تم تسجيل الشعور." : "Logged. Your streak just grew."}</p> : null}
      <p className="mt-3 text-xs text-ink-muted">XP: {profile?.xp ?? 0} · Streak: {profile?.streak ?? 0}</p>
    </div>
  );
}

function MicroQuest() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const [done, setDone] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const quests = [
    locale === "ar" ? "أرسل ميم لصديق لم تتحدث معه منذ أسبوع." : "Send a meme to a friend you haven't talked to in a week.",
    locale === "ar" ? "اكتب جملة واحدة ممتن لها اليوم." : "Write one sentence you're grateful for today.",
    locale === "ar" ? "امشِ خمس دقائق بعيدًا عن الشاشة." : "Take a 5-minute walk away from screens.",
  ];
  const quest = quests[new Date().getDate() % quests.length];

  async function markDone() {
    if (!user || done) return;
    setSaving(true);
    try {
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, "users", user.uid), { xp: increment(15), updatedAt: new Date() });
      }
      setDone(true);
    } catch (err) {
      console.error("microquest xp", err);
      toast.error(locale === "ar" ? "تعذّر حفظ المكافأة." : "Couldn’t save XP.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-lavender/50 p-6 shadow-soft">
      <div className="flex items-center gap-2"><Target className="h-4 w-4" /> <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{locale === "ar" ? "مهمة اليوم" : "Today's micro-quest"}</p></div>
      <p className="mt-3 text-base">{quest}</p>
      <p className="mt-2 text-xs text-ink-muted">+15 XP</p>
      <button
        onClick={markDone}
        disabled={done || saving}
        className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
      >{done ? (locale === "ar" ? "أحسنت! +15 XP" : "Nice one! +15 XP") : (locale === "ar" ? "أنجزتها" : "Mark done")}</button>
    </div>
  );
}

function EscapeHatch() {
  const { locale } = useI18n();
  return (
    <div className="rounded-3xl bg-ink p-6 text-cream shadow-soft">
      <h3 className="font-display text-2xl">{locale === "ar" ? "يوم ثقيل؟" : "Heavy stuff today?"}</h3>
      <p className="mt-2 text-sm text-cream/80">{locale === "ar" ? "لا ضغط. ثيرا هنا، ومعالج حقيقي على بعد نقرة." : "No pressure. Thera AI is here, and a real therapist is a tap away."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/dashboard/$role/chat" params={{ role: "teen" }} className="rounded-full bg-cream px-4 py-2 text-xs font-semibold text-ink">{locale === "ar" ? "محادثة ثيرا" : "Chat with Thera"}</Link>
        <Link to="/dashboard/$role/find" params={{ role: "teen" }} className="rounded-full border border-cream/40 px-4 py-2 text-xs font-semibold">{locale === "ar" ? "معالج" : "Find a therapist"}</Link>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}
