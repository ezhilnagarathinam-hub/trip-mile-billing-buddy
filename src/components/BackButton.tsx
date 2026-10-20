import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export type BackDestination = "/" | "/dashboard" | "/admin" | "/driver" | "/invoice" | "/auth";

export function BackButton({ to, label = "Back" }: { to: BackDestination; label?: string }) {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" aria-label={label} onClick={() => {
      navigate({ to });
    }}>
        <ArrowLeft aria-hidden="true" />
        <span>{label}</span>
    </Button>
  );
}