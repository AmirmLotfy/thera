import * as React from "react";
import {
  collection,
  onSnapshot,
  query,
  type QueryConstraint,
  type DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

type UseFirestoreLiveOptions<T> = {
  queryKey: readonly unknown[];
  /** Firestore path segments, e.g. ["bookings"] or ["careThreads", id, "messages"] */
  pathSegments: string[];
  constraints: QueryConstraint[];
  mapDoc: (id: string, data: DocumentData) => T;
  enabled?: boolean;
  fallback?: T[];
};

export function useFirestoreLive<T>({
  queryKey,
  pathSegments,
  constraints,
  mapDoc,
  enabled = true,
  fallback = [],
}: UseFirestoreLiveOptions<T>) {
  const [data, setData] = React.useState<T[]>(fallback);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const key = JSON.stringify(queryKey);
  const pathKey = pathSegments.join("/");

  React.useEffect(() => {
    if (!enabled) {
      setData(fallback);
      setLoading(false);
      return;
    }
    if (!isFirebaseConfigured || !db || pathSegments.length === 0) {
      setData(fallback);
      setLoading(false);
      return;
    }
    setLoading(true);
    const colRef = collection(db, ...(pathSegments as [string, ...string[]]));
    const q = query(colRef, ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => mapDoc(d.id, d.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useFirestoreLive", err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pathKey, enabled, fallback]);

  return { data, loading, error };
}
