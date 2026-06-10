import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useCareMessagesLive, sendCareMessage } from "@/lib/queries/care";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/$role/inbox/$threadId")({
  head: () => ({ meta: [{ title: "Conversation — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <ThreadPage />
    </RouteGuard>
  ),
});

function ThreadPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const { role, threadId } = useParams({ from: "/dashboard/$role/inbox/$threadId" });
  const { data: messages = [], loading } = useCareMessagesLive(threadId);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || !user) return;
    setSending(true);
    try {
      const idToken = await user.getIdToken();
      await sendCareMessage(threadId, text, idToken);
      setDraft("");
    } catch (err) {
      console.error("send message", err);
      toast.error(locale === "ar" ? "تعذّر الإرسال" : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto flex max-w-3xl flex-col px-5 py-8 md:px-8" style={{ minHeight: "70vh" }}>
        <Link to="/dashboard/$role/inbox" params={{ role }} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {locale === "ar" ? "العودة للصندوق" : "Back to inbox"}
        </Link>
        <h1 className="mt-4 font-display text-3xl">{locale === "ar" ? "المحادثة" : "Conversation"}</h1>

        <div className="mt-6 flex-1 space-y-3 overflow-y-auto rounded-3xl border border-border/70 bg-card p-4">
          {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-muted" />}
          {!loading && messages.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-muted">
              {locale === "ar" ? "لا رسائل بعد. اكتب أول رسالة أدناه." : "No messages yet. Say hello below."}
            </p>
          )}
          {messages.map((m) => {
            const mine = m.senderUid === user?.uid;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-ink text-cream" : "bg-muted text-foreground"}`}>
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={locale === "ar" ? "اكتب رسالة..." : "Write a message..."}
            className="flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-cream disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </section>
    </SiteShell>
  );
}
