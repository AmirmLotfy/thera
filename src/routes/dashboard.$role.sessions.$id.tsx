import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { summarizeReport } from "@/lib/ai/client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Mic, MicOff, PhoneOff, FileText, Video, VideoOff, Check } from "lucide-react";
import type { DailyCall, DailyEventObjectAppMessage } from "@daily-co/daily-js";

export const Route = createFileRoute("/dashboard/$role/sessions/$id")({
  head: () => ({ meta: [{ title: "Session room — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <SessionRoom />
    </RouteGuard>
  ),
});

type TokenResponse = { roomUrl?: string | null; roomName?: string | null; token?: string | null; demo?: boolean };

function SessionRoom() {
  const { t, locale } = useI18n();
  const { id } = Route.useParams();
  const { user, effectiveRole } = useAuth();
  const reduce = useReducedMotion();
  const videoRef = React.useRef<HTMLDivElement>(null);
  const callRef = React.useRef<DailyCall | null>(null);

  const [phase, setPhase] = React.useState<"idle" | "connecting" | "live" | "ended">("idle");
  const [tokenInfo, setTokenInfo] = React.useState<TokenResponse | null>(null);
  const [mic, setMic] = React.useState(true);
  const [cam, setCam] = React.useState(true);
  const [chat, setChat] = React.useState<Array<{ from: string; text: string; at: number }>>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [showReport, setShowReport] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function fetchToken() {
      const idToken = await user!.getIdToken();
      const res = await fetch(`/api/sessions/${id}/token`, { headers: { Authorization: `Bearer ${idToken}` } });
      if (!res.ok) return;
      const json = await res.json() as TokenResponse;
      if (!cancelled) setTokenInfo(json);
    }
    void fetchToken();
    return () => { cancelled = true; };
  }, [id, user]);

  async function join() {
    if (!tokenInfo?.roomUrl) {
      setPhase("live");
      return;
    }
    setPhase("connecting");
    const [{ default: Daily }] = await Promise.all([import("@daily-co/daily-js")]);
    if (!videoRef.current) return;
    const frame = Daily.createFrame(videoRef.current, {
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "24px", background: "#1F1B2E" },
      showLeaveButton: false,
      showFullscreenButton: true,
    });
    callRef.current = frame;
    frame.on("joined-meeting", () => setPhase("live"));
    frame.on("left-meeting", () => setPhase("ended"));
    frame.on("app-message", (event: DailyEventObjectAppMessage) => {
      const payload = event?.data as { type?: string; text?: string } | undefined;
      if (payload?.type === "chat" && payload.text) {
        setChat((prev) => [...prev, { from: event.fromId ?? "guest", text: String(payload.text), at: Date.now() }]);
      }
    });
    await frame.join({ url: tokenInfo.roomUrl, token: tokenInfo.token ?? undefined, userName: user?.displayName ?? "Client" });
  }

  async function leave() {
    const call = callRef.current;
    if (call) { await call.leave(); await call.destroy(); callRef.current = null; }
    setPhase("ended");
    if (effectiveRole === "therapist") setShowReport(true);
  }

  React.useEffect(() => () => { void callRef.current?.destroy(); }, []);

  // Countdown to meeting start (best-effort demo)
  React.useEffect(() => {
    if (tokenInfo?.roomUrl) return;
    setCountdown(10 * 60);
    const i = setInterval(() => setCountdown((c) => (c != null && c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, [tokenInfo]);

  async function toggleMic() {
    const call = callRef.current; if (!call) return;
    call.setLocalAudio(!mic); setMic(!mic);
  }
  async function toggleCam() {
    const call = callRef.current; if (!call) return;
    call.setLocalVideo(!cam); setCam(!cam);
  }
  function sendChat() {
    const text = chatInput.trim(); if (!text) return;
    setChat((p) => [...p, { from: "me", text, at: Date.now() }]);
    callRef.current?.sendAppMessage({ type: "chat", text }, "*");
    setChatInput("");
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.sessions.title} · #{id.slice(0, 8)}</p>

        {phase === "idle" ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-3xl border border-border/70 bg-cream p-10 text-center shadow-soft"
          >
            <h1 className="font-display text-4xl md:text-5xl">{t.sessions.lobby}</h1>
            <p className="mt-3 text-sm text-ink-muted">{t.sessions.lobbySub}</p>
            {countdown != null ? (
              <p className="mt-6 text-xl font-semibold tabular-nums">{formatCountdown(countdown, locale)}</p>
            ) : null}
            <button onClick={join} className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream shadow-soft">{t.sessions.join}</button>
            {!tokenInfo?.roomUrl ? (
              <p className="mt-4 text-xs text-ink-muted">{locale === "ar" ? "وضع تجريبي — لا يوجد اتصال فيديو حقيقي" : "Demo mode — no live video connection"}</p>
            ) : null}
          </motion.div>
        ) : null}

        {(phase === "connecting" || phase === "live") ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-border/70 bg-ink">
              {tokenInfo?.roomUrl ? (
                <div ref={videoRef} className="h-full w-full" />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm text-cream/70">
                  {locale === "ar" ? "غرفة فيديو تجريبية" : "Demo video room"}
                </div>
              )}
              {phase === "connecting" ? (
                <div className="absolute inset-0 grid place-items-center bg-ink/70 text-cream">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : null}
            </div>

            <aside className="flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card">
              <div className="border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {locale === "ar" ? "المحادثة" : "Side chat"}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
                {chat.length === 0 ? (
                  <p className="text-ink-muted">{locale === "ar" ? "لم تبدأ محادثة بعد." : "No messages yet."}</p>
                ) : chat.map((m, i) => (
                  <div key={i} className={`rounded-2xl px-3 py-2 ${m.from === "me" ? "ms-auto w-fit bg-ink text-cream" : "w-fit bg-muted/60"}`}>{m.text}</div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-border/60 p-3">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder={locale === "ar" ? "اكتب رسالة..." : "Type a message"}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <button onClick={sendChat} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">{locale === "ar" ? "إرسال" : "Send"}</button>
              </div>
            </aside>
          </div>
        ) : null}

        {(phase === "connecting" || phase === "live") ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <ControlButton onClick={toggleMic} active={!mic} label={mic ? (locale === "ar" ? "كتم" : "Mute") : (locale === "ar" ? "تشغيل" : "Unmute")}>
              {mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </ControlButton>
            <ControlButton onClick={toggleCam} active={!cam} label={cam ? (locale === "ar" ? "إيقاف الكاميرا" : "Camera off") : (locale === "ar" ? "تشغيل الكاميرا" : "Camera on")}>
              {cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </ControlButton>
            <button onClick={leave} className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground">
              <PhoneOff className="h-4 w-4" /> {t.sessions.end}
            </button>
          </div>
        ) : null}

        {phase === "ended" ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-3xl border border-border/70 bg-cream p-8 text-center shadow-soft"
          >
            <h2 className="font-display text-3xl">{locale === "ar" ? "انتهت الجلسة" : "Session ended"}</h2>
            <p className="mt-2 text-sm text-ink-muted">{locale === "ar" ? "شكرًا لك. يمكنك مراجعة ملخص الجلسة في لوحة التحكم." : "Thanks for being here. Your dashboard now has a session summary."}</p>
            {effectiveRole === "therapist" && !showReport ? (
              <button onClick={() => setShowReport(true)} className="mt-4 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">{t.sessions.writeReport}</button>
            ) : null}
          </motion.div>
        ) : null}

        {showReport ? <ReportForm sessionId={id} onDone={() => setShowReport(false)} /> : null}
      </section>
    </SiteShell>
  );
}

function ControlButton({ children, onClick, active, label }: { children: React.ReactNode; onClick: () => void; active?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${active ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-card"}`}
    >{children}</button>
  );
}

function formatCountdown(seconds: number, locale: "en" | "ar") {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  const label = locale === "ar" ? "ستبدأ الجلسة خلال" : "Session starts in";
  return `${label} ${m}:${s}`;
}

function ReportForm({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [raw, setRaw] = React.useState("");
  const [summaryEn, setSummaryEn] = React.useState<string | null>(null);
  const [summaryAr, setSummaryAr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function generateSummary() {
    if (raw.trim().length < 30) return;
    setAiLoading(true);
    try {
      const r = await summarizeReport(raw, sessionId);
      setSummaryEn(r.summaryEn ?? r.summary ?? null);
      setSummaryAr(r.summaryAr ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/reports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ sessionId, raw }),
      });
      setSaved(true);
      setTimeout(onDone, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
      <h2 className="font-display text-2xl">{t.sessions.reportTitle}</h2>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={7}
        placeholder={t.sessions.reportPlaceholder}
        className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={generateSummary} disabled={aiLoading} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs">
          {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
          {locale === "ar" ? "ملخص ذكي" : "Generate bilingual summary"}
        </button>
        <button onClick={save} disabled={saving || raw.trim().length < 10} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : null}
          {t.common.submit}
        </button>
      </div>
      {summaryEn || summaryAr ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {summaryEn ? <SummaryCard title={t.sessions.summaryLangLabel} body={summaryEn} /> : null}
          {summaryAr ? <SummaryCard title="ملخص بالعربية" body={summaryAr} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-cream p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      <p className="mt-1 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
