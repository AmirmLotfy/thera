import type { Locale } from "@/lib/types";

export type MoneyCurrency = "EGP" | "USD" | "SAR" | "AED";

export const DEFAULT_CURRENCY: MoneyCurrency = "EGP";

/** Filter chips: max price in EGP (major units) → stored in URL search as this number */
export const PRICE_FILTER_EGP = [
  { maxEgp: 600, labelEn: "Under E£600", labelAr: "أقل من ٦٠٠ ج.م" },
  { maxEgp: 1000, labelEn: "Under E£1,000", labelAr: "أقل من ١٬٠٠٠ ج.م" },
  { maxEgp: 1500, labelEn: "Under E£1,500", labelAr: "أقل من ١٬٥٠٠ ج.م" },
] as const;

export function minorToMajor(minor: number): number {
  return minor / 100;
}

/** Therapist onboarding: user enters EGP (or other) major units → store piastres/cents */
export function majorToMinor(major: number): number {
  return Math.round(major * 100);
}

export function priceLabel(minor: number, currency: string, locale: Locale): string {
  const amount = minorToMajor(minor);
  const c = (currency || DEFAULT_CURRENCY) as MoneyCurrency;
  if (c === "EGP") {
    return locale === "ar"
      ? `${amount.toLocaleString("ar-EG")} ج.م`
      : `E£${amount.toLocaleString("en-EG")}`;
  }
  if (c === "USD") return `$${amount.toLocaleString("en-US")}`;
  if (c === "SAR") return locale === "ar" ? `${amount} ر.س` : `SAR ${amount}`;
  if (c === "AED") return locale === "ar" ? `${amount} د.إ` : `AED ${amount}`;
  return `${c} ${amount}`;
}

export function formatPrice(minor: number, currency: string, locale: Locale): string {
  const c = (currency || DEFAULT_CURRENCY) as MoneyCurrency;
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 0,
    }).format(minorToMajor(minor));
  } catch {
    return priceLabel(minor, c, locale);
  }
}

export function priceFilterToMinor(maxEgp: number): number {
  return majorToMinor(maxEgp);
}
