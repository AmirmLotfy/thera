import { cn } from "@/lib/utils";

const GRADIENT_BY_SLUG: Record<string, string> = {
  "online-therapy-egypt":
    "bg-gradient-to-br from-lavender via-sky/90 to-blush",
  "when-to-see-a-therapist":
    "bg-gradient-to-br from-blush via-cream to-mint/90",
  "anxiety-grounding-arabic":
    "bg-gradient-to-br from-mint via-lavender/80 to-sky",
};

const FALLBACK = [
  "bg-gradient-to-br from-lavender via-blush/80 to-cream",
  "bg-gradient-to-br from-sky via-lavender/70 to-mint",
  "bg-gradient-to-br from-mint via-cream to-blush/90",
];

/** Colorful gradient surface for blog cards — no image assets */
export function blogCardGradient(slug: string, index = 0): string {
  return GRADIENT_BY_SLUG[slug] ?? FALLBACK[index % FALLBACK.length];
}

type BlogCardCoverProps = {
  slug: string;
  category: string;
  index?: number;
  className?: string;
  aspect?: "4/3" | "16/9";
};

export function BlogCardCover({
  slug,
  category,
  index = 0,
  className,
  aspect = "4/3",
}: BlogCardCoverProps) {
  const aspectClass = aspect === "16/9" ? "aspect-[16/9]" : "aspect-[4/3]";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        aspectClass,
        blogCardGradient(slug, index),
        className,
      )}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.45),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_90%,rgba(31,27,46,0.08),transparent_45%)]" />
      <span className="absolute bottom-3 start-3 rounded-full border border-white/40 bg-card/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink/80 backdrop-blur-sm">
        {category.replace(/_/g, " ")}
      </span>
    </div>
  );
}
