import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { RouteGuard } from "@/components/site/RouteGuard";
import { TherapistsDirectory, therapistsSearchSchema, type TherapistsSearch } from "@/components/therapists/TherapistsDirectory";

export const Route = createFileRoute("/dashboard/$role/find")({
  head: () => ({
    meta: [
      { title: "Find a therapist — Thera" },
      { name: "description", content: "Browse vetted bilingual therapists by specialty, language, price and format." },
    ],
  }),
  validateSearch: (search) => therapistsSearchSchema.parse(search),
  component: () => (
    <RouteGuard requireAuth>
      <DashboardFindTherapists />
    </RouteGuard>
  ),
});

function DashboardFindTherapists() {
  const { role } = Route.useParams() as { role: string };
  const search = Route.useSearch() as TherapistsSearch;
  const navigate = Route.useNavigate();

  return (
    <SiteShell>
      <TherapistsDirectory
        search={search}
        setSearch={(patch) => {
          if (Object.keys(patch).length === 0) {
            void navigate({ to: "/dashboard/$role/find", params: { role }, search: {}, replace: true });
            return;
          }
          void navigate({
            to: "/dashboard/$role/find",
            params: { role },
            search: { ...search, ...patch },
            replace: true,
          });
        }}
        variant="app"
      />
    </SiteShell>
  );
}
