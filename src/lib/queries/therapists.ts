import { useQuery } from "@tanstack/react-query";
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { DEMO_THERAPISTS, demoSlotsFor } from "@/lib/demo/therapists";
import type { TherapistDoc, AvailabilitySlot, Specialty, Locale, Format } from "@/lib/types";

export type TherapistFilters = {
  specialty?: Specialty | null;
  language?: Locale | null;
  format?: Format | null;
  maxPrice?: number | null;
  sort?: "rating" | "price" | "soonest";
  q?: string;
};

function clientMatches(t: TherapistDoc, f: TherapistFilters): boolean {
  if (f.specialty && !t.specialties.includes(f.specialty)) return false;
  if (f.language && !t.languages.includes(f.language)) return false;
  if (f.format && f.format !== "both" && t.format !== f.format && t.format !== "both") return false;
  if (f.maxPrice != null && t.pricePerSession > f.maxPrice) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [t.displayName, t.title, t.bio, ...(t.specialties ?? [])].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function useTherapists(filters: TherapistFilters = {}) {
  return useQuery({
    queryKey: ["therapists", filters],
    queryFn: async (): Promise<TherapistDoc[]> => {
      if (!isFirebaseConfigured || !db) {
        const filtered = DEMO_THERAPISTS.filter((t) => clientMatches(t, filters));
        return sortTherapists(filtered, filters.sort);
      }
      const ref = collection(db, "therapists");
      const constraints = [where("approved", "==", true)];
      const q = query(ref, ...constraints, limit(60));
      const snap = await getDocs(q);
      const docs: TherapistDoc[] = snap.docs.map((d) => ({ ...(d.data() as TherapistDoc), id: d.id }));
      const filtered = docs.filter((t) => clientMatches(t, filters));
      return sortTherapists(filtered, filters.sort);
    },
  });
}

function sortTherapists(list: TherapistDoc[], sort?: TherapistFilters["sort"]): TherapistDoc[] {
  const copy = list.slice();
  if (sort === "price") copy.sort((a, b) => a.pricePerSession - b.pricePerSession);
  else if (sort === "soonest") copy.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  else copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return copy;
}

export function useTherapist(id: string | undefined | null) {
  return useQuery({
    queryKey: ["therapist", id],
    queryFn: async (): Promise<TherapistDoc | null> => {
      if (!id) return null;
      if (!isFirebaseConfigured || !db) {
        return DEMO_THERAPISTS.find((t) => t.id === id) ?? null;
      }
      const snap = await getDoc(doc(db, "therapists", id));
      if (!snap.exists()) return null;
      return { ...(snap.data() as TherapistDoc), id: snap.id };
    },
    enabled: !!id,
  });
}

export function useTherapistSlots(therapistId: string | undefined | null, lookaheadDays = 14) {
  return useQuery({
    queryKey: ["therapistSlots", therapistId, lookaheadDays],
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      if (!therapistId) return [];
      if (!isFirebaseConfigured || !db) {
        return demoSlotsFor(therapistId);
      }
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + lookaheadDays);
      const ref = collection(db, "availabilitySlots");
      const q = query(
        ref,
        where("therapistId", "==", therapistId),
        where("status", "==", "open"),
        where("startsAt", ">=", new Date().toISOString()),
        orderBy("startsAt", "asc"),
        limit(100),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...(d.data() as AvailabilitySlot), id: d.id }));
    },
    enabled: !!therapistId,
  });
}
