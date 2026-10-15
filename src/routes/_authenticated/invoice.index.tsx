import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDT, inr, statusStyle } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoice/")({
  head: () => ({ meta: [{ title: "Create Invoice — Raman Travels" }, { name: "description", content: "Pick a trip to invoice." }] }),
  component: Pick,
});

function Pick() {
  const { data: me } = useMe();
  const [q, setQ] = useState("");
  const trips = useQuery({
    queryKey: ["invoice-pick"],
    queryFn: async () => (await supabase.from("trips").select("*").neq("status", "ongoing").order("created_at", { ascending: false })).data ?? [],
  });
  const s = q.toLowerCase();
  const list = (trips.data ?? []).filter((t) => !s || t.trip_code.toLowerCase().includes(s) || t.customer_name.toLowerCase().includes(s) || t.customer_phone.includes(s));
  return (
    <div className="min-h-screen">
      <AppHeader title={me?.isAdmin ? "Admin" : "Driver"} name={me?.profile?.full_name} />
      <main className="mx-auto max-w-3xl p-4">
        <Card>
          <CardHeader><CardTitle className="text-3xl font-normal">Select trip to invoice</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Travel ID, customer name or mobile number" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {list.map((t) => (
              <Link key={t.id} to="/invoice/$tripId" params={{ tripId: t.id }} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
                <div>
                  <div className="font-semibold">{t.trip_code} · {t.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{t.customer_phone} · {fmtDT(t.start_time)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusStyle[t.status]}`}>{t.status}</span>
                  {Number(t.total_amount) > 0 && <b>{inr(Number(t.total_amount))}</b>}
                </div>
              </Link>
            ))}
            {list.length === 0 && <p className="text-muted-foreground">No completed trips found.</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
