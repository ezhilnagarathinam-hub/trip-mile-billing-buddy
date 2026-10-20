import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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