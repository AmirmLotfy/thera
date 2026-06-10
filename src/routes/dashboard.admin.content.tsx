import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { Plus, Edit3, Trash2, Globe, X, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

export const Route = createFileRoute("/dashboard/admin/content")({
  head: () => ({ meta: [{ title: "Content — Thera Admin" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <ContentPage />
    </RouteGuard>
  ),
});

type Article = {
  id: string;
  slug: string;
  category: string;
  status: "draft" | "review" | "published";
  en?: { title: string; excerpt: string; body: string };
  ar?: { title: string; excerpt: string; body: string };
  cover?: string;
  author?: string;
  updatedAt?: unknown;
};

function useArticles() {
  return useQuery({
    queryKey: ["admin", "articles"],
    queryFn: async (): Promise<Article[]> => {
      if (!isFirebaseConfigured || !db) return demo();
      const q = query(collection(db, "articles"), orderBy("updatedAt", "desc"), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as Article), id: d.id }));
    },
  });
}

function ContentPage() {
  const { locale } = useI18n();
  const qc = useQueryClient();
  const { data = [] } = useArticles();
  const [editing, setEditing] = React.useState<Partial<Article> | null>(null);
  const [catFilter, setCatFilter] = React.useState<string>("all");

  const cats = Array.from(new Set(["all", ...data.map((a) => a.category)]));
  const filtered = data.filter((a) => catFilter === "all" || a.category === catFilter);

  async function save(a: Partial<Article>) {
    if (!isFirebaseConfigured || !db) {
      toast.error(locale === "ar" ? "فعّل Firebase لحفظ المقالات." : "Connect Firebase to persist articles.");
      return;
    }
    const payload = {
      slug: a.slug ?? slugify(a.en?.title ?? a.ar?.title ?? "untitled"),
      category: a.category ?? "general",
      status: a.status ?? "draft",
      en: a.en ?? null,
      ar: a.ar ?? null,
      cover: a.cover ?? null,
      author: a.author ?? null,
      updatedAt: serverTimestamp(),
    };
    try {
      if (a.id) await updateDoc(doc(db, "articles", a.id), payload);
      else await addDoc(collection(db, "articles"), { ...payload, createdAt: serverTimestamp() });
      await qc.invalidateQueries({ queryKey: ["admin", "articles"] });
      setEditing(null);
      toast.success(locale === "ar" ? "تم حفظ المقال." : "Article saved.");
    } catch (e) {
      console.error(e);
      toast.error(locale === "ar" ? "تعذّر الحفظ." : "Save failed.");
    }
  }

  async function remove(id: string) {
    if (!confirm(locale === "ar" ? "حذف المقال؟" : "Delete this article?")) return;
    if (!isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, "articles", id));
    await qc.invalidateQueries({ queryKey: ["admin", "articles"] });
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "المحتوى" : "Content"}</h1>
            <p className="mt-2 text-ink-muted">{locale === "ar" ? "مقالات ثنائية اللغة مع ترجمات مخصصة." : "Bilingual articles with per-language translations."}</p>
          </div>
          <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream">
            <Plus className="h-4 w-4" /> {locale === "ar" ? "مقال جديد" : "New article"}
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Kpi label={locale === "ar" ? "منشور" : "Published"} value={String(data.filter((a) => a.status === "published").length)} />
          <Kpi label={locale === "ar" ? "مسودات" : "Drafts"} value={String(data.filter((a) => a.status === "draft").length)} />
          <Kpi label={locale === "ar" ? "قيد المراجعة" : "In review"} value={String(data.filter((a) => a.status === "review").length)} />
          <Kpi label={locale === "ar" ? "إجمالي" : "Total"} value={String(data.length)} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${catFilter === c ? "bg-ink text-cream" : "bg-card border border-border"}`}>{c}</button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg">{a.en?.title ?? a.ar?.title ?? a.slug}</p>
                <p className="mt-0.5 text-sm text-ink-muted" dir="rtl">{a.ar?.title ?? "—"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{a.category}</span>
                  <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {[a.en ? "EN" : null, a.ar ? "AR" : null].filter(Boolean).join(" · ") || "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs ${a.status === "published" ? "bg-mint/60" : a.status === "draft" ? "bg-muted" : "bg-blush/60"}`}>{a.status}</span>
                <button onClick={() => setEditing(a)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"><Edit3 className="h-4 w-4" /></button>
                <button onClick={() => void remove(a.id)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="rounded-3xl border border-border/70 bg-cream p-10 text-center text-sm text-ink-muted shadow-soft">{locale === "ar" ? "لا توجد مقالات بعد." : "No articles yet."}</div>}
        </div>
      </section>
      <AnimatePresence>
        {editing ? <ArticleEditor initial={editing} onClose={() => setEditing(null)} onSave={save} /> : null}
      </AnimatePresence>
    </SiteShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function ArticleEditor({ initial, onClose, onSave }: { initial: Partial<Article>; onClose: () => void; onSave: (a: Partial<Article>) => void | Promise<void> }) {
  const { locale } = useI18n();
  const [draft, setDraft] = React.useState<Partial<Article>>(initial);

  function updateLang(lang: "en" | "ar", field: "title" | "excerpt" | "body", value: string) {
    setDraft((d) => ({ ...d, [lang]: { ...(d[lang] ?? { title: "", excerpt: "", body: "" }), [field]: value } }));
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 md:items-center">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-3xl rounded-3xl bg-card p-6 shadow-soft-lg md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{draft.id ? (locale === "ar" ? "تحرير مقال" : "Edit article") : (locale === "ar" ? "مقال جديد" : "New article")}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label={locale === "ar" ? "رابط" : "Slug"}>
            <input value={draft.slug ?? ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className="input" />
          </Field>
          <Field label={locale === "ar" ? "فئة" : "Category"}>
            <input value={draft.category ?? ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="input" />
          </Field>
          <Field label={locale === "ar" ? "الحالة" : "Status"}>
            <select value={draft.status ?? "draft"} onChange={(e) => setDraft({ ...draft, status: e.target.value as Article["status"] })} className="input">
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
            </select>
          </Field>
          <Field label={locale === "ar" ? "صورة الغلاف" : "Cover URL"}>
            <input value={draft.cover ?? ""} onChange={(e) => setDraft({ ...draft, cover: e.target.value })} className="input" />
          </Field>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <LangBlock lang="en" draft={draft} onChange={(f, v) => updateLang("en", f, v)} />
          <LangBlock lang="ar" draft={draft} onChange={(f, v) => updateLang("ar", f, v)} />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-5 py-2 text-sm">{locale === "ar" ? "إلغاء" : "Cancel"}</button>
          <button onClick={() => onSave(draft)} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-cream">
            <Save className="h-4 w-4" /> {locale === "ar" ? "حفظ" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LangBlock({ lang, draft, onChange }: { lang: "en" | "ar"; draft: Partial<Article>; onChange: (field: "title" | "excerpt" | "body", value: string) => void }) {
  const v = draft[lang] ?? { title: "", excerpt: "", body: "" };
  return (
    <div className="rounded-3xl border border-border/60 bg-muted/30 p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">{lang === "en" ? "English" : "العربية"}</p>
      <label className="text-xs text-ink-muted">Title</label>
      <input value={v.title} onChange={(e) => onChange("title", e.target.value)} className="input mb-2" />
      <label className="text-xs text-ink-muted">Excerpt</label>
      <textarea value={v.excerpt} onChange={(e) => onChange("excerpt", e.target.value)} rows={2} className="input mb-2" />
      <label className="text-xs text-ink-muted">Body (Markdown)</label>
      <textarea value={v.body} onChange={(e) => onChange("body", e.target.value)} rows={6} className="input" />
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

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"); }

function demo(): Article[] {
  const now = new Date();
  return [
    { id: "a1", slug: "naming-what-you-feel", category: "awareness", status: "published", en: { title: "Naming what you feel", excerpt: "A 60-second practice.", body: "" }, ar: { title: "تسمية ما تشعر به", excerpt: "ممارسة لمدة ٦٠ ثانية.", body: "" }, updatedAt: now },
    { id: "a2", slug: "box-breathing", category: "anxiety", status: "published", en: { title: "Box breathing", excerpt: "", body: "" }, ar: { title: "تنفس الصندوق", excerpt: "", body: "" }, updatedAt: now },
    { id: "a3", slug: "wind-down", category: "sleep", status: "draft", en: { title: "Wind-down evenings", excerpt: "", body: "" }, updatedAt: now },
  ];
}
