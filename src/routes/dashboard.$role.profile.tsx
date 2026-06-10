import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured, auth, storage } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, deleteUser } from "firebase/auth";
import { Camera, Bell, Lock, Globe, Trash2, Loader2, Check, Eye, EyeOff, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/$role/profile")({
  head: () => ({ meta: [{ title: "Profile — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth>
      <ProfilePage />
    </RouteGuard>
  ),
});

function ProfilePage() {
  const { t, locale, toggle } = useI18n();
  const { profile, user, logout, changePassword } = useAuth();

  const [displayName, setDisplayName] = React.useState(profile?.displayName ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const [notifBooking, setNotifBooking] = React.useState(true);
  const [notifReport, setNotifReport] = React.useState(true);
  const [notifReminder, setNotifReminder] = React.useState(true);
  const [notifNewsletter, setNotifNewsletter] = React.useState(false);
  const [savingNotif, setSavingNotif] = React.useState(false);

  // Change-password modal state
  const [showPwModal, setShowPwModal] = React.useState(false);
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [changingPw, setChangingPw] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);
  const [pwDone, setPwDone] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = React.useState(false);

  React.useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    const prefs = (profile as typeof profile & { notifPrefs?: { booking?: boolean; report?: boolean; reminder?: boolean; newsletter?: boolean } })?.notifPrefs;
    if (prefs) {
      setNotifBooking(prefs.booking ?? true);
      setNotifReport(prefs.report ?? true);
      setNotifReminder(prefs.reminder ?? true);
      setNotifNewsletter(prefs.newsletter ?? false);
    }
  }, [profile]);

  async function uploadAvatar(file: File) {
    if (!user || !storage || !isFirebaseConfigured || !db) {
      toast.error(locale === "ar" ? "الاتصال غير جاهز." : "Connection not ready.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(t.profile.avatarWrongType);
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error(t.profile.avatarTooLarge);
      return;
    }
    setAvatarBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").slice(0, 8);
      const path = `avatars/${user.uid}/avatar.${ext}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, "users", user.uid), { photoURL: url, updatedAt: new Date() });
      toast.success(t.profile.avatarSaved);
    } catch (e) {
      console.error(e);
      toast.error(t.profile.avatarFailed);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, "users", user.uid), { displayName, updatedAt: new Date() });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("profile save", err);
      alert(locale === "ar" ? "تعذّر الحفظ. حاول مرة أخرى." : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotifPrefs() {
    if (!user || !isFirebaseConfigured || !db) return;
    setSavingNotif(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        notifPrefs: {
          booking: notifBooking,
          report: notifReport,
          reminder: notifReminder,
          newsletter: notifNewsletter,
        },
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("notif prefs", err);
    } finally {
      setSavingNotif(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwError(locale === "ar" ? "كلمتا المرور غير متطابقتين." : "Passwords don't match."); return; }
    if (newPw.length < 6) { setPwError(locale === "ar" ? "كلمة المرور قصيرة جدًا (6 أحرف على الأقل)." : "Password too short (min 6 chars)."); return; }
    setPwError(null);
    setChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      setPwDone(true);
      setTimeout(() => { setShowPwModal(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwDone(false); }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setPwError(locale === "ar" ? "كلمة المرور الحالية غير صحيحة." : "Current password is incorrect.");
      } else if (msg.includes("requires-recent-login")) {
        setPwError(locale === "ar" ? "يرجى إعادة تسجيل الدخول ثم المحاولة." : "Please sign out and sign back in first.");
      } else {
        setPwError(msg);
      }
    } finally {
      setChangingPw(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    const confirmed = window.confirm(
      locale === "ar"
        ? "هل أنت متأكد؟ سيتم حذف حسابك وبياناتك بشكل نهائي."
        : "Are you sure? Your account and data will be permanently deleted.",
    );
    if (!confirmed) return;
    try {
      if (isFirebaseConfigured && db) {
        // Mark deleted — do NOT write role: "deleted" as rules block self-service role changes
        await updateDoc(doc(db, "users", user.uid), { deletedAt: new Date(), deletedFlag: true });
      }
      await deleteUser(user);
      await logout();
    } catch (err) {
      console.error("delete account", err);
      alert(locale === "ar" ? "تعذّر حذف الحساب. ربما تحتاج لإعادة تسجيل الدخول أولاً." : "Could not delete account. You may need to re-sign-in first.");
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.dash.profile}</p>
        <h1 className="mt-2 font-display text-4xl">{profile?.displayName ?? user?.email ?? "Guest"}</h1>
        <p className="mt-2 text-ink-muted">{t.profile.subtitle}</p>

        <div className="mt-8 flex items-center gap-5 rounded-3xl border border-border/70 bg-card p-6">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-lavender/70 to-blush/60">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadAvatar(f);
              }}
            />
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -end-1 grid h-8 w-8 place-items-center rounded-full bg-ink text-cream disabled:opacity-50"
              aria-label={t.profile.avatarAria}
            >
              {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex-1">
            <p className="font-display text-2xl">{profile?.displayName ?? user?.email ?? "Guest"}</p>
            <p className="text-sm text-ink-muted">{t.achv.level} {profile?.level ?? 1} · {profile?.xp ?? 0} {t.achv.xp}</p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <Card title={t.profile.cardAccount}>
            <FormRow label={t.common.name}>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
            </FormRow>
            <FormRow label={t.common.email}>
              <input readOnly defaultValue={user?.email ?? ""} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm" />
            </FormRow>
            <FormRow label={t.profile.roleLabel}>
              <input readOnly value={profile?.role ?? "—"} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm" />
            </FormRow>
            <button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saved ? (locale === "ar" ? "تم الحفظ" : "Saved") : t.common.save}
            </button>
          </Card>

          <Card title={t.profile.cardPreferences} Icon={Globe}>
            <FormRow label={t.profile.langLabel}>
              <button onClick={toggle} className="rounded-full border border-border bg-card px-4 py-2 text-sm">
                {locale === "en" ? "English ↔ العربية" : "العربية ↔ English"}
              </button>
            </FormRow>
          </Card>

          <Card title={t.profile.cardNotifications} Icon={Bell}>
            <Toggle label={t.profile.toggle1} checked={notifBooking} onChange={(v) => { setNotifBooking(v); }} />
            <Toggle label={t.profile.toggle2} checked={notifReport} onChange={(v) => { setNotifReport(v); }} />
            <Toggle label={t.profile.toggle3} checked={notifReminder} onChange={(v) => { setNotifReminder(v); }} />
            <Toggle label={t.profile.toggle4} checked={notifNewsletter} onChange={(v) => { setNotifNewsletter(v); }} />
            <button onClick={saveNotifPrefs} disabled={savingNotif} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50">
              {savingNotif ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {locale === "ar" ? "حفظ الإشعارات" : "Save notifications"}
            </button>
          </Card>

          <Card title={t.profile.cardSecurity} Icon={Lock}>
            <button
              onClick={() => { setShowPwModal(true); setPwError(null); setPwDone(false); }}
              className="block w-full rounded-2xl bg-muted px-4 py-3 text-start text-sm hover:bg-lavender/40"
            >
              {t.profile.pwdBtn}
            </button>
            <Link
              to="/settings/security"
              className="block w-full rounded-2xl bg-muted px-4 py-3 text-start text-sm hover:bg-lavender/40"
            >
              {t.profile.tfaStub}
            </Link>
          </Card>

          <Card title={t.profile.cardDangerZone}>
            <button onClick={handleDeleteAccount} className="inline-flex items-center gap-2 rounded-full bg-destructive/20 px-5 py-3 text-sm font-semibold text-destructive">
              <Trash2 className="h-4 w-4" /> {t.profile.deleteBtn}
            </button>
            <p className="text-xs text-ink-muted">{t.profile.deleteNote}</p>
          </Card>

          <button onClick={logout} className="rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold">{t.nav.logout}</button>
        </div>
      </section>

      {/* Change-password modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{t.profile.pwdBtn}</h2>
              <button onClick={() => setShowPwModal(false)} className="text-ink-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            {pwDone ? (
              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-mint/60">
                  <Check className="h-7 w-7 text-ink" />
                </div>
                <p className="font-semibold">{locale === "ar" ? "تم تغيير كلمة المرور" : "Password updated"}</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-5 space-y-3">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    placeholder={locale === "ar" ? "كلمة المرور الحالية" : "Current password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 end-3 flex items-center text-ink-muted">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder={locale === "ar" ? "كلمة المرور الجديدة" : "New password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder={locale === "ar" ? "تأكيد كلمة المرور" : "Confirm new password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm ${confirmPw && newPw !== confirmPw ? "border-destructive" : "border-border"}`}
                />
                {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                <button
                  type="submit"
                  disabled={changingPw || !currentPw || !newPw || newPw !== confirmPw}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-40"
                >
                  {changingPw && <Loader2 className="h-4 w-4 animate-spin" />}
                  {locale === "ar" ? "تغيير كلمة المرور" : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </SiteShell>
  );
}

function Card({ title, Icon, children }: { title: string; Icon?: typeof Globe; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-6">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-ink-muted" />}
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-3">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-border transition-colors checked:bg-ink"
      />
    </label>
  );
}
