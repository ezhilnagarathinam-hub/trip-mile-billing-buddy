import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { Button } from "./ui/button";

export function AppHeader({ title, name }: { title: string; name?: string }) {
  const navigate = useNavigate();
  return (
    <header className="bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/dashboard"><Logo /></Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs uppercase tracking-widest text-ink-foreground/60">{title}</div>
            <div className="text-sm font-semibold">{name}</div>
          </div>
          <Button size="sm" variant="outline" className="border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="stripes h-1.5" />
    </header>
  );
}
