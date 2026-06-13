import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /therapists — index (therapists.index) + details (therapists.$id) render via Outlet */
export const Route = createFileRoute("/therapists")({
  component: () => <Outlet />,
});
