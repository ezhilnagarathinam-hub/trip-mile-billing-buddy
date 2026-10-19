import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { BackButton, type BackDestination } from "./BackButton";

export function AppHeader({ title, name, backTo = "/dashboard" }: { title: string; name?: string | undefined; backTo?: BackDestination }) {
  const navigate = useNavigate();
  return (
    <header className="bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <BackButton to={backTo} />
          <Link to="/dashboard" aria-label="Raman Travels dashboard"><Logo /></Link>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs uppercase tracking-widest text-ink-foreground/60">{title}</div>
            <div className="text-sm font-semibold">{name}</div>
          </div>
          <Button size="sm" variant="outline" className="border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="stripes h-1.5" />
    </header>
  );
}
