import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";
import * as React from "react";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

/** Resolve the post-login navigation target for a given role. */
function goToDashboard(
  nav: ReturnType<typeof useNavigate>,
  role: string | null,
) {
  if (!role) {
    void nav({ to: "/auth/role" });
    return;
  }
  void nav({ to: "/dashboard/$role", params: { role } });
}

function LoginPage() {
  const { t } = useI18n();
  const { signIn, configured, effectiveRole } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      if (!configured) throw new Error(t.common.demoBanner);
      await signIn(email, password);
      // effectiveRole may not be populated yet (auth state loads async).
      // /auth/role handles the redirect once the profile is ready.
      nav({ to: "/auth/role" });
    } catch (e) {
      setErr(e instanceof Error ? humanizeFirebaseError(e.message) : t.auth.errorDefault);
    } finally { setLoading(false); }
  }

  // If already authenticated with a role, send straight to dashboard.
  React.useEffect(() => {
    if (effectiveRole) goToDashboard(nav, effectiveRole);
  }, [effectiveRole, nav]);

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border/70 bg-card p-6">
      <h1 className="font-display text-3xl">{t.auth.welcomeBack}</h1>
      <p className="text-sm text-ink-muted">{t.auth.signInSub}</p>
      <GoogleButton label={t.auth.signInWithGoogle} redirectTo="/auth/role" />
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-muted">{t.auth.orEmail}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <input type="email" required placeholder={t.common.email} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      <input type="password" required placeholder={t.common.password} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm" />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button disabled={loading} type="submit" className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream disabled:opacity-60">
        {loading ? t.common.loading : t.nav.login}
      </button>
      <div className="flex items-center justify-between text-xs">
        <Link to="/auth/forgot" className="text-ink-muted underline">{t.auth.forgot}</Link>
        <Link to="/auth/signup" className="font-semibold text-foreground underline">{t.auth.createAccount}</Link>
      </div>
    </form>
  );
}

function humanizeFirebaseError(msg: string): string {
  if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential"))
    return "Incorrect email or password.";
  if (msg.includes("too-many-requests")) return "Too many attempts — try again later.";
  if (msg.includes("network-request-failed")) return "Network error — check your connection.";
  return msg;
}
