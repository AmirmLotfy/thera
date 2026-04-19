import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Download, Check, X, Loader2, Image } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

export const Route = createFileRoute("/dashboard/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — Thera Admin" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <PaymentsPage />
    </RouteGuard>
  ),
});

type Payment = {
  id: string;
  bookingId?: string;
  uid?: string;
  therapistId?: string;
  provider?: "polar" | "instapay" | "manual";
  amount?: number;
  currency?: string;
  status?: "pending" | "paid" | "failed" | "refunded";
  createdAt?: unknown;
};

type ProofDoc = {
  id: string;
  bookingId?: string;
  therapistId?: string;
  patientUid?: string;
  uid?: string;
  fileUrl?: string;
  reference?: string;
  note?: string;
  status?: "pending_review" | "approved" | "rejected";
  createdAt?: unknown;
};

function usePayments() {
  return useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async (): Promise<Payment[]> => {
      if (!isFirebaseConfigured || !db) return demoPayments();
      const q = query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as Payment), id: d.id }));
    },
  });
}

function useProofs() {
  return useQuery({
    queryKey: ["admin", "proofs"],
    queryFn: async (): Promise<ProofDoc[]> => {
      if (!isFirebaseConfigured || !db) return demoProofs();
      const q = query(collection(db, "paymentProofs"), where("status", "==", "pending_review"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as ProofDoc), id: d.id }));
    },
  });
}

function useVerify() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ proofId, decision }: { proofId: string; decision: "approve" | "reject" }) => {
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/instapay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ proofId, decision }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "proofs"] });
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
  });
}

function PaymentsPage() {
  const { locale } = useI18n();
  const [tab, setTab] = React.useState<"all" | "proofs">("all");
  const { data = [] } = usePayments();
  const { data: proofs = [], isLoading: loadingProofs } = useProofs();
  const verify = useVerify();

  const total = data.filter((p) => p.status === "paid").reduce((a, b) => a + (b.amount ?? 0), 0);
  const pending = data.filter((p) => p.status === "pending").reduce((a, b) => a + (b.amount ?? 0), 0);
  const refunded = data.filter((p) => p.status === "refunded").reduce((a, b) => a + (b.amount ?? 0), 0);

  function exportCsv() {
    const rows = [["id", "bookingId", "uid", "provider", "amount", "currency", "status"]];
    for (const p of data) rows.push([p.id, p.bookingId ?? "", p.uid ?? "", p.provider ?? "", String(p.amount ?? 0), p.currency ?? "", p.status ?? ""]);
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "المدفوعات" : "Payments"}</h1>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">
            <Download className="h-3.5 w-3.5" /> {locale === "ar" ? "تصدير CSV" : "Export CSV"}
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Kpi label={locale === "ar" ? "إجمالي مدفوع" : "Paid total"} value={fmt(total)} />
          <Kpi label={locale === "ar" ? "قيد الانتظار" : "Pending"} value={fmt(pending)} />
          <Kpi label={locale === "ar" ? "مستردّ" : "Refunded"} value={fmt(refunded)} />
        </div>

        <div className="mt-8 flex gap-2">
          {(["all", "proofs"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-xs font-semibold ${tab === t ? "bg-ink text-cream" : "bg-card border border-border"}`}>
              {t === "all"
                ? (locale === "ar" ? "كل المدفوعات" : "All payments")
                : (locale === "ar" ? `إثباتات InstaPay (${proofs.length})` : `Instapay proofs (${proofs.length})`)}
            </button>
          ))}
        </div>

        {tab === "all" && (
          <div className="mt-5 overflow-x-auto rounded-3xl border border-border/70 bg-card shadow-soft">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3 text-start">{locale === "ar" ? "المعرّف" : "ID"}</th>
                  <th className="px-5 py-3 text-start">{locale === "ar" ? "المزود" : "Provider"}</th>
                  <th className="px-5 py-3 text-start">{locale === "ar" ? "المبلغ" : "Amount"}</th>
                  <th className="px-5 py-3 text-start">{locale === "ar" ? "العملة" : "Currency"}</th>
                  <th className="px-5 py-3 text-start">{locale === "ar" ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-mono text-xs">{p.id.slice(0, 10)}</td>
                    <td className="px-5 py-3 capitalize">{p.provider ?? "—"}</td>
                    <td className="px-5 py-3 font-semibold">{fmt(p.amount ?? 0, p.currency)}</td>
                    <td className="px-5 py-3 text-xs uppercase">{p.currency ?? "—"}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-3 py-1 text-xs capitalize ${p.status === "paid" ? "bg-mint/60" : p.status === "pending" ? "bg-blush/60" : "bg-muted"}`}>{p.status ?? "—"}</span></td>
                  </tr>
                ))}
                {data.length === 0 && (<tr><td colSpan={5} className="px-5 py-10 text-center text-ink-muted">{locale === "ar" ? "لا توجد معاملات." : "No payments yet."}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

        {tab === "proofs" && (
          <div className="mt-5 space-y-4">
            {loadingProofs && <div className="flex items-center gap-2 text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" />{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</div>}
            {!loadingProofs && proofs.length === 0 && (
              <div className="rounded-3xl border border-border/70 bg-card p-10 text-center text-ink-muted">
                {locale === "ar" ? "لا توجد إثباتات بانتظار المراجعة." : "No proofs pending review."}
              </div>
            )}
            {proofs.map((proof) => (
              <div key={proof.id} className="rounded-3xl border border-border/70 bg-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="font-display text-lg">{locale === "ar" ? "إثبات تحويل" : "Transfer proof"}</p>
                    <p className="text-xs text-ink-muted">{locale === "ar" ? "حجز: " : "Booking: "}{proof.bookingId?.slice(0, 8) ?? "—"}</p>
                    {proof.reference && <p className="text-xs text-ink-muted">{locale === "ar" ? "المرجع: " : "Ref: "}{proof.reference}</p>}
                    {proof.note && <p className="text-sm text-ink-muted">{proof.note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proof.fileUrl && (
                      <a href={proof.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium">
                        <Image className="h-3.5 w-3.5" /> {locale === "ar" ? "عرض الصورة" : "View proof"}
                      </a>
                    )}
                    <button
                      onClick={() => verify.mutate({ proofId: proof.id, decision: "approve" })}
                      disabled={verify.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-mint/80 px-4 py-2 text-xs font-semibold text-ink disabled:opacity-50"
                    >
                      {verify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {locale === "ar" ? "موافقة" : "Approve"}
                    </button>
                    <button
                      onClick={() => verify.mutate({ proofId: proof.id, decision: "reject" })}
                      disabled={verify.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> {locale === "ar" ? "رفض" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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

function fmt(amount: number, currency?: string): string {
  const cur = currency || "USD";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount); }
  catch { return `${cur} ${amount.toFixed(2)}`; }
}

function demoPayments(): Payment[] {
  return [
    { id: "p1", provider: "polar", amount: 90, currency: "USD", status: "paid" },
    { id: "p2", provider: "instapay", amount: 1600, currency: "EGP", status: "pending" },
    { id: "p3", provider: "polar", amount: 90, currency: "USD", status: "refunded" },
  ];
}

function demoProofs(): ProofDoc[] {
  return [
    { id: "pr1", bookingId: "bk_demo_1", uid: "u1", therapistId: "th1", reference: "IP-99123", status: "pending_review", note: "Transfer done at 9am" },
    { id: "pr2", bookingId: "bk_demo_2", uid: "u2", therapistId: "th2", reference: "IP-88010", status: "pending_review" },
  ];
}
