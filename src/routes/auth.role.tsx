import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth, type Role } from "@/lib/auth";
import { Heart, Users, Baby, Stethoscope, Loader2 } from "lucide-react";
import * as React from "react";
import { peekPostLoginRedirect } from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth/role")({
  component: RolePicker,
});

function RolePicker() {
  const { t, locale } = useI18n();
  const { user, setRole, effectiveRole, loading, configured, profile } = useAuth();
  const nav = useNavigate();
  const [picking, setPicking] = React.useState<Role | null>(null);
  const [bookRedirect, setBookRedirect] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (loading || !configured) return;
    const stored = peekPostLoginRedirect();
    if (stored && (stored.startsWith("/book/") || stored.startsWith("/therapists/") || stored.startsWith("/checkout/"))) {
      setBookRedirect(stored);
    }
  }, [loading, configured]);

  React.useEffect(() => {
    if (!effectiveRole || !bookRedirect) return;
    if (["adult", "parent", "teen"].includes(effectiveRole)) {
      window.location.assign(bookRedirect);
    }
  }, [effectiveRole, bookRedirect]);

  // If already has a role, redirect straight to their dashboard.
  if (!loading && configured && effectiveRole && !bookRedirect) {
    return (
      <Navigate
        to="/dashboard/$role"
        params={{ role: effectiveRole }}
      />
    );
  }

  // Therapist application in progress → pending page.
  const therapistAppStatus = (profile as (typeof profile & { therapistApplicationStatus?: string }) | null)?.therapistApplicationStatus;
  if (
    !loading &&
    configured &&
    !effectiveRole &&
    therapistAppStatus &&
    ["submitted", "under_review", "rejected"].includes(therapistAppStatus)
  ) {
    return (
      <Navigate
        to="/dashboard/$role/pending"
        params={{ role: "therapist" }}
      />
    );
  }

  const roles: { id: Role; Icon: typeof Heart; title: string; body: string; color: string }[] = [
    { id: "adult", Icon: Heart, title: t.auth.adult, body: t.auth.adultBody, color: "bg-lavender/40" },
    { id: "parent", Icon: Users, title: t.auth.parent, body: t.auth.parentBody, color: "bg-blush/60" },
    { id: "teen", Icon: Baby, title: t.auth.teen, body: t.auth.teenBody, color: "bg-aqua/50" },
    { id: "therapist", Icon: Stethoscope, title: t.auth.therapist, body: t.auth.therapistBody, color: "bg-mint/45" },
  ];

  async function pick(role: Role) {
    if (role === "therapist" && configured && user && !user.emailVerified) {
      void nav({ to: "/auth/verify-email" });
      return;
    }
    setPicking(role);
    try {
      if (configured && role !== "therapist") {
        // Therapist role is ONLY granted via admin approval (approve-therapist API).
        // We do NOT set role: "therapist" here so applicants cannot access the
        // therapist dashboard until approved. The therapistApplicationStatus
        // field on users/{uid} tracks the pending state.
        await setRole(role);
      }
      nav({ to: "/onboarding/$role", params: { role } });
    } catch {
      // Firestore permission denied etc. — still navigate to onboarding
      nav({ to: "/onboarding/$role", params: { role } });
    } finally {
      setPicking(null);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-hero-under-site-header md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.nav.signup}</p>
        <h1 className="hero-title hero-title-xl mt-4 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">{t.auth.roleTitle}</h1>
        <p className="mt-3 max-w-xl text-pretty text-ink-muted">{t.auth.roleSub}</p>
        {bookRedirect && (
          <p className="mt-4 max-w-xl rounded-2xl border border-lavender/50 bg-lavender/25 px-4 py-3 text-sm text-ink-muted">
            {locale === "ar"
              ? "اختر نوع حسابك (بالغ، ولي أمر، أو مراهق) لإكمال حجز الجلسة."
              : "Choose your account type below to finish booking your session."}
          </p>
        )}
        <div className="isolate mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {roles.map(({ id, Icon, title, body, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => pick(id)}
              disabled={!!picking}
              className={`group relative z-0 flex min-h-[14.5rem] min-w-0 flex-col text-start rounded-3xl border border-border/70 ${color} p-6 shadow-soft transition-all duration-300 hover:z-10 hover:-translate-y-1 hover:border-ink/20 hover:shadow-soft-lg disabled:pointer-events-none disabled:opacity-60`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card/90 shadow-sm">
                {picking === id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
              </span>
              <h3 className="mt-5 font-display text-2xl leading-tight">{title}</h3>
              <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-ink-muted sm:min-h-[3.25rem]">{body}</p>
            </button>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
