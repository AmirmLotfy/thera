import { useQuery } from "@tanstack/react-query";
import {
  collection, getDocs, limit, orderBy, query, where, doc, getDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type {
  MoodLog, SessionDoc, NotificationDoc, ReportDoc, Booking, ChildDoc, Achievement,
} from "@/lib/types";

const DEMO_ENABLED = () =>
  (import.meta.env.VITE_ENABLE_DEMO === "false") ? false
  : !isFirebaseConfigured || !db;

export function useRecentMoodLogs(uid: string | undefined | null) {
  return useQuery({
    queryKey: ["moodLogs", uid],
    enabled: !!uid,
    queryFn: async (): Promise<MoodLog[]> => {
      if (!uid) return [];
      if (DEMO_ENABLED()) return demoMoods();
      const ref = collection(db!, "moodLogs");
      const q = query(ref, where("uid", "==", uid), orderBy("date", "desc"), limit(30));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as MoodLog), id: d.id }));
    },
  });
}

export function useUpcomingSessions(uid: string | undefined | null, role: "patient" | "therapist") {
  return useQuery({
    queryKey: ["sessions", "upcoming", uid, role],
    enabled: !!uid,
    queryFn: async (): Promise<SessionDoc[]> => {
      if (!uid) return [];
      if (DEMO_ENABLED()) return demoSessions(role);
      const field = role === "therapist" ? "therapistId" : "patientUid";
      const ref = collection(db!, "sessions");
      const q = query(ref, where(field, "==", uid), orderBy("startsAt", "asc"), limit(8));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as SessionDoc), id: d.id }));
    },
  });
}

/** All sessions for a therapist (newest first) — for sessions index / filters. */
export function useTherapistSessionsIndex(uid: string | undefined | null) {
  return useQuery({
    queryKey: ["sessions", "therapist", "index", uid],
    enabled: !!uid,
    queryFn: async (): Promise<SessionDoc[]> => {
      if (!uid) return [];
      if (DEMO_ENABLED()) return demoSessions("therapist");
      const ref = collection(db!, "sessions");
      const q = query(ref, where("therapistId", "==", uid), orderBy("startsAt", "desc"), limit(120));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as SessionDoc), id: d.id }));
    },
  });
}

export function useNotifications(uid: string | undefined | null) {
  return useQuery({
    queryKey: ["notifications", uid],
    enabled: !!uid,
    queryFn: async (): Promise<NotificationDoc[]> => {
      if (!uid) return [];
      if (DEMO_ENABLED()) return demoNotifications();
      const ref = collection(db!, "notifications");
      const q = query(ref, where("uid", "==", uid), orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as NotificationDoc), id: d.id }));
    },
  });
}

export function useMyReports(uid: string | undefined | null, role: "patient" | "therapist") {
  return useQuery({
    queryKey: ["reports", uid, role],
    enabled: !!uid,
    queryFn: async (): Promise<ReportDoc[]> => {
      if (!uid) return [];
      if (DEMO_ENABLED()) return demoReports();
      const field = role === "therapist" ? "therapistId" : "patientUid";
      const ref = collection(db!, "reports");
      const q = query(ref, where(field, "==", uid), orderBy("createdAt", "desc"), limit(10));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as ReportDoc), id: d.id }));
    },
  });
}

export function useMyBookings(uid: string | undefined | null, role: "patient" | "therapist") {
  return useQuery({
    queryKey: ["bookings", uid, role],
    enabled: !!uid,
    queryFn: async (): Promise<Booking[]> => {
      if (!uid) return [];
      if (DEMO_ENABLED()) return demoBookings();
      const field = role === "therapist" ? "therapistId" : "patientUid";
      const ref = collection(db!, "bookings");
      const q = query(ref, where(field, "==", uid), orderBy("createdAt", "desc"), limit(10));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as Booking), id: d.id }));
    },
  });
}

export function useMyChildren(parentUid: string | undefined | null) {
  return useQuery({
    queryKey: ["children", parentUid],
    enabled: !!parentUid,
    queryFn: async (): Promise<ChildDoc[]> => {
      if (!parentUid) return [];
      if (DEMO_ENABLED()) return demoChildren();
      const ref = collection(db!, "children");
      const q = query(ref, where("parentUid", "==", parentUid), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as ChildDoc), id: d.id }));
    },
  });
}

export function useMyAchievements(uid: string | undefined | null) {
  return useQuery({
    queryKey: ["achievements", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Achievement[]> => {
      if (!uid) return [];
      if (DEMO_ENABLED()) return demoAchievements();
      const ref = collection(db!, `users/${uid}/achievements`);
      const snap = await getDocs(ref);
      return snap.docs.map((d) => ({ ...(d.data() as Achievement), id: d.id }));
    },
  });
}

export function useUserProfile(uid: string | undefined | null) {
  return useQuery({
    queryKey: ["userProfile", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return null;
      if (DEMO_ENABLED()) return { uid, streak: 4, xp: 220, level: 3 } as const;
      const snap = await getDoc(doc(db!, "users", uid));
      return snap.exists() ? snap.data() : null;
    },
  });
}

function demoMoods(): MoodLog[] {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const score = ((Math.floor(Math.sin(i) * 10) + 13) % 5 + 1) as 1 | 2 | 3 | 4 | 5;
    return {
      id: `demo-mood-${i}`, uid: "demo", date: d.toISOString().slice(0, 10),
      score, tags: ["rested"], createdAt: d,
    };
  });
}

function demoSessions(role: "patient" | "therapist"): SessionDoc[] {
  const start = new Date(); start.setHours(17, 0, 0, 0); start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setMinutes(end.getMinutes() + 50);
  return [{
    id: "demo-s1", bookingId: "demo-b1",
    therapistId: role === "therapist" ? "me" : "layla-haddad",
    patientUid: role === "patient" ? "me" : "demo-patient",
    startsAt: start.toISOString(), endsAt: end.toISOString(),
    roomUrl: "https://thera.daily.co/demo", roomName: "demo",
    status: "upcoming" as const, createdAt: new Date(),
  }];
}

function demoNotifications(): NotificationDoc[] {
  return [
    { id: "n1", uid: "me", title: "Session confirmed", body: "Tomorrow at 5:00 PM with Dr. Layla Haddad", read: false, kind: "booking", createdAt: new Date() },
    { id: "n2", uid: "me", title: "New article", body: "Calming rituals for high-stress weeks", read: false, kind: "system", createdAt: new Date(Date.now() - 8.64e7) },
  ];
}

function demoReports(): ReportDoc[] {
  return [
    { id: "r1", sessionId: "demo-s0", therapistId: "t", patientUid: "me", raw: "...", summary: "Discussed coping strategies for work stress.", createdAt: new Date(Date.now() - 6 * 8.64e7) },
  ];
}

function demoBookings(): Booking[] {
  return [
    { id: "b1", slotId: "sl1", therapistId: "layla-haddad", patientUid: "me", status: "confirmed", amount: 9000, currency: "USD", createdAt: new Date() },
  ];
}

function demoChildren(): ChildDoc[] {
  return [
    { id: "c1", parentUid: "me", name: "Amira", dob: "2014-03-14", createdAt: new Date() },
    { id: "c2", parentUid: "me", name: "Omar", dob: "2016-09-02", createdAt: new Date() },
  ];
}

function demoAchievements(): Achievement[] {
  return [
    { id: "a1", key: "first_check_in", unlockedAt: new Date() },
    { id: "a2", key: "streak_3", unlockedAt: new Date() },
  ];
}
