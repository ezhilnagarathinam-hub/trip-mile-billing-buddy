import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Raman Travels" }, { name: "description", content: "Your Raman Travels dashboard." }] }),
  component: Dash,
});

function Dash() {
  const { data, isLoading } = useMe();
  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  return <Navigate to={data.isAdmin ? "/admin" : "/driver"} />;
}
