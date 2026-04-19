import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { useMyChildren } from "@/lib/queries/dashboard";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { Plus, Calendar, FileText, MessageSquare, Loader2, Trash2, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/$role/children")({
  head: () => ({ meta: [{ title: "Children — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="parent">
      <ChildrenPage />
    </RouteGuard>
  ),
});

type Draft = { id?: string; name: string; dob: string; pronouns?: string; notes?: string };

function ChildrenPage() {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const childrenQ = useMyChildren(user?.uid);
  const [editing, setEditing] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  async function saveChild(d: Draft) {
    if (!user) return;
    setSaving(true);
    try {
      if (!isFirebaseConfigured || !db) {
        await new Promise((r) => setTimeout(r, 400));
        setEditing(null);
        return;
      }
      if (d.id) {
        await updateDoc(doc(db, "children", d.id), {
          name: d.name, dob: d.dob, pronouns: d.pronouns ?? null, notes: d.notes ?? null,
        });
      } else {
        await addDoc(collection(db, "children"), {
          parentUid: user.uid, name: d.name, dob: d.dob,
          pronouns: d.pronouns ?? null, notes: d.notes ?? null,
          createdAt: serverTimestamp(),
        });
      }
      await childrenQ.refetch();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemoveChild() {
    const id = pendingDelete;
    if (!id || !isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, "children", id));
    setPendingDelete(null);
    await childrenQ.refetch();
  }

  const list = childrenQ.data ?? [];

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.dash.family}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{t.dash.children}</h1>
        <p className="mt-2 text-ink-muted">{t.dash.childrenSub}</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {childrenQ.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-muted/60" />
            ))
          ) : null}
          {!childrenQ.isLoading && list.map((k, i) => (
            <motion.article
              key={k.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-lavender/60" />
                <div className="flex-1">
                  <h3 className="font-display text-2xl">{k.name}</h3>
                  <p className="text-sm text-ink-muted">{ageFromDob(k.dob, locale)}{k.pronouns ? ` · ${k.pronouns}` : ""}</p>
                </div>
              </div>
              {k.notes ? <p className="mt-4 rounded-2xl bg-cream p-3 text-sm text-ink-muted">{k.notes}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/dashboard/$role/find" params={{ role: "parent" }} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream"><Calendar className="h-3.5 w-3.5" /> {locale === "ar" ? "احجز جلسة" : "Book a session"}</Link>
                <Link to="/dashboard/$role/reports" params={{ role: "parent" }} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold"><FileText className="h-3.5 w-3.5" /> {locale === "ar" ? "التقارير" : "Reports"}</Link>
                <button onClick={() => setEditing({ id: k.id, name: k.name, dob: k.dob, pronouns: k.pronouns, notes: k.notes })} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold"><MessageSquare className="h-3.5 w-3.5" /> {locale === "ar" ? "تعديل" : "Edit"}</button>
                <button type="button" onClick={() => setPendingDelete(k.id)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> {locale === "ar" ? "حذف" : "Remove"}</button>
              </div>
            </motion.article>
          ))}

          {!childrenQ.isLoading ? (
          <button
            onClick={() => setEditing({ name: "", dob: "" })}
            className="rounded-3xl border-2 border-dashed border-border bg-transparent p-6 text-start transition-colors hover:bg-card"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted"><Plus className="h-5 w-5" /></span>
            <h3 className="mt-4 font-display text-2xl">{locale === "ar" ? "إضافة طفل" : "Add a child"}</h3>
            <p className="text-sm text-ink-muted">{locale === "ar" ? "أنشئ ملفًا للحجز وتتبع الرعاية." : "Create a profile to book and track care."}</p>
          </button>
          ) : null}
        </div>

        <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{locale === "ar" ? "حذف الملف؟" : "Remove this profile?"}</DialogTitle>
              <DialogDescription>
                {locale === "ar" ? "لن يمكن التراجع عن هذا الإجراء." : "This can’t be undone."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-end">
              <button type="button" onClick={() => setPendingDelete(null)} className="rounded-full border border-border px-4 py-2 text-sm">
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveChild()}
                className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-cream"
              >
                {locale === "ar" ? "حذف" : "Remove"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {editing ? (
          <EditorModal
            draft={editing}
            onChange={setEditing}
            onCancel={() => setEditing(null)}
            onSave={saveChild}
            saving={saving}
          />
        ) : null}
      </section>
    </SiteShell>
  );
}

function EditorModal({ draft, onChange, onCancel, onSave, saving }: {
  draft: Draft; onChange: (d: Draft) => void; onCancel: () => void; onSave: (d: Draft) => void; saving: boolean;
}) {
  const { locale } = useI18n();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">{draft.id ? (locale === "ar" ? "تعديل الملف" : "Edit profile") : (locale === "ar" ? "طفل جديد" : "New child")}</h3>
          <button onClick={onCancel} aria-label="Close" className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <Field label={locale === "ar" ? "الاسم" : "Name"}>
            <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2" />
          </Field>
          <Field label={locale === "ar" ? "تاريخ الميلاد" : "Date of birth"}>
            <input type="date" value={draft.dob} onChange={(e) => onChange({ ...draft, dob: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2" />
          </Field>
          <Field label={locale === "ar" ? "الضمائر (اختياري)" : "Pronouns (optional)"}>
            <input value={draft.pronouns ?? ""} onChange={(e) => onChange({ ...draft, pronouns: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2" />
          </Field>
          <Field label={locale === "ar" ? "ملاحظات (اختياري)" : "Notes (optional)"}>
            <textarea value={draft.notes ?? ""} onChange={(e) => onChange({ ...draft, notes: e.target.value })} rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-2" />
          </Field>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">{locale === "ar" ? "إلغاء" : "Cancel"}</button>
          <button onClick={() => onSave(draft)} disabled={!draft.name || !draft.dob || saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {locale === "ar" ? "حفظ" : "Save"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function ageFromDob(dob: string, locale: "en" | "ar") {
  if (!dob) return "";
  const now = new Date();
  const d = new Date(dob);
  const years = now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return `${years} ${locale === "ar" ? "سنوات" : "yr"}`;
}
