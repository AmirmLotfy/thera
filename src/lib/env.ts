/**
 * Strip accidental whitespace/newlines from env values.
 * Vercel CLI and shell heredocs often append `\n`, which breaks Firebase Auth
 * iframe URLs (e.g. `authDomain%0A` → illegal URL).
 */
export function trimEnv(v: unknown): string | undefined {
  if (v == null) return undefined;
  const t = String(v).trim();
  return t || undefined;
}
