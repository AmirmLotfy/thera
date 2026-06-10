import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Search, ShieldCheck, UserMinus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

export const Route = createFileRoute("/dashboard/admin/users")({
  head: () => ({ meta: [{ title: "Users — Thera Admin" }] }),
  component: () => (
    <RouteGuard requireAuth requireRole="admin">
      <UsersPage />
    </RouteGuard>
  ),
});

type Row = { id: string; email?: string; displayName?: string; role?: string; language?: "en" | "ar"; createdAt?: unknown; status?: string };

function useUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<Row[]> => {
      if (!isFirebaseConfigured || !db) return demo();
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as Row), id: d.id }));
    },
  });
}

function UsersPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [roleF, setRoleF] = React.useState<"all" | "adult" | "parent" | "teen" | "therapist" | "admin">("all");
  const { data = [] } = useUsers();

  const filtered = data
    .filter((u) => roleF === "all" || u.role === roleF)
    .filter((u) => {
      if (!search) return true;
      const hay = `${u.email ?? ""} ${u.displayName ?? ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });

  async function postUserStatus(uid: string, status: "active" | "suspended") {
    if (!user || !isFirebaseConfigured) return;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/admin/users/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ uid, status }),
    });
    if (!res.ok) throw new Error(await res.text());
    await qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  async function suspend(uid: string) {
    if (!user || !isFirebaseConfigured) return;
    if (!confirm(locale === "ar" ? "تعليق الحساب؟" : "Suspend this account?")) return;
    try {
      await postUserStatus(uid, "suspended");
    } catch (e) {
      console.error(e);
    }
  }

  async function verify(uid: string) {
    if (!user || !isFirebaseConfigured) return;
    try {
      await postUserStatus(uid, "active");
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{locale === "ar" ? "مسؤول" : "Admin"}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{locale === "ar" ? "المستخدمون" : "Users"}</h1>
        <p className="mt-2 text-ink-muted">{locale === "ar" ? "إدارة كل حساب — بحث، فلتر، تعليق أو تحقق." : "Manage every account on Thera — search, filter, suspend, or verify."}</p>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === "ar" ? "ابحث بالاسم أو البريد…" : "Search by name or email…"}
              className="w-full rounded-full border border-border bg-card ps-11 pe-4 py-2.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["all", "adult", "parent", "teen", "therapist", "admin"] as const).map((r) => (
              <button key={r} onClick={() => setRoleF(r)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${roleF === r ? "bg-ink text-cream" : "bg-card border border-border"}`}>{r}</button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-border/70 bg-card shadow-soft">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "الاسم" : "Name"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "الدور" : "Role"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "اللغة" : "Lang"}</th>
                <th className="px-5 py-3 text-start">{locale === "ar" ? "الحالة" : "Status"}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{u.displayName || u.email || u.id}</p>
                    <p className="text-xs text-ink-muted">{u.email ?? ""}</p>
                  </td>
                  <td className="px-5 py-4 capitalize">{u.role ?? "—"}</td>
                  <td className="px-5 py-4 uppercase text-xs">{u.language ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs capitalize ${u.status === "suspended" ? "bg-destructive/20 text-destructive" : "bg-mint/60"}`}>{u.status ?? "active"}</span>
                  </td>
                  <td className="px-5 py-4 text-end">
                    <div className="inline-flex gap-1">
                      <button onClick={() => void verify(u.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted" title={locale === "ar" ? "تحقق" : "Verify"}><ShieldCheck className="h-4 w-4" /></button>
                      <button onClick={() => void suspend(u.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted" title={locale === "ar" ? "تعليق" : "Suspend"}><UserMinus className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-muted">{locale === "ar" ? "لا توجد نتائج." : "No users match the current filter."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </SiteShell>
  );
}

function demo(): Row[] {
  return [
    { id: "u1", email: "mariam@example.com", displayName: "Mariam K.", role: "adult", language: "en", status: "active" },
    { id: "u2", email: "yusuf@example.com", displayName: "Yusuf I.", role: "parent", language: "ar", status: "active" },
    { id: "u3", email: "layla@example.com", displayName: "Dr. Layla H.", role: "therapist", language: "en", status: "active" },
    { id: "u4", email: "karim@example.com", displayName: "Karim N.", role: "therapist", language: "ar", status: "pending" },
  ];
}
