import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for /blog — index (blog.index) + articles (blog.$slug) render via Outlet */
export const Route = createFileRoute("/blog")({
  component: () => <Outlet />,
});
