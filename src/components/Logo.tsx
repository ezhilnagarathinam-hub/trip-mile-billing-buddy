import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Car className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="font-display text-2xl leading-none">
          RAMAN <span className="text-primary">TRAVELS</span>
        </span>
      )}
    </div>
  );
}

export function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-ink text-ink-foreground">
      <div className="animate-drive flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl">
        <Car className="h-14 w-14" />
      </div>
      <div className="road-line mt-6 h-1 w-72" />
      <h1 className="animate-rise mt-6 text-6xl text-primary sm:text-7xl">RAMAN TRAVELS</h1>
      <p className="animate-rise mt-1 text-sm uppercase tracking-[0.3em] text-ink-foreground/70">Safe · On time · Every trip</p>
    </div>
  );
}
