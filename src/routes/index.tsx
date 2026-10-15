import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo, Splash } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { MapPin, Receipt, Share2, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Raman Travels — Trip Billing & Invoices" },
      { name: "description", content: "Track trips, calculate km charges and share invoices to customers on WhatsApp." },
      { property: "og:title", content: "Raman Travels — Trip Billing & Invoices" },
      { property: "og:description", content: "Track trips, calculate km charges and share invoices to customers on WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-ink text-ink-foreground">
      {splash && <Splash />}
      <div className="stripes h-2" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild><Link to="/auth">Login</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-10">
        <h1 className="max-w-3xl text-6xl leading-[0.95] text-primary sm:text-8xl">Every trip billed in one tap.</h1>
        <p className="mt-5 max-w-xl text-lg text-ink-foreground/80">
          Drivers start and end trips, the distance is measured on the map, and a branded invoice goes straight to the customer's WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild><Link to="/auth">Get started</Link></Button>
          <Button size="lg" variant="outline" className="border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground" asChild>
            <Link to="/auth" search={{ demo: true }}>Try demo</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-4">
          {[
            [MapPin, "Live km tracking", "GPS start & end with road distance"],
            [Receipt, "Instant invoice", "Per-km, up & down, bata, extras"],
            [Share2, "Share anywhere", "WhatsApp, SMS or email"],
            [ShieldCheck, "Admin control", "Approve drivers, see reports"],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof MapPin;
            return (
              <div key={t as string} className="rounded-lg border border-primary/30 p-5">
                <I className="h-6 w-6 text-primary" />
                <h3 className="mt-3 text-2xl">{t as string}</h3>
                <p className="text-sm text-ink-foreground/70">{d as string}</p>
              </div>
            );
          })}
        </div>
      </main>
      <footer className="border-t border-primary/20 py-6 text-center text-sm text-ink-foreground/70">
        {BRAND.name} · Contact {BRAND.contact} · Support {BRAND.support}
      </footer>
    </div>
  );
}
