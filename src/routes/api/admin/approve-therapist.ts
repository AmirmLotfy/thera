import { createFileRoute } from "@tanstack/react-router";
import { adminAuth, adminDb, verifyIdToken } from "@/lib/firebase.server";
import { Timestamp } from "firebase-admin/firestore";
import { notificationPayload } from "@/lib/notifications/copy";

type Body = {
  applicationId: string;
  decision: "approve" | "reject";
  reason?: string;
};

export const Route = createFileRoute("/api/admin/approve-therapist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const decoded = await verifyIdToken(request);
        if (!decoded) return new Response("Unauthorized", { status: 401 });
        const role = (decoded as unknown as { role?: string; admin?: boolean }).role;
        const adminFlag = (decoded as unknown as { admin?: boolean }).admin;
        if (role !== "admin" && adminFlag !== true) return new Response("Forbidden", { status: 403 });

        const db = adminDb(); const auth = adminAuth();
        if (!db || !auth) return new Response("Admin SDK unavailable", { status: 500 });
        let body: Body;
        try { body = await request.json() as Body; }
        catch { return new Response("Bad JSON", { status: 400 }); }

        const appRef = db.collection("therapistApplications").doc(body.applicationId);
        const snap = await appRef.get();
        if (!snap.exists) return new Response("Application not found", { status: 404 });
        const app = snap.data()!;
        const now = Timestamp.now();

        if (body.decision === "reject") {
          const userRef = db.collection("users").doc(app.uid);
          await db.runTransaction(async (tx) => {
            tx.update(appRef, { status: "rejected", adminNote: body.reason ?? null, reviewedAt: now });
            tx.update(userRef, { therapistApplicationStatus: "rejected" });
            tx.set(db.collection("notifications").doc(), {
              ...notificationPayload(app.uid, "approval.rejected"),
              createdAt: now,
            });
            tx.set(db.collection("adminLogs").doc(), {
              kind: "therapist_rejected",
              uid: decoded.uid,
              payload: { applicationId: body.applicationId, reason: body.reason ?? null },
              createdAt: now,
            });
          });
          return Response.json({ ok: true, decision: "reject" });
        }

        // Approve: grant custom claim, create /therapists/{uid} doc if missing
        await auth.setCustomUserClaims(app.uid, { role: "therapist" });

        const therapistRef = db.collection("therapists").doc(app.uid);
        await db.runTransaction(async (tx) => {
          tx.update(appRef, { status: "approved", reviewedAt: now, adminNote: null });
          tx.set(therapistRef, {
            id: app.uid,
            uid: app.uid,
            displayName: app.displayName,
            title: app.title ?? null,
            bio: app.bio ?? "",
            specialties: app.specialties ?? [app.specialty ?? "general"],
            languages: app.languages ?? ["en"],
            pricePerSession: app.pricePerSession ?? 0,
            currency: app.currency ?? "USD",
            format: app.format ?? "online",
            yearsExperience: app.yearsExperience ?? null,
            education: app.education ?? [],
            certifications: app.certifications ?? [],
            approved: true,
            createdAt: now,
          }, { merge: true });
          tx.update(db.collection("users").doc(app.uid), { role: "therapist", therapistApplicationStatus: "approved" });
          tx.set(db.collection("notifications").doc(), {
            ...notificationPayload(app.uid, "approval.granted"),
            createdAt: now,
          });
          tx.set(db.collection("adminLogs").doc(), {
            kind: "therapist_approved",
            uid: decoded.uid,
            payload: { applicationId: body.applicationId, therapistUid: app.uid },
            createdAt: now,
          });
        });

        return Response.json({ ok: true, decision: "approve" });
      },
    },
  },
});
