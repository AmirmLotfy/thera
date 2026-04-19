import { createFileRoute } from "@tanstack/react-router";
import { adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";

type Body = { uid: string; status: "active" | "suspended" };

export const Route = createFileRoute("/api/admin/users/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const role = (decoded as unknown as { role?: string }).role;
        const adminFlag = (decoded as unknown as { admin?: boolean }).admin;
        if (role !== "admin" && adminFlag !== true) return new Response("Forbidden", { status: 403 });

        const db = adminDb();
        if (!db) return new Response("Admin SDK unavailable", { status: 500 });

        let body: Body;
        try {
          body = await request.json() as Body;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        if (!body.uid || !body.status) return new Response("Missing uid or status", { status: 400 });
        if (!["active", "suspended"].includes(body.status)) return new Response("Invalid status", { status: 400 });

        const ref = db.collection("users").doc(body.uid);
        const snap = await ref.get();
        if (!snap.exists) return new Response("User not found", { status: 404 });

        const now = Timestamp.now();
        await db.runTransaction(async (tx) => {
          tx.update(ref, { status: body.status });
          tx.set(db.collection("adminLogs").doc(), {
            kind: "user_status",
            uid: decoded.uid,
            payload: { targetUid: body.uid, status: body.status },
            createdAt: now,
          });
        });

        return Response.json({ ok: true });
      },
    },
  },
});
