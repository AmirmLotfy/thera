import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, err) => {
          const msg = (err as Error)?.message ?? "";
          if (/permission-denied|unauthenticated|auth\/.+/i.test(msg)) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });
}

let client: QueryClient | null = null;
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!client) client = makeQueryClient();
  return client;
}
