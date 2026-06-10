import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { sendEmailVerification } from "firebase/auth";
import * as React from "react";

export const Route = createFileRoute("/auth/verify-email")({
  component: VerifyPage,
});

function VerifyPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [sent, setSent] = React.useState(false);

  async function resend() {
    if (!user) return;
    try { await sendEmailVerification(user); setSent(true); } catch { /* */ }
  }
  return (
    <div className="space-y-4 rounded-3xl border border-border/70 bg-card p-6 text-center">
      <h1 className="font-display text-3xl">{t.auth.verifyTitle}</h1>
      <p className="text-sm text-ink-muted">{t.auth.verifySub}</p>
      <button onClick={resend} type="button" className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">
        {sent ? t.auth.forgotSent : t.auth.resend}
      </button>
    </div>
  );
}
