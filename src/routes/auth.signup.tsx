import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";
import * as React from "react";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { t } = useI18n();
  const { signUp, configured } = useAuth();
  const nav = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      if (!configured) throw new Error(t.common.demoBanner);
      await signUp(email, password, name);
      // New sign-ups always need to pick a role.
      nav({ to: "/auth/role" });
    } catch (e) {
      setErr(e instanceof Error ? humanizeSignupError(e.message) : "Error");
    } finally { setLoading(false); }
  }

  function humanizeSignupError(msg: string): string {
    if (msg.includes("email-already-in-use")) return "An account with this email already exists.";
    if (msg.includes("weak-password")) return "Password must be at least 6 characters.";
    if (msg.includes("invalid-email")) return "Please enter a valid email address.";
    return msg;
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border/70 bg-card p-6">
      <h1 className="font-display text-3xl">{t.auth.signUpTitle}</h1>
      <p className="text-sm text-ink-muted">{t.auth.signUpSub}</p>
      <GoogleButton label={t.auth.signUpWithGoogle} redirectTo="/auth/role" />
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-muted">or with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <input required placeholder={t.common.name} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      <input type="email" required placeholder={t.common.email} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      <input type="password" required minLength={6} placeholder={t.common.password} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button disabled={loading} type="submit" className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream disabled:opacity-60">
        {loading ? t.common.loading : t.nav.signup}
      </button>
      <p className="text-center text-xs text-ink-muted">
        {t.auth.haveAccount} <Link to="/auth/login" className="font-semibold text-foreground underline">{t.auth.signInLink}</Link>
      </p>
      <p className="text-center text-[11px] text-ink-muted">
        By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
