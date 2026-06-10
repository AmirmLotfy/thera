import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Check, X, FileText, ExternalLink, Globe, Award, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/$role/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <ApprovalsPage />
    </RouteGuard>
  ),
});

type Application = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  specialty?: string;
  specialties?: string[];
  languages?: Array<"en" | "ar">;
  yearsExperience?: number;
  country?: string;
  cvPath?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  createdAt?: unknown;
};

function useApplications() {
  return useQuery({
    queryKey: ["applications", "pending"],
    queryFn: async (): Promise<Application[]> => {
      if (!isFirebaseConfigured || !db) return demoApplications();
      const ref = collection(db, "therapistApplications");
      const q = query(ref, where("status", "in", ["submitted", "under_review"]), orderBy("createdAt", "desc"), limit(40));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as Application), id: d.id }));
    },
  });
}

function ApprovalsPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const { data = [] } = useApplications();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [rejectFor, setRejectFor] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  async function decide(applicationId: string, decision: "approve" | "reject", reason?: string): Promise<boolean> {
    if (!user) return false;
    setBusy(applicationId);
    try {
      if (!isFirebaseConfigured) {
        await new Promise((r) => setTimeout(r, 400));
      } else {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/approve-therapist", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ applicationId, decision, reason }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      await qc.invalidateQueries({ queryKey: ["applications", "pending"] });
      return true;
    } catch (err) {
      console.error("approval", err);
      alert("Something went wrong — try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "قائمة اعتماد المعالجين" : "Therapist approvals"}</h1>
        <p className="mt-2 text-ink-muted">{data.length} {locale === "ar" ? "طلبات قيد المراجعة" : "applications pending review"}.</p>

        <div className="mt-8 space-y-3">
          {data.map((a) => (
            <article key={a.id} className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-lavender/70 to-sky/60" />
                  <div>
                    <p className="font-display text-xl">{a.displayName}</p>
                    <p className="text-sm text-ink-muted">{(a.specialties ?? [a.specialty ?? "general"]).join(" · ")}{a.country ? ` · ${a.country}` : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {(a.languages ?? ["en"]).join(" · ").toUpperCase()}</span>
                      {a.yearsExperience ? <span className="inline-flex items-center gap-1"><Award className="h-3 w-3" /> {a.yearsExperience} {locale === "ar" ? "سنوات" : "yrs"}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.cvPath ? <a href={a.cvPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold"><FileText className="h-3.5 w-3.5" /> {locale === "ar" ? "السيرة" : "CV"}</a> : null}
                  {a.linkedinUrl ? <a href={a.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">LinkedIn <ExternalLink className="h-3 w-3" /></a> : null}
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => void decide(a.id, "approve")}
                  disabled={busy === a.id}
                  className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2 text-xs font-semibold text-ink disabled:opacity-60"
                >
                  {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                  {locale === "ar" ? "قبول" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectFor(a.id); setRejectReason(""); }}
                  disabled={busy === a.id}
                  className="inline-flex items-center gap-2 rounded-full bg-blush px-5 py-2 text-xs font-semibold text-ink disabled:opacity-60"
                >
                  <X className="h-4 w-4" /> {locale === "ar" ? "رفض" : "Reject"}
                </button>
              </div>
            </article>
          ))}
          {data.length === 0 && (
            <div className="rounded-3xl border border-border/70 bg-cream p-10 text-center shadow-soft">
              <p className="font-display text-2xl">{locale === "ar" ? "لا توجد طلبات حالياً" : "All caught up"}</p>
              <p className="mt-2 text-sm text-ink-muted">{locale === "ar" ? "سنقوم بإشعارك عند وصول طلبات جديدة." : "We'll notify you when new applications arrive."}</p>
            </div>
          )}
        </div>

        <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{locale === "ar" ? "رفض الطلب" : "Reject application"}</DialogTitle>
              <DialogDescription>
                {locale === "ar" ? "سبب الرفض (اختياري) — سيصل للمتقدم." : "Optional reason — shared with the applicant."}
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              placeholder={locale === "ar" ? "اكتب سبب الرفض…" : "Reason for rejection…"}
            />
            <DialogFooter className="gap-2 sm:justify-end">
              <button type="button" onClick={() => setRejectFor(null)} className="rounded-full border border-border px-4 py-2 text-sm">
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectFor) return;
                  void (async () => {
                    const ok = await decide(rejectFor, "reject", rejectReason.trim() || undefined);
                    if (ok) {
                      setRejectFor(null);
                      setRejectReason("");
                    }
                  })();
                }}
                disabled={busy === rejectFor}
                className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
              >
                {locale === "ar" ? "رفض الطلب" : "Confirm reject"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </SiteShell>
  );
}

function demoApplications(): Application[] {
  const now = new Date();
  return [
    { id: "a1", uid: "u1", displayName: "Dr. Karim Nasser", email: "karim@example.com", specialties: ["couples"], languages: ["ar", "en"], yearsExperience: 8, country: "Jordan", cvPath: "#", status: "submitted", createdAt: now },
    { id: "a2", uid: "u2", displayName: "Nadia Saeed", email: "nadia@example.com", specialties: ["teens", "anxiety"], languages: ["ar"], yearsExperience: 5, country: "UAE", cvPath: "#", status: "submitted", createdAt: now },
    { id: "a3", uid: "u3", displayName: "Dr. Omar Faris", email: "omar@example.com", specialties: ["trauma"], languages: ["en"], yearsExperience: 12, country: "UK", cvPath: "#", status: "under_review", createdAt: now },
  ];
}
