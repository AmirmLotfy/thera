import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured, storage } from "@/lib/firebase";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Check, Upload, Loader2, X } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/onboarding/$role")({
  head: () => ({ meta: [{ title: "Onboarding — Thera" }] }),
  component: OnboardingPage,
});

// ─── State types ─────────────────────────────────────────────────────────────

type Step0 = {
  displayName: string;
  language: "en" | "ar";
  timezone: string;
};

type AdultStep1 = { tags: string[]; therapyFormat: string };
type ParentStep1 = { childName: string; childAge: string; childTags: string[] };
type TeenStep1 = { vibes: string[]; helpTags: string[] };
type TherapistStep1 = {
  title: string;
  specialty: string;
  yearsExperience: string;
  license: string;
  linkedinUrl: string;
  bio: string;
  languages: ("en" | "ar")[];
  pricePerSession: string;
  currency: string;
  cvFile: File | null;
  cvName: string;
};

type Step2 = { notifEmail: boolean; notifPush: boolean; note: string };

const ADULT_TAGS = ["Anxiety", "Depression", "Relationships", "Work stress", "Grief", "Self-esteem", "Trauma", "Sleep"];
const PARENT_TAGS = ["Behaviour", "School", "Anxiety", "ADHD", "Autism", "Social skills", "Grief", "Screen time"];
const TEEN_HELP_TAGS = ["School pressure", "Anxiety", "Family", "Friendships", "Self-esteem", "Anger", "Identity"];
const THERAPY_FORMATS = ["Online", "In-person", "Either"];

// ─── Main page ────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const { role } = Route.useParams();
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const o = t.onboarding;

  const [step, setStep] = React.useState(0);
  const [finishing, setFinishing] = React.useState(false);
  const [finishError, setFinishError] = React.useState<string | null>(null);

  // Step 0
  const [step0, setStep0] = React.useState<Step0>({
    displayName: profile?.displayName ?? user?.displayName ?? "",
    language: locale as "en" | "ar",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo",
  });

  // Step 1 per role
  const [adultStep1, setAdultStep1] = React.useState<AdultStep1>({ tags: [], therapyFormat: "Either" });
  const [parentStep1, setParentStep1] = React.useState<ParentStep1>({ childName: "", childAge: "", childTags: [] });
  const [teenStep1, setTeenStep1] = React.useState<TeenStep1>({ vibes: [], helpTags: [] });
  const [therapistStep1, setTherapistStep1] = React.useState<TherapistStep1>({
    title: "", specialty: "", yearsExperience: "", license: "", linkedinUrl: "",
    bio: "", languages: ["en"], pricePerSession: "", currency: "USD",
    cvFile: null, cvName: "",
  });

  // Step 2
  const [step2, setStep2] = React.useState<Step2>({ notifEmail: true, notifPush: true, note: "" });

  const stepsByRole: Record<string, string[]> = {
    adult: [o.adult1, o.adult2, o.adult3],
    parent: [o.parent1, o.parent2, o.parent3],
    teen: [o.teen1, o.teen2, o.teen3],
    therapist: [o.therapist1, o.therapist2, o.therapist3],
  };
  const titlesByRole: Record<string, string> = {
    adult: o.titleAdult, parent: o.titleParent, teen: o.titleTeen, therapist: o.titleTherapist,
  };

  const steps = stepsByRole[role] ?? [o.adult1, o.adult2, o.adult3];
  const last = step === steps.length - 1;

  async function finish() {
    setFinishError(null);
    if (!user) {
      setFinishError(locale === "ar" ? "يرجى تسجيل الدخول للمتابعة." : "Please sign in to continue.");
      return;
    }
    setFinishing(true);
    try {
      const uid = user.uid;
      const canWrite = isFirebaseConfigured && db;

      let cvPath: string | null = null;
      if (role === "therapist" && therapistStep1.cvFile && storage) {
        if (therapistStep1.cvFile.type !== "application/pdf") {
          setFinishError(locale === "ar" ? "يجب أن يكون الملف بصيغة PDF." : "Please upload a PDF file.");
          setFinishing(false);
          return;
        }
        const ts = Date.now();
        const r = storageRef(storage, `applications/${uid}/cv-${ts}.pdf`);
        await uploadBytes(r, therapistStep1.cvFile);
        cvPath = await getDownloadURL(r);
      }

      const userData: Record<string, unknown> = {
        onboardingCompleted: true,
        language: step0.language,
        timezone: step0.timezone,
        displayName: step0.displayName || profile?.displayName || null,
        notifPrefs: { email: step2.notifEmail, push: step2.notifPush },
        updatedAt: new Date(),
      };

      if (role === "adult") {
        userData.concerns = adultStep1.tags;
        userData.therapyFormat = adultStep1.therapyFormat;
      } else if (role === "parent") {
        userData.child = { name: parentStep1.childName, age: parentStep1.childAge, tags: parentStep1.childTags };
      } else if (role === "teen") {
        userData.vibes = teenStep1.vibes;
        userData.helpTags = teenStep1.helpTags;
      } else if (role === "therapist") {
        userData.therapistApplicationStatus = "submitted";
      }

      if (step2.note) userData.onboardingNote = step2.note;

      if (canWrite) {
        await updateDoc(doc(db!, "users", uid), userData);

        if (role === "therapist") {
          await setDoc(doc(db!, "therapistApplications", uid), {
            id: uid,
            uid,
            displayName: step0.displayName || user?.displayName || "",
            email: user?.email ?? "",
            title: therapistStep1.title || null,
            bio: therapistStep1.bio || "",
            specialty: therapistStep1.specialty,
            specialties: [therapistStep1.specialty].filter(Boolean),
            yearsExperience: Number(therapistStep1.yearsExperience) || null,
            license: therapistStep1.license || null,
            linkedinUrl: therapistStep1.linkedinUrl || null,
            cvPath,
            languages: therapistStep1.languages,
            pricePerSession: Number(therapistStep1.pricePerSession) || 0,
            currency: therapistStep1.currency,
            status: "submitted",
            createdAt: serverTimestamp(),
          });
        }
      }

      if (role === "therapist") {
        await nav({ to: "/dashboard/$role/pending", params: { role: "therapist" } });
      } else {
        await nav({ to: "/dashboard/$role", params: { role } });
      }
    } catch (err) {
      console.error("onboarding finish", err);
      setFinishError(locale === "ar" ? "تعذّر حفظ بياناتك. حاول مرة أخرى." : "We couldn't save your information. Please try again.");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-5 pb-24 pt-hero-under-site-header md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{o.eyebrow} · {role}</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">{titlesByRole[role] ?? o.defaultTitle}</h1>

        {/* Progress stepper */}
        <ol className="mt-8 flex items-center gap-3">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${i <= step ? "bg-ink text-cream" : "bg-muted text-ink-muted"}`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`text-xs ${i === step ? "font-semibold text-foreground" : "text-ink-muted"}`}>{s}</span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="mt-8 space-y-4 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
          {/* ── Step 0: Basic info ── */}
          {step === 0 && (
            <>
              <Field label={t.common.name}>
                <input
                  className="input"
                  value={step0.displayName}
                  onChange={(e) => setStep0({ ...step0, displayName: e.target.value })}
                  placeholder={o.namePh}
                />
              </Field>
              <Field label={o.prefLangLabel}>
                <select
                  className="input"
                  value={step0.language}
                  onChange={(e) => setStep0({ ...step0, language: e.target.value as "en" | "ar" })}
                >
                  <option value="en">{o.prefLangEn}</option>
                  <option value="ar">{o.prefLangAr}</option>
                </select>
              </Field>
              <Field label={o.tzLabel}>
                <select
                  className="input"
                  value={step0.timezone}
                  onChange={(e) => setStep0({ ...step0, timezone: e.target.value })}
                >
                  {[
                    "Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Asia/Beirut",
                    "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles",
                  ].map((tz) => (
                    <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {/* ── Step 1: adult ── */}
          {step === 1 && role === "adult" && (
            <>
              <Field label={o.adultHeavyLabel}>
                <div className="flex flex-wrap gap-2">
                  {ADULT_TAGS.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      active={adultStep1.tags.includes(tag)}
                      onClick={() => setAdultStep1((s) => ({
                        ...s,
                        tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag],
                      }))}
                    />
                  ))}
                </div>
              </Field>
              <Field label={o.therapyLabel}>
                <div className="flex flex-wrap gap-2">
                  {THERAPY_FORMATS.map((fmt) => (
                    <Chip
                      key={fmt}
                      label={fmt}
                      active={adultStep1.therapyFormat === fmt}
                      onClick={() => setAdultStep1((s) => ({ ...s, therapyFormat: fmt }))}
                    />
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── Step 1: parent ── */}
          {step === 1 && role === "parent" && (
            <>
              <Field label={o.childNameLabel}>
                <input className="input" placeholder={o.childNamePh} value={parentStep1.childName} onChange={(e) => setParentStep1((s) => ({ ...s, childName: e.target.value }))} />
              </Field>
              <Field label={o.childAgeLabel}>
                <input type="number" min={2} max={17} className="input" placeholder={o.childAgePh} value={parentStep1.childAge} onChange={(e) => setParentStep1((s) => ({ ...s, childAge: e.target.value }))} />
              </Field>
              <Field label={o.childFocusLabel}>
                <div className="flex flex-wrap gap-2">
                  {PARENT_TAGS.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      active={parentStep1.childTags.includes(tag)}
                      onClick={() => setParentStep1((s) => ({
                        ...s,
                        childTags: s.childTags.includes(tag) ? s.childTags.filter((t) => t !== tag) : [...s.childTags, tag],
                      }))}
                    />
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── Step 1: teen ── */}
          {step === 1 && role === "teen" && (
            <>
              <Field label={o.teenVibeLabel}>
                <div className="flex flex-wrap gap-2">
                  {["😌", "🥱", "😣", "😊", "😢", "💪", "🥹", "🤯"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setTeenStep1((s) => ({
                        ...s,
                        vibes: s.vibes.includes(e) ? s.vibes.filter((v) => v !== e) : [...s.vibes, e],
                      }))}
                      className={`rounded-2xl px-4 py-2 text-2xl transition-transform hover:scale-110 ${teenStep1.vibes.includes(e) ? "bg-ink/10 ring-2 ring-ink" : "bg-muted"}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={o.teenHelpLabel}>
                <div className="flex flex-wrap gap-2">
                  {TEEN_HELP_TAGS.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      active={teenStep1.helpTags.includes(tag)}
                      onClick={() => setTeenStep1((s) => ({
                        ...s,
                        helpTags: s.helpTags.includes(tag) ? s.helpTags.filter((t) => t !== tag) : [...s.helpTags, tag],
                      }))}
                    />
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── Step 1: therapist ── */}
          {step === 1 && role === "therapist" && (
            <>
              <div className="rounded-2xl bg-lavender/30 p-3 text-xs text-ink-muted">
                {locale === "ar"
                  ? "ستُراجع طلبك إدارة ثيرا خلال 48 ساعة. يُرجى تقديم معلومات دقيقة."
                  : "Thera's team will review your application within 48 hours. Please provide accurate information."}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={locale === "ar" ? "اللقب الأكاديمي" : "Title (e.g. Dr.)"}>
                  <input className="input" placeholder="Dr. / MSc / MA" value={therapistStep1.title} onChange={(e) => setTherapistStep1((s) => ({ ...s, title: e.target.value }))} />
                </Field>
                <Field label={o.specialtyLabel}>
                  <input className="input" required placeholder={o.specialtyPh} value={therapistStep1.specialty} onChange={(e) => setTherapistStep1((s) => ({ ...s, specialty: e.target.value }))} />
                </Field>
                <Field label={o.expLabel}>
                  <input type="number" min={0} className="input" placeholder={o.expPh} value={therapistStep1.yearsExperience} onChange={(e) => setTherapistStep1((s) => ({ ...s, yearsExperience: e.target.value }))} />
                </Field>
                <Field label={o.licenseLabel}>
                  <input className="input" placeholder={o.licensePh} value={therapistStep1.license} onChange={(e) => setTherapistStep1((s) => ({ ...s, license: e.target.value }))} />
                </Field>
              </div>

              <Field label={locale === "ar" ? "نبذة مختصرة" : "Short bio"}>
                <textarea className="input" rows={3} placeholder={locale === "ar" ? "اكتب نبذة قصيرة عن نفسك وأسلوبك العلاجي…" : "A short description of yourself and your therapeutic approach…"} value={therapistStep1.bio} onChange={(e) => setTherapistStep1((s) => ({ ...s, bio: e.target.value }))} />
              </Field>

              <Field label={o.linkedinLabel}>
                <input className="input" type="url" placeholder={o.linkedinPh} value={therapistStep1.linkedinUrl} onChange={(e) => setTherapistStep1((s) => ({ ...s, linkedinUrl: e.target.value }))} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={locale === "ar" ? "السعر لكل جلسة" : "Price per session"}>
                  <input type="number" min={0} className="input" placeholder="200" value={therapistStep1.pricePerSession} onChange={(e) => setTherapistStep1((s) => ({ ...s, pricePerSession: e.target.value }))} />
                </Field>
                <Field label={locale === "ar" ? "العملة" : "Currency"}>
                  <select className="input" value={therapistStep1.currency} onChange={(e) => setTherapistStep1((s) => ({ ...s, currency: e.target.value }))}>
                    <option value="USD">USD</option>
                    <option value="EGP">EGP</option>
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                  </select>
                </Field>
              </div>

              <Field label={locale === "ar" ? "لغات الجلسة" : "Session languages"}>
                <div className="flex gap-3">
                  {(["en", "ar"] as const).map((lang) => (
                    <label key={lang} className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium ${therapistStep1.languages.includes(lang) ? "border-ink bg-ink/5" : "border-border"}`}>
                      <input
                        type="checkbox"
                        checked={therapistStep1.languages.includes(lang)}
                        onChange={(e) => setTherapistStep1((s) => ({
                          ...s,
                          languages: e.target.checked
                            ? [...s.languages, lang]
                            : s.languages.filter((l) => l !== lang),
                        }))}
                        className="sr-only"
                      />
                      {lang === "en" ? "English" : "العربية"}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label={o.cvLabel}>
                {therapistStep1.cvName ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                    <span className="flex-1 truncate">{therapistStep1.cvName}</span>
                    <button
                      type="button"
                      onClick={() => setTherapistStep1((s) => ({ ...s, cvFile: null, cvName: "" }))}
                      className="text-ink-muted hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background px-4 py-3 text-sm text-ink-muted hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    {o.cvBtn}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f && f.type !== "application/pdf") {
                          setFinishError(locale === "ar" ? "يُقبل ملف PDF فقط." : "Only PDF files are accepted.");
                          return;
                        }
                        setFinishError(null);
                        setTherapistStep1((s) => ({ ...s, cvFile: f, cvName: f?.name ?? "" }));
                      }}
                    />
                  </label>
                )}
              </Field>
            </>
          )}

          {/* ── Step 2: Preferences ── */}
          {step === 2 && (
            <>
              <Field label={o.reminderLabel}>
                <div className="space-y-2">
                  {[
                    { key: "notifEmail" as const, label: o.reminderEmail },
                    { key: "notifPush" as const, label: o.reminderPush },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-muted px-4 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={step2[key]}
                        onChange={(e) => setStep2((s) => ({ ...s, [key]: e.target.checked }))}
                        className="h-4 w-4 rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label={o.anythingLabel}>
                <textarea
                  className="input"
                  rows={3}
                  placeholder={o.anythingPh}
                  value={step2.note}
                  onChange={(e) => setStep2((s) => ({ ...s, note: e.target.value }))}
                />
              </Field>
            </>
          )}

          {finishError && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{finishError}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm disabled:opacity-50"
            >
              {t.common.back}
            </button>
            {last ? (
              <button
                type="button"
                onClick={finish}
                disabled={finishing}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
              >
                {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
                {role === "therapist"
                  ? (locale === "ar" ? "تقديم الطلب" : "Submit application")
                  : o.finishCta}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream"
              >
                {t.common.continue}
              </button>
            )}
          </div>
        </div>
      </section>

      <style>{`.input{width:100%;border-radius:.75rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.625rem 1rem;font-size:.875rem;}`}</style>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${active ? "bg-ink text-cream" : "border border-border bg-background hover:bg-muted"}`}
    >
      {label}
    </button>
  );
}
