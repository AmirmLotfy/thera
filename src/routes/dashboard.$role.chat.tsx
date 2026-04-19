import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth, type Role } from "@/lib/auth";
import { streamChat, type ClientMessage } from "@/lib/ai/client";
import { CRISIS_HOTLINES } from "@/lib/ai/prompts";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Send, ShieldAlert, Mic, RotateCw, Wind, Smile, CalendarCheck, Phone,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/$role/chat")({
  head: () => ({ meta: [{ title: "Thera AI · Chat" }] }),
  component: ChatPage,
});

type ChatMessage = ClientMessage & { id: string; crisis?: boolean; pending?: boolean };

function greetingFor(role: Role, locale: "en" | "ar", t: ReturnType<typeof useI18n>["t"]): string {
  const key = (["adult", "parent", "teen", "therapist"].includes(role) ? role : "adult") as Role;
  if (locale === "ar") {
    return ({
      adult: t.ai.greetingAdult,
      parent: t.ai.greetingParent,
      teen: t.ai.greetingTeen,
      therapist: t.ai.greetingTherapist,
      admin: t.ai.greetingAdult,
    } as Record<Role, string>)[key];
  }
  return ({
    adult: t.ai.greetingAdult,
    parent: t.ai.greetingParent,
    teen: t.ai.greetingTeen,
    therapist: t.ai.greetingTherapist,
    admin: t.ai.greetingAdult,
  } as Record<Role, string>)[key];
}

function ChatPage() {
  return (
    <RouteGuard requireAuth requireVerified={false}>
      <Chat />
    </RouteGuard>
  );
}

function Chat() {
  const { role: roleParam } = Route.useParams();
  const { t, locale } = useI18n();
  const { effectiveRole, user } = useAuth();
  const role = ((effectiveRole ?? roleParam) as Role) ?? "adult";
  const [voiceBusy, setVoiceBusy] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();

  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    { id: crypto.randomUUID(), role: "assistant", content: greetingFor(role, locale, t) },
  ]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [crisisPanel, setCrisisPanel] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | undefined>();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new content
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [messages, streaming, prefersReducedMotion]);

  // Re-seed greeting when locale changes (and no convo yet)
  React.useEffect(() => {
    setMessages((m) => {
      if (m.length > 1) return m;
      return [{ id: crypto.randomUUID(), role: "assistant", content: greetingFor(role, locale, t) }];
    });
  }, [locale, role, t]);

  async function send(text?: string) {
    const toSend = (text ?? input).trim();
    if (!toSend || streaming) return;
    setInput("");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: toSend };
    const assistantId = crypto.randomUUID();
    const placeholder: ChatMessage = { id: assistantId, role: "assistant", content: "", pending: true };
    const nextMessages = [...messages, userMsg, placeholder];
    setMessages(nextMessages);
    setStreaming(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const history: ClientMessage[] = nextMessages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.content }));

    await streamChat(
      { messages: history, role, locale, conversationId },
      {
        onCrisis: () => setCrisisPanel(true),
        onDelta: (chunk) => {
          setMessages((m) => m.map((x) => x.id === assistantId
            ? { ...x, content: x.content + chunk, pending: false }
            : x));
        },
        onDone: (payload) => {
          setStreaming(false);
          if (payload.crisis) {
            setMessages((m) => m.map((x) => x.id === assistantId ? { ...x, crisis: true } : x));
          }
        },
        onError: (err) => {
          setStreaming(false);
          setMessages((m) => m.map((x) => x.id === assistantId
            ? { ...x, content: (locale === "ar" ? "تعذّر الاتصال. حاول مرة أخرى." : "Couldn't reach Thera AI. Please try again.") + ` (${err.message})`, pending: false }
            : x));
        },
      },
      ac.signal,
    );
    if (abortRef.current === ac) abortRef.current = null;
  }

  function newConversation() {
    setConversationId(undefined);
    setCrisisPanel(false);
    setMessages([{ id: crypto.randomUUID(), role: "assistant", content: greetingFor(role, locale, t) }]);
  }

  const suggestions = React.useMemo(() => {
    const rows: { icon: typeof Wind; label: string; to: string }[] = [];
    if (role === "teen") {
      rows.push({ icon: Wind, label: t.ai.suggestedBreathing, to: `/dashboard/teen/vibe` });
    }
    const bookTo =
      role === "adult" || role === "parent" || role === "teen"
        ? `/dashboard/${role}/find`
        : "/therapists";
    rows.push(
      { icon: Smile, label: t.ai.suggestedMood, to: `/dashboard/${role}/mood` },
      { icon: CalendarCheck, label: t.ai.suggestedBook, to: bookTo },
    );
    return rows;
  }, [t, role]);

  async function onVoiceClick() {
    if (voiceBusy || !user) return;
    setVoiceBusy(true);
    try {
      let blob = new Blob();
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        await new Promise<void>((resolve, reject) => {
          rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          rec.onerror = () => reject(new Error("recorder"));
          rec.onstop = () => resolve();
          rec.start(250);
          setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } stream.getTracks().forEach((tr) => tr.stop()); }, 3200);
        });
        blob = new Blob(chunks, { type: "audio/webm" });
      }
      const fd = new FormData();
      fd.append("audio", blob, "clip.webm");
      const token = await user.getIdToken();
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; text?: string; error?: string; message?: string };
      if (!res.ok) {
        if (res.status === 503 && payload.error === "no_api_key") {
          toast.message(locale === "ar" ? "أضف GEMINI_API_KEY على الخادم لتفعيل الصوت." : "Add GEMINI_API_KEY on the server to enable voice.");
          return;
        }
        toast.error(
          locale === "ar"
            ? (payload.message ?? "تعذّر تحويل الصوت إلى نص.")
            : (payload.message ?? "Could not transcribe audio."),
        );
        return;
      }
      const line = (payload.text ?? "").trim();
      if (line) {
        setInput((prev) => (prev ? `${prev.trim()} ${line}` : line));
        toast.success(locale === "ar" ? "تمت إضافة النص." : "Added to your message.");
      } else {
        toast.message(locale === "ar" ? "لم نسمع كلامًا واضحًا — جرّب مرة أخرى." : "No clear speech detected — try again.");
      }
    } catch {
      toast.error(locale === "ar" ? "تعذّر الوصول للميكروفون." : "Could not access the microphone.");
    } finally {
      setVoiceBusy(false);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col gap-6 px-5 py-10 md:px-8">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
              {role} · Thera AI
            </p>
            <h1 className="mt-1 font-display text-3xl md:text-5xl">
              {locale === "ar" ? "ثيرا AI" : "Thera AI"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={newConversation}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
            >
              <RotateCw className="h-3.5 w-3.5" /> {t.ai.newConversation}
            </button>
          </div>
        </header>

        <div className="flex items-start gap-2 rounded-2xl border border-border/70 bg-blush/40 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t.ai.disclaimer}</p>
        </div>

        {/* Crisis banner */}
        <AnimatePresence>
          {crisisPanel && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative overflow-hidden rounded-3xl border border-destructive/40 bg-destructive/10 p-6"
            >
              <div aria-hidden className="blob absolute -right-16 -top-10 h-40 w-40 bg-destructive/25" />
              <h2 className="relative font-display text-xl text-destructive">{t.ai.crisisTitle}</h2>
              <p className="relative mt-2 text-sm text-ink">{t.ai.crisisBody}</p>
              <p className="relative mt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.ai.crisisHotlinesIntro}</p>
              <ul className="relative mt-2 grid gap-2 sm:grid-cols-2">
                {CRISIS_HOTLINES.map((h) => (
                  <li key={h.number}>
                    <a
                      href={`tel:${h.number}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4" /> {locale === "ar" ? h.labelAr : h.labelEn}
                      </span>
                      <span className="font-display tabular-nums">{h.number}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="relative mt-4">
                {role === "adult" || role === "parent" || role === "teen" ? (
                  <Link
                    to="/dashboard/$role/find"
                    params={{ role }}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream"
                  >
                    {t.ai.crisisBookCta}
                  </Link>
                ) : (
                  <Link to="/therapists" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream">
                    {t.ai.crisisBookCta}
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div
          ref={scrollerRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-[2rem] border border-border/60 bg-card p-5 shadow-soft md:p-8"
        >
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-ink text-cream"
                    : m.crisis
                    ? "bg-destructive/10 text-ink"
                    : "bg-muted text-ink"
                }`}
              >
                {m.content}
                {m.pending && streaming && (
                  <span className="ms-2 inline-flex items-center gap-0.5 align-middle">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted [animation-delay:300ms]" />
                  </span>
                )}
              </div>
            </motion.div>
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <p className="text-xs text-ink-muted">{t.ai.typing}</p>
          )}
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2">
          {suggestions.map(({ icon: Icon, label, to }) => (
            <Link
              key={label}
              to={to}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-muted"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </Link>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="sticky bottom-4 flex items-center gap-2 rounded-full border border-border bg-card/95 p-2 shadow-soft backdrop-blur"
        >
          <button
            type="button"
            aria-label={locale === "ar" ? "إدخال صوتي" : "Voice input"}
            disabled={voiceBusy}
            className="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-muted disabled:opacity-40"
            onClick={() => void onVoiceClick()}
          >
            <Mic className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={locale === "ar" ? "اكتب كيف تشعر…" : "Type how you're feeling…"}
            className="flex-1 bg-transparent px-4 text-sm outline-none"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t.ai.send}</span>
            <Send className="h-4 w-4 sm:hidden rtl:rotate-180" />
          </button>
        </form>
      </section>
    </SiteShell>
  );
}
