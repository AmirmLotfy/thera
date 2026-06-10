/**
 * Firebase email action handler.
 *
 * When the Firebase Console "Email action handler URL" is configured to
 * `https://yourdomain.com/auth/action`, clicking any Firebase-generated link
 * (password reset, email verify, email change recovery) will land here with:
 *
 *   /auth/action?mode=resetPassword&oobCode=xxx&apiKey=yyy&continueUrl=zzz&lang=en
 *
 * This route inspects `mode` and routes to the right flow:
 *   - resetPassword → /auth/reset-password?oobCode=xxx
 *   - verifyEmail   → verifies inline, then redirects to dashboard
 *   - recoverEmail  → shows info message
 */
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  applyActionCode,
  checkActionCode,
} from "firebase/auth";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/auth/action")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: typeof search.mode === "string" ? search.mode : "",
    oobCode: typeof search.oobCode === "string" ? search.oobCode : "",
    continueUrl: typeof search.continueUrl === "string" ? search.continueUrl : undefined,
    lang: typeof search.lang === "string" ? search.lang : "en",
  }),
  component: ActionPage,
});

function ActionPage() {
  const { mode, oobCode } = Route.useSearch();
  const { locale } = useI18n();
  const nav = useNavigate();

  // Password reset: forward to the reset-password page with the code
  if (mode === "resetPassword" && oobCode) {
    return <Navigate to="/auth/reset-password" search={{ oobCode, mode }} />;
  }

  // Email verification: apply inline
  if (mode === "verifyEmail" && oobCode) {
    return <VerifyEmailAction oobCode={oobCode} locale={locale} onDone={() => void nav({ to: "/auth/role" })} />;
  }

  // Undo email change (recover previous address)
  if (mode === "recoverEmail" && oobCode) {
    return <RecoverEmailAction oobCode={oobCode} locale={locale} onDone={() => void nav({ to: "/auth/login" })} />;
  }

  // Fallback
  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-6 text-center text-sm">
      <AlertTriangle className="mx-auto h-8 w-8 text-ink-muted" />
      <p className="font-display text-xl">
        {locale === "ar" ? "رابط غير معروف" : "Unknown action"}
      </p>
      <p className="text-ink-muted">
        {locale === "ar"
          ? "هذا الرابط لا يتعرّف عليه النظام. تحقّق من البريد الإلكتروني مرة أخرى."
          : "This link isn't recognised. Check your email again or request a new link."}
      </p>
    </div>
  );
}

function RecoverEmailAction({ oobCode, locale, onDone }: { oobCode: string; locale: string; onDone: () => void }) {
  const [status, setStatus] = React.useState<"working" | "done" | "error">("working");
  const [errMsg, setErrMsg] = React.useState("");

  React.useEffect(() => {
    if (!isFirebaseConfigured || !auth) { setStatus("error"); setErrMsg("Firebase not configured."); return; }
    checkActionCode(auth, oobCode)
      .then(() => applyActionCode(auth!, oobCode))
      .then(() => {
        setStatus("done");
        setTimeout(onDone, 2000);
      })
      .catch((e: Error) => {
        setStatus("error");
        setErrMsg(e.message.includes("expired") ? "This link has expired." : e.message);
      });
  }, [oobCode, onDone]);

  if (status === "working") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card p-10">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        <p className="text-sm text-ink-muted">{locale === "ar" ? "جارٍ استعادة البريد…" : "Restoring your email…"}</p>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card p-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-mint/60">
          <Check className="h-7 w-7 text-ink" />
        </div>
        <p className="font-display text-2xl">{locale === "ar" ? "تمت استعادة بريدك السابق" : "Email address restored"}</p>
        <p className="text-sm text-ink-muted">{locale === "ar" ? "جارٍ التوجيه لتسجيل الدخول…" : "Redirecting to sign in…"}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <p className="font-display text-xl">{locale === "ar" ? "تعذّرت الاستعادة" : "Could not restore email"}</p>
      <p className="text-sm text-destructive">{errMsg}</p>
    </div>
  );
}

function VerifyEmailAction({ oobCode, locale, onDone }: { oobCode: string; locale: string; onDone: () => void }) {
  const [status, setStatus] = React.useState<"verifying" | "done" | "error">("verifying");
  const [errMsg, setErrMsg] = React.useState("");

  React.useEffect(() => {
    if (!isFirebaseConfigured || !auth) { setStatus("error"); setErrMsg("Firebase not configured."); return; }
    checkActionCode(auth, oobCode)
      .then(() => applyActionCode(auth!, oobCode))
      .then(() => {
        setStatus("done");
        setTimeout(onDone, 2000);
      })
      .catch((e: Error) => {
        setStatus("error");
        setErrMsg(e.message.includes("expired") ? "This verification link has expired." : e.message);
      });
  }, [oobCode, onDone]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card p-10">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        <p className="text-sm text-ink-muted">{locale === "ar" ? "جارٍ التحقق من البريد…" : "Verifying your email…"}</p>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card p-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-mint/60">
          <Check className="h-7 w-7 text-ink" />
        </div>
        <p className="font-display text-2xl">{locale === "ar" ? "تم التحقق من بريدك" : "Email verified"}</p>
        <p className="text-sm text-ink-muted">{locale === "ar" ? "جارٍ التوجيه…" : "Redirecting…"}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <p className="font-display text-xl">{locale === "ar" ? "فشل التحقق" : "Verification failed"}</p>
      <p className="text-sm text-destructive">{errMsg}</p>
    </div>
  );
}
