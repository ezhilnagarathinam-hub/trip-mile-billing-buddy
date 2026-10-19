import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export type BackDestination = "/" | "/dashboard" | "/admin" | "/driver" | "/invoice" | "/auth";

export function BackButton({ to, label = "Back" }: { to: BackDestination; label?: string }) {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" aria-label={label} onClick={() => {
      const state = window.history.state as { __TSR_index?: number } | null;
      if (state && typeof state.__TSR_index === "number" && state.__TSR_index > 0) window.history.back();
      else navigate({ to });
    }}>
        <ArrowLeft aria-hidden="true" />
        <span>{label}</span>
    </Button>
  );
}