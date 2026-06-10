const STORAGE_KEY = "thera_post_login_redirect";

export function peekPostLoginRedirect(): string | null {
  try {
    const fromStorage = sessionStorage.getItem(STORAGE_KEY);
    if (fromStorage?.startsWith("/")) return fromStorage;
  } catch {
    /* ignore */
  }
  return null;
}

export function savePostLoginRedirect(path: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    /* ignore */
  }
}

export function consumePostLoginRedirect(fallback = "/auth/role"): string {
  try {
    const fromStorage = sessionStorage.getItem(STORAGE_KEY);
    if (fromStorage?.startsWith("/")) {
      sessionStorage.removeItem(STORAGE_KEY);
      return fromStorage;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function redirectFromSearch(searchRedirect: unknown): string | null {
  if (typeof searchRedirect === "string" && searchRedirect.startsWith("/")) {
    return searchRedirect;
  }
  return null;
}
