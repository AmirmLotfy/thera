import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Thera Admin" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <SettingsPage />
    </RouteGuard>
  ),
});

type SiteConfig = {
  supportEmail?: string;
  crisisBanner?: { en?: string; ar?: string };
  hotlines?: { region: string; label: string; phone: string }[];
  maintenance?: boolean;
  maintenanceMessage?: { en?: string; ar?: string };
  instapay?: { handle?: string; name?: string; amountEgp?: number };
};

function useSiteConfig() {
  return useQuery({
    queryKey: ["admin", "siteConfig"],
    queryFn: async (): Promise<SiteConfig> => {
      if (!isFirebaseConfigured || !db) return defaultConfig();
      const snap = await getDoc(doc(db, "config", "site"));
      if (!snap.exists()) return defaultConfig();
      return snap.data() as SiteConfig;
    },
  });
}

function SettingsPage() {
  const { locale } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useSiteConfig();
  const [draft, setDraft] = React.useState<SiteConfig | null>(data ?? null);
  React.useEffect(() => { if (data) setDraft(data); }, [data]);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  if (isLoading) {
    return (
      <SiteShell>
        <section className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-16 text-ink-muted md:px-8">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </section>
      </SiteShell>
    );
  }
  if (!draft) return null;

  async function save() {
    if (!isFirebaseConfigured || !db) {
      toast.error("Connect Firebase to persist settings.");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "site"), draft, { merge: true });
      await qc.invalidateQueries({ queryKey: ["admin", "siteConfig"] });
      setSavedAt(Date.now());
      toast.success(locale === "ar" ? "تم الحفظ." : "Settings saved.");
    } catch (e) {
      console.error(e);
      toast.error(locale === "ar" ? "تعذّر الحفظ." : "Save failed. Try again.");
    } finally { setSaving(false); }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "الإعدادات" : "Settings"}</h1>

        <div className="mt-8 space-y-6">
          <Card title={locale === "ar" ? "الدعم" : "Support"}>
            <Field label={locale === "ar" ? "بريد الدعم" : "Support email"}>
              <input className="input" value={draft.supportEmail ?? ""} onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })} />
            </Field>
          </Card>

          <Card title={locale === "ar" ? "شعار السلامة" : "Safety banner"}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="English">
                <textarea className="input" rows={2} value={draft.crisisBanner?.en ?? ""} onChange={(e) => setDraft({ ...draft, crisisBanner: { ...(draft.crisisBanner ?? {}), en: e.target.value } })} />
              </Field>
              <Field label="العربية">
                <textarea className="input" rows={2} dir="rtl" value={draft.crisisBanner?.ar ?? ""} onChange={(e) => setDraft({ ...draft, crisisBanner: { ...(draft.crisisBanner ?? {}), ar: e.target.value } })} />
              </Field>
            </div>
          </Card>

          <Card title={locale === "ar" ? "الخطوط الساخنة" : "Hotlines"}>
            <div className="space-y-3">
              {(draft.hotlines ?? []).map((h, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <input className="input" placeholder="Region" value={h.region} onChange={(e) => updateHotline(i, { ...h, region: e.target.value })} />
                  <input className="input" placeholder="Label" value={h.label} onChange={(e) => updateHotline(i, { ...h, label: e.target.value })} />
                  <input className="input" placeholder="Phone" value={h.phone} onChange={(e) => updateHotline(i, { ...h, phone: e.target.value })} />
                  <button onClick={() => removeHotline(i)} className="rounded-full border border-border px-3 text-xs">×</button>
                </div>
              ))}
              <button onClick={() => setDraft({ ...draft, hotlines: [...(draft.hotlines ?? []), { region: "", label: "", phone: "" }] })} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">
                + {locale === "ar" ? "إضافة خط" : "Add hotline"}
              </button>
            </div>
          </Card>

          <Card title="InstaPay">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label={locale === "ar" ? "المعرّف" : "Handle"}>
                <input className="input" value={draft.instapay?.handle ?? ""} onChange={(e) => setDraft({ ...draft, instapay: { ...(draft.instapay ?? {}), handle: e.target.value } })} />
              </Field>
              <Field label={locale === "ar" ? "الاسم" : "Recipient"}>
                <input className="input" value={draft.instapay?.name ?? ""} onChange={(e) => setDraft({ ...draft, instapay: { ...(draft.instapay ?? {}), name: e.target.value } })} />
              </Field>
              <Field label="EGP">
                <input className="input" type="number" value={draft.instapay?.amountEgp ?? 0} onChange={(e) => setDraft({ ...draft, instapay: { ...(draft.instapay ?? {}), amountEgp: Number(e.target.value) } })} />
              </Field>
            </div>
          </Card>

          <Card title={locale === "ar" ? "وضع الصيانة" : "Maintenance"}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!draft.maintenance} onChange={(e) => setDraft({ ...draft, maintenance: e.target.checked })} />
              <span>{locale === "ar" ? "تفعيل وضع الصيانة" : "Enable maintenance mode"}</span>
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <textarea className="input" rows={2} value={draft.maintenanceMessage?.en ?? ""} onChange={(e) => setDraft({ ...draft, maintenanceMessage: { ...(draft.maintenanceMessage ?? {}), en: e.target.value } })} placeholder="English message" />
              <textarea className="input" rows={2} dir="rtl" value={draft.maintenanceMessage?.ar ?? ""} onChange={(e) => setDraft({ ...draft, maintenanceMessage: { ...(draft.maintenanceMessage ?? {}), ar: e.target.value } })} placeholder="الرسالة العربية" />
            </div>
          </Card>

          <div className="flex items-center justify-between">
            {savedAt ? <p className="text-xs text-ink-muted">{locale === "ar" ? "تم الحفظ" : "Saved"} · {new Date(savedAt).toLocaleTimeString()}</p> : <span />}
            <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? (locale === "ar" ? "جارٍ الحفظ…" : "Saving…") : (locale === "ar" ? "حفظ" : "Save changes")}
            </button>
          </div>
        </div>
      </section>
    </SiteShell>
  );

  function updateHotline(i: number, v: NonNullable<SiteConfig["hotlines"]>[number]) {
    if (!draft) return;
    const h = [...(draft.hotlines ?? [])]; h[i] = v; setDraft({ ...draft, hotlines: h });
  }
  function removeHotline(i: number) {
    if (!draft) return;
    const h = [...(draft.hotlines ?? [])]; h.splice(i, 1); setDraft({ ...draft, hotlines: h });
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-ink-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function defaultConfig(): SiteConfig {
  return {
    supportEmail: "hello@wethera.site",
    crisisBanner: {
      en: "If you or someone you know is in immediate danger in Egypt, call 123 (ambulance) or 122 (police). For mental health support call 16328 or 08008880700.",
      ar: "إذا كنت في خطر فوري داخل مصر، اتصل بـ 123 (الإسعاف) أو 122 (الشرطة). للدعم النفسي اتصل بـ 16328 أو 08008880700.",
    },
    hotlines: [
      { region: "EG", label: "Ambulance", phone: "123" },
      { region: "EG", label: "Emergency police", phone: "122" },
      { region: "EG", label: "Mental health · General Secretariat (24/7)", phone: "16328" },
      { region: "EG", label: "Mental health toll-free", phone: "08008880700" },
      { region: "EG", label: "General Secretariat landline (Cairo)", phone: "+20220816831" },
      { region: "EG", label: "Fire / Civil Defense", phone: "180" },
      { region: "EG", label: "National Council for Women", phone: "15115" },
      { region: "EG", label: "Child helpline (NCCM)", phone: "16000" },
      { region: "EG", label: "Tourist police", phone: "126" },
      { region: "EG", label: "Traffic police", phone: "128" },
    ],
    instapay: { handle: "thera-clinic@instapay", name: "Thera Health", amountEgp: 1500 },
    maintenance: false,
  };
}
