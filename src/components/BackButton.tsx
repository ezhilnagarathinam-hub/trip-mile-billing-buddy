import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export type BackDestination = "/" | "/dashboard" | "/admin" | "/driver" | "/invoice" | "/auth";

export function BackButton({ to, label = "Back" }: { to: BackDestination; label?: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to={to} aria-label={label}>
        <ArrowLeft aria-hidden="true" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}