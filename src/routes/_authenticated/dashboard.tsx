import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Travel Workspace — Raman Travels" },
    { name: "description", content: "Your Raman Travels workspace for trips and invoices." },
    { property: "og:title", content: "Travel Workspace — Raman Travels" },
    { property: "og:description", content: "Your Raman Travels workspace for trips and invoices." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Dash,
});

function Dash() {
  const { data, isLoading } = useMe();
  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  return <Navigate to={data.isAdmin ? "/admin" : "/driver"} />;
}
