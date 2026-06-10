import { Polar } from "@polar-sh/sdk";

export function polarClient(): Polar | null {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) return null;
  const server = process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
  return new Polar({ accessToken: token, server });
}

/** Set POLAR_PAYMENTS_ENABLED=true when ready to accept card payments. */
export function polarPaymentsEnabled(): boolean {
  return process.env.POLAR_PAYMENTS_ENABLED === "true";
}

export function polarConfigured(): boolean {
  return polarPaymentsEnabled()
    && Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID);
}

export function siteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? process.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
