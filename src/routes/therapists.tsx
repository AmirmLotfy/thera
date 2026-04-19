import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { TherapistsDirectory, therapistsSearchSchema, type TherapistsSearch } from "@/components/therapists/TherapistsDirectory";

export const Route = createFileRoute("/therapists")({
  head: () => ({
    meta: [
      { title: "Find a therapist — Thera" },
      { name: "description", content: "Browse vetted bilingual therapists by specialty, language, price and format." },
      { property: "og:title", content: "Find a therapist — Thera" },
      { property: "og:description", content: "Vetted EN/AR specialists, ready to listen." },
    ],
  }),
  validateSearch: (search) => therapistsSearchSchema.parse(search),
  component: PublicTherapistsPage,
});

function PublicTherapistsPage() {
  const search = Route.useSearch() as TherapistsSearch;
  const navigate = Route.useNavigate();
  return (
    <SiteShell>
      <TherapistsDirectory
        search={search}
        setSearch={(patch) => {
          if (Object.keys(patch).length === 0) {
            void navigate({ search: {}, replace: true });
            return;
          }
          void navigate({ search: { ...search, ...patch }, replace: true });
        }}
        variant="marketing"
      />
    </SiteShell>
  );
}
