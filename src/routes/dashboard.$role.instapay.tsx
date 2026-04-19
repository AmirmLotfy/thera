import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Check, X, Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

export const Route = createFileRoute("/dashboard/$role/instapay")({
  head: () => ({ meta: [{ title: "Instapay proofs — Thera" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="therapist">
      <TherapistInstapayPage />
    </RouteGuard>
  ),
});

type ProofDoc = {
  id: string;
  bookingId?: string;
  patientUid?: string;
  fileUrl?: string;
  reference?: string;
  note?: string;
  status?: "pending_review" | "approved" | "rejected";
  createdAt?: { toDate?: () => Date };
};

function useTherapistProofs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["therapist", "proofs", user?.uid],
    enabled: !!user,
    queryFn: async (): Promise<ProofDoc[]> => {
      if (!isFirebaseConfigured || !db || !user) return demoProofs();
      const q = query(
        collection(db, "paymentProofs"),
        where("therapistId", "==", user.uid),
        where("status", "==", "pending_review"),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as ProofDoc), id: d.id }));
    },
  });
}

function useVerify() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ proofId, decision, reason }: { proofId: string; decision: "approve" | "reject"; reason?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/instapay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ proofId, decision, reason }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["therapist", "proofs"] });
    },
  });
}

function TherapistInstapayPage() {
  const { locale } = useI18n();
  const { data: proofs = [], isLoading } = useTherapistProofs();
  const verify = useVerify();
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  function handleApprove(proofId: string) {
    verify.mutate({ proofId, decision: "approve" });
  }

  function handleReject() {
    if (!rejectId) return;
    verify.mutate({ proofId: rejectId, decision: "reject", reason: reason || undefined }, {
      onSuccess: () => { setRejectId(null); setReason(""); },
    });
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
          {locale === "ar" ? "المدفوعات" : "Payments"}
        </p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">
          {locale === "ar" ? "إثباتات InstaPay" : "InstaPay proofs"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {locale === "ar"
            ? "راجع لقطات التحويل المرسلة من مرضاك وأكّد الاستلام أو ارفض."
            : "Review screenshots sent by your patients and confirm receipt or reject."}
        </p>

        <div className="mt-8 space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {locale === "ar" ? "جارٍ التحميل..." : "Loading..."}
            </div>
          )}

          {!isLoading && proofs.length === 0 && (
            <div className="rounded-3xl border border-border/70 bg-card p-14 text-center text-ink-muted">
              <p className="font-display text-xl">
                {locale === "ar" ? "لا توجد إثباتات بانتظار مراجعتك" : "No proofs waiting for review"}
              </p>
              <p className="mt-2 text-sm">
                {locale === "ar"
                  ? "عندما يرسل مريض لقطة تحويل InstaPay ستظهر هنا."
                  : "When a patient submits an InstaPay screenshot it will appear here."}
              </p>
            </div>
          )}

          {proofs.map((proof) => (
            <ProofCard
              key={proof.id}
              proof={proof}
              locale={locale}
              onApprove={() => handleApprove(proof.id)}
              onReject={() => { setRejectId(proof.id); setReason(""); }}
              busy={verify.isPending && (verify.variables as { proofId: string } | undefined)?.proofId === proof.id}
            />
          ))}
        </div>
      </section>

      {/* Reject reason modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-xl">
            <h2 className="font-display text-2xl">
              {locale === "ar" ? "رفض الإثبات" : "Reject proof"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {locale === "ar"
                ? "أخبر المريض سبب الرفض (اختياري)."
                : "Let the patient know why (optional)."}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              placeholder={locale === "ar" ? "مثال: لم يظهر اسم المستلم بوضوح." : "e.g. Recipient name was unclear."}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleReject}
                disabled={verify.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-destructive/90 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {verify.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <X className="h-3.5 w-3.5" />
                {locale === "ar" ? "رفض" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}

function ProofCard({
  proof,
  locale,
  onApprove,
  onReject,
  busy,
}: {
  proof: ProofDoc;
  locale: string;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const date = proof.createdAt?.toDate?.()?.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <p className="font-display text-xl">
            {locale === "ar" ? "إثبات تحويل" : "Transfer proof"}
          </p>
          <p className="text-xs text-ink-muted">
            {locale === "ar" ? "رقم الحجز: " : "Booking: "}{proof.bookingId?.slice(0, 8) ?? "—"}
          </p>
          {proof.reference && (
            <p className="text-xs text-ink-muted">
              {locale === "ar" ? "مرجع: " : "Ref: "}<span className="font-mono">{proof.reference}</span>
            </p>
          )}
          {proof.note && <p className="text-sm text-ink-muted">{proof.note}</p>}
          {date && <p className="text-xs text-ink-muted">{date}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {proof.fileUrl && (
            <a
              href={proof.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/80"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {locale === "ar" ? "عرض اللقطة" : "View screenshot"}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
          <button
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-mint/80 px-4 py-2 text-xs font-semibold text-ink shadow-soft hover:bg-mint disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {locale === "ar" ? "تأكيد الاستلام" : "Confirm receipt"}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            {locale === "ar" ? "رفض" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function demoProofs(): ProofDoc[] {
  return [
    { id: "pr1", bookingId: "bk_demo_1", patientUid: "u1", reference: "IP-99123", status: "pending_review", note: "Transfer done at 9am" },
    { id: "pr2", bookingId: "bk_demo_2", patientUid: "u2", reference: "IP-88010", status: "pending_review" },
  ];
}
