import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import * as React from "react";

export const Route = createFileRoute("/auth/forgot")({
  component: ForgotPage,
});

function ForgotPage() {
  const { t } = useI18n();
  const { resetPassword, configured } = useAuth();
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      if (!configured) throw new Error(t.common.demoBanner);
      // continueUrl sets up the Firebase action URL to redirect back to our
      // custom reset page (/auth/action) after Firebase verifies the oobCode.
      // When the Firebase Console "Email action handler URL" is configured to
      // this domain, the link in the email will land directly on /auth/action.
      const continueUrl = `${window.location.origin}/auth/action?mode=resetPassword`;
      await resetPassword(email, continueUrl);
      setSent(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border/70 bg-card p-6">
      <h1 className="font-display text-3xl">{t.auth.forgotTitle}</h1>
      <p className="text-sm text-ink-muted">{t.auth.forgotSub}</p>
      <input type="email" required placeholder={t.common.email} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      {err && <p className="text-xs text-destructive">{err}</p>}
      {sent && <p className="text-xs text-ink-muted">{t.auth.forgotSent}</p>}
      <button type="submit" className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">{t.common.submit}</button>
      <Link to="/auth/login" className="block text-center text-xs text-ink-muted underline">{t.common.back}</Link>
    </form>
  );
}
