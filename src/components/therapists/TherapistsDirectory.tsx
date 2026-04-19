import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { useI18n } from "@/i18n/I18nProvider";
import { useTherapists } from "@/lib/queries/therapists";
import type { Specialty, Locale as LocaleT, Format, TherapistDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Search, Heart, ArrowUpRight, Languages as LangIcon, Video, MapPin, SlidersHorizontal, X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

export const therapistsSearchSchema = z.object({
  q: z.string().optional(),
  specialty: z.string().optional(),
  language: z.string().optional(),
  format: z.string().optional(),
  max: z.coerce.number().optional(),
  sort: z.enum(["rating", "price", "soonest"]).optional(),
});

export type TherapistsSearch = z.infer<typeof therapistsSearchSchema>;

const SPECIALTIES: { id: Specialty; labelEn: string; labelAr: string }[] = [
  { id: "anxiety", labelEn: "Anxiety", labelAr: "قلق" },
  { id: "depression", labelEn: "Depression", labelAr: "اكتئاب" },
  { id: "relationships", labelEn: "Relationships", labelAr: "علاقات" },
  { id: "couples", labelEn: "Couples", labelAr: "شريك/زواج" },
  { id: "parenting", labelEn: "Parenting", labelAr: "تربية" },
  { id: "children", labelEn: "Children", labelAr: "أطفال" },
  { id: "teens", labelEn: "Teens", labelAr: "مراهقون" },
  { id: "trauma", labelEn: "Trauma", labelAr: "صدمات" },
  { id: "grief", labelEn: "Grief", labelAr: "فقدان" },
  { id: "work_stress", labelEn: "Work stress", labelAr: "ضغوط العمل" },
  { id: "sleep", labelEn: "Sleep", labelAr: "النوم" },
  { id: "adhd", labelEn: "ADHD", labelAr: "فرط الحركة" },
  { id: "self_esteem", labelEn: "Self-esteem", labelAr: "تقدير الذات" },
  { id: "eating", labelEn: "Eating", labelAr: "الأكل" },
  { id: "addictions", labelEn: "Addictions", labelAr: "الإدمان" },
];

const PRICE_PRESETS = [
  { max: 60 as const },
  { max: 100 as const },
  { max: 150 as const },
] as const;

export function priceLabel(n: number, c: string, locale: LocaleT) {
  const amount = n / 100;
  if (c === "USD") return locale === "ar" ? `$${amount}` : `$${amount}`;
  if (c === "EGP") return locale === "ar" ? `${amount} ج.م` : `E£${amount}`;
  if (c === "SAR") return locale === "ar" ? `${amount} ر.س` : `SAR ${amount}`;
  if (c === "AED") return locale === "ar" ? `${amount} د.إ` : `AED ${amount}`;
  return `${c} ${amount}`;
}

export type TherapistsDirectoryProps = {
  search: TherapistsSearch;
  setSearch: (patch: Partial<TherapistsSearch>) => void;
  variant?: "marketing" | "app";
};

function activeFilterCount(search: TherapistsSearch): number {
  let n = 0;
  if (search.q?.trim()) n++;
  if (search.specialty) n++;
  if (search.language) n++;
  if (search.format) n++;
  if (search.max != null && search.max > 0) n++;
  if (search.sort && search.sort !== "rating") n++;
  return n;
}

function resultsLabel(count: number, t: ReturnType<typeof useI18n>["t"], locale: "en" | "ar"): string {
  if (count === 0) return t.therapists.resultsCountNone;
  if (count === 1) return t.therapists.resultsCountOne;
  const raw = t.therapists.resultsCount;
  return raw.replace("{{count}}", String(count));
}

export function TherapistsDirectory({ search, setSearch, variant = "marketing" }: TherapistsDirectoryProps) {
  const { t, locale } = useI18n();
  const reduced = useReducedMotion();
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [qDraft, setQDraft] = React.useState(search.q ?? "");
  const searchRef = React.useRef(search);
  searchRef.current = search;

  React.useEffect(() => {
    setQDraft(search.q ?? "");
  }, [search.q]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = qDraft.trim();
      const cur = searchRef.current;
      const currentQ = (cur.q ?? "").trim();
      if (trimmed === currentQ) return;
      setSearch({ ...cur, q: trimmed || undefined });
    }, 320);
    return () => window.clearTimeout(id);
  }, [qDraft, setSearch]);

  const filters = React.useMemo(
    () => ({
      q: search.q,
      specialty: (search.specialty as Specialty) ?? null,
      language: (search.language as LocaleT) ?? null,
      format: (search.format as Format) ?? null,
      maxPrice: search.max ? search.max * 100 : null,
      sort: search.sort ?? "rating",
    }),
    [search],
  );

  const { data: therapists = [], isLoading } = useTherapists(filters);
  const active = activeFilterCount(search);
  const app = variant === "app";

  function updateSearch(patch: Partial<TherapistsSearch>) {
    setSearch({ ...search, ...patch });
  }

  const filterBlocks = (
    <div className="flex flex-col gap-8">
      <FilterBlock title={t.therapists.specialty}>
        <div className="flex flex-wrap gap-2 md:max-h-none">
          <FilterChip
            active={!filters.specialty}
            onClick={() => updateSearch({ specialty: undefined })}
            label={t.therapists.allSpecialties}
          />
          {SPECIALTIES.map((s) => (
            <FilterChip
              key={s.id}
              active={filters.specialty === s.id}
              onClick={() => updateSearch({ specialty: filters.specialty === s.id ? undefined : s.id })}
              label={locale === "ar" ? s.labelAr : s.labelEn}
            />
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title={t.therapists.format}>
        <div className="flex flex-wrap gap-2">
          {(["online", "in_person", "both"] as const).map((f) => (
            <FilterChip
              key={f}
              active={filters.format === f}
              onClick={() => updateSearch({ format: filters.format === f ? undefined : f })}
              label={
                f === "online" ? t.therapists.formatOnline
                  : f === "in_person" ? t.therapists.formatInPerson
                    : t.therapists.formatBoth
              }
            />
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title={t.therapists.language}>
        <div className="flex flex-wrap gap-2">
          {(["en", "ar"] as const).map((l) => (
            <FilterChip
              key={l}
              active={filters.language === l}
              onClick={() => updateSearch({ language: filters.language === l ? undefined : l })}
              label={l === "en" ? t.therapists.speaksEnglish : t.therapists.speaksArabic}
            />
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title={t.therapists.priceRange}>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={!search.max}
            onClick={() => updateSearch({ max: undefined })}
            label={t.therapists.priceAny}
          />
          {PRICE_PRESETS.map((p) => (
            <FilterChip
              key={p.max}
              active={search.max === p.max}
              onClick={() => updateSearch({ max: search.max === p.max ? undefined : p.max })}
              label={
                p.max === 60 ? t.therapists.priceUnder60
                  : p.max === 100 ? t.therapists.priceUnder100
                    : t.therapists.priceUnder150
              }
            />
          ))}
        </div>
      </FilterBlock>
    </div>
  );

  return (
    <>
      <section className={cn("relative overflow-hidden border-b border-border/40", app ? "bg-card/30" : "")}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="blob absolute -left-20 top-0 h-96 w-96 bg-blush/50 animate-drift" />
          <div className="blob absolute -right-28 top-20 h-80 w-80 bg-mint/40 animate-drift [animation-delay:-6s]" />
          <div className="blob absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 bg-sky/40" />
        </div>
        <div className={cn("relative mx-auto max-w-7xl px-4 sm:px-5 md:px-8", app ? "pb-6 pt-5 md:pb-8 md:pt-6" : "pb-8 pt-hero-under-site-header md:pb-10")}>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">
            {t.therapists.browseTitle}
          </p>
          <h1
            className={cn(
              "mt-3 max-w-3xl text-balance font-display leading-[1.05] md:mt-4",
              app ? "text-2xl sm:text-3xl md:text-4xl" : "text-4xl sm:text-5xl md:text-7xl",
            )}
          >
            {locale === "ar"
              ? "المختص المناسب، جاهز حين تكون أنت جاهزًا."
              : "The right specialist, ready when you are."}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink-muted md:text-base">{t.therapists.browseSub}</p>

          {/* Search + sort — desktop shows full toolbar; mobile stacks */}
          <div className="mt-6 rounded-[1.75rem] border border-border/60 bg-card/85 p-4 shadow-soft backdrop-blur-md sm:p-5 md:mt-8 md:rounded-[2rem] md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {locale === "ar" ? "بحث" : "Search"}
                </label>
                <div
                  className={cn(
                    "flex min-h-[3rem] items-center gap-3 rounded-2xl border border-border/80 bg-background/80 px-4 transition-shadow",
                    "ring-offset-2 ring-offset-background focus-within:border-ink/25 focus-within:ring-2 focus-within:ring-lavender/50",
                  )}
                >
                  <Search className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
                  <input
                    value={qDraft}
                    onChange={(e) => setQDraft(e.target.value)}
                    placeholder={t.therapists.searchPlaceholder}
                    className="min-h-[2.75rem] flex-1 bg-transparent py-2 text-base outline-none placeholder:text-ink-muted/70 md:text-sm"
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  {qDraft ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQDraft("");
                        updateSearch({ q: undefined });
                      }}
                      className="rounded-full p-1.5 text-ink-muted hover:bg-muted hover:text-foreground"
                      aria-label={t.common.close}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-ink-muted/90">{t.therapists.searchHint}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end lg:w-[min(100%,20rem)]">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t.therapists.sort}</span>
                  <div
                    className="flex rounded-2xl border border-border/80 bg-muted/40 p-1"
                    role="group"
                    aria-label={t.therapists.sort}
                  >
                    {(["rating", "price", "soonest"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => updateSearch({ sort: k })}
                        className={cn(
                          "min-h-[2.75rem] flex-1 rounded-xl px-2 text-xs font-semibold transition-all sm:px-3 sm:text-[0.8rem]",
                          (filters.sort ?? "rating") === k
                            ? "bg-ink text-cream shadow-sm"
                            : "text-ink-muted hover:bg-card hover:text-foreground",
                        )}
                      >
                        {k === "rating" ? t.therapists.sortTop : k === "price" ? t.therapists.sortPrice : t.therapists.sortSoonest}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSearch({})}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-xs font-semibold text-ink hover:bg-muted sm:h-auto sm:min-h-[2.75rem] sm:self-end"
                >
                  {t.common.reset}
                </button>
              </div>
            </div>

            {/* Desktop / tablet: inline filters */}
            <div className="mt-6 hidden border-t border-border/50 pt-6 md:block">{filterBlocks}</div>
          </div>

          {/* Mobile: open sheet */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetContent
              side="bottom"
              className="flex max-h-[min(88dvh,36rem)] flex-col rounded-t-[2rem] border-border/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
            >
              <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
              <SheetHeader className="shrink-0 space-y-1 pb-2 text-start rtl:text-right">
                <SheetTitle className="font-display text-xl">{t.therapists.filterSheetTitle}</SheetTitle>
                <p className="text-sm text-ink-muted">{t.therapists.filterSheetHint}</p>
              </SheetHeader>
              <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-2">{filterBlocks}</div>
              <SheetFooter className="shrink-0 border-t border-border/60 pt-4">
                <SheetClose asChild>
                  <button
                    type="button"
                    className="h-12 w-full rounded-2xl bg-ink text-sm font-semibold text-cream"
                  >
                    {t.common.close}
                  </button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-5 md:px-8 md:pb-24 md:pt-10">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
              {locale === "ar" ? "النتائج" : "Results"}
            </p>
            <p className="mt-1 font-display text-2xl text-foreground md:text-3xl">
              {isLoading ? t.common.loading : resultsLabel(therapists.length, t, locale)}
            </p>
          </div>
          {active > 0 ? (
            <span className="inline-flex w-fit items-center rounded-full bg-lavender/50 px-3 py-1 text-xs font-semibold text-ink">
              {t.therapists.filtersActive.replace("{{count}}", String(active))}
            </span>
          ) : null}
        </div>

        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-[2rem] border border-border/60 bg-muted/60" />
            ))}
          </div>
        )}
        {!isLoading && therapists.length === 0 && (
          <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-10 text-center shadow-soft">
            <p className="font-display text-2xl">{t.therapists.empty}</p>
            <button
              type="button"
              onClick={() => setSearch({})}
              className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              {t.common.reset}
            </button>
          </div>
        )}

        <motion.div
          layout
          className="grid auto-rows-[minmax(260px,auto)] gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {therapists.map((therapist, i) => (
            <motion.div
              key={therapist.id}
              layout
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className={i % 5 === 0 ? "md:row-span-2" : ""}
            >
              <TherapistCard t={therapist} locale={locale} feature={i % 5 === 0} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mobile sticky filter bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 p-3 shadow-[0_-8px_30px_-12px_rgba(31,27,46,0.2)] backdrop-blur-xl md:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-stretch gap-2">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-sm font-semibold"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t.therapists.filterMobileCta}
            {active > 0 ? (
              <span className="absolute end-3 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-cream">
                {active > 9 ? "9+" : active}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

function TherapistCard({
  t, locale, feature,
}: {
  t: TherapistDoc;
  locale: LocaleT;
  feature?: boolean;
}) {
  const { t: tr } = useI18n();
  const initials = t.displayName.split(" ").slice(0, 2).map((n) => n[0]).join("");
  const accent =
    t.id.charCodeAt(0) % 4 === 0 ? "bg-lavender/50"
    : t.id.charCodeAt(0) % 4 === 1 ? "bg-blush/55"
    : t.id.charCodeAt(0) % 4 === 2 ? "bg-sky/55"
    : "bg-mint/55";

  return (
    <Link
      to="/therapists/$id"
      params={{ id: t.id }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border/60 p-6 shadow-soft transition-shadow hover:shadow-soft-lg",
        accent,
      )}
    >
      {feature && (
        <div aria-hidden className="blob pointer-events-none absolute -right-16 top-10 h-56 w-56 bg-card/70" />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-card font-display text-2xl">
          {initials}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-semibold">
          <Heart className="h-3 w-3 fill-ink text-ink" /> {t.rating?.toFixed(1) ?? "—"}
          {t.ratingCount && <span className="text-ink-muted">({t.ratingCount})</span>}
        </div>
      </div>
      <h3 className="relative mt-5 font-display text-2xl">{t.displayName}</h3>
      <p className="text-sm text-ink-muted">{t.title}</p>

      <p className={cn("mt-3 text-sm text-ink-muted", feature ? "line-clamp-4" : "line-clamp-2")}>
        {t.bio}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {t.specialties.slice(0, feature ? 6 : 3).map((s) => (
          <span key={s} className="rounded-full bg-card/80 px-2.5 py-0.5 text-[11px]">{s.replace("_", " ")}</span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1"><LangIcon className="h-3.5 w-3.5" /> {t.languages.map((l) => l === "en" ? "EN" : "ع").join(" · ")}</span>
        {t.format !== "in_person" && <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" /> {tr.therapists.formatOnline}</span>}
        {t.format !== "online" && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {tr.therapists.formatInPerson}</span>}
      </div>

      <div className="mt-auto flex items-end justify-between pt-5">
        <span className="font-display text-xl">
          {priceLabel(t.pricePerSession, t.currency, locale)}
          <span className="text-xs text-ink-muted"> / {t.sessionMinutes ?? 50} {tr.booking.minutes}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">
          {tr.therapists.viewProfile} <ArrowUpRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </span>
      </div>
    </Link>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[2.5rem] rounded-full px-4 py-2 text-left text-xs font-semibold transition-all rtl:text-right",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender/60 focus-visible:ring-offset-2",
        active
          ? "bg-ink text-cream shadow-sm ring-1 ring-ink/10"
          : "border border-border/80 bg-card text-foreground hover:border-ink/15 hover:bg-muted/80",
      )}
    >
      {label}
    </button>
  );
}
