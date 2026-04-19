import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    oobCode: typeof search.oobCode === "string" ? search.oobCode : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useI18n();
  const { confirmReset, configured } = useAuth();
  const { oobCode } = Route.useSearch();
  const nav = useNavigate();

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 6;
  const canSubmit = !!oobCode && password.length >= 6 && password === confirm && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setLoading(true);
    try {
      if (!configured) throw new Error("Firebase not configured — use demo mode.");
      await confirmReset(oobCode!, password);
      setDone(true);
      // Redirect to login after 2 s so the user can read the success message
      setTimeout(() => void nav({ to: "/auth/login" }), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("expired") || msg.includes("invalid-action-code")) {
        setErr("This reset link has expired or already been used. Please request a new one.");
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-3xl border border-border/70 bg-card p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint/60">
          <Check className="h-7 w-7 text-ink" />
        </div>
        <h1 className="font-display text-2xl">{t.auth.resetDone}</h1>
        <p className="text-sm text-ink-muted">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border/70 bg-card p-6">
      <h1 className="font-display text-3xl">{t.auth.resetTitle}</h1>
      <p className="text-sm text-ink-muted">
        {oobCode
          ? "Enter your new password below."
          : "Open the link from your reset email to set a new password."}
      </p>

      {oobCode && (
        <>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              placeholder={t.common.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 end-3 flex items-center text-ink-muted"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {tooShort && <p className="text-xs text-destructive">Password must be at least 6 characters.</p>}

          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm ${mismatch ? "border-destructive" : "border-border"}`}
          />
          {mismatch && <p className="text-xs text-destructive">Passwords don't match.</p>}
        </>
      )}

      {err && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}

      {oobCode ? (
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream disabled:opacity-40"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.common.save}
        </button>
      ) : (
        <Link to="/auth/forgot" className="block w-full rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-cream">
          Request a new reset link
        </Link>
      )}

      <Link to="/auth/login" className="block text-center text-xs text-ink-muted underline">{t.common.back}</Link>
    </form>
  );
}
